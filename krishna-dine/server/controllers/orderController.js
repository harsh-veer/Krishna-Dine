'use strict';
const { Order, Table } = require('../models');
const ApiError = require('../utils/ApiError');
const orderService = require('../services/orderService');
const billing = require('../services/billingService');
const { toStaffOrder, toPublicOrder } = require('../services/orderSerializer');
const { verifyTrackingToken } = require('../services/trackingService');
const { dayRange, startOfLocalDay, addDays } = require('../utils/dates');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.create = async (req, res) => {
  const { order, trackingToken, replayed } = await orderService.createOrder(req.body);
  res.status(replayed ? 200 : 201).json({ success: true, data: { order: toPublicOrder(order), trackingToken, replayed } });
};

exports.list = async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.date) {
    const { start, end } = dayRange(q.date);
    filter.createdAt = { $gte: start, $lt: end };
  } else if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = startOfLocalDay(q.from);
    if (q.to) filter.createdAt.$lt = addDays(startOfLocalDay(q.to), 1);
  }
  if (q.table) filter.table = q.table;
  if (q.status) {
    const statuses = q.status.split(',').map((s) => s.trim()).filter((s) => ['pending', 'accepted', 'preparing', 'ready', 'served', 'cancelled'].includes(s));
    if (statuses.length) filter.orderStatus = { $in: statuses };
  }
  if (q.paymentStatus) filter.paymentStatus = q.paymentStatus;
  if (q.closed !== undefined) filter.isClosed = q.closed;
  if (q.active) {
    // Kitchen board: everything not closed, plus recently finished orders for the Completed tab.
    const since = addDays(new Date(), -1);
    filter.$or = [{ isClosed: false, orderStatus: { $nin: ['served', 'cancelled'] } }, { updatedAt: { $gte: since } }];
  }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    const or = [{ orderNumber: rx }, { customerName: rx }, { customerPhone: rx }, { tableNumber: rx }];
    filter.$and = [...(filter.$and || []), { $or: or }];
  }

  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, data: items.map(toStaffOrder), meta: { page: q.page, limit: q.limit, total, pages: Math.ceil(total / q.limit) } });
};

/** Staff see the full order; customers must present the tracking token from checkout. */
exports.get = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (req.user) {
    if (!order) throw ApiError.notFound('Order not found');
    return res.json({ success: true, data: toStaffOrder(order) });
  }
  const token = req.get('x-order-token') || req.query.token;
  if (!token || !verifyTrackingToken(req.params.id, token)) throw ApiError.unauthorized('You can only view your own orders');
  if (!order) throw ApiError.notFound('Order not found');
  res.set('Cache-Control', 'no-store');
  return res.json({ success: true, data: toPublicOrder(order) });
};

/** Customer rates the meal once the order is served. Needs the tracking token from checkout. */
exports.feedback = async (req, res) => {
  const token = req.get('x-order-token') || req.query.token;
  if (!token || !verifyTrackingToken(req.params.id, token)) throw ApiError.unauthorized('You can only rate your own orders');
  const order = await Order.findOneAndUpdate(
    { _id: req.params.id, orderStatus: 'served', 'feedback.rating': { $exists: false } },
    { $set: { feedback: { rating: req.body.rating, comment: req.body.comment || '', at: new Date() } } },
    { new: true }
  );
  if (!order) {
    const existing = await Order.findById(req.params.id).select('orderStatus feedback');
    if (!existing) throw ApiError.notFound('Order not found');
    if (existing.feedback && existing.feedback.rating) throw ApiError.conflict('Thank you, feedback was already received for this order');
    throw ApiError.conflict('You can rate the order once it has been served');
  }
  res.json({ success: true, data: toPublicOrder(order) });
};

exports.updateStatus = async (req, res) => {
  const { order, changed } = await orderService.updateStatus(req.params.id, req.body, req.user);
  res.json({ success: true, data: toStaffOrder(order), meta: { changed } });
};

exports.byTable = async (req, res) => {
  const table = await Table.findById(req.params.tableId);
  if (!table) throw ApiError.notFound('Table not found');
  const filter = { table: table._id };
  if (!req.query.includeClosed) filter.isClosed = false;
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data: orders.map(toStaffOrder) });
};

exports.getBill = async (req, res) => {
  res.json({ success: true, data: await billing.getBill(req.params.id) });
};

exports.generateBill = async (req, res) => {
  res.json({ success: true, data: await billing.generateBill(req.params.id, req.body) });
};

exports.recordPayment = async (req, res) => {
  res.status(201).json({ success: true, data: await billing.recordPayment(req.params.id, req.body, req.user) });
};

exports.close = async (req, res) => {
  const { order, changed } = await billing.closeOrder(req.params.id, req.user);
  res.json({ success: true, data: toStaffOrder(order), meta: { changed } });
};

/** Admin only: permanently delete finished (closed or cancelled) orders. */
exports.bulkDelete = async (req, res) => {
  const result = await orderService.deleteOrders(req.body.ids);
  res.json({ success: true, data: result });
};

exports.remove = async (req, res) => {
  const result = await orderService.deleteOrders([req.params.id]);
  if (!result.deleted.length) {
    const reason = result.skipped[0]?.reason || 'Order could not be deleted';
    throw reason === 'Order not found' ? ApiError.notFound(reason) : ApiError.conflict(reason);
  }
  res.json({ success: true, data: result });
};

/** Admin only: delete every closed or cancelled order older than N days (dryRun just counts them). */
exports.purgeOld = async (req, res) => {
  const cutoff = new Date(Date.now() - req.body.olderThanDays * 24 * 60 * 60 * 1000);
  const filter = { createdAt: { $lt: cutoff }, $or: [{ isClosed: true }, { orderStatus: 'cancelled' }] };
  if (req.body.dryRun) return res.json({ success: true, data: { matching: await Order.countDocuments(filter), cutoff } });
  const ids = (await Order.find(filter).select('_id').limit(5000)).map((o) => String(o._id));
  const result = ids.length ? await orderService.deleteOrders(ids) : { deleted: [], skipped: [] };
  return res.json({ success: true, data: { ...result, cutoff } });
};
