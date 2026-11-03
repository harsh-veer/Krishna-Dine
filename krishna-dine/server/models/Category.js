'use strict';
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameHi: { type: String, trim: true, maxlength: 60, default: '' },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true, maxlength: 300, default: '' },
    image: { type: String, trim: true, default: '' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isActive: 1, displayOrder: 1 });

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
