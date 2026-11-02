'use strict';
const mongoose = require('mongoose');
const { Order, Table, MenuItem, Category, Settings, Counter, Payment } = require('../models');
const { STATUS_FLOW, CANCELLABLE, STATUS_EVENT, ORDER_STATUS } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { localDateKey } = require('../utils/dates');
const { computeTotals } = require('./pricingService');
const { trackingTokenFor } = require('./trackingService');
const { emitOrderEvent, emitTableEvent, emitOrderDeleted } = require('../sockets/emitter');
const { serializeTable } = require('./qrService');

async function resolveActiveTable(qrToken) {
  const table = await Table.findOne({ uniqueQrToken: String(qrToken) });
  if (!table) throw ApiError.notFound('This QR code is not valid. Please ask the staff for help.');
  if (!table.isActive) throw ApiError.gone('This table is not accepting orders right now. Please ask the staff.');
  return table;
}

async function nextOrderNumber(dateKey) {
  const seq = await Counter.next(`order:${dateKey}`);
  return `KD${dateKey.slice(2).replace(/-/g, '')}-${String(seq).padStart(3, '0')}`;
}

/** Recomputes a table's occupied/available status from its open orders. */
async function refreshTableStatus(tableId) {
  const open = await Order.countDocuments({ table: tableId, isClosed: false, orderStatus: { $ne: ORDER_STATUS.CANCELLED } });
  const table = await Table.findById(tableId);
  if (!table) return;
  let next = table.status;
  if (open > 0) next = 'occupied';
  else if (table.status === 'occupied') next = 'available';
  if (next !== table.status) {
    table.status = next;
    await table.save();
    emitTableEvent('table-updated', serializeTable(table));
  }
}

/**
 * Creates an order for the table identified by `qrToken`. Prices always come from the database.
 * `idempotencyKey` (client generated UUID) makes retries and double taps return the same order.
 */
async function createOrder(input) {
  const { qrToken, customerName, customerPhone = '', specialInstructions = '', idempotencyKey } = input;
  const table = await resolveActiveTable(qrToken);

  if (idempotencyKey) {
    const existing = await Order.findOne({ idempotencyKey }).select('+idempotencyKey');
    if (existing) {
      if (String(existing.table) !== String(table._id)) throw ApiError.conflict('Duplicate request');
      return { order: existing, trackingToken: trackingTokenFor(existing._id.toString()), replayed: true };
    }
  }

  // Merge duplicate lines of the same item (notes are concatenated).
  const merged = new Map();
  for (const line of input.items) {
    const addons = [...new Set(line.addons || [])].sort();
    const key = [String(line.menuItemId), line.size || '', addons.join('|')].join('::');
    const prev = merged.get(key);
    if (prev) {
      prev.quantity += line.quantity;
      if (line.notes) prev.notes = [prev.notes, line.notes].filter(Boolean).join('; ');
    } else merged.set(key, { menuItemId: String(line.menuItemId), size: line.size || '', addons, quantity: line.quantity, notes: line.notes || '' });
  }
  for (const line of merged.values()) {
    if (line.quantity > 50) throw ApiError.badRequest('A maximum of 50 of each item can be ordered at once');
  }

  const ids = [...new Set([...merged.values()].map((l) => l.menuItemId))];
  const menuItems = await MenuItem.find({ _id: { $in: ids }, isDeleted: false });
  const activeCats = new Set(
    (await Category.find({ _id: { $in: menuItems.map((m) => m.category) }, isActive: true }).select('_id')).map((c) => String(c._id))
  );
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const unavailable = [];
  const lines = [];
  for (const line of merged.values()) {
    const item = byId.get(line.menuItemId);
    if (!item || !item.isAvailable || !activeCats.has(String(item.category))) {
      unavailable.push({ menuItemId: line.menuItemId, name: item ? item.name : 'Unknown item' });
      continue;
    }
    // Portion size and extras are priced from the database, never from the client.
    let unit = item.price;
    let label = item.name;
    if (item.sizes && item.sizes.length) {
      const size = item.sizes.find((s) => s.label === line.size);
      if (!size) throw ApiError.badRequest(`Please choose a size for ${item.name}`);
      unit = size.price;
      label += ` (${size.label})`;
    } else if (line.size) {
      throw ApiError.badRequest(`${item.name} has no size options`);
    }
    const extras = [];
    for (const name of line.addons) {
      const addon = (item.addons || []).find((a) => a.name === name);
      if (!addon) throw ApiError.badRequest(`"${name}" is not available for ${item.name}`);
      unit += addon.price;
      extras.push(addon.name);
    }
    if (extras.length) label += ` + ${extras.join(', ')}`;
    lines.push({
      menuItem: item._id,
      name: label,
      price: Math.round(unit * 100) / 100,
      quantity: line.quantity,
      isVegetarian: item.isVegetarian,
      notes: line.notes.slice(0, 120),
    });
  }
  if (unavailable.length) {
    throw ApiError.conflict(
      `Sorry, ${unavailable.map((u) => u.name).join(', ')} ${unavailable.length > 1 ? 'are' : 'is'} no longer available`,
      { unavailable }
    );
  }

  const settings = await Settings.get();
  const totals = computeTotals(lines, {
    gstRate: settings.gstRate,
    serviceChargeRate: settings.serviceChargeEnabled ? settings.serviceChargeRate : 0,
    roundTotal: settings.roundTotal,
  });

  const now = new Date();
  const dateKey = localDateKey(now);
  const _id = new mongoose.Types.ObjectId();
  let order;
  try {
    order = await Order.create({
      _id,
      orderNumber: await nextOrderNumber(dateKey),
      table: table._id,
      tableNumber: table.tableNumber,
      customerName,
      customerPhone,
      specialInstructions,
      ...totals,
      orderStatus: ORDER_STATUS.PENDING,
      statusHistory: [{ status: ORDER_STATUS.PENDING, at: now, byName: 'Customer' }],
      idempotencyKey: idempotencyKey || undefined,
      localDate: dateKey,
    });
  } catch (err) {
    // Two identical submissions raced: return the one that won.
    if (err && err.code === 11000 && idempotencyKey && err.keyPattern && err.keyPattern.idempotencyKey) {
      const existing = await Order.findOne({ idempotencyKey });
      if (existing) return { order: existing, trackingToken: trackingTokenFor(existing._id.toString()), replayed: true };
    }
    throw err;
  }

  // Persisted first, then broadcast.
  emitOrderEvent(STATUS_EVENT.pending, order);
  refreshTableStatus(table._id).catch(() => {});
  return { order, trackingToken: trackingTokenFor(order._id.toString()), replayed: false };
}

