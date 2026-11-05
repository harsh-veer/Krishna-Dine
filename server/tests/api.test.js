'use strict';
/**
 * Integration tests: run against a real MongoDB (MONGODB_URI_TEST, default local) with a live HTTP + Socket.IO server.
 *   npm test
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/krishna_dine_test';
process.env.FORCE_PASSWORD_CHANGE = 'true';
process.env.RATE_LIMIT_DISABLED = 'true';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { io: ioClient } = require('socket.io-client');
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const { createApp } = require('../app');
const { initSocket } = require('../sockets');
const { seed, ACCOUNTS } = require('../seed/seed');
const { Order } = require('../models');

let server;
let base;
let adminToken;
let kitchenToken;
const sockets = [];

async function api(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${base}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = res.headers.get('content-type') || '';
  const data = type.includes('json') ? await res.json() : await res.arrayBuffer();
  return { status: res.status, data, headers: res.headers };
}

function connect(auth) {
  return new Promise((resolve, reject) => {
    const s = ioClient(base, { auth, transports: ['websocket'], forceNew: true });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

const waitFor = (socket, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (p) => { clearTimeout(t); resolve(p); });
  });

async function loginAndChange(acc) {
  const r = await api('POST', '/auth/login', { body: { email: acc.email, password: acc.password } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.data.mustChangePassword, true);
  const blocked = await api('GET', '/orders', { token: r.data.data.token });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.error.code, 'PASSWORD_CHANGE_REQUIRED');
  const c = await api('POST', '/auth/change-password', { token: r.data.data.token, body: { currentPassword: acc.password, newPassword: `${acc.password}x9` } });
  assert.equal(c.status, 200, JSON.stringify(c.data));
  return c.data.data.token;
}

before(async () => {
  await connectDB();
  await mongoose.connection.db.dropDatabase();
  await Promise.all(Object.values(mongoose.models).map((m) => m.createIndexes()));
  await seed({ log: () => {} });
  server = http.createServer(createApp());
  initSocket(server);
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
  adminToken = await loginAndChange(ACCOUNTS[0]);
  kitchenToken = await loginAndChange(ACCOUNTS[1]);
});

after(async () => {
  sockets.forEach((s) => s.close());
  await new Promise((r) => server.close(r));
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('auth: rejects bad credentials and unauthenticated admin access', async () => {
  assert.equal((await api('POST', '/auth/login', { body: { email: ACCOUNTS[0].email, password: 'wrong' } })).status, 401);
  assert.equal((await api('GET', '/tables')).status, 401);
  assert.equal((await api('GET', '/reports/daily')).status, 401);
  assert.equal((await api('GET', '/auth/me', { token: 'garbage' })).status, 401);
  // Old token was revoked by the password change.
  const me = await api('GET', '/auth/me', { token: adminToken });
  assert.equal(me.data.data.user.role, 'admin');
});

test('rbac: kitchen staff cannot use admin-only APIs', async () => {
  for (const [m, p] of [['GET', '/reports/daily'], ['POST', '/tables'], ['GET', '/users'], ['PUT', '/settings'], ['POST', '/menu'], ['GET', '/tables/qr/bulk']]) {
    const r = await api(m, p, { token: kitchenToken, body: m === 'GET' ? undefined : {} });
    assert.equal(r.status, 403, `${m} ${p} should be forbidden for kitchen`);
  }
  assert.equal((await api('GET', '/orders', { token: kitchenToken })).status, 200);
});

test('nosql injection payloads are rejected', async () => {
  const r = await api('POST', '/auth/login', { body: { email: { $gt: '' }, password: { $gt: '' } } });
  assert.equal(r.status, 400);
  const t = await api('GET', '/public/tables/%7B%22%24gt%22%3A%22%22%7D');
  assert.equal(t.status, 404);
});

test('full acceptance workflow over HTTP + Socket.IO', async () => {
  // Admin creates Table 01 (seed already has 01, so use a fresh number), generates its QR.
  const created = await api('POST', '/tables', { token: adminToken, body: { tableNumber: 'A1', seats: 4 } });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const table = created.data.data;
  assert.match(table.uniqueQrToken, /^[A-Za-z0-9_-]{24}$/);
  assert.ok(table.qrCodeUrl.endsWith(`/menu/${table.uniqueQrToken}`));
  const dup = await api('POST', '/tables', { token: adminToken, body: { tableNumber: 'a1' } });
  assert.equal(dup.status, 409);

  const qr = await api('GET', `/tables/${table.id}/qr?format=png`, { token: adminToken });
  assert.equal(qr.status, 200);
  assert.equal(qr.headers.get('content-type'), 'image/png');
  const zip = await api('GET', '/tables/qr/bulk.zip', { token: adminToken });
  assert.equal(zip.status, 200);
  assert.equal(Buffer.from(zip.data).subarray(0, 2).toString(), 'PK');

  // Customer scans the QR.
  const resolved = await api('GET', `/public/tables/${table.uniqueQrToken}`);
  assert.equal(resolved.data.data.tableNumber, 'A1');
  const menu = await api('GET', '/menu');
  assert.ok(menu.data.data.items.length >= 25);
  assert.ok(menu.data.data.categories.length >= 8);
  const [a, b] = menu.data.data.items;

  const kitchen = await connect({ token: kitchenToken });
  const newOrderP = waitFor(kitchen, 'new-order');

  // Price tampering is ignored: the server uses database prices.
  const orderBody = {
    qrToken: table.uniqueQrToken,
    customerName: 'Rahul',
    customerPhone: '9876543210',
    specialInstructions: 'Less spicy please',
    idempotencyKey: 'test-key-123456',
    items: [{ menuItemId: a.id, quantity: 2, price: 1 }, { menuItemId: b.id, quantity: 1 }],
  };
  const placed = await api('POST', '/orders', { body: orderBody });
  assert.equal(placed.status, 201, JSON.stringify(placed.data));
  const order = placed.data.data.order;
  const trackingToken = placed.data.data.trackingToken;
  assert.equal(order.subtotal, a.price * 2 + b.price);
  assert.equal(order.tableNumber, 'A1');
  assert.equal(order.customerPhone, undefined, 'public payload must not echo phone');

  const ev = await newOrderP;
  assert.equal(ev.order.id, order.id);
  assert.equal(ev.order.specialInstructions, 'Less spicy please');

  // Double submit returns the same order and emits nothing new.
  const again = await api('POST', '/orders', { body: orderBody });
  assert.equal(again.status, 200);
  assert.equal(again.data.data.order.id, order.id);
  assert.equal(await Order.countDocuments({ idempotencyKey: 'test-key-123456' }), 1);

  // Order ownership: no token / wrong token cannot read the order.
  assert.equal((await api('GET', `/orders/${order.id}`)).status, 401);
  assert.equal((await api('GET', `/orders/${order.id}`, { headers: { 'X-Order-Token': 'x'.repeat(43) } })).status, 401);
  assert.equal((await api('GET', `/orders/${order.id}`, { headers: { 'X-Order-Token': trackingToken } })).status, 200);

  // Customer socket subscribes with proof of ownership.
  const customer = await connect({});
  const bad = await customer.emitWithAck('track-order', { orderId: order.id, token: 'nope' });
  assert.equal(bad.ok, false);
  const ok = await customer.emitWithAck('track-order', { orderId: order.id, token: trackingToken });
  assert.equal(ok.ok, true);

  for (const [status, event] of [['accepted', 'order-accepted'], ['preparing', 'order-preparing'], ['ready', 'order-ready']]) {
    const custP = waitFor(customer, event);
    const r = await api('PATCH', `/orders/${order.id}/status`, { token: kitchenToken, body: { status } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    const ce = await custP;
    assert.equal(ce.order.orderStatus, status);
  }

  // Invalid transition and idempotent repeat.
  assert.equal((await api('PATCH', `/orders/${order.id}/status`, { token: kitchenToken, body: { status: 'preparing' } })).status, 409);
  const repeat = await api('PATCH', `/orders/${order.id}/status`, { token: kitchenToken, body: { status: 'ready' } });
  assert.equal(repeat.data.meta.changed, false);

  // Cannot close before paid / served.
  assert.equal((await api('POST', `/orders/${order.id}/close`, { token: adminToken })).status, 409);

  const served = await api('PATCH', `/orders/${order.id}/status`, { token: kitchenToken, body: { status: 'served' } });
  assert.equal(served.data.data.orderStatus, 'served');

  // Billing: kitchen cannot bill; admin generates the bill (no GST).
  assert.equal((await api('POST', `/orders/${order.id}/bill`, { token: kitchenToken, body: {} })).status, 403);
  const bill = await api('POST', `/orders/${order.id}/bill`, { token: adminToken, body: {} });
  assert.equal(bill.status, 200, JSON.stringify(bill.data));
  const bo = bill.data.data.order;
  assert.match(bo.invoiceNumber, /^INV\/\d{4}-\d{2}\/\d{5}$/);
  assert.equal(bo.tax, 0);
  assert.equal(bo.cgst, 0);
  assert.equal(bo.totalAmount, Math.round(bo.subtotal));

  // Card is not accepted.
  assert.equal((await api('POST', `/orders/${order.id}/payments`, { token: adminToken, body: { paymentMethod: 'card' } })).status, 400);
  // UPI is recorded by staff like cash: paid immediately, no UTR needed.
  const upi = await api('POST', `/orders/${order.id}/payments`, { token: adminToken, body: { paymentMethod: 'upi' } });
  assert.equal(upi.status, 201, JSON.stringify(upi.data));
  assert.equal(upi.data.data.payment.paymentStatus, 'paid');
  assert.equal(upi.data.data.payment.verification, 'staff');
  assert.equal(upi.data.data.bill.order.paymentStatus, 'paid');
  assert.equal((await api('POST', `/orders/${order.id}/payments`, { token: adminToken, body: { paymentMethod: 'cash' } })).status, 409);

  const closed = await api('POST', `/orders/${order.id}/close`, { token: adminToken });
  assert.equal(closed.data.data.isClosed, true);

  // Admin views orders filtered by table and status.
  const list = await api('GET', `/orders?table=${table.id}&status=served`, { token: adminToken });
  assert.equal(list.data.data.length, 1);
  assert.equal(list.data.data[0].customerPhone, '9876543210');

  const daily = await api('GET', '/reports/daily', { token: adminToken });
  assert.equal(daily.data.data.summary.totalOrders, 1);
  assert.equal(daily.data.data.summary.collected, bo.totalAmount);
  const csv = await api('GET', '/reports/monthly?format=csv', { token: adminToken });
  assert.equal(csv.status, 200);
  assert.match(Buffer.from(csv.data).toString(), /Popular menu items/);
  const dash = await api('GET', '/reports/dashboard', { token: adminToken });
  assert.equal(dash.data.data.daily.length, 7);
  assert.equal(dash.data.data.weekly.length, 8);
});

test('ordering is blocked for disabled tables, regenerated QR codes and sold-out items', async () => {
  const { data } = await api('POST', '/tables', { token: adminToken, body: { tableNumber: 'B2' } });
  const t = data.data;
  const menu = (await api('GET', '/menu')).data.data.items;
  const item = menu[3];

  const regen = await api('POST', `/tables/${t.id}/regenerate-qr`, { token: adminToken });
  assert.notEqual(regen.data.data.uniqueQrToken, t.uniqueQrToken);
  assert.equal((await api('GET', `/public/tables/${t.uniqueQrToken}`)).status, 404);

  await api('PUT', `/tables/${t.id}`, { token: adminToken, body: { isActive: false } });
  const r = await api('POST', '/orders', { body: { qrToken: regen.data.data.uniqueQrToken, customerName: 'X', items: [{ menuItemId: item.id, quantity: 1 }] } });
  assert.equal(r.status, 410);
  await api('PUT', `/tables/${t.id}`, { token: adminToken, body: { isActive: true } });

  assert.equal((await api('PATCH', `/menu/${item.id}/availability`, { token: kitchenToken, body: { isAvailable: false } })).status, 200);
  const r2 = await api('POST', '/orders', { body: { qrToken: regen.data.data.uniqueQrToken, customerName: 'X', items: [{ menuItemId: item.id, quantity: 1 }] } });
  assert.equal(r2.status, 409);
  await api('PATCH', `/menu/${item.id}/availability`, { token: kitchenToken, body: { isAvailable: true } });

  // Cancellation requires a reason and notifies.
  const placed = await api('POST', '/orders', { body: { qrToken: regen.data.data.uniqueQrToken, customerName: 'Y', items: [{ menuItemId: item.id, quantity: 1 }] } });
  assert.equal(placed.status, 201);
  const id = placed.data.data.order.id;
  assert.equal((await api('PATCH', `/orders/${id}/status`, { token: kitchenToken, body: { status: 'cancelled' } })).status, 400);
  const c = await api('PATCH', `/orders/${id}/status`, { token: kitchenToken, body: { status: 'cancelled', reason: 'Customer left' } });
  assert.equal(c.data.data.orderStatus, 'cancelled');
  assert.equal(c.data.data.cancellationReason, 'Customer left');
});

test('menu snapshot: editing a price does not change past orders', async () => {
  const tables = (await api('GET', '/tables', { token: adminToken })).data.data;
  const t = tables.find((x) => x.tableNumber === '01');
  const item = (await api('GET', '/menu')).data.data.items[5];
  const placed = await api('POST', '/orders', { body: { qrToken: t.uniqueQrToken, customerName: 'Snap', items: [{ menuItemId: item.id, quantity: 1 }] } });
  await api('PUT', `/menu/${item.id}`, { token: adminToken, body: { price: item.price + 100 } });
  const o = await api('GET', `/orders/${placed.data.data.order.id}`, { token: adminToken });
  assert.equal(o.data.data.items[0].price, item.price);
});

test('sockets: invalid staff token is refused, guests cannot receive kitchen events', async () => {
  await assert.rejects(connect({ token: 'bad.token.here' }));
  const guest = await connect({});
  let leaked = false;
  guest.on('new-order', () => { leaked = true; });
  const t = (await api('GET', '/tables', { token: adminToken })).data.data.find((x) => x.tableNumber === '02');
  const item = (await api('GET', '/menu')).data.data.items[0];
  await api('POST', '/orders', { body: { qrToken: t.uniqueQrToken, customerName: 'Z', items: [{ menuItemId: item.id, quantity: 1 }] } });
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(leaked, false);
});

test('order deletion: admin only, finished orders only, payments removed, old-order purge', async () => {
  const t = (await api('GET', '/tables', { token: adminToken })).data.data.find((x) => x.tableNumber === '03');
  const item = (await api('GET', '/menu')).data.data.items[1];
  const place = async () => (await api('POST', '/orders', { body: { qrToken: t.uniqueQrToken, customerName: 'Del', items: [{ menuItemId: item.id, quantity: 1 }] } })).data.data.order.id;
  const open = await place();
  const cancelled = await place();
  const done = await place();

  // Open orders cannot be deleted.
  assert.equal((await api('DELETE', `/orders/${open}`, { token: adminToken })).status, 409);
  // Kitchen staff cannot delete anything.
  assert.equal((await api('DELETE', `/orders/${cancelled}`, { token: kitchenToken })).status, 403);
  assert.equal((await api('POST', '/orders/bulk-delete', { token: kitchenToken, body: { ids: [cancelled] } })).status, 403);
  assert.equal((await api('DELETE', `/orders/${cancelled}`)).status, 401);

  // Cancelled orders can be deleted.
  await api('PATCH', `/orders/${cancelled}/status`, { token: kitchenToken, body: { status: 'cancelled', reason: 'test cancel' } });
  const admin = await connect({ token: adminToken });
  const evP = waitFor(admin, 'order-deleted');
  const del = await api('DELETE', `/orders/${cancelled}`, { token: adminToken });
  assert.equal(del.status, 200);
  assert.equal((await evP).id, cancelled);
  assert.equal((await api('GET', `/orders/${cancelled}`, { token: adminToken })).status, 404);

  // A paid, closed order is deleted together with its payment records.
  for (const s of ['accepted', 'preparing', 'ready', 'served']) await api('PATCH', `/orders/${done}/status`, { token: kitchenToken, body: { status: s } });
  await api('POST', `/orders/${done}/payments`, { token: adminToken, body: { paymentMethod: 'cash' } });
  await api('POST', `/orders/${done}/close`, { token: adminToken });
  const { Payment } = require('../models');
  assert.equal(await Payment.countDocuments({ order: done }), 1);
  const bulk = await api('POST', '/orders/bulk-delete', { token: adminToken, body: { ids: [done, open] } });
  assert.equal(bulk.status, 200);
  assert.equal(bulk.data.data.deleted.length, 1);
  assert.equal(bulk.data.data.skipped.length, 1);
  assert.equal(await Payment.countDocuments({ order: done }), 0);
  assert.ok(await Order.findById(open), 'open order is untouched');

  // Purge: finished orders older than N days go, recent ones stay.
  const oldId = await place();
  await api('PATCH', `/orders/${oldId}/status`, { token: adminToken, body: { status: 'cancelled', reason: 'old test' } });
  await Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(oldId) }, { $set: { createdAt: new Date(Date.now() - 40 * 86400000) } }); // createdAt is immutable through Mongoose
  const dry = await api('POST', '/orders/purge-old', { token: adminToken, body: { olderThanDays: 30, dryRun: true } });
  assert.equal(dry.data.data.matching, 1);
  const purge = await api('POST', '/orders/purge-old', { token: adminToken, body: { olderThanDays: 30 } });
  assert.equal(purge.data.data.deleted.length, 1);
  assert.equal(await Order.countDocuments({ _id: oldId }), 0);
  assert.equal((await api('POST', '/orders/purge-old', { token: adminToken, body: { olderThanDays: 0 } })).status, 400);
});

test('item options: sizes and extras are priced on the server and snapshotted', async () => {
  const t = (await api('GET', '/tables', { token: adminToken })).data.data.find((x) => x.tableNumber === '03');
  const item = (await api('GET', '/menu')).data.data.items[2];
  const upd = await api('PUT', `/menu/${item.id}`, {
    token: adminToken,
    body: { nameHi: 'पनीर', sizes: [{ label: 'Half', price: 100 }, { label: 'Full', price: 180 }], addons: [{ name: 'Extra cheese', price: 30 }] },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.data.price, 100, 'base price becomes the cheapest size');
  assert.equal(upd.data.data.nameHi, 'पनीर');

  const place = (line) => api('POST', '/orders', { body: { qrToken: t.uniqueQrToken, customerName: 'Opt', items: [{ menuItemId: item.id, quantity: 2, ...line }] } });
  assert.equal((await place({})).status, 400, 'a size is required');
  assert.equal((await place({ size: 'Jumbo' })).status, 400, 'unknown size');
  assert.equal((await place({ size: 'Full', addons: ['Gold leaf'] })).status, 400, 'unknown extra');
  const ok = await place({ size: 'Full', addons: ['Extra cheese'], notes: 'less spicy' });
  assert.equal(ok.status, 201);
  const line = ok.data.data.order.items[0];
  assert.equal(line.price, 210);
  assert.equal(line.lineTotal, 420);
  assert.match(line.name, /\(Full\) \+ Extra cheese/);
  assert.equal(line.notes, 'less spicy');

  // Same dish in two sizes stays as two lines.
  const two = await api('POST', '/orders', {
    body: { qrToken: t.uniqueQrToken, customerName: 'Opt', items: [{ menuItemId: item.id, quantity: 1, size: 'Half' }, { menuItemId: item.id, quantity: 1, size: 'Full' }] },
  });
  assert.equal(two.data.data.order.items.length, 2);
});

test('feedback: only the owner, only after served, only once', async () => {
  const t = (await api('GET', '/tables', { token: adminToken })).data.data.find((x) => x.tableNumber === '03');
  const item = (await api('GET', '/menu')).data.data.items[7];
  const placed = (await api('POST', '/orders', { body: { qrToken: t.uniqueQrToken, customerName: 'Fb', items: [{ menuItemId: item.id, quantity: 1 }] } })).data.data;
  const id = placed.order.id;
  const rate = (token, body) => api('POST', `/orders/${id}/feedback`, { body, headers: token ? { 'X-Order-Token': token } : {} });

  assert.equal((await rate(null, { rating: 5 })).status, 401);
  assert.equal((await rate(placed.trackingToken, { rating: 5 })).status, 409, 'not served yet');
  for (const status of ['accepted', 'preparing', 'ready', 'served']) await api('PATCH', `/orders/${id}/status`, { token: kitchenToken, body: { status } });
  assert.equal((await rate(placed.trackingToken, { rating: 9 })).status, 400);
  const ok = await rate(placed.trackingToken, { rating: 4, comment: 'Tasty' });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.data.feedback.rating, 4);
  assert.equal((await rate(placed.trackingToken, { rating: 1 })).status, 409, 'only once');

  const dash = await api('GET', '/reports/dashboard', { token: adminToken });
  assert.ok(dash.data.data.feedback.count >= 1);
  assert.ok(dash.data.data.feedback.recent.some((r) => r.comment === 'Tasty'));
});

test('admin can place and edit orders; kitchen cannot; paid orders are locked', async () => {
  const tables = (await api('GET', '/tables', { token: adminToken })).data.data;
  const t = tables.find((x) => x.tableNumber === '03');
  const menu = (await api('GET', '/menu')).data.data.items;
  const [a, b] = [menu[0], menu[1]];

  const body = { tableId: t.id, customerName: 'Walk-in guest', items: [{ menuItemId: a.id, quantity: 2 }, { menuItemId: b.id, quantity: 1, notes: 'no onion' }] };
  assert.equal((await api('POST', '/orders/admin', { token: kitchenToken, body })).status, 403);
  assert.equal((await api('POST', '/orders/admin', { body })).status, 401);
  const placed = await api('POST', '/orders/admin', { token: adminToken, body });
  assert.equal(placed.status, 201, JSON.stringify(placed.data));
  const id = placed.data.data.id;
  assert.equal(placed.data.data.statusHistory[0].byName.length > 0, true);
  const before = placed.data.data.subtotal;
  assert.equal(before, a.price * 2 + b.price);

  // Edit: change qty of line 0, remove line 1, add a new item.
  const c = menu[9];
  const bad = await api('PATCH', `/orders/${id}`, { token: adminToken, body: { items: [{ lineIndex: 9, quantity: 1 }] } });
  assert.equal(bad.status, 400);
  const edited = await api('PATCH', `/orders/${id}`, { token: adminToken, body: { customerName: 'Edited', items: [{ lineIndex: 0, quantity: 3 }, { menuItemId: c.id, quantity: 1 }] } });
  assert.equal(edited.status, 200, JSON.stringify(edited.data));
  assert.equal(edited.data.data.customerName, 'Edited');
  assert.equal(edited.data.data.items.length, 2);
  assert.equal(edited.data.data.subtotal, a.price * 3 + c.price);
  assert.equal(edited.data.data.statusHistory.at(-1).note, 'Order edited by staff');
  assert.equal((await api('PATCH', `/orders/${id}`, { token: kitchenToken, body: { customerName: 'X' } })).status, 403);
  assert.equal((await api('PATCH', `/orders/${id}`, { token: adminToken, body: { items: [] } })).status, 400);

  // Editing keeps the original snapshot price even if the menu price changed.
  await api('PUT', `/menu/${a.id}`, { token: adminToken, body: { price: a.price + 50 } });
  const again = await api('PATCH', `/orders/${id}`, { token: adminToken, body: { items: [{ lineIndex: 0, quantity: 1 }] } });
  assert.equal(again.data.data.items[0].price, a.price);

  // Bill, pay: locked afterwards.
  await api('POST', `/orders/${id}/bill`, { token: adminToken, body: {} });
  const billed = await api('PATCH', `/orders/${id}`, { token: adminToken, body: { items: [{ lineIndex: 0, quantity: 2 }] } });
  assert.equal(billed.status, 200, 'unpaid billed orders can still be edited and re-totalled');
  assert.equal(billed.data.data.invoiceNumber != null, true);
  await api('POST', `/orders/${id}/payments`, { token: adminToken, body: { paymentMethod: 'cash' } });
  assert.equal((await api('PATCH', `/orders/${id}`, { token: adminToken, body: { items: [{ lineIndex: 0, quantity: 5 }] } })).status, 409);
});
