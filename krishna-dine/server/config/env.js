'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const isProd = process.env.NODE_ENV === 'production';

function list(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || (isProd ? '' : 'mongodb://127.0.0.1:27017/krishna_dine'),
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-insecure-secret-change-me-0123456789'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  // Comma separated list of browser origins allowed to call the API (the client app).
  corsOrigins: list(process.env.CORS_ORIGINS || process.env.CLIENT_URL || (isProd ? '' : 'http://localhost:5173')),
  // Public base URL of the customer app. QR codes point to `${publicMenuUrl}/menu/<token>`.
  publicMenuUrl: (process.env.PUBLIC_MENU_URL || process.env.CLIENT_URL || (isProd ? '' : 'http://localhost:5173')).replace(/\/+$/, ''),
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY : (isProd ? 1 : 0),
  forcePasswordChange: process.env.FORCE_PASSWORD_CHANGE !== 'false',
  uploadMaxBytes: Number(process.env.UPLOAD_MAX_BYTES) || 2 * 1024 * 1024,
  timezoneOffsetMinutes: Number(process.env.TZ_OFFSET_MINUTES ?? 330), // IST = UTC+05:30
  paymentGateway: process.env.PAYMENT_GATEWAY || 'none',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  rateLimitDisabled: process.env.RATE_LIMIT_DISABLED === 'true' && !isProd,
};

function assertEnv() {
  const problems = [];
  if (!env.mongoUri) problems.push('MONGODB_URI is required');
  if (!env.jwtSecret) problems.push('JWT_SECRET is required');
  if (isProd) {
    if (env.jwtSecret.length < 32 || /change[-_ ]?me/i.test(env.jwtSecret)) {
      problems.push('JWT_SECRET must be a random string of at least 32 characters in production');
    }
    if (!env.corsOrigins.length) problems.push('CORS_ORIGINS (or CLIENT_URL) is required in production');
    if (!env.publicMenuUrl) problems.push('PUBLIC_MENU_URL (or CLIENT_URL) is required in production');
    if (/localhost|127\.0\.0\.1/.test(env.publicMenuUrl)) problems.push('PUBLIC_MENU_URL must not point to localhost in production');
  }
  if (problems.length) {
    const err = new Error(`Invalid configuration:\n - ${problems.join('\n - ')}`);
    err.code = 'CONFIG';
    throw err;
  }
}

module.exports = { env, assertEnv };
