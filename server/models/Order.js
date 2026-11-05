'use strict';
const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, STORED_PAYMENT_METHODS } = require('../config/constants');

// Snapshot of the menu item at the time of ordering, so bills never change when the menu does.
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true }, // unit price in INR at order time
    quantity: { type: Number, required: true, min: 1, max: 50 },
    isVegetarian: { type: Boolean, default: true },
    lineTotal: { type: Number, required: true },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(ORDER_STATUS), required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byName: String,
    note: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: { type: String, required: true }, // snapshot
    customerName: { type: String, required: true, trim: true, maxlength: 60 },
    customerPhone: { type: String, trim: true, maxlength: 15, default: '' },
    items: { type: [orderItemSchema], validate: (v) => Array.isArray(v) && v.length > 0 },
    specialInstructions: { type: String, trim: true, maxlength: 500, default: '' },

    subtotal: { type: Number, required: true },
    serviceChargeRate: { type: Number, default: 0 },
    serviceCharge: { type: Number, default: 0 },
    gstRate: { type: Number, default: 0 },
    tax: { type: Number, required: true }, // total GST (CGST + SGST)
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    orderStatus: { type: String, enum: Object.values(ORDER_STATUS), default: ORDER_STATUS.PENDING },
    statusHistory: { type: [statusEventSchema], default: [] },
    cancellationReason: { type: String, default: '' },

    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.PENDING },
    paymentMethod: { type: String, enum: [...STORED_PAYMENT_METHODS, null], default: null },
    paidAt: Date,

    // Customer feedback, left once after the order is served.
    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true, maxlength: 500, default: '' },
      at: Date,
    },

    invoiceNumber: { type: String },
    billGeneratedAt: Date,
    isClosed: { type: Boolean, default: false },
    closedAt: Date,
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Client-generated key that makes order submission idempotent.
    idempotencyKey: { type: String, select: false },
    localDate: { type: String, required: true }, // "YYYY-MM-DD" in restaurant time, for reporting
  },
  { timestamps: true, optimisticConcurrency: true }
);

orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ invoiceNumber: 1 }, { unique: true, partialFilterExpression: { invoiceNumber: { $type: 'string' } } });
orderSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ table: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ localDate: 1, orderStatus: 1 });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
