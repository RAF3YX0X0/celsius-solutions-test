/**
 * Request logger middleware that logs method, path, response status, and duration.
 */

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;
    const logPrefix = `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`;

    if (isError) {
      console.warn(`\x1b[33m${logPrefix}\x1b[0m`);
    } else {
      console.log(`\x1b[32m${logPrefix}\x1b[0m`);
    }
  });

  next();
}

module.exports = requestLogger;
