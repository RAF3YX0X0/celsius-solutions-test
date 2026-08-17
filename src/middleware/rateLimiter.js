const config = require('../config');

/**
 * Sliding Window In-Memory Rate Limiter Middleware
 */

const requestLog = new Map();

function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
  const now = Date.now();
  const windowMs = config.rateLimitWindowMs;
  const maxRequests = config.rateLimitMaxRequests;

  if (!requestLog.has(ip)) {
    requestLog.set(ip, []);
  }

  const timestamps = requestLog.get(ip);
  // Filter out timestamps outside the sliding window
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);

  if (recentTimestamps.length >= maxRequests) {
    const oldest = recentTimestamps[0];
    const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
    res.setHeader('Retry-After', retryAfterSec);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Maximum ${maxRequests} requests per minute allowed. Try again in ${retryAfterSec}s.`,
      retryAfterSeconds: retryAfterSec
    });
  }

  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', maxRequests - recentTimestamps.length);

  next();
}

module.exports = rateLimiter;
