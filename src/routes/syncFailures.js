const express = require('express');
const router = express.Router();
const FailureHandler = require('../services/failureHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { db } = require('../db/database');

/**
 * GET /api/sync-failures
 */
router.get('/', requireAuth, (req, res, next) => {
  try {
    const { status, source, page = 1, limit = 20 } = req.query;
    const result = FailureHandler.getFailures({
      status,
      source,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/sync-failures/:id
 */
router.get('/:id', requireAuth, (req, res) => {
  const failure = db.prepare('SELECT * FROM sync_failures WHERE id = ?').get(req.params.id);
  if (!failure) {
    return res.status(404).json({ error: 'NotFound', message: 'Sync failure record not found.' });
  }

  res.json({
    failure: {
      ...failure,
      payloadParsed: (() => {
        try { return JSON.parse(failure.payload); } catch (e) { return failure.payload; }
      })()
    }
  });
});

/**
 * POST /api/sync-failures/:id/retry (Admin Only)
 */
router.post('/:id/retry', requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { payload } = req.body;
    const result = await FailureHandler.retryFailure(req.params.id, payload, req.user.email);
    res.json(result);
  } catch (err) {
    res.status(422).json({
      error: 'RetryFailed',
      message: err.message
    });
  }
});

/**
 * DELETE /api/sync-failures/:id (Admin Only)
 */
router.delete('/:id', requireAuth, requireAdmin, (req, res, next) => {
  try {
    const result = FailureHandler.deleteFailure(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'NotFound', message: 'Sync failure record not found.' });
    }
    res.json({ message: 'Sync failure record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
