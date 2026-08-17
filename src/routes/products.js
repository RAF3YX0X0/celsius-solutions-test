const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

/**
 * GET /api/products
 * High-performance indexed catalogue endpoint
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
      search,
      category,
      stockStatus,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    const result = ProductService.getProducts({
      search,
      category,
      stockStatus,
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
 * GET /api/products/:id
 */
router.get('/:id', requireAuth, (req, res, next) => {
  try {
    const product = ProductService.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'NotFound', message: `Product #${req.params.id} not found.` });
    }
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/products/:id/stock
 */
router.patch('/:id/stock', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (quantity === undefined) {
      return res.status(400).json({ error: 'BadRequest', message: 'Quantity is required.' });
    }

    const updated = ProductService.updateStock(req.params.id, quantity);
    res.json({ product: updated });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/products (Admin Only)
 */
router.post('/', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const { sku, name, description, category, price, salePrice, stockQuantity, imageUrl } = req.body;
    if (!sku || !name || price === undefined) {
      return res.status(400).json({ error: 'BadRequest', message: 'SKU, name, and price are required.' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO products (id, sku, name, description, category, price, sale_price, stock_quantity, image_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      id,
      sku.trim().toUpperCase(),
      name.trim(),
      description || '',
      category || 'General',
      parseFloat(price),
      salePrice ? parseFloat(salePrice) : null,
      parseInt(stockQuantity, 10) || 0,
      imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&auto=format&fit=crop&q=60'
    );

    const created = ProductService.getProductById(id);
    res.status(201).json({ product: created });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed: products.sku')) {
      return res.status(409).json({ error: 'Conflict', message: `Product with SKU '${req.body.sku}' already exists.` });
    }
    next(err);
  }
});

module.exports = router;
