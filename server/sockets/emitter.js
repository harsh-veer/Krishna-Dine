'use strict';
const crypto = require('crypto');
const rooms = require('./rooms');
const { toStaffOrder, toPublicOrder } = require('../services/orderSerializer');

let io = null;

function setIO(instance) { io = instance; }
function getIO() { return io; }

/**
 * Broadcasts an order event. Every payload carries a unique eventId and the order version,
 * so clients can drop duplicates and out-of-order deliveries.
 */
function emitOrderEvent(event, order, extra = {}) {
  if (!io) return;
  const eventId = crypto.randomUUID();
  const at = new Date().toISOString();
  io.to(rooms.STAFF).emit(event, { eventId, event, at, order: toStaffOrder(order), ...extra });
  io.to(rooms.order(order._id.toString())).emit(event, { eventId, event, at, order: toPublicOrder(order), ...extra });
}

function emitTableEvent(event, table) {
  if (!io) return;
  io.to(rooms.STAFF).emit(event, { eventId: crypto.randomUUID(), table });
}

function emitMenuChanged() {
  if (!io) return;
  io.emit('menu-updated', { eventId: crypto.randomUUID(), at: new Date().toISOString() });
}

module.exports = { setIO, getIO, emitOrderEvent, emitTableEvent, emitMenuChanged };
