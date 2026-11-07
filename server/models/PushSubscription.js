'use strict';
const mongoose = require('mongoose');

// A staff device that agreed to receive background order alerts (Web Push).
const schema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    role: { type: String, enum: ['admin', 'kitchen'], required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', schema);
