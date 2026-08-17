const express = require('express');
const router = express.Router();
const CustomerService = require('../services/customerService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { db } = require('../db/database');

/**
 * GET /api/customers
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20, sortBy = 'total_spend', sortOrder = 'DESC' } = req.query;
    const result = CustomerService.getCustomers({
      search,
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
 * GET /api/customers/:id
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const customer = CustomerService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'NotFound', message: `Customer #${req.params.id} not found.` });
    }
    res.json({ customer });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers
 */
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { email, firstName, lastName, phone } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'BadRequest', message: 'Customer email is required.' });
    }

    const customer = CustomerService.findOrCreateCustomer({
      email,
      firstName,
      lastName,
      phone
    });

    res.status(201).json({ customer });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/customers/:id
 */
router.put('/:id', requireAuth, async (req, res, next) => {
  try {
    const { firstName, lastName, phone, notes } = req.body;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'NotFound', message: 'Customer not found.' });
    }

    db.prepare(`
      UPDATE customers 
      SET first_name = ?, last_name = ?, phone = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      firstName !== undefined ? firstName : customer.first_name,
      lastName !== undefined ? lastName : customer.last_name,
      phone !== undefined ? phone : customer.phone,
      notes !== undefined ? notes : customer.notes,
      req.params.id
    );

    const updated = CustomerService.getCustomerById(req.params.id);
    res.json({ customer: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/customers/merge (Admin Only)
 */
router.post('/merge', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { sourceCustomerId, targetCustomerId } = req.body;
    if (!sourceCustomerId || !targetCustomerId) {
      return res.status(400).json({ error: 'BadRequest', message: 'Both sourceCustomerId and targetCustomerId are required.' });
    }

    const merged = CustomerService.mergeCustomers(sourceCustomerId, targetCustomerId, req.user.email);
    res.json({
      message: 'Customers merged successfully.',
      customer: merged
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
