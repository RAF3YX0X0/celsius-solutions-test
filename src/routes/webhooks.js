const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const FailureHandler = require('../services/failureHandler');
const WebhookSecurity = require('../services/webhookSecurity');
const { normalizeShopifyOrder, normalizeWooCommerceOrder } = require('../utils/validators');
const sseService = require('../services/sseService');

/**
 * POST /api/webhooks/shopify
 * Webhook receiver for Shopify store
 */
router.post('/shopify', async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signatureHeader = req.headers['x-shopify-hmac-sha256'];
  const eventId = req.headers['x-shopify-webhook-id'] || req.headers['x-event-id'];
  const isTestMode = req.headers['x-crm-test-mode'] === 'true' || req.query.test_mode === 'true';

  // Broadcast Webhook Received event for live console / visualizer
  sseService.broadcast('webhook_received', {
    source: 'shopify',
    topic: req.headers['x-shopify-topic'] || 'orders/create',
    signaturePresent: !!signatureHeader,
    eventId,
    payloadSummary: req.body ? { id: req.body.id, email: req.body.email || req.body.customer?.email } : 'Empty',
    timestamp: new Date().toISOString()
  });

  // 1. Signature Verification (unless explicitly bypassed in test simulator mode without HMAC)
  if (signatureHeader && !isTestMode) {
    const isValid = WebhookSecurity.verifyShopifySignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn('[Webhook] Shopify HMAC signature verification failed.');
      FailureHandler.logFailure({
        source: 'shopify',
        externalOrderId: req.body?.id ? String(req.body.id) : 'unknown',
        payload: req.body,
        errorMessage: 'Security Error: Invalid X-Shopify-Hmac-Sha256 signature.'
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid HMAC signature. Request rejected.'
      });
    }
  }

  // 2. Replay Protection Check
  if (eventId && !WebhookSecurity.checkAndRecordEvent(eventId, 'shopify')) {
    console.warn(`[Webhook] Replay attack detected for Shopify event ID: ${eventId}`);
    return res.status(200).json({
      message: 'Event already processed (Replay protection active).',
      eventId
    });
  }

  // 3. Normalize and Ingest Order
  try {
    const normalized = normalizeShopifyOrder(req.body);
    const result = await OrderService.ingestOrder(normalized);
    const statusCode = result.isExistingDuplicate ? 200 : 201;

    return res.status(statusCode).json({
      success: true,
      message: result.message,
      crmOrderId: result.order.id,
      externalOrderId: result.order.external_order_id,
      orderNumber: result.order.order_number,
      isExistingDuplicate: result.isExistingDuplicate
    });
  } catch (err) {
    console.error('[Webhook] Shopify order processing failed:', err.message);
    const failureId = FailureHandler.logFailure({
      source: 'shopify',
      externalOrderId: req.body?.id ? String(req.body.id) : null,
      payload: req.body,
      errorMessage: err.message
    });

    return res.status(422).json({
      error: 'UnprocessableEntity',
      message: err.message,
      failureId,
      deadLetterQueue: true
    });
  }
});

/**
 * POST /api/webhooks/woocommerce
 * Webhook receiver for WooCommerce store
 */
router.post('/woocommerce', async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signatureHeader = req.headers['x-wc-webhook-signature'];
  const eventId = req.headers['x-wc-webhook-id'] || req.headers['x-event-id'];
  const isTestMode = req.headers['x-crm-test-mode'] === 'true' || req.query.test_mode === 'true';

  // Broadcast Webhook Received event for live console / visualizer
  sseService.broadcast('webhook_received', {
    source: 'woocommerce',
    topic: req.headers['x-wc-webhook-topic'] || 'order.created',
    signaturePresent: !!signatureHeader,
    eventId,
    payloadSummary: req.body ? { id: req.body.id, email: req.body.email || req.body.billing?.email } : 'Empty',
    timestamp: new Date().toISOString()
  });

  // 1. Signature Verification
  if (signatureHeader && !isTestMode) {
    const isValid = WebhookSecurity.verifyWooCommerceSignature(rawBody, signatureHeader);
    if (!isValid) {
      console.warn('[Webhook] WooCommerce HMAC signature verification failed.');
      FailureHandler.logFailure({
        source: 'woocommerce',
        externalOrderId: req.body?.id ? String(req.body.id) : 'unknown',
        payload: req.body,
        errorMessage: 'Security Error: Invalid X-WC-Webhook-Signature.'
      });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid HMAC signature. Request rejected.'
      });
    }
  }

  // 2. Replay Protection Check
  if (eventId && !WebhookSecurity.checkAndRecordEvent(eventId, 'woocommerce')) {
    console.warn(`[Webhook] Replay attack detected for WooCommerce event ID: ${eventId}`);
    return res.status(200).json({
      message: 'Event already processed (Replay protection active).',
      eventId
    });
  }

  // 3. Normalize and Ingest Order
  try {
    const normalized = normalizeWooCommerceOrder(req.body);
    const result = await OrderService.ingestOrder(normalized);
    const statusCode = result.isExistingDuplicate ? 200 : 201;

    return res.status(statusCode).json({
      success: true,
      message: result.message,
      crmOrderId: result.order.id,
      externalOrderId: result.order.external_order_id,
      orderNumber: result.order.order_number,
      isExistingDuplicate: result.isExistingDuplicate
    });
  } catch (err) {
    console.error('[Webhook] WooCommerce order processing failed:', err.message);
    const failureId = FailureHandler.logFailure({
      source: 'woocommerce',
      externalOrderId: req.body?.id ? String(req.body.id) : null,
      payload: req.body,
      errorMessage: err.message
    });

    return res.status(422).json({
      error: 'UnprocessableEntity',
      message: err.message,
      failureId,
      deadLetterQueue: true
    });
  }
});

module.exports = router;
