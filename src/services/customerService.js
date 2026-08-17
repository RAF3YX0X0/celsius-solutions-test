const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const { sanitizeEmail } = require('../utils/formatters');
const sseService = require('./sseService');

/**
 * Customer Management Service
 * Provides customer deduplication by email, unified multi-store order histories, and lifetime metrics.
 */

class CustomerService {
  /**
   * Retrieves or creates a customer by email (Primary Deduplication Rule)
   */
  static findOrCreateCustomer({ email, firstName = '', lastName = '', phone = '' }) {
    const cleanEmail = sanitizeEmail(email);
    if (!cleanEmail) {
      throw new Error('Customer email is required for deduplication.');
    }

    let customer = db.prepare('SELECT * FROM customers WHERE email = ?').get(cleanEmail);

    if (!customer) {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO customers (id, email, first_name, last_name, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).run(id, cleanEmail, firstName, lastName, phone);

      customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
      sseService.broadcast('customer_created', { customer });
    } else {
      // If customer already exists, update name and phone if new info is present
      const updates = [];
      const params = [];

      if (firstName && !customer.first_name) {
        updates.push('first_name = ?');
        params.push(firstName);
      }
      if (lastName && !customer.last_name) {
        updates.push('last_name = ?');
        params.push(lastName);
      }
      if (phone && !customer.phone) {
        updates.push('phone = ?');
        params.push(phone);
      }

      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        params.push(customer.id);
        db.prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer.id);
      }
    }

    return customer;
  }

  /**
   * Lists customers with search, pagination, and calculated lifetime metrics
   */
  static getCustomers({ search, page = 1, limit = 20, sortBy = 'total_spend', sortOrder = 'DESC' }) {
    const offset = (page - 1) * limit;

    let baseQuery = `
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' AND o.status != 'refunded' THEN o.total ELSE 0 END), 0) as total_spend,
        COALESCE(AVG(CASE WHEN o.status != 'cancelled' AND o.status != 'refunded' THEN o.total ELSE NULL END), 0) as average_order_value,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date,
        GROUP_CONCAT(DISTINCT o.source) as store_sources
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
    `;

    const whereClauses = [];
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(c.email) LIKE ? OR 
        LOWER(c.first_name) LIKE ? OR 
        LOWER(c.last_name) LIKE ? OR 
        LOWER(c.phone) LIKE ? OR
        LOWER(c.first_name || ' ' || c.last_name) LIKE ?
      )`);
      params.push(term, term, term, term, term);
    }

    if (whereClauses.length > 0) {
      baseQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    baseQuery += ' GROUP BY c.id ';

    // Sorting
    const validSorts = ['total_spend', 'total_orders', 'last_order_date', 'created_at', 'email', 'first_name'];
    const selectedSort = validSorts.includes(sortBy) ? sortBy : 'total_spend';
    const direction = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    baseQuery += ` ORDER BY ${selectedSort} ${direction} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const customers = db.prepare(baseQuery).all(...params);

    // Count total matching
    let countQuery = 'SELECT COUNT(*) as total FROM customers c';
    const countParams = [];
    if (whereClauses.length > 0) {
      countQuery += ' WHERE ' + whereClauses.join(' AND ');
      countParams.push(...params.slice(0, -2)); // exclude limit and offset
    }
    const total = db.prepare(countQuery).get(...countParams).total;

    return {
      data: customers.map(c => ({
        ...c,
        total_spend: parseFloat(Number(c.total_spend || 0).toFixed(2)),
        average_order_value: parseFloat(Number(c.average_order_value || 0).toFixed(2)),
        sources: c.store_sources ? c.store_sources.split(',') : []
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
   * Retrieves single customer details along with full multi-store order history
   */
  static getCustomerById(customerId) {
    const customer = db.prepare(`
      SELECT 
        c.*,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' AND o.status != 'refunded' THEN o.total ELSE 0 END), 0) as total_spend,
        COALESCE(AVG(CASE WHEN o.status != 'cancelled' AND o.status != 'refunded' THEN o.total ELSE NULL END), 0) as average_order_value,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date,
        GROUP_CONCAT(DISTINCT o.source) as store_sources
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(customerId);

    if (!customer) return null;

    // Fetch unified multi-store order history
    const orders = db.prepare(`
      SELECT 
        o.id,
        o.source,
        o.external_order_id,
        o.order_number,
        o.status,
        o.payment_status,
        o.total,
        o.currency,
        o.created_at,
        COUNT(oi.id) as items_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.customer_id = ?
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `).all(customerId);

    return {
      ...customer,
      total_spend: parseFloat(Number(customer.total_spend || 0).toFixed(2)),
      average_order_value: parseFloat(Number(customer.average_order_value || 0).toFixed(2)),
      sources: customer.store_sources ? customer.store_sources.split(',') : [],
      orders
    };
  }

  /**
   * Merges two duplicate customer profiles
   */
  static mergeCustomers(sourceCustomerId, targetCustomerId, performedBy = 'admin') {
    if (sourceCustomerId === targetCustomerId) {
      throw new Error('Cannot merge a customer into themselves.');
    }

    const source = db.prepare('SELECT * FROM customers WHERE id = ?').get(sourceCustomerId);
    const target = db.prepare('SELECT * FROM customers WHERE id = ?').get(targetCustomerId);

    if (!source || !target) {
      throw new Error('Both source and target customer accounts must exist.');
    }

    const mergeTransaction = db.transaction(() => {
      // Re-assign all orders from source to target
      db.prepare('UPDATE orders SET customer_id = ?, updated_at = datetime("now") WHERE customer_id = ?')
        .run(targetCustomerId, sourceCustomerId);

      // Delete the redundant source customer record
      db.prepare('DELETE FROM customers WHERE id = ?').run(sourceCustomerId);

      // Record audit log
      db.prepare(`
        INSERT INTO audit_logs (id, action, entity_type, entity_id, details, performed_by, created_at)
        VALUES (?, 'CUSTOMER_MERGE', 'CUSTOMER', ?, ?, ?, datetime('now'))
      `).run(
        uuidv4(),
        targetCustomerId,
        JSON.stringify({ mergedSourceCustomer: source, targetCustomer: target }),
        performedBy
      );
    });

    mergeTransaction();
    return this.getCustomerById(targetCustomerId);
  }
}

module.exports = CustomerService;
