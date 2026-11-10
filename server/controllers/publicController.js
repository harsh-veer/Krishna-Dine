'use strict';
const { resolveActiveTable } = require('../services/orderService');
const { Table } = require('../models');
const ApiError = require('../utils/ApiError');

/** Resolves a QR token into the table a customer is sitting at. */
exports.resolveTable = async (req, res) => {
  const table = await resolveActiveTable(req.params.token);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { id: table._id.toString(), tableNumber: table.tableNumber, label: table.label || '' } });
};

/** Tables a customer can pick from after scanning the shared QR code (active tables only, no tokens). */
exports.listTables = async (_req, res) => {
  const tables = await Table.find({ isActive: true }).collation({ locale: 'en', numericOrdering: true }).sort({ tableNumber: 1 });
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: tables.map((t) => ({ id: t._id.toString(), tableNumber: t.tableNumber, label: t.label || '' })) });
};

/** Customer picked their table: hand back that table's ordering token. */
exports.selectTable = async (req, res) => {
  const id = String(req.body && req.body.tableId);
  if (!/^[a-f0-9]{24}$/i.test(id)) throw ApiError.badRequest('Please choose a table');
  const table = await Table.findById(id);
  if (!table || !table.isActive) throw ApiError.notFound('That table is not available. Please ask the staff.');
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { token: table.uniqueQrToken } });
};