/**
 * Moves an order to `status`. Uses a conditional atomic update so two kitchen screens
 * pressing the same button cannot double-apply a transition or emit duplicate events.
 */
async function updateStatus(orderId, { status, reason }, user) {
  const current = await Order.findById(orderId);
  if (!current) throw ApiError.notFound('Order not found');

  if (current.orderStatus === status) {
    return { order: current, changed: false }; // idempotent repeat
  }

  let filter;
  const set = { orderStatus: status };
  if (status === ORDER_STATUS.CANCELLED) {
    if (!reason || !reason.trim()) throw ApiError.badRequest('A cancellation reason is required');
    if (current.paymentStatus === 'paid') throw ApiError.conflict('This order has been paid. Refund the payment before cancelling.');
    filter = { _id: current._id, orderStatus: { $in: CANCELLABLE }, isClosed: false };
    set.cancellationReason = reason.trim();
  } else {
    const from = Object.keys(STATUS_FLOW).filter((s) => STATUS_FLOW[s].includes(status));
    if (!from.length) throw ApiError.badRequest(`Cannot move an order to ${status}`);
    filter = { _id: current._id, orderStatus: { $in: from } };
  }

  const updated = await Order.findOneAndUpdate(
    filter,
    {
      $set: set,
      $push: { statusHistory: { status, at: new Date(), by: user._id, byName: user.name, note: reason || '' } },
      $inc: { __v: 1 },
    },
    { new: true }
  );

  if (!updated) {
    const latest = await Order.findById(orderId);
    throw ApiError.conflict(`Order ${latest.orderNumber} is ${latest.orderStatus}${latest.isClosed ? ' and closed' : ''}; it cannot be changed to ${status}`, {
      currentStatus: latest.orderStatus,
    });
  }

  emitOrderEvent(STATUS_EVENT[status], updated);
  if (status === ORDER_STATUS.CANCELLED) refreshTableStatus(updated.table).catch(() => {});
  return { order: updated, changed: true };
}

/**
 * Permanently deletes finished orders (closed or cancelled) together with their payment records.
 * Orders still in progress, or served but not yet closed, are skipped so a live order or an
 * unsettled bill can never be removed by accident. Returns which ids were deleted or skipped.
 */
async function deleteOrders(ids) {
  const orders = await Order.find({ _id: { $in: ids } }).select('orderNumber orderStatus isClosed table');
  const found = new Map(orders.map((o) => [String(o._id), o]));
  const deletable = [];
  const skipped = [];
  for (const id of ids) {
    const o = found.get(String(id));
    if (!o) skipped.push({ id, reason: 'Order not found' });
    else if (o.isClosed || o.orderStatus === ORDER_STATUS.CANCELLED) deletable.push(o);
    else skipped.push({ id, orderNumber: o.orderNumber, reason: 'Still open. Close or cancel it before deleting.' });
  }
  if (deletable.length) {
    const delIds = deletable.map((o) => o._id);
    await Payment.deleteMany({ order: { $in: delIds } });
    await Order.deleteMany({ _id: { $in: delIds }, $or: [{ isClosed: true }, { orderStatus: ORDER_STATUS.CANCELLED }] });
    deletable.forEach((o) => emitOrderDeleted(o._id.toString()));
    const tables = [...new Set(deletable.map((o) => String(o.table)))];
    await Promise.all(tables.map((t) => refreshTableStatus(t).catch(() => {})));
  }
  return { deleted: deletable.map((o) => ({ id: o._id.toString(), orderNumber: o.orderNumber })), skipped };
}

module.exports = { createOrder, updateStatus, deleteOrders, resolveActiveTable, refreshTableStatus };
