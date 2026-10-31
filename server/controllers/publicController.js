'use strict';
const { resolveActiveTable } = require('../services/orderService');

/** Resolves a QR token into the table a customer is sitting at. */
exports.resolveTable = async (req, res) => {
  const table = await resolveActiveTable(req.params.token);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { id: table._id.toString(), tableNumber: table.tableNumber, label: table.label || '' } });
};
