'use strict';
const mongoose = require('mongoose');
const { PAYMENT_STATUS, PAYMENT_METHODS } = require('../config/constants');

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    transactionReference: { type: String, trim: true, maxlength: 100, default: '' },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    // How the payment was confirmed. "gateway" means verified by a payment provider API;
    // "staff" means a staff member confirmed receiving it (cash in hand, card terminal slip,
    // or checking the UPI app). The UI always shows which one applies.
    verification: { type: String, enum: ['none', 'staff', 'gateway'], default: 'none' },
    gateway: { type: String, default: '' },
    gatewayPayload: { type: mongoose.Schema.Types.Mixed, select: false },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedByName: String,
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date,
    note: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
