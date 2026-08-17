const { sanitizeEmail } = require('./formatters');

/**
 * Validates and normalizes payloads from Shopify, WooCommerce, or direct REST API
 */

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Parses and normalizes Shopify Webhook / API Payload
 */
function normalizeShopifyOrder(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid Shopify payload: payload must be a non-empty object');
  }

  const externalOrderId = String(payload.id || payload.order_id || payload.external_order_id || '').trim();
  if (!externalOrderId) {
    throw new Error('Shopify order validation failed: Missing external order identifier (id / external_order_id)');
  }

  // Extract Customer
  const custSource = payload.customer || {};
  const email = sanitizeEmail(payload.email || custSource.email);
  if (!email || !isValidEmail(email)) {
    throw new Error(`Shopify order validation failed: Invalid or missing customer email (${email || 'empty'})`);
  }

  const firstName = (custSource.first_name || payload.billing_address?.first_name || '').trim();
  const lastName = (custSource.last_name || payload.billing_address?.last_name || '').trim();
  const phone = (custSource.phone || payload.phone || payload.shipping_address?.phone || '').trim();

  // Extract Line Items
  const rawItems = payload.line_items || payload.items || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('Shopify order validation failed: Order must contain at least 1 line item');
  }

  const items = rawItems.map((item, idx) => {
    const sku = (item.sku || `SHOPIFY-ITEM-${item.id || idx + 1}`).trim();
    const title = (item.title || item.name || 'Untitled Product').trim();
    const quantity = parseInt(item.quantity, 10) || 1;
    const unitPrice = parseFloat(item.price || item.unit_price) || 0;

    if (quantity <= 0) {
      throw new Error(`Shopify line item #${idx + 1} (${title}) quantity must be greater than 0`);
    }
    if (unitPrice < 0) {
      throw new Error(`Shopify line item #${idx + 1} (${title}) price cannot be negative`);
    }

    return {
      sku,
      title,
      quantity,
      unitPrice,
      subtotal: parseFloat((quantity * unitPrice).toFixed(2)),
      productId: item.product_id ? String(item.product_id) : null
    };
  });

  // Financials
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = parseFloat(payload.total_discounts || payload.discount || 0);
  const tax = parseFloat(payload.total_tax || payload.tax || 0);
  const shipping = parseFloat(payload.total_shipping_price_set?.shop_money?.amount || payload.shipping_lines?.[0]?.price || payload.shipping || 0);
  const calculatedTotal = parseFloat((subtotal - discount + tax + shipping).toFixed(2));
  const total = parseFloat(payload.total_price || payload.total || calculatedTotal);

  // Status mapping
  let status = 'pending';
  const rawStatus = (payload.financial_status || payload.fulfillment_status || payload.status || '').toLowerCase();
  if (rawStatus.includes('paid') || rawStatus.includes('fulfilled') || rawStatus === 'completed') {
    status = payload.fulfillment_status === 'fulfilled' ? 'completed' : 'processing';
  } else if (rawStatus.includes('cancel')) {
    status = 'cancelled';
  } else if (rawStatus.includes('refund')) {
    status = 'refunded';
  }

  let paymentStatus = 'paid';
  if (rawStatus.includes('refund')) paymentStatus = 'refunded';
  else if (rawStatus.includes('pending')) paymentStatus = 'pending';
  else if (rawStatus.includes('fail') || rawStatus.includes('void')) paymentStatus = 'failed';

  // Addresses
  const shippingAddress = payload.shipping_address ? {
    address1: payload.shipping_address.address1 || '',
    address2: payload.shipping_address.address2 || '',
    city: payload.shipping_address.city || '',
    state: payload.shipping_address.province || payload.shipping_address.state || '',
    postalCode: payload.shipping_address.zip || payload.shipping_address.postalCode || '',
    country: payload.shipping_address.country || 'United States'
  } : null;

  const billingAddress = payload.billing_address ? {
    address1: payload.billing_address.address1 || '',
    address2: payload.billing_address.address2 || '',
    city: payload.billing_address.city || '',
    state: payload.billing_address.province || payload.billing_address.state || '',
    postalCode: payload.billing_address.zip || payload.billing_address.postalCode || '',
    country: payload.billing_address.country || 'United States'
  } : shippingAddress;

  const orderNumber = payload.name || payload.order_number ? `#SH-${payload.order_number || payload.name.replace('#', '')}` : `#SH-${externalOrderId}`;

  return {
    source: 'shopify',
    externalOrderId,
    orderNumber,
    customer: {
      email,
      firstName,
      lastName,
      phone
    },
    items,
    financials: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount,
      tax,
      shipping,
      total,
      currency: payload.currency || 'USD'
    },
    status,
    paymentStatus,
    shippingAddress,
    billingAddress,
    notes: payload.note || 'Ingested via Shopify Webhook',
    rawPayload: payload,
    createdAt: payload.created_at || new Date().toISOString()
  };
}

