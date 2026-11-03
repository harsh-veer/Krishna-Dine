'use strict';
const mongoose = require('mongoose');

// Atomic sequences (order numbers per day, invoice numbers per financial year).
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

counterSchema.statics.next = async function next(name) {
  const doc = await this.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return doc.seq;
};

module.exports = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
