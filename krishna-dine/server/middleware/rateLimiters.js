'use strict';
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

const make = (opts) =>
  rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.rateLimitDisabled,
    handler: (_req, res) =>
      res.status(429).json({ success: false, error: { message: opts.message || 'Too many requests. Please slow down.', code: 'RATE_LIMITED' } }),
    ...opts,
  });

module.exports = {
  // General API ceiling per IP.
  apiLimiter: make({ windowMs: 60 * 1000, limit: 300 }),
  // Brute-force protection for staff logins.
  loginLimiter: make({ windowMs: 15 * 60 * 1000, limit: 10, message: 'Too many login attempts. Try again in 15 minutes.', skipSuccessfulRequests: true }),
  // Customers placing orders (shared restaurant Wi-Fi means one IP may serve many tables).
  orderLimiter: make({ windowMs: 5 * 60 * 1000, limit: 30, message: 'Too many orders from this network. Please ask the staff for help.' }),
  // Public QR token lookups.
  publicLimiter: make({ windowMs: 60 * 1000, limit: 120 }),
};
