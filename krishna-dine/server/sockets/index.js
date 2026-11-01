'use strict';
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { env } = require('../config/env');
const { userFromToken } = require('../middleware/auth');
const { Order } = require('../models');
const { verifyTrackingToken } = require('../services/trackingService');
const { toPublicOrder } = require('../services/orderSerializer');
const rooms = require('./rooms');
const { setIO } = require('./emitter');

const MAX_ORDER_SUBSCRIPTIONS = 20;

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    maxHttpBufferSize: 1e5,
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Authentication: staff send their JWT in `auth.token`. Sockets without a valid token are guests
  // and can only subscribe to orders they can prove ownership of.
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (token) {
        const user = await userFromToken(token);
        if (!user) return next(new Error('UNAUTHORIZED'));
        if (env.forcePasswordChange && user.mustChangePassword) return next(new Error('PASSWORD_CHANGE_REQUIRED'));
        socket.data.user = { id: user._id.toString(), role: user.role, name: user.name };
      }
      socket.data.orderSubs = new Set();
      return next();
    } catch (err) {
      return next(err);
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    if (user) {
      socket.join(rooms.STAFF);
      socket.join(user.role === 'admin' ? rooms.ADMIN : rooms.KITCHEN);
    }

    // Customer: follow a specific order. Requires the secret tracking token returned at checkout.
    socket.on('track-order', async (payload, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        const orderId = payload && String(payload.orderId || '');
        const token = payload && String(payload.token || '');
        if (!mongoose.isValidObjectId(orderId) || !verifyTrackingToken(orderId, token)) {
          return reply({ ok: false, error: 'Invalid order or token' });
        }
        if (!socket.data.orderSubs.has(orderId) && socket.data.orderSubs.size >= MAX_ORDER_SUBSCRIPTIONS) {
          return reply({ ok: false, error: 'Too many subscriptions' });
        }
        const order = await Order.findById(orderId);
        if (!order) return reply({ ok: false, error: 'Order not found' });
        socket.data.orderSubs.add(orderId);
        socket.join(rooms.order(orderId));
        return reply({ ok: true, order: toPublicOrder(order) });
      } catch {
        return reply({ ok: false, error: 'Unable to track order' });
      }
    });

    socket.on('untrack-order', (payload) => {
      const orderId = payload && String(payload.orderId || '');
      if (socket.data.orderSubs.delete(orderId)) socket.leave(rooms.order(orderId));
    });
  });

  setIO(io);
  return io;
}

module.exports = { initSocket };
