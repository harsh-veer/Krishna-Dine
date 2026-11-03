'use strict';
const QRCode = require('qrcode');
const { env } = require('../config/env');
const { randomToken } = require('../utils/tokens');

const QR_COLOR = { dark: '#0B3B2E', light: '#FFFFFF' };

const newQrToken = () => randomToken(18); // 144-bit random, 24 URL-safe chars
const buildMenuUrl = (token) => `${env.publicMenuUrl}/menu/${encodeURIComponent(token)}`;

function qrPng(url, width = 720) {
  return QRCode.toBuffer(url, { type: 'png', width, margin: 2, errorCorrectionLevel: 'M', color: QR_COLOR });
}

function qrDataUrl(url, width = 720) {
  return QRCode.toDataURL(url, { width, margin: 2, errorCorrectionLevel: 'M', color: QR_COLOR });
}

/** Shape a table for API responses; the menu URL is derived so a domain change never leaves stale QR links. */
function serializeTable(table, extra = {}) {
  const t = typeof table.toObject === 'function' ? table.toObject() : table;
  return {
    id: t._id.toString(),
    tableNumber: t.tableNumber,
    label: t.label || '',
    seats: t.seats,
    uniqueQrToken: t.uniqueQrToken,
    qrCodeUrl: buildMenuUrl(t.uniqueQrToken),
    qrVersion: t.qrVersion,
    isActive: t.isActive,
    status: t.status,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    ...extra,
  };
}

module.exports = { newQrToken, buildMenuUrl, qrPng, qrDataUrl, serializeTable };
