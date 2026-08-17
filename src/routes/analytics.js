const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

/**
 * GET /api/analytics/dashboard
 * Aggregates all KPI metrics, charts, and recent activity
 */
router.get('/dashboard', requireAuth, (req, res, next) => {
  try {
    // 1. Overall Totals
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(total), 0) as revenue 
      FROM orders 
      WHERE status != 'cancelled' AND status != 'refunded'
    `).get().revenue;

    const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'").get().count;
    const processingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'processing'").get().count;
    const completedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'").get().count;
    const cancelledOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled'").get().count;
    const refundedOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'refunded'").get().count;

    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const pendingFailures = db.prepare("SELECT COUNT(*) as count FROM sync_failures WHERE status = 'pending'").get().count;

    // 2. Store Breakdown (Shopify vs WooCommerce)
    const storeStats = db.prepare(`
      SELECT 
        source,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND status != 'refunded' THEN total ELSE 0 END), 0) as revenue,
        COALESCE(AVG(CASE WHEN status != 'cancelled' AND status != 'refunded' THEN total ELSE 0 END), 0) as aov
      FROM orders
      GROUP BY source
    `).all();

    const shopifyStats = storeStats.find(s => s.source === 'shopify') || { order_count: 0, revenue: 0, aov: 0 };
    const wooStats = storeStats.find(s => s.source === 'woocommerce') || { order_count: 0, revenue: 0, aov: 0 };

    // 3. Daily Revenue Trend (Last 14 days)
    const dailyRevenue = db.prepare(`
      SELECT 
        date(created_at) as date,
        source,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE WHEN status != 'cancelled' AND status != 'refunded' THEN total ELSE 0 END), 0) as revenue
      FROM orders
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at), source
      ORDER BY date(created_at) ASC
    `).all();

    // 4. Order Status Distribution
    const statusDistribution = [
      { status: 'Completed', count: completedOrders, color: '#10b981' },
      { status: 'Processing', count: processingOrders, color: '#3b82f6' },
      { status: 'Pending', count: pendingOrders, color: '#f59e0b' },
      { status: 'Cancelled', count: cancelledOrders, color: '#ef4444' },
      { status: 'Refunded', count: refundedOrders, color: '#8b5cf6' }
    ];

    // 5. Recent Orders (Last 8)
    const recentOrders = db.prepare(`
      SELECT 
        o.id,
        o.order_number,
        o.external_order_id,
        o.source,
        o.status,
        o.payment_status,
        o.total,
        o.currency,
        o.created_at,
        c.email as customer_email,
        c.first_name || ' ' || c.last_name as customer_name,
        COUNT(oi.id) as items_count
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT 8
    `).all();

    // 6. Recent Audit / Sync Logs
    const recentLogs = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `).all();

    res.json({
      kpis: {
        totalOrders,
        totalRevenue: parseFloat(Number(totalRevenue).toFixed(2)),
        pendingOrders,
        processingOrders,
        completedOrders,
        cancelledOrders,
        refundedOrders,
        totalCustomers,
        totalProducts,
        pendingFailures,
        averageOrderValue: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0
      },
      stores: {
        shopify: {
          orderCount: shopifyStats.order_count,
          revenue: parseFloat(Number(shopifyStats.revenue).toFixed(2)),
          aov: parseFloat(Number(shopifyStats.aov).toFixed(2))
        },
        woocommerce: {
          orderCount: wooStats.order_count,
          revenue: parseFloat(Number(wooStats.revenue).toFixed(2)),
          aov: parseFloat(Number(wooStats.aov).toFixed(2))
        }
      },
      statusDistribution,
      dailyRevenue,
      recentOrders,
      recentLogs: recentLogs.map(l => ({
        ...l,
        details: (() => { try { return JSON.parse(l.details); } catch(e){ return l.details; } })()
      }))
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
