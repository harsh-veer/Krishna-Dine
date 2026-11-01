'use strict';
/**
 * Payment gateway integration point.
 *
 * Krishna Dine never marks a UPI payment as successful on its own. A UPI payment is either:
 *  - verified by a gateway (verification: "gateway") once a provider is configured, or
 *  - confirmed by a staff member who checked the money arrived (verification: "staff"),
 *    and the UI labels it "confirmed by staff, not gateway verified".
 *
 * To enable automatic verification, set PAYMENT_GATEWAY=razorpay plus RAZORPAY_KEY_ID and
 * RAZORPAY_KEY_SECRET. Other providers (PhonePe, Paytm, Cashfree) can be added by implementing
 * the same three functions below.
 */
const crypto = require('crypto');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const providers = {
  none: {
    name: 'none',
    configured: false,
    async createIntent() {
      return null;
    },
    verify() {
      throw ApiError.unprocessable('No payment gateway is configured. Confirm the UPI payment manually after checking your UPI app.');
    },
  },

  razorpay: {
    name: 'razorpay',
    get configured() {
      return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
    },
    /** Creates a Razorpay order the customer/staff can pay against (amount in paise). */
    async createIntent({ amount, receipt }) {
      if (!this.configured) throw ApiError.unprocessable('Razorpay keys are not configured');
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({ amount: Math.round(amount * 100), currency: 'INR', receipt }),
      });
      if (!res.ok) throw ApiError.unprocessable('Payment gateway rejected the request');
      const data = await res.json();
      return { gatewayOrderId: data.id, keyId: env.razorpayKeyId, amount: data.amount, currency: data.currency };
    },
    /** Verifies the checkout signature returned by Razorpay. */
    verify({ gatewayOrderId, paymentId, signature }) {
      if (!this.configured) throw ApiError.unprocessable('Razorpay keys are not configured');
      const expected = crypto.createHmac('sha256', env.razorpayKeySecret).update(`${gatewayOrderId}|${paymentId}`).digest('hex');
      const ok = typeof signature === 'string' && signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
      return { verified: ok, transactionReference: paymentId };
    },
  },
};

function getGateway() {
  const g = providers[env.paymentGateway] || providers.none;
  return g.configured ? g : providers.none;
}

module.exports = { getGateway };
