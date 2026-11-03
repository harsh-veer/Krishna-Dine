'use strict';
const crypto = require('crypto');
const { env } = require('../config/env');

// A customer receives a tracking token derived from the order id with a server-side secret.
// Only the device that placed the order knows it, so other people cannot read or follow the order.
function trackingTokenFor(orderId) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`order-tracking:${orderId}`).digest('base64url');
}

function verifyTrackingToken(orderId, token) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) return false;
  const expected = Buffer.from(trackingTokenFor(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

module.exports = { trackingTokenFor, verifyTrackingToken };
