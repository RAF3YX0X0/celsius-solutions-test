const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const CustomerService = require('./customerService');
const TwoWaySyncService = require('./twoWaySync');
const sseService = require('./sseService');
const config = require('../config');

/**
 * Order Management Service
 * Central order ingestion pipeline, idempotency guard, customer deduplication, and status synchronizer.
 */

class OrderService {
  /**
   * Ingests an order atomically with idempotency and customer deduplication
   */
  static async ingestOrder(normalizedOrder) {
    const {
      source,
      externalOrderId,
      orderNumber,
      customer: custData,
      items,
      financials,
      status = 'pending',
      paymentStatus = 'paid',
      shippingAddress,
      billingAddress,
      notes = '',
      rawPayload = {}
    } = normalizedOrder;

    // 1. Idempotency Check: (source, external_order_id)
    const existingOrder = db.prepare(
      'SELECT * FROM orders WHERE source = ? AND external_order_id = ?'
    ).get(source, externalOrderId);

    if (existingOrder) {
      console.log(`[OrderService] Idempotent match found for ${source} order #${externalOrderId}. Updating status safely.`);
      
      // Update existing order status if different
      if (existingOrder.status !== status || existingOrder.payment_status !== paymentStatus) {
        db.prepare(`
          UPDATE orders 
          SET status = ?, payment_status = ?, updated_at = datetime('now')
          WHERE id = ?
        `).run(status, paymentStatus, existingOrder.id);
      }

      return {
        order: this.getOrderById(existingOrder.id),
        isExistingDuplicate: true,
        message: 'Order already exists. Updated existing record idempotently.'
      };
    }

    // 2. Customer Deduplication: Find or create customer record
    const customer = CustomerService.findOrCreateCustomer({
      email: custData.email,
      firstName: custData.firstName,
      lastName: custData.lastName,
      phone: custData.phone
    });

    const orderId = uuidv4();
    const subtotal = financials.subtotal || 0;
    const discount = financials.discount || 0;
    const tax = financials.tax || 0;
    const shipping = financials.shipping || 0;
    const total = financials.total || (subtotal - discount + tax + shipping);
    const currency = financials.currency || 'USD';

    // 3. Execute Order Creation in an Atomic Transaction
    const insertTransaction = db.transaction(() => {
      // Insert Order
      db.prepare(`
        INSERT INTO orders (
          id, customer_id, source, external_order_id, order_number, status, payment_status,
          subtotal, discount, tax, shipping, total, currency, billing_address, shipping_address,
          notes, raw_payload, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, datetime('now'), datetime('now')
        )
      `).run(
        orderId,
        customer.id,
        source,
        externalOrderId,
        orderNumber || `#${source.toUpperCase().slice(0, 2)}-${externalOrderId}`,
        status,
        paymentStatus,
        subtotal,
        discount,
        tax,
        shipping,
        total,
        currency,
        JSON.stringify(billingAddress || {}),
        JSON.stringify(shippingAddress || {}),
        notes,
        JSON.stringify(rawPayload || {})
      );

      // Insert Order Items and Update Inventory
      const insertItemStmt = db.prepare(`
        INSERT INTO order_items (id, order_id, product_id, sku, title, quantity, unit_price, subtotal, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products 
        SET stock_quantity = MAX(0, stock_quantity - ?), updated_at = datetime('now')
        WHERE id = ?
      `);

      for (const item of items) {
        const itemId = uuidv4();
        // Lookup matching product in catalogue by SKU or ID
        let matchedProduct = null;
        if (item.productId) {
          matchedProduct = db.prepare('SELECT id, stock_quantity FROM products WHERE id = ?').get(item.productId);
        }
        if (!matchedProduct && item.sku) {
          matchedProduct = db.prepare('SELECT id, stock_quantity FROM products WHERE sku = ?').get(item.sku);
        }

        const resolvedProductId = matchedProduct ? matchedProduct.id : null;

        insertItemStmt.run(
          itemId,
          orderId,
          resolvedProductId,
          item.sku,
          item.title,
          item.quantity,
          item.unitPrice,
          item.subtotal
        );

        if (resolvedProductId) {
          updateStockStmt.run(item.quantity, resolvedProductId);
        }
      }

      // Record Audit Log
      db.prepare(`
        INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
        VALUES (?, 'ORDER_INGESTED', 'ORDER', ?, ?, 'system', datetime('now'))
      `).run(
        uuidv4(),
        orderId,
        JSON.stringify({
          source,
          externalOrderId,
          orderNumber,
          customerEmail: customer.email,
          total,
          itemsCount: items.length
        })
      );
    });

    insertTransaction();

    const createdOrder = this.getOrderById(orderId);

    // Broadcast Realtime SSE Event
    sseService.broadcast('order_created', {
      order: createdOrder,
      source,
      timestamp: new Date().toISOString()
    });

    return {
      order: createdOrder,
      isExistingDuplicate: false,
      message: 'Order ingested successfully.'
    };
  }

