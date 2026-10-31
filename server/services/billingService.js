'use strict';
const { Order, Payment, Settings, Counter } = require('../models');
const ApiError = require('../utils/ApiError');
const { computeTotals } = require('./pricingService');
const { emitOrderEvent } = require('../sockets/emitter');
const { refreshTableStatus } = require('./orderService');
const { getGateway } = require('./paymentGateway');
const { toStaffOrder } = require('./orderSerializer');

function financialYear(date = new Date()) {
  // Indian financial year runs April to March.
  const ist = new Date(date.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

async function nextInvoiceNumber() {
  const fy = financialYear();
  const seq = await Counter.next(`invoice:${fy}`);
  return `INV/${fy}/${String(seq).padStart(5, '0')}`;
}

function serializePayment(p) {
  return {
    id: p._id.toString(),
    order: String(p.order),
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    transactionReference: p.transactionReference,
    paymentStatus: p.paymentStatus,
    verification: p.verification,
    gateway: p.gateway,
    recordedByName: p.recordedByName || '',
    confirmedAt: p.confirmedAt || null,
    note: p.note,
    createdAt: p.createdAt,
  };
}

async function buildBill(order) {
  const settings = await Settings.get();
  const payments = await Payment.find({ order: order._id }).sort({ createdAt: -1 });
  return {
    restaurant: {
      name: settings.restaurantName,
      brandName: settings.brandName,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      invoiceFooter: settings.invoiceFooter,
      upiId: settings.upiId,
    },
    order: toStaffOrder(order),
    payments: payments.map(serializePayment),
    gateway: getGateway().name,
  };
}

/**
 * Generates (or regenerates, while unpaid) the itemised bill using the current billing settings.
 * Item prices come from the order snapshot, never from the live menu.
 */
async function generateBill(orderId, { applyServiceCharge, gstRate } = {}) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.orderStatus === 'cancelled') throw ApiError.conflict('Cancelled orders cannot be billed');

  if (order.paymentStatus !== 'paid' && !order.isClosed) {
    const settings = await Settings.get();
    const useService = applyServiceCharge === undefined ? settings.serviceChargeEnabled : applyServiceCharge;
    const totals = computeTotals(
      order.items.map((i) => ({ menuItem: i.menuItem, name: i.name, price: i.price, quantity: i.quantity, isVegetarian: i.isVegetarian, notes: i.notes })),
      {
        gstRate: gstRate ?? settings.gstRate,
        serviceChargeRate: useService ? settings.serviceChargeRate : 0,
        roundTotal: settings.roundTotal,
      }
    );
    Object.assign(order, totals);
    if (!order.invoiceNumber) order.invoiceNumber = await nextInvoiceNumber();
    order.billGeneratedAt = new Date();
    await order.save();
    emitOrderEvent('order-updated', order, { reason: 'bill-generated' });
  }
  return buildBill(order);
}

async function getBill(orderId) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  return buildBill(order);
}

async function markOrderPaid(order, method) {
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $ne: 'paid' } },
    { $set: { paymentStatus: 'paid', paymentMethod: method, paidAt: new Date() }, $inc: { __v: 1 } },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('This order is already paid');
  emitOrderEvent('order-updated', updated, { reason: 'payment' });
  return updated;
}

/**
 * Records a payment against an order.
 *  - cash / card: staff confirm money received -> paid (verification "staff").
 *  - upi: stays pending until a gateway verifies it or staff explicitly confirm it.
 */
