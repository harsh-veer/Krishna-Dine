'use strict';
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    nameHi: { type: String, trim: true, maxlength: 100, default: '' },
    descriptionHi: { type: String, trim: true, maxlength: 500, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0, max: 100000 },
    // Optional portion sizes (e.g. Half / Full). When present, the customer must pick one and its price replaces `price`.
    sizes: {
      type: [new mongoose.Schema({ label: { type: String, required: true, trim: true, maxlength: 30 }, price: { type: Number, required: true, min: 0, max: 100000 } }, { _id: false })],
      default: [],
    },
    // Optional extras (e.g. Extra cheese +Rs 30) that add to the unit price.
    addons: {
      type: [new mongoose.Schema({ name: { type: String, required: true, trim: true, maxlength: 40 }, price: { type: Number, required: true, min: 0, max: 10000 } }, { _id: false })],
      default: [],
    },
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
