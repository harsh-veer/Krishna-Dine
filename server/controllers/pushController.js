'use strict';
const push = require('../services/pushService');
const ApiError = require('../utils/ApiError');

exports.key = async (_req, res) => res.json({ success: true, data: { publicKey: await push.publicKey() } });

exports.subscribe = async (req, res) => {
  const sub = req.body;
  if (!sub || typeof sub.endpoint !== 'string' || !sub.keys || typeof sub.keys.p256dh !== 'string' || typeof sub.keys.auth !== 'string') {
    throw ApiError.badRequest('Invalid push subscription');
  }
  await push.subscribe(req.user, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
  res.status(201).json({ success: true, data: { subscribed: true } });
};

exports.unsubscribe = async (req, res) => {
  if (typeof req.body?.endpoint === 'string') await push.unsubscribe(req.body.endpoint);
  res.json({ success: true, data: { subscribed: false } });
};

exports.test = async (_req, res) => {
  await push.sendToStaff({ title: 'Test alert', body: 'Background alerts are working.', tag: 'test', url: '/kitchen' });
  res.json({ success: true, data: { sent: true } });
};