async function recordPayment(orderId, { paymentMethod, transactionReference = '', note = '' }, user) {
  let order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.orderStatus === 'cancelled') throw ApiError.conflict('Cancelled orders cannot be paid');
  if (order.paymentStatus === 'paid') throw ApiError.conflict('This order is already paid');

  if (!order.invoiceNumber) {
    await generateBill(orderId);
    order = await Order.findById(orderId);
  }

  // Only one open payment attempt at a time.
  await Payment.updateMany({ order: order._id, paymentStatus: 'pending' }, { $set: { paymentStatus: 'failed', note: 'Superseded by a new payment attempt' } });

  const payment = new Payment({
    order: order._id,
    amount: order.totalAmount,
    paymentMethod,
    transactionReference,
    note,
    recordedBy: user._id,
    recordedByName: user.name,
  });

  let intent = null;
  if (paymentMethod === 'upi') {
    const gateway = getGateway();
    payment.paymentStatus = 'pending';
    payment.verification = 'none';
    payment.gateway = gateway.name;
    if (gateway.configured) intent = await gateway.createIntent({ amount: order.totalAmount, receipt: order.orderNumber });
    if (intent) payment.gatewayPayload = { gatewayOrderId: intent.gatewayOrderId };
    await payment.save();
    order.paymentMethod = 'upi';
    await order.save();
    emitOrderEvent('order-updated', order, { reason: 'payment-pending' });
  } else {
    payment.paymentStatus = 'paid';
    payment.verification = 'staff';
    payment.confirmedBy = user._id;
    payment.confirmedAt = new Date();
    await payment.save();
    order = await markOrderPaid(order, paymentMethod);
  }

  return { payment: serializePayment(payment), intent, bill: await buildBill(order) };
}

/** Staff confirm a pending UPI payment after checking it in their UPI/bank app. */
async function confirmPayment(paymentId, { transactionReference, note = '' }, user) {
  const payment = await Payment.findById(paymentId).select('+gatewayPayload');
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.paymentStatus !== 'pending') throw ApiError.conflict(`Payment is already ${payment.paymentStatus}`);
  const order = await Order.findById(payment.order);
  if (!order) throw ApiError.notFound('Order not found');

  payment.paymentStatus = 'paid';
  payment.verification = 'staff';
  payment.transactionReference = transactionReference;
  payment.note = note || 'Confirmed by staff after checking UPI app (not gateway verified)';
  payment.confirmedBy = user._id;
  payment.confirmedAt = new Date();
  await payment.save();
  const updated = await markOrderPaid(order, payment.paymentMethod);
  return { payment: serializePayment(payment), bill: await buildBill(updated) };
}

/** Gateway callback: verify signature, then mark paid with verification "gateway". */
async function verifyGatewayPayment(paymentId, { paymentId: gatewayPaymentId, signature }) {
  const payment = await Payment.findById(paymentId).select('+gatewayPayload');
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.paymentStatus !== 'pending') throw ApiError.conflict(`Payment is already ${payment.paymentStatus}`);
  const gateway = getGateway();
  const result = gateway.verify({ gatewayOrderId: payment.gatewayPayload && payment.gatewayPayload.gatewayOrderId, paymentId: gatewayPaymentId, signature });
  if (!result.verified) {
    payment.paymentStatus = 'failed';
    await payment.save();
    throw ApiError.unprocessable('Payment could not be verified by the gateway');
  }
  payment.paymentStatus = 'paid';
  payment.verification = 'gateway';
  payment.transactionReference = result.transactionReference;
  payment.confirmedAt = new Date();
  await payment.save();
  const order = await Order.findById(payment.order);
  const updated = await markOrderPaid(order, payment.paymentMethod);
  return { payment: serializePayment(payment), bill: await buildBill(updated) };
}

async function failPayment(paymentId, { note = '' }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.paymentStatus !== 'pending') throw ApiError.conflict(`Payment is already ${payment.paymentStatus}`);
  payment.paymentStatus = 'failed';
  payment.note = note || 'Marked as failed by staff';
  await payment.save();
  const order = await Order.findById(payment.order);
  return { payment: serializePayment(payment), bill: await buildBill(order) };
}

/** Closes an order once it is paid and served (or cancelled), freeing the table. */
async function closeOrder(orderId, user) {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.isClosed) return { order, changed: false };
  if (order.orderStatus !== 'cancelled') {
    if (order.paymentStatus !== 'paid') throw ApiError.conflict('Record the payment before closing this order');
    if (order.orderStatus !== 'served') throw ApiError.conflict('Mark the order as served before closing it');
  }
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, isClosed: false },
    { $set: { isClosed: true, closedAt: new Date(), closedBy: user._id }, $inc: { __v: 1 } },
    { new: true }
  );
  if (!updated) return { order: await Order.findById(orderId), changed: false };
  emitOrderEvent('order-updated', updated, { reason: 'closed' });
  await refreshTableStatus(updated.table);
  return { order: updated, changed: true };
}

module.exports = { generateBill, getBill, recordPayment, confirmPayment, verifyGatewayPayment, failPayment, closeOrder, financialYear };
