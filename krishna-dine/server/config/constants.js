'use strict';

const ROLES = Object.freeze({ ADMIN: 'admin', KITCHEN: 'kitchen' });

const ORDER_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled',
});

// Allowed forward transitions. Cancellation is handled separately.
const STATUS_FLOW = Object.freeze({
  pending: ['accepted'],
  accepted: ['preparing'],
  preparing: ['ready'],
  ready: ['served'],
  served: [],
  cancelled: [],
});

const CANCELLABLE = ['pending', 'accepted', 'preparing', 'ready'];

// Socket.IO event emitted when an order reaches a status.
const STATUS_EVENT = Object.freeze({
  pending: 'new-order',
  accepted: 'order-accepted',
  preparing: 'order-preparing',
  ready: 'order-ready',
  served: 'order-served',
  cancelled: 'order-cancelled',
});

const PAYMENT_STATUS = Object.freeze({ PENDING: 'pending', PAID: 'paid', FAILED: 'failed', REFUNDED: 'refunded' });
const PAYMENT_METHODS = Object.freeze(['cash', 'upi', 'card']);

const TABLE_STATUS = Object.freeze(['available', 'occupied', 'reserved', 'cleaning']);

module.exports = {
  ROLES,
  ORDER_STATUS,
  STATUS_FLOW,
  CANCELLABLE,
  STATUS_EVENT,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  TABLE_STATUS,
};
