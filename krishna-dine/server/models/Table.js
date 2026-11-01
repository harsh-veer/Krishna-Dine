'use strict';
const mongoose = require('mongoose');
const { TABLE_STATUS } = require('../config/constants');

const tableSchema = new mongoose.Schema(
  {
    // Kept as a string so tables can be "01", "12", "T5" or "Garden-2".
    tableNumber: { type: String, required: true, trim: true, maxlength: 20 },
    label: { type: String, trim: true, maxlength: 60 },
    seats: { type: Number, min: 1, max: 50, default: 4 },
    uniqueQrToken: { type: String, required: true },
    qrCodeUrl: { type: String, required: true },
    qrVersion: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: TABLE_STATUS, default: 'available' },
  },
  { timestamps: true }
);

tableSchema.index({ tableNumber: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
tableSchema.index({ uniqueQrToken: 1 }, { unique: true });

module.exports = mongoose.models.Table || mongoose.model('Table', tableSchema);
