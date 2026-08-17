/**
 * Centralized Error Handling Middleware
 * Converts errors into standard JSON responses with appropriate HTTP status codes.
 */

function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || (err.name === 'ValidationError' ? 422 : 500);

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred.',
    statusCode,
    path: req.originalUrl,
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
