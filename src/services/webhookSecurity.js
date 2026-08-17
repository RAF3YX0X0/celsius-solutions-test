const crypto = require('crypto');
const config = require('../config');
const { db } = require('../db/database');

/**
 * Webhook Security & Cryptographic Signature Verification
 * Implements HMAC SHA-256 signature checks, nonce/replay protection, and security audits.
 */

class WebhookSecurity {
  /**
   * Verifies Shopify HMAC-SHA256 signature
   * @param {string|Buffer} rawBody - Raw unparsed HTTP request body
   * @param {string} signatureHeader - Value of 'x-shopify-hmac-sha256' header
   * @param {string} secret - Shopify Webhook Shared Secret
   * @returns {boolean}
   */
  static verifyShopifySignature(rawBody, signatureHeader, secret = config.shopifyWebhookSecret) {
    if (!signatureHeader || !rawBody) return false;
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const computedHash = hmac.update(rawBody, 'utf8').digest('base64');
      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'utf8'),
        Buffer.from(computedHash, 'utf8')
      );
    } catch (err) {
      console.error('[Security] Shopify HMAC verification error:', err.message);
      return false;
    }
  }

  /**
   * Verifies WooCommerce HMAC-SHA256 signature
   * @param {string|Buffer} rawBody - Raw unparsed HTTP request body
   * @param {string} signatureHeader - Value of 'x-wc-webhook-signature' header
   * @param {string} secret - WooCommerce Webhook Secret
   * @returns {boolean}
   */
  static verifyWooCommerceSignature(rawBody, signatureHeader, secret = config.woocommerceWebhookSecret) {
    if (!signatureHeader || !rawBody) return false;
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const computedHash = hmac.update(rawBody, 'utf8').digest('base64');
      return crypto.timingSafeEqual(
        Buffer.from(signatureHeader, 'utf8'),
        Buffer.from(computedHash, 'utf8')
      );
    } catch (err) {
      console.error('[Security] WooCommerce HMAC verification error:', err.message);
      return false;
    }
  }

  /**
   * Generates a valid HMAC SHA-256 signature for test requests
   */
  static generateSignature(rawBody, secret) {
    return crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  }

  /**
   * Checks whether a webhook event ID has been processed already (Replay Protection)
   */
  static checkAndRecordEvent(eventId, source) {
    if (!eventId) return true; // If no eventId header supplied, reliance is on unique order constraint

    const existing = db.prepare('SELECT event_id FROM webhook_events WHERE event_id = ?').get(eventId);
    if (existing) {
      return false; // Replay detected!
    }

    try {
      db.prepare('INSERT INTO webhook_events (event_id, source, processed_at) VALUES (?, ?, datetime("now"))')
        .run(eventId, source);
      return true;
    } catch (e) {
      return false;
    }
  }
}

module.exports = WebhookSecurity;
