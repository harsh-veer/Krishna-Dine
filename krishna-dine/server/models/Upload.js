'use strict';
const mongoose = require('mongoose');

// Food images are stored in MongoDB so they survive redeploys on hosts with ephemeral disks
// (Render free tier, etc.). Images are limited to a couple of MB and served with long caching.
const uploadSchema = new mongoose.Schema(
  {
    filename: String,
    contentType: { type: String, required: true },
    size: Number,
    data: { type: Buffer, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Upload || mongoose.model('Upload', uploadSchema);
