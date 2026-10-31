const rateLimit = require('express-rate-limit');

// 1. Dedicated Login Rate Limiter (Brute-Force Attack Prevention)
// Specifically guards POST /api/auth/login against password guessing and credential stuffing.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute observation window
  max: process.env.NODE_ENV === 'test' ? 1000 : (process.env.NODE_ENV === 'production' ? 20 : 100),
  standardHeaders: true, // Draft-6/7 RateLimit-* headers
  legacyHeaders: false,  // Disable legacy X-RateLimit-* headers
  statusCode: 429,
  message: {
    success: false,
    error: 'Too many login attempts from this IP. Please wait 15 minutes before trying again.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

// 2. Public Registration Rate Limiter (Bot Flooding Prevention)
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    error: 'Too many registration requests from this IP. Please try again after an hour.'
  },
  skip: (req) => process.env.NODE_ENV === 'test'
});

// 3. Global API Rate Limiter (General DoS / Resource Protection)
// Protects general data endpoints from flooding.
// Explicitly skips endpoints that have their own dedicated limiters (/login, registration)
// and session restoration (/api/auth/me) so legitimate users and multi-tab browsing
// are never throttled during normal session validation or login.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : (process.env.NODE_ENV === 'production' ? 1000 : 5000),
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please try again later.'
  },
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') return true;
    const url = req.originalUrl || req.url || '';
    // Skip /login and registration routes (handled dedicatedly by loginLimiter / registrationLimiter)
    if (
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/register') ||
      url.includes('/api/auth/join-society') ||
      url.includes('/api/auth/register-society')
    ) {
      return true;
    }
    // Never block authenticated session restoration
    if (req.method === 'GET' && url.includes('/api/auth/me')) {
      return true;
    }
    return false;
  }
});

// 4. Authorized Development Rate-Limit Reset Function
// Resets rate limit stores for all limiters on given IPs in development/testing mode only.
const devResetAllLimiters = async (ip) => {
  if (process.env.NODE_ENV === 'production') return;
  const loopbackIps = [ip, '127.0.0.1', '::1', '::ffff:127.0.0.1'].filter(Boolean);
  const limiters = [loginLimiter, registrationLimiter, globalLimiter];
  for (const lim of limiters) {
    if (typeof lim.resetKey === 'function') {
      for (const targetIp of loopbackIps) {
        try {
          await lim.resetKey(targetIp);
        } catch (_) {}
      }
    }
  }
};

module.exports = {
  loginLimiter,
  registrationLimiter,
  globalLimiter,
  devResetAllLimiters
};
