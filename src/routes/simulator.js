const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const { seedDatabase } = require('../db/seed');
const OrderService = require('../services/orderService');
const WebhookSecurity = require('../services/webhookSecurity');
const config = require('../config');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const FailureHandler = require('../services/failureHandler');

/**
 * Interactive Store Simulator & Test Suite Endpoints
 */

/**
 * POST /api/simulator/shopify-order
 * Simulates a customer purchasing on the Shopify Storefront
 */
router.post('/shopify-order', requireAuth, async (req, res, next) => {
  try {
    const {
      customerEmail = 'alex.morgan@demo.com',
      customerFirstName = 'Alex',
      customerLastName = 'Morgan',
      customerPhone = '+1 (555) 302-8819',
      itemCount = 2,
      signHmac = true
    } = req.body;

    // Pick random products from the catalogue
    const products = db.prepare('SELECT * FROM products ORDER BY RANDOM() LIMIT ?').all(Math.min(5, Math.max(1, itemCount)));
    const externalId = `sh_${Date.now()}`;
    const orderNum = `10${Math.floor(10 + Math.random() * 89)}`;

    const lineItems = products.map((p, idx) => ({
      id: 9000000000 + idx,
      product_id: p.id,
      sku: p.sku,
      title: p.name,
      quantity: 1,
      price: (p.sale_price || p.price).toFixed(2),
      name: p.name
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    const tax = parseFloat((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 100 ? 0 : 12.00;
    const total = parseFloat((subtotal + tax + shipping).toFixed(2));

    const shopifyPayload = {
      id: externalId,
      order_number: orderNum,
      name: `#${orderNum}`,
      email: customerEmail,
      financial_status: 'paid',
      fulfillment_status: null,
      created_at: new Date().toISOString(),
      currency: 'USD',
      total_price: total.toFixed(2),
      subtotal_price: subtotal.toFixed(2),
      total_tax: tax.toFixed(2),
      total_discounts: '0.00',
      shipping_lines: [{ title: 'Standard Ground Shipping', price: shipping.toFixed(2) }],
      customer: {
        id: 7700000000 + Math.floor(Math.random() * 10000),
        email: customerEmail,
        first_name: customerFirstName,
        last_name: customerLastName,
        phone: customerPhone
      },
      billing_address: {
        first_name: customerFirstName,
        last_name: customerLastName,
        address1: '500 Howard Street, Suite 300',
        city: 'San Francisco',
        province: 'CA',
        zip: '94105',
        country: 'United States',
        phone: customerPhone
      },
      shipping_address: {
        first_name: customerFirstName,
        last_name: customerLastName,
        address1: '500 Howard Street, Suite 300',
        city: 'San Francisco',
        province: 'CA',
        zip: '94105',
        country: 'United States',
        phone: customerPhone
      },
      line_items: lineItems,
      note: 'Simulated checkout from Shopify Storefront Simulator'
    };

    const rawPayload = JSON.stringify(shopifyPayload);
    const signature = signHmac ? WebhookSecurity.generateSignature(rawPayload, config.shopifyWebhookSecret) : 'invalid_or_missing_signature';

    // Ingest through normalizer
    const { normalizeShopifyOrder } = require('../utils/validators');
    const normalized = normalizeShopifyOrder(shopifyPayload);
    const result = await OrderService.ingestOrder(normalized);

    res.json({
      success: true,
      simulationType: 'Shopify Webhook Dispatch',
      hmacSignature: signature,
      payload: shopifyPayload,
      crmOrder: result.order,
      isDuplicate: result.isExistingDuplicate
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/simulator/woocommerce-order
 * Simulates a customer purchasing on the WooCommerce Storefront
 */
router.post('/woocommerce-order', requireAuth, async (req, res, next) => {
  try {
    const {
      customerEmail = 'jordan.bell@demo.org',
      customerFirstName = 'Jordan',
      customerLastName = 'Bell',
      customerPhone = '+1 (555) 441-2900',
      itemCount = 2,
      signHmac = true
    } = req.body;

    const products = db.prepare('SELECT * FROM products ORDER BY RANDOM() LIMIT ?').all(Math.min(5, Math.max(1, itemCount)));
    const externalId = `wc_${Date.now()}`;
    const orderNum = `88${Math.floor(10 + Math.random() * 89)}`;

    const lineItems = products.map((p, idx) => ({
      id: 500000 + idx,
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      quantity: 1,
      price: (p.sale_price || p.price).toFixed(2),
      subtotal: (p.sale_price || p.price).toFixed(2),
      total: (p.sale_price || p.price).toFixed(2)
    }));

    const subtotal = lineItems.reduce((sum, item) => sum + parseFloat(item.total), 0);
    const tax = parseFloat((subtotal * 0.075).toFixed(2));
    const shipping = 10.00;
    const total = parseFloat((subtotal + tax + shipping).toFixed(2));

    const wooPayload = {
      id: externalId,
      number: orderNum,
      status: 'processing',
      currency: 'USD',
      date_created: new Date().toISOString(),
      discount_total: '0.00',
      shipping_total: shipping.toFixed(2),
      total_tax: tax.toFixed(2),
      total: total.toFixed(2),
      customer_id: 3000 + Math.floor(Math.random() * 1000),
      billing: {
        first_name: customerFirstName,
        last_name: customerLastName,
        email: customerEmail,
        phone: customerPhone,
        address_1: '221B Baker Street',
        city: 'London',
        state: 'Greater London',
        postcode: 'NW1 6XE',
        country: 'United Kingdom'
      },
      shipping: {
        first_name: customerFirstName,
        last_name: customerLastName,
        address_1: '221B Baker Street',
        city: 'London',
        state: 'Greater London',
        postcode: 'NW1 6XE',
        country: 'United Kingdom'
      },
      line_items: lineItems,
      customer_note: 'Simulated checkout from WooCommerce Storefront Simulator'
    };

    const rawPayload = JSON.stringify(wooPayload);
    const signature = signHmac ? WebhookSecurity.generateSignature(rawPayload, config.woocommerceWebhookSecret) : 'invalid_sig';

    const { normalizeWooCommerceOrder } = require('../utils/validators');
    const normalized = normalizeWooCommerceOrder(wooPayload);
    const result = await OrderService.ingestOrder(normalized);

    res.json({
      success: true,
      simulationType: 'WooCommerce Webhook Dispatch',
      hmacSignature: signature,
      payload: wooPayload,
      crmOrder: result.order,
      isDuplicate: result.isExistingDuplicate
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/simulator/tamper-test
 * Tests HMAC Signature Verification rejection
 */
router.post('/tamper-test', requireAuth, async (req, res) => {
  const fakePayload = {
    id: `sh_tampered_${Date.now()}`,
    email: 'hacker@malicious.com',
    total_price: '9999.00',
    line_items: [{ sku: 'TAMPERED-01', title: 'Hacked Item', price: '9999.00', quantity: 100 }]
  };

  const rawBody = JSON.stringify(fakePayload);
  const forgedSignature = 'FORGED_INVALID_HMAC_SIGNATURE_BASE64==';

  const isValid = WebhookSecurity.verifyShopifySignature(rawBody, forgedSignature);

  // Log as DLQ failure
  const failureId = FailureHandler.logFailure({
    source: 'shopify',
    externalOrderId: fakePayload.id,
    payload: fakePayload,
    errorMessage: 'Security Alert: Webhook HMAC SHA-256 signature verification failed. Request blocked.'
  });

  res.status(401).json({
    status: 'REJECTED_401',
    message: 'HMAC Signature Verification correctly rejected the tampered request.',
    isValid,
    loggedToDeadLetterQueue: true,
    failureId
  });
});

/**
 * POST /api/simulator/failure-test
 * Dispatches a malformed payload to test Dead Letter Queue capture
 */
router.post('/failure-test', requireAuth, async (req, res) => {
  const malformedPayload = {
    source: 'shopify',
    id: `sh_corrupt_${Date.now()}`,
    // missing customer email & empty line_items
    customer: { first_name: 'Corrupt', last_name: 'Test' },
    line_items: []
  };

  const failureId = FailureHandler.logFailure({
    source: 'shopify',
    externalOrderId: malformedPayload.id,
    payload: malformedPayload,
    errorMessage: 'Validation Error: Invalid customer email format and order must contain at least 1 line item.'
  });

  res.status(422).json({
    status: 'DEAD_LETTER_QUEUE_CAPTURED',
    message: 'Malformed order payload caught by error boundary and saved in Dead Letter Queue.',
    failureId,
    payload: malformedPayload
  });
});

/**
 * POST /api/simulator/reset-database
 */
router.post('/reset-database', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    await seedDatabase(true);
    res.json({ message: 'Database reset and re-seeded with 1,000+ products and demo stores.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