  /**
   * Retrieves paginated orders with comprehensive filtering and search
   */
  static getOrders({
    source,
    status,
    paymentStatus,
    search,
    startDate,
    endDate,
    customerId,
    page = 1,
    limit = 20,
    sortBy = 'created_at',
    sortOrder = 'DESC'
  }) {
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        o.*,
        c.email as customer_email,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.phone as customer_phone,
        COUNT(oi.id) as items_count,
        GROUP_CONCAT(oi.title, ' | ') as items_summary
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;

    const whereClauses = [];
    const params = [];

    if (source && source !== 'all') {
      whereClauses.push('o.source = ?');
      params.push(source.toLowerCase());
    }

    if (status && status !== 'all') {
      whereClauses.push('o.status = ?');
      params.push(status.toLowerCase());
    }

    if (paymentStatus && paymentStatus !== 'all') {
      whereClauses.push('o.payment_status = ?');
      params.push(paymentStatus.toLowerCase());
    }

    if (customerId) {
      whereClauses.push('o.customer_id = ?');
      params.push(customerId);
    }

    if (startDate) {
      whereClauses.push('date(o.created_at) >= date(?)');
      params.push(startDate);
    }

    if (endDate) {
      whereClauses.push('date(o.created_at) <= date(?)');
      params.push(endDate);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(o.id) LIKE ? OR
        LOWER(o.external_order_id) LIKE ? OR
        LOWER(o.order_number) LIKE ? OR
        LOWER(c.email) LIKE ? OR
        LOWER(c.first_name) LIKE ? OR
        LOWER(c.last_name) LIKE ? OR
        LOWER(c.phone) LIKE ? OR
        LOWER(c.first_name || ' ' || c.last_name) LIKE ? OR
        LOWER(oi.sku) LIKE ? OR
        LOWER(oi.title) LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ' GROUP BY o.id ';

    const validSortCols = ['created_at', 'total', 'status', 'source', 'order_number'];
    const sortCol = validSortCols.includes(sortBy) ? `o.${sortBy}` : 'o.created_at';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    baseQuery += ` ORDER BY ${sortCol} ${direction} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const orders = db.prepare(baseQuery).all(...params);

    // Count Total Query
    let countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    if (whereClauses.length > 0) {
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }
    const total = db.prepare(countQuery).get(...params.slice(0, -2)).total;

    return {
      data: orders.map(o => ({
        ...o,
        shipping_address: (() => { try { return JSON.parse(o.shipping_address); } catch(e){ return null; } })(),
        billing_address: (() => { try { return JSON.parse(o.billing_address); } catch(e){ return null; } })()
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
   * Retrieves single order by ID with all relations (items, customer, addresses, audit trail)
   */
  static getOrderById(orderId) {
    const order = db.prepare(`
      SELECT 
        o.*,
        c.email as customer_email,
        c.first_name as customer_first_name,
        c.last_name as customer_last_name,
        c.phone as customer_phone
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE o.id = ?
    `).get(orderId);

    if (!order) return null;

    // Fetch order items with product images if available
    const items = db.prepare(`
      SELECT 
        oi.*,
        p.image_url as product_image,
        p.category as product_category,
        p.stock_quantity as current_stock
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).all(orderId);

    // Fetch Audit Trail for this order
    const auditLogs = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE entity_type = 'ORDER' AND entity_id = ? 
      ORDER BY created_at DESC
    `).all(orderId);

    return {
      ...order,
      customer: {
        id: order.customer_id,
        email: order.customer_email,
        firstName: order.customer_first_name,
        lastName: order.customer_last_name,
        phone: order.customer_phone
      },
      items,
      shipping_address: (() => { try { return JSON.parse(order.shipping_address); } catch(e){ return null; } })(),
      billing_address: (() => { try { return JSON.parse(order.billing_address); } catch(e){ return null; } })(),
      raw_payload: (() => { try { return JSON.parse(order.raw_payload); } catch(e){ return null; } })(),
      auditLogs: auditLogs.map(a => ({
        ...a,
        details: (() => { try { return JSON.parse(a.details); } catch(e){ return a.details; } })()
      }))
    };
  }

  /**
   * Updates order status and triggers optional two-way sync
   */
  static async updateOrderStatus(orderId, newStatus, user = { email: 'admin@crm.local', role: 'admin' }) {
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status '${newStatus}'. Allowed: ${validStatuses.join(', ')}`);
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found.`);
    }

    const oldStatus = order.status;

    // Update status and payment_status if refunded/cancelled
    let paymentStatus = order.payment_status;
    if (newStatus === 'refunded') paymentStatus = 'refunded';

    db.prepare(`
      UPDATE orders 
      SET status = ?, payment_status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, paymentStatus, orderId);

    // Record audit log
    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
      VALUES (?, 'ORDER_STATUS_UPDATED', 'ORDER', ?, ?, ?, datetime('now'))
    `).run(
      uuidv4(),
      orderId,
      JSON.stringify({ oldStatus, newStatus, paymentStatus }),
      user.email
    );

    // Trigger Two-Way Sync Dispatch if enabled
    let syncResult = null;
    if (config.enableTwoWaySyncSimulation) {
      try {
        syncResult = await TwoWaySyncService.syncStatusToStore(orderId, newStatus, user.email);
      } catch (syncErr) {
        console.error('[OrderService] Two-way sync error:', syncErr.message);
      }
    }

    const updatedOrder = this.getOrderById(orderId);

    // Broadcast SSE
    sseService.broadcast('order_updated', {
      orderId,
      oldStatus,
      newStatus,
      updatedOrder,
      twoWaySync: syncResult,
      timestamp: new Date().toISOString()
    });

    return {
      order: updatedOrder,
      twoWaySync: syncResult
    };
  }

  /**
   * Deletes an order (Admin Only)
   */
  static deleteOrder(orderId, performedBy = 'admin') {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) return false;

    db.prepare('DELETE FROM orders WHERE id = ?').run(orderId);

    db.prepare(`
      INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
      VALUES (?, 'ORDER_DELETED', 'ORDER', ?, ?, ?, datetime('now'))
    `).run(uuidv4(), orderId, JSON.stringify(order), performedBy);

    sseService.broadcast('order_deleted', { orderId });
    return true;
  }
}

module.exports = OrderService;
