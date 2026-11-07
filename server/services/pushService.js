'use strict';
const webpush = require('web-push');
const { Settings, PushSubscription } = require('../models');

let ready = null;

/** VAPID keys are generated once and kept in the database, so no extra server setup is needed. */
async function init() {
  if (ready) return ready;
  ready = (async () => {
    let s = await Settings.findOne({ key: 'restaurant' }).select('+vapidPrivateKey');
    if (!s) s = await Settings.get().then(() => Settings.findOne({ key: 'restaurant' }).select('+vapidPrivateKey'));
    if (!s.vapidPublicKey || !s.vapidPrivateKey) {
      const keys = webpush.generateVAPIDKeys();
      await Settings.updateOne({ key: 'restaurant', $or: [{ vapidPublicKey: '' }, { vapidPrivateKey: '' }] }, { $set: { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey } });
      s = await Settings.findOne({ key: 'restaurant' }).select('+vapidPrivateKey');
    }
    webpush.setVapidDetails('mailto:admin@krishna-dine.local', s.vapidPublicKey, s.vapidPrivateKey);
    return s.vapidPublicKey;
  })().catch((err) => { ready = null; throw err; });
  return ready;
}

const publicKey = () => init();

async function subscribe(user, sub) {
  await PushSubscription.findOneAndUpdate(
    { endpoint: sub.endpoint },
    { endpoint: sub.endpoint, keys: sub.keys, user: user._id, role: user.role },
    { upsert: true, new: true }
  );
}

const unsubscribe = (endpoint) => PushSubscription.deleteOne({ endpoint });

async function sendToStaff(payload, { roles = ['admin', 'kitchen'] } = {}) {
  await init();
  const subs = await PushSubscription.find({ role: { $in: roles } });
  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 3600, urgency: 'high' });
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: s._id });
      }
    })
  );
}

/** Fire and forget: a push failure must never break order placement. */
function notifyNewOrder(order) {
  const count = order.items.reduce((n, i) => n + i.quantity, 0);
  sendToStaff({
    title: `New order · Table ${order.tableNumber}`,
    body: `${count} item${count === 1 ? '' : 's'} · ${order.customerName || 'Guest'}`,
    tag: `order-${order._id}`,
    url: '/kitchen',
  }).catch(() => {});
}

module.exports = { publicKey, subscribe, unsubscribe, sendToStaff, notifyNewOrder };
