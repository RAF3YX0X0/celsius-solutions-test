/**
 * Automated End-to-End Integration & Unit Test Suite
 * Tests all endpoints, webhook HMAC verification, deduplication, idempotency, and DLQ retry.
 */

const assert = require('assert');
const crypto = require('crypto');
const config = require('../src/config');
const { db } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');
const OrderService = require('../src/services/orderService');
const CustomerService = require('../src/services/customerService');
const ProductService = require('../src/services/productService');
const WebhookSecurity = require('../src/services/webhookSecurity');
const FailureHandler = require('../src/services/failureHandler');
const TwoWaySyncService = require('../src/services/twoWaySync');
const { normalizeShopifyOrder, normalizeWooCommerceOrder } = require('../src/utils/validators');

async function runAllTests() {
  console.log('\n=============================================================');
  console.log('  🧪 Running Central CRM Full Automated Test Suite');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`  ▶ Testing: ${name}... `);
      await fn();
      console.log('\x1b[32m✔ PASSED\x1b[0m');
      passed++;
    } catch (err) {
      console.log('\x1b[31m✖ FAILED\x1b[0m');
      console.error(`    Error: ${err.message}\n`, err.stack);
      failed++;
    }
  }

  // 1. Test Database Seeding & Schema
  await test('Database Schema & 1,000+ Products Catalogue Seeding', async () => {
    await seedDatabase(true);
    const prodCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const custCount = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    assert.ok(prodCount >= 1000, `Expected at least 1000 products, got ${prodCount}`);
    assert.strictEqual(userCount, 2, 'Expected 2 default users (Admin, Staff)');
    assert.ok(custCount >= 10, 'Expected demo customers');
    assert.ok(orderCount >= 10, 'Expected demo orders');
  });

  // 2. Test Customer Deduplication Logic
  await test('Customer Deduplication Across Stores (Email Resolution)', async () => {
    const testEmail = 'dedup.tester@company.org';
    
    // Shopify Order from customer
    const cust1 = CustomerService.findOrCreateCustomer({
      email: testEmail,
      firstName: 'Dedup',
      lastName: 'Tester',
      phone: '+1 555-0199'
    });

    // WooCommerce Order from SAME customer
    const cust2 = CustomerService.findOrCreateCustomer({
      email: testEmail.toUpperCase(), // Test case insensitivity
      firstName: 'Dedup',
      lastName: 'Tester'
    });

    assert.strictEqual(cust1.id, cust2.id, 'Customer records must have identical UUID when email matches');
    
    const count = db.prepare('SELECT COUNT(*) as count FROM customers WHERE email = ?').get(testEmail).count;
    assert.strictEqual(count, 1, 'Database must contain exactly 1 customer row');
  });

  // 3. Test Shopify Webhook Normalizer & Ingestion
  await test('Shopify Webhook Normalization & Ingestion', async () => {
    const testExtId = `sh_test_${Date.now()}`;
    const rawShopifyPayload = {
      id: testExtId,
      order_number: 9911,
      email: 'shopify.shopper@domain.com',
      financial_status: 'paid',
      fulfillment_status: null,
      total_price: '149.99',
      currency: 'USD',
      customer: {
        email: 'shopify.shopper@domain.com',
        first_name: 'Shopify',
        last_name: 'Shopper'
      },
      line_items: [
        { sku: 'ELEC-1001', title: 'Noise-Cancelling Headphones Pro', price: '149.99', quantity: 1 }
      ]
    };

    const normalized = normalizeShopifyOrder(rawShopifyPayload);
    assert.strictEqual(normalized.source, 'shopify');
    assert.strictEqual(normalized.externalOrderId, testExtId);
    assert.strictEqual(normalized.items.length, 1);

    const result = await OrderService.ingestOrder(normalized);
    assert.ok(result.order.id, 'Order must be created with UUID');
    assert.strictEqual(result.order.source, 'shopify');
    assert.strictEqual(result.isExistingDuplicate, false);
  });

  // 4. Test WooCommerce Webhook Normalizer & Ingestion
  await test('WooCommerce Webhook Normalization & Ingestion', async () => {
    const testExtId = `wc_test_${Date.now()}`;
    const rawWooPayload = {
      id: testExtId,
      number: '7788',
      status: 'processing',
      total: '89.50',
      currency: 'USD',
      billing: {
        email: 'shopify.shopper@domain.com', // Same customer to test cross-store link!
        first_name: 'Shopify',
        last_name: 'Shopper',
        phone: '555-1234'
      },
      line_items: [
        { sku: 'HOME-1020', name: 'Gooseneck Electric Kettle', price: '89.50', quantity: 1 }
      ]
    };

    const normalized = normalizeWooCommerceOrder(rawWooPayload);
    assert.strictEqual(normalized.source, 'woocommerce');
    assert.strictEqual(normalized.externalOrderId, testExtId);

    const result = await OrderService.ingestOrder(normalized);
    assert.ok(result.order.id, 'WooCommerce order created');
    assert.strictEqual(result.order.source, 'woocommerce');

    // Verify Customer has orders from both stores
    const customer = CustomerService.getCustomerById(result.order.customer_id);
    assert.ok(customer.sources.includes('shopify'), 'Customer sources must include shopify');
    assert.ok(customer.sources.includes('woocommerce'), 'Customer sources must include woocommerce');
  });

  // 5. Test Duplicate Order Idempotency
  await test('Duplicate Order Protection & Idempotency', async () => {
    const duplicateExtId = `sh_duplicate_test_${Date.now()}`;
    const payload = {
      id: duplicateExtId,
      order_number: 5544,
      email: 'idempotent.user@domain.com',
      financial_status: 'paid',
      line_items: [{ sku: 'ELEC-1002', title: 'Studio Speaker', price: '79.00', quantity: 1 }]
    };

    const normalized = normalizeShopifyOrder(payload);
    
    // First Ingest
    const firstResult = await OrderService.ingestOrder(normalized);
    assert.strictEqual(firstResult.isExistingDuplicate, false);

    // Second Ingest with SAME external ID
    const secondResult = await OrderService.ingestOrder(normalized);
    assert.strictEqual(secondResult.isExistingDuplicate, true, 'Second ingestion must be flagged as existing duplicate');
    assert.strictEqual(firstResult.order.id, secondResult.order.id, 'Must return same CRM order ID without duplicate rows');

    const totalOrdersMatching = db.prepare("SELECT COUNT(*) as count FROM orders WHERE source = 'shopify' AND external_order_id = ?").get(duplicateExtId).count;
    assert.strictEqual(totalOrdersMatching, 1, 'Database must contain exactly 1 order for unique composite key');
  });

  // 6. Test Webhook Security (HMAC-SHA256 Verification)
  await test('HMAC SHA-256 Signature Verification & Tamper Detection', async () => {
    const rawPayload = JSON.stringify({ id: 12345, test: 'secure' });
    
    // Generate valid HMAC signature
    const validSignature = WebhookSecurity.generateSignature(rawPayload, config.shopifyWebhookSecret);
    const isValid = WebhookSecurity.verifyShopifySignature(rawPayload, validSignature);
    assert.strictEqual(isValid, true, 'Valid signature must verify as true');

    // Test forged/tampered signature
    const forgedSignature = 'INVALID_FORGED_SIGNATURE_BASE64==';
    const isForgedValid = WebhookSecurity.verifyShopifySignature(rawPayload, forgedSignature);
    assert.strictEqual(isForgedValid, false, 'Forged signature must be rejected as false');
  });

  // 7. Test Dead Letter Queue & Failure Handling
  await test('Dead Letter Queue Capture & Safe Retry Mechanism', async () => {
    const failureId = FailureHandler.logFailure({
      source: 'shopify',
      externalOrderId: 'failed_order_99',
      payload: {
        id: 'failed_order_99',
        customer: { email: 'bad_email' }, // intentionally invalid email
        line_items: [] // intentionally empty items
      },
      errorMessage: 'Validation Error: Invalid customer email format'
    });

    assert.ok(failureId, 'Failure logged with UUID');

    const failureRecord = db.prepare('SELECT * FROM sync_failures WHERE id = ?').get(failureId);
    assert.strictEqual(failureRecord.status, 'pending');

    // Retry with corrected payload
    const fixedPayload = {
      id: 'failed_order_99',
      order_number: 9901,
      email: 'corrected.shopper@domain.com',
      financial_status: 'paid',
      customer: { email: 'corrected.shopper@domain.com', first_name: 'Fixed', last_name: 'User' },
      line_items: [{ sku: 'ELEC-1003', title: 'Wireless Keyboard', price: '45.00', quantity: 1 }]
    };

    const retryResult = await FailureHandler.retryFailure(failureId, fixedPayload, 'admin');
    assert.strictEqual(retryResult.success, true);
    assert.strictEqual(retryResult.resolved, true);

    const updatedFailure = db.prepare('SELECT * FROM sync_failures WHERE id = ?').get(failureId);
    assert.strictEqual(updatedFailure.status, 'resolved', 'DLQ record marked as resolved');
  });

  // 8. Test Two-Way Status Synchronization
  await test('Two-Way Status Synchronization Dispatch', async () => {
    const order = db.prepare('SELECT * FROM orders LIMIT 1').get();
    assert.ok(order, 'Order exists for status update');

    const updateRes = await OrderService.updateOrderStatus(order.id, 'completed', { email: 'admin@crm.local', role: 'admin' });
    assert.strictEqual(updateRes.order.status, 'completed');
    assert.ok(updateRes.twoWaySync, 'Two-way sync dispatch executed');
    assert.strictEqual(updateRes.twoWaySync.newStatus, 'completed');
  });

  // 9. Test Product Catalogue Indexed Search Performance (1,000+ Items)
  await test('Product Catalogue Indexed Search Performance (1,000+ items)', async () => {
    const startTime = performance.now();
    const result = ProductService.getProducts({
      search: 'Raw Milk',
      category: 'all',
      page: 1,
      limit: 20
    });
    const duration = performance.now() - startTime;

    assert.ok(result.data.length > 0, 'Found matching products in catalogue');
    assert.ok(result.pagination.total > 0, 'Count total matching items');
    assert.ok(duration < 20, `Search query must execute in < 20ms (took ${duration.toFixed(2)}ms)`);
  });

  console.log('\n=============================================================');
  console.log(`  Test Results: \x1b[32m${passed} Passed\x1b[0m, \x1b[${failed > 0 ? '31' : '32'}m${failed} Failed\x1b[0m`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch(err => {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  });
}

module.exports = { runAllTests };
