'use strict';
const { Table, Order } = require('../models');
const ApiError = require('../utils/ApiError');
const { newQrToken, buildMenuUrl, qrPng, qrDataUrl, serializeTable } = require('../services/qrService');
const { emitTableEvent } = require('../sockets/emitter');
const { createZip } = require('../utils/zip');
const { objectId } = require('../validators');
const { env } = require('../config/env');

const safeName = (n) => String(n).replace(/[^A-Za-z0-9_-]+/g, '-');

async function withOpenCounts(tables) {
  const counts = await Order.aggregate([
    { $match: { table: { $in: tables.map((t) => t._id) }, isClosed: false, orderStatus: { $ne: 'cancelled' } } },
    { $group: { _id: '$table', open: { $sum: 1 } } },
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.open]));
  return tables.map((t) => serializeTable(t, { openOrders: map.get(String(t._id)) || 0 }));
}

exports.list = async (_req, res) => {
  const tables = await Table.find().collation({ locale: 'en', numericOrdering: true }).sort({ tableNumber: 1 });
  res.json({ success: true, data: await withOpenCounts(tables) });
};

exports.create = async (req, res) => {
  const token = newQrToken();
  const table = await Table.create({ ...req.body, uniqueQrToken: token, qrCodeUrl: buildMenuUrl(token) });
  emitTableEvent('table-updated', serializeTable(table));
  res.status(201).json({ success: true, data: serializeTable(table, { openOrders: 0 }) });
};

exports.update = async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw ApiError.notFound('Table not found');
  Object.assign(table, req.body);
  await table.save();
  emitTableEvent('table-updated', serializeTable(table));
  res.json({ success: true, data: (await withOpenCounts([table]))[0] });
};

exports.remove = async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw ApiError.notFound('Table not found');
  const open = await Order.countDocuments({ table: table._id, isClosed: false, orderStatus: { $ne: 'cancelled' } });
  if (open) throw ApiError.conflict('This table has open orders. Close them before deleting the table, or disable the table instead.');
  const history = await Order.countDocuments({ table: table._id });
  if (history) {
    // Keep the record for historical reports, but retire the QR code permanently.
    table.isActive = false;
    table.uniqueQrToken = newQrToken();
    table.qrCodeUrl = buildMenuUrl(table.uniqueQrToken);
    table.tableNumber = `${table.tableNumber}-archived-${Date.now().toString(36)}`.slice(0, 20);
    await table.save();
    emitTableEvent('table-deleted', { id: table._id.toString() });
    return res.json({ success: true, data: { id: table._id.toString(), archived: true } });
  }
  await table.deleteOne();
  emitTableEvent('table-deleted', { id: table._id.toString() });
  return res.json({ success: true, data: { id: table._id.toString(), archived: false } });
};

exports.qr = async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw ApiError.notFound('Table not found');
  const url = buildMenuUrl(table.uniqueQrToken);
  if (req.query.format === 'png') {
    const png = await qrPng(url);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    if (req.query.download) res.set('Content-Disposition', `attachment; filename="krishna-dine-table-${safeName(table.tableNumber)}.png"`);
    return res.send(png);
  }
  return res.json({ success: true, data: { ...serializeTable(table), qrDataUrl: await qrDataUrl(url) } });
};

exports.regenerateQr = async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table) throw ApiError.notFound('Table not found');
  table.uniqueQrToken = newQrToken(); // old printed QR codes stop working immediately
  table.qrCodeUrl = buildMenuUrl(table.uniqueQrToken);
  table.qrVersion += 1;
  await table.save();
  emitTableEvent('table-updated', serializeTable(table));
  res.json({ success: true, data: { ...serializeTable(table), qrDataUrl: await qrDataUrl(table.qrCodeUrl) } });
};

/** One shared QR code for every table: customers scan it, then pick their table from a list. */
exports.sharedQr = async (_req, res) => {
  const url = `${env.publicMenuUrl}/menu`;
  res.json({ success: true, data: { id: 'shared', tableNumber: 'ANY', posterLabel: 'CHOOSE YOUR TABLE', qrCodeUrl: url, isActive: true, qrDataUrl: await qrDataUrl(url) } });
};

/** JSON list of QR data URLs (for bulk printing) or a ZIP of PNGs (?format=zip). */
exports.bulkQr = async (req, res) => {
  const filter = {};
  if (req.query.ids) {
    const ids = req.query.ids.split(',').map((s) => s.trim()).filter(Boolean);
    if (!ids.every((id) => objectId.safeParse(id).success)) throw ApiError.badRequest('Invalid table ids');
    filter._id = { $in: ids };
  } else {
    filter.isActive = true;
  }
  const tables = await Table.find(filter).collation({ locale: 'en', numericOrdering: true }).sort({ tableNumber: 1 });

  if (req.path.endsWith('.zip')) {
    const files = await Promise.all(
      tables.map(async (t) => ({ name: `krishna-dine-table-${safeName(t.tableNumber)}.png`, data: await qrPng(buildMenuUrl(t.uniqueQrToken)) }))
    );
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', 'attachment; filename="krishna-dine-qr-codes.zip"');
    return res.send(createZip(files));
  }
  const data = await Promise.all(tables.map(async (t) => ({ ...serializeTable(t), qrDataUrl: await qrDataUrl(buildMenuUrl(t.uniqueQrToken)) })));
  return res.json({ success: true, data });
};
