const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const sseService = require('./sseService');

/**
 * Failure Handling & Dead Letter Queue (DLQ) Service
 * Captures failed webhook synchronizations, provides inspection, and supports safe retry execution.
 */

class FailureHandler {
  /**
   * Records a failed synchronization attempt in the DLQ
   */
  static logFailure({ source, externalOrderId = null, payload, errorMessage }) {
    const id = uuidv4();
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);

    const stmt = db.prepare(`
      INSERT INTO sync_failures (id, source, external_order_id, payload, error_message, status, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, datetime('now'), datetime('now'))
    `);

    stmt.run(id, source, externalOrderId, payloadStr, errorMessage);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
      VALUES (?, 'SYNC_FAILURE_LOGGED', 'SYNC_FAILURE', ?, ?, 'system', datetime('now'))
    `).run(uuidv4(), id, JSON.stringify({ source, externalOrderId, error: errorMessage }));

    // Realtime notification
    sseService.broadcast('sync_failure_logged', {
      failureId: id,
      source,
      externalOrderId,
      errorMessage,
      timestamp: new Date().toISOString()
    });

    return id;
  }

  /**
   * Retrieves paginated list of sync failures
   */
  static getFailures({ status, source, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM sync_failures WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM sync_failures WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status && status !== 'all') {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (source && source !== 'all') {
      query += ' AND source = ?';
      countQuery += ' AND source = ?';
      params.push(source);
      countParams.push(source);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const failures = db.prepare(query).all(...params);
    const total = db.prepare(countQuery).get(...countParams).total;

    return {
      data: failures.map(f => ({
        ...f,
        payloadParsed: (() => {
          try { return JSON.parse(f.payload); } catch (e) { return f.payload; }
        })()
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Retries a failed synchronization item
   */
  static async retryFailure(failureId, customPayload = null, performedBy = 'admin') {
    const failure = db.prepare('SELECT * FROM sync_failures WHERE id = ?').get(failureId);
    if (!failure) {
      throw new Error(`Sync failure #${failureId} not found.`);
    }

    const OrderService = require('./orderService'); // Lazy import to avoid circular dependency
    const { normalizeShopifyOrder, normalizeWooCommerceOrder } = require('../utils/validators');

    let payloadToProcess;
    try {
      payloadToProcess = customPayload ? (typeof customPayload === 'string' ? JSON.parse(customPayload) : customPayload) : JSON.parse(failure.payload);
    } catch (e) {
      throw new Error(`Invalid JSON payload: ${e.message}`);
    }

    // Increment retry count and update timestamp
    db.prepare(`
      UPDATE sync_failures 
      SET retry_count = retry_count + 1, last_retry_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(failureId);

    try {
      let normalizedOrder;
      if (failure.source === 'shopify') {
        normalizedOrder = normalizeShopifyOrder(payloadToProcess);
      } else if (failure.source === 'woocommerce') {
        normalizedOrder = normalizeWooCommerceOrder(payloadToProcess);
      } else {
        throw new Error(`Unsupported sync source: ${failure.source}`);
      }

      // Process order ingestion (idempotent, safe retry)
      const result = await OrderService.ingestOrder(normalizedOrder);

      // Mark failure as resolved
      db.prepare(`
        UPDATE sync_failures 
        SET status = 'resolved', resolved_order_id = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(result.order.id, failureId);

      // Audit log
      db.prepare(`
        INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
        VALUES (?, 'SYNC_FAILURE_RESOLVED', 'SYNC_FAILURE', ?, ?, ?, datetime('now'))
      `).run(uuidv4(), failureId, JSON.stringify({ resolvedOrderId: result.order.id, attempts: failure.retry_count + 1 }), performedBy);

      sseService.broadcast('sync_failure_resolved', {
        failureId,
        orderId: result.order.id,
        orderNumber: result.order.order_number,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        resolved: true,
        order: result.order,
        isExistingDuplicate: result.isExistingDuplicate
      };
    } catch (err) {
      // Update failure error message and mark as failed
      db.prepare(`
        UPDATE sync_failures 
        SET error_message = ?, status = 'failed', updated_at = datetime('now')
        WHERE id = ?
      `).run(err.message, failureId);

      sseService.broadcast('sync_failure_retry_failed', {
        failureId,
        errorMessage: err.message,
        timestamp: new Date().toISOString()
      });

      throw new Error(`Retry failed: ${err.message}`);
    }
  }

  /**
   * Dismisses or deletes a failure record
   */
  static deleteFailure(failureId) {
    return db.prepare('DELETE FROM sync_failures WHERE id = ?').run(failureId);
  }
}

module.exports = FailureHandler;
