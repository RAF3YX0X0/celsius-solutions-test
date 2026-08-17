const jwt = require('jsonwebtoken');
const config = require('../config');
const { db } = require('../db/database');

/**
 * Authentication and Role-Based Access Control (RBAC) Middleware
 */

function requireAuth(req, res, next) {
  let token = null;

  // Extract from Authorization header: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication token required. Please login.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, name, email, role, avatar_url FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User account no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token. Please re-authenticate.'
    });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Administrator privileges required for this action.'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};