/**
 * Parses and normalizes WooCommerce Webhook / API Payload
 */
function normalizeWooCommerceOrder(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid WooCommerce payload: payload must be a non-empty object');
  }

  const externalOrderId = String(payload.id || payload.order_id || payload.external_order_id || '').trim();
  if (!externalOrderId) {
    throw new Error('WooCommerce order validation failed: Missing external order identifier (id / external_order_id)');
  }

  // Extract Customer
  const billing = payload.billing || {};
  const email = sanitizeEmail(payload.email || billing.email);
  if (!email || !isValidEmail(email)) {
    throw new Error(`WooCommerce order validation failed: Invalid or missing customer email (${email || 'empty'})`);
  }

  const firstName = (billing.first_name || payload.customer?.first_name || '').trim();
  const lastName = (billing.last_name || payload.customer?.last_name || '').trim();
  const phone = (billing.phone || payload.phone || '').trim();

  // Extract Line Items
  const rawItems = payload.line_items || payload.items || [];
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('WooCommerce order validation failed: Order must contain at least 1 line item');
  }

  const items = rawItems.map((item, idx) => {
    const sku = (item.sku || `WC-ITEM-${item.id || idx + 1}`).trim();
    const title = (item.name || item.title || 'Untitled Product').trim();
    const quantity = parseInt(item.quantity, 10) || 1;
    const unitPrice = parseFloat(item.price || item.unit_price || (item.total ? (parseFloat(item.total) / quantity) : 0)) || 0;

    if (quantity <= 0) {
      throw new Error(`WooCommerce line item #${idx + 1} (${title}) quantity must be greater than 0`);
    }
    if (unitPrice < 0) {
      throw new Error(`WooCommerce line item #${idx + 1} (${title}) price cannot be negative`);
    }

    return {
      sku,
      title,
      quantity,
      unitPrice,
      subtotal: parseFloat((quantity * unitPrice).toFixed(2)),
      productId: item.product_id ? String(item.product_id) : null
    };
  });

  // Financials
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const discount = parseFloat(payload.discount_total || payload.discount || 0);
  const tax = parseFloat(payload.total_tax || payload.tax || 0);
  const shipping = parseFloat(payload.shipping_total || payload.shipping || 0);
  const total = parseFloat(payload.total || (subtotal - discount + tax + shipping).toFixed(2));

  // Status mapping
  let status = 'pending';
  const rawStatus = (payload.status || '').toLowerCase();
  if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'processing') status = 'processing';
  else if (rawStatus === 'cancelled' || rawStatus === 'failed') status = 'cancelled';
  else if (rawStatus === 'refunded') status = 'refunded';
  else if (rawStatus === 'on-hold' || rawStatus === 'pending') status = 'pending';

  let paymentStatus = 'paid';
  if (status === 'cancelled' || rawStatus === 'failed') paymentStatus = 'failed';
  else if (status === 'refunded') paymentStatus = 'refunded';
  else if (status === 'pending') paymentStatus = 'pending';

  // Addresses
  const shippingSource = payload.shipping || {};
  const shippingAddress = {
    address1: shippingSource.address_1 || billing.address_1 || '',
    address2: shippingSource.address_2 || billing.address_2 || '',
    city: shippingSource.city || billing.city || '',
    state: shippingSource.state || billing.state || '',
    postalCode: shippingSource.postcode || billing.postcode || '',
    country: shippingSource.country || billing.country || 'United States'
  };

  const billingAddress = {
    address1: billing.address_1 || shippingAddress.address1,
    address2: billing.address_2 || shippingAddress.address2,
    city: billing.city || shippingAddress.city,
    state: billing.state || shippingAddress.state,
    postalCode: billing.postcode || shippingAddress.postalCode,
    country: billing.country || shippingAddress.country
  };

  const orderNumber = `#WC-${payload.number || externalOrderId}`;

  return {
    source: 'woocommerce',
    externalOrderId,
    orderNumber,
    customer: {
      email,
      firstName,
      lastName,
      phone
    },
    items,
    financials: {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount,
      tax,
      shipping,
      total,
      currency: payload.currency || 'USD'
    },
    status,
    paymentStatus,
    shippingAddress,
    billingAddress,
    notes: payload.customer_note || 'Ingested via WooCommerce Webhook',
    rawPayload: payload,
    createdAt: payload.date_created || payload.date_created_gmt || new Date().toISOString()
  };
}

module.exports = {
  isValidEmail,
  normalizeShopifyOrder,
  normalizeWooCommerceOrder
};
