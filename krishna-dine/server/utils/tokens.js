'use strict';
const crypto = require('crypto');

/** URL-safe random token (default 24 bytes = 192 bits of entropy). */
const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('base64url');
const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

/** Constant-time comparison of two hex digests. */
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

module.exports = { randomToken, sha256, safeEqualHex };
