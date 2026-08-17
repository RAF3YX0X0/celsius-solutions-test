const express = require('express');
const router = express.Router();
const OrderService = require('../services/orderService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { normalizeShopifyOrder, normalizeWooCommerceOrder } = require('../utils/validators');

/**
 * GET /api/orders
 * Returns paginated, filtered orders
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
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
    } = req.query;

    const result = OrderService.getOrders({
      source,
      status,
      paymentStatus,
      search,
      startDate,
      endDate,
      customerId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sortBy,
      sortOrder
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/track/lookup
 * Public Customer Order Tracking & History Lookup by Email or Order Number
 */
router.get('/track/lookup', (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email or order number query parameter is required.' });
    }

    const cleanQuery = query.trim().toLowerCase();
    const { db } = require('../db/database');

    // Search by email or order number or external order id
    const orders = db.prepare(`
      SELECT o.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE LOWER(c.email) = ? OR LOWER(o.order_number) = ? OR LOWER(o.external_order_id) = ? OR LOWER(o.id) = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `).all(cleanQuery, cleanQuery, cleanQuery, cleanQuery);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: `No orders found matching "${query}".` });
    }

    // Attach items and tracking steps
    const enrichedOrders = orders.map(ord => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
      
      const trackingSteps = [
        { label: 'Order Confirmed', completed: true, timestamp: ord.created_at, note: 'Order validated & payment captured' },
        { label: 'Cold-Chain Packed', completed: ['processing', 'shipped', 'delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.created_at, note: 'Bottled fresh & packed at 34-38°F in eco-insulated box' },
        { label: 'Out for Refrigerated Delivery', completed: ['shipped', 'delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.two_way_synced_at || ord.created_at, note: 'Dispatched via cold-chain carrier' },
        { label: 'Delivered', completed: ['delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.status === 'delivered' ? ord.updated_at : null, note: 'Delivered safely to doorstep' }
      ];

      return {
        ...ord,
        items,
        tracking: {
          currentStatus: ord.status,
          carrier: 'St. Benoit Cold-Chain Express',
          trackingCode: `STB-TRACK-${ord.id.slice(0, 8).toUpperCase()}`,
          temperature: '36.4°F (Safe & Optimal)',
          steps: trackingSteps
        }
      };
    });

    res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/:id
 * Returns single order with full customer, items, and address details
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = OrderService.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({
        error: 'NotFound',
        message: `Order #${req.params.id} not found.`
      });
    }
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/orders
 * Manual or Direct API Order Creation
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const payload = req.body;
    let normalized;

    if (payload.source === 'shopify') {
      normalized = normalizeShopifyOrder(payload);
    } else if (payload.source === 'woocommerce') {
      normalized = normalizeWooCommerceOrder(payload);
    } else {
      // Direct REST Order Format
      normalized = {
        source: payload.source || 'shopify',
        externalOrderId: payload.external_order_id || payload.externalOrderId || `manual_${Date.now()}`,
        orderNumber: payload.order_number || payload.orderNumber || `#DIR-${Date.now().toString().slice(-4)}`,
        customer: payload.customer || { email: payload.email, firstName: payload.firstName, lastName: payload.lastName },
        items: payload.items || [],
        financials: payload.financials || { subtotal: payload.subtotal, total: payload.total },
        status: payload.status || 'pending',
        paymentStatus: payload.payment_status || 'paid',
        shippingAddress: payload.shipping_address || payload.shippingAddress,
        billingAddress: payload.billing_address || payload.billingAddress,
        notes: payload.notes || 'Created via REST API',
        rawPayload: payload
      };
    }

    const result = await OrderService.ingestOrder(normalized);
    const statusCode = result.isExistingDuplicate ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/orders/:id
 * Updates order status and triggers two-way sync
 */
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'BadRequest', message: 'Status field is required.' });
    }

    const result = await OrderService.updateOrderStatus(req.params.id, status, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/orders/track/lookup
 * Public Customer Order Tracking & History Lookup by Email or Order Number
 */
router.get('/track/lookup', (req, res, next) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'BadRequest', message: 'Email or order number query parameter is required.' });
    }

    const cleanQuery = query.trim().toLowerCase();
    const { db } = require('../db/database');

    // Search by email or order number or external order id
    const orders = db.prepare(`
      SELECT o.*, c.first_name, c.last_name, c.email as customer_email, c.phone as customer_phone
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE LOWER(c.email) = ? OR LOWER(o.order_number) = ? OR LOWER(o.external_order_id) = ? OR LOWER(o.id) = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `).all(cleanQuery, cleanQuery, cleanQuery, cleanQuery);

    if (orders.length === 0) {
      return res.status(404).json({ error: 'NotFound', message: `No orders found matching "${query}".` });
    }

    // Attach items and tracking steps
    const enrichedOrders = orders.map(ord => {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(ord.id);
      
      const trackingSteps = [
        { label: 'Order Confirmed', completed: true, timestamp: ord.created_at, note: 'Order validated & payment captured' },
        { label: 'Cold-Chain Packed', completed: ['processing', 'shipped', 'delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.created_at, note: 'Bottled fresh & packed at 34-38°F in eco-insulated box' },
        { label: 'Out for Refrigerated Delivery', completed: ['shipped', 'delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.two_way_synced_at || ord.created_at, note: 'Dispatched via cold-chain carrier' },
        { label: 'Delivered', completed: ['delivered', 'completed'].includes(ord.status.toLowerCase()), timestamp: ord.status === 'delivered' ? ord.updated_at : null, note: 'Delivered safely to doorstep' }
      ];

      return {
        ...ord,
        items,
        tracking: {
          currentStatus: ord.status,
          carrier: 'St. Benoit Cold-Chain Express',
          trackingCode: `STB-TRACK-${ord.id.slice(0, 8).toUpperCase()}`,
          temperature: '36.4°F (Safe & Optimal)',
          steps: trackingSteps
        }
      };
    });

    res.json({ success: true, count: enrichedOrders.length, orders: enrichedOrders });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
