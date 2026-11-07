'use strict';
const mongoose = require('mongoose');

// Single document holding restaurant-wide configuration (billing rates, invoice header).
const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'restaurant', unique: true },
    restaurantName: { type: String, default: 'Krishna Hotel and Restaurant' },
    brandName: { type: String, default: 'Krishna Dine' },
    address: { type: String, default: 'Akbarpur, Ambedkar Nagar, Uttar Pradesh, India' },
    phone: { type: String, default: '' },
    gstin: { type: String, default: '' },
    gstRate: { type: Number, min: 0, max: 28, default: 0 },
    serviceChargeEnabled: { type: Boolean, default: false },
    serviceChargeRate: { type: Number, min: 0, max: 20, default: 0 },
    roundTotal: { type: Boolean, default: true },
    invoiceFooter: { type: String, default: 'Thank you for dining with us!' },
    upiId: { type: String, default: '' },
    vapidPublicKey: { type: String, default: '' },
    vapidPrivateKey: { type: String, default: '', select: false },
  },
  { timestamps: true }
);

settingsSchema.statics.get = async function get() {
  return this.findOneAndUpdate({ key: 'restaurant' }, { $setOnInsert: { key: 'restaurant' } }, { upsert: true, new: true });
};

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
