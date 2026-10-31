'use strict';
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0, max: 100000 },
    image: { type: String, trim: true, default: '' },
    isVegetarian: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: Number, min: 0, max: 240, default: 15 }, // minutes
    isDeleted: { type: Boolean, default: false }, // soft delete keeps historical references valid
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1, isDeleted: 1, name: 1 });
menuItemSchema.index({ isDeleted: 1, isAvailable: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);
