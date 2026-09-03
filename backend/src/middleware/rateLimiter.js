const { safeRedis } = require('../config/redis');

/**
 * Creates a Redis-backed rate limiter middleware
 * @param {string} prefix - Key prefix (e.g. 'ratelimit:login:')
 * @param {number} maxRequests - Max allowed requests in window
 * @param {number} windowSeconds - Window duration in seconds
 * @param {function} keyExtractor - Function extracting identifier (IP or userId)
 */
const createRateLimiter = ({
  prefix = 'ratelimit:',
  maxRequests = 10,
  windowSeconds = 60,
  keyExtractor = (req) => req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip'
}) => {
  return async (req, res, next) => {
    try {
      const identifier = keyExtractor(req);
      const redisKey = `${prefix}${identifier}`;

      // Increment count
      const currentCountStr = await safeRedis.get(redisKey);
      let count = currentCountStr ? parseInt(currentCountStr, 10) : 0;

      if (count >= maxRequests) {
        const ttl = await safeRedis.ttl(redisKey);
        res.setHeader('Retry-After', ttl > 0 ? ttl : windowSeconds);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        return res.status(429).json({
          success: false,
          message: `Too many requests. Please slow down and try again in ${ttl > 0 ? ttl : windowSeconds} seconds.`,
          retryAfter: ttl > 0 ? ttl : windowSeconds
        });
      }

      // Increment and set expiry if new
      if (count === 0) {
        await safeRedis.set(redisKey, '1', windowSeconds);
      } else {
        const ttl = await safeRedis.ttl(redisKey);
        await safeRedis.set(redisKey, String(count + 1), ttl > 0 ? ttl : windowSeconds);
      }

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - (count + 1)));

      next();
    } catch (error) {
      console.error('Rate limiter error:', error.message);
      // In case of rate limiter glitch, allow request to proceed
      next();
    }
  };
};

// 1. Login Rate Limiter: 5 attempts per minute per IP
const loginRateLimiter = createRateLimiter({
  prefix: 'ratelimit:login:',
  maxRequests: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5', 10),
  windowSeconds: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '60', 10),
  keyExtractor: (req) => req.ip || 'ip'
});

// 2. Appointment Lock Rate Limiter: 10 attempts per minute per User (or IP if unauthenticated)
const slotLockRateLimiter = createRateLimiter({
  prefix: 'ratelimit:slotlock:',
  maxRequests: parseInt(process.env.RATE_LIMIT_LOCK_MAX || '10', 10),
  windowSeconds: parseInt(process.env.RATE_LIMIT_LOCK_WINDOW || '60', 10),
  keyExtractor: (req) => (req.user && req.user.userId) ? `user_${req.user.userId}` : (req.ip || 'ip')
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  slotLockRateLimiter
};
