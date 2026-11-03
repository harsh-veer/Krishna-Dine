'use strict';
const { Category, MenuItem } = require('../models');
const { hindiNames } = require('./data');

/** Fills in missing Hindi names for the sample menu. Never overwrites a name the admin has set. */
async function backfillHindi() {
  const ops = (Model) =>
    Object.entries(hindiNames).map(([name, nameHi]) => ({
      updateMany: { filter: { name, $or: [{ nameHi: '' }, { nameHi: { $exists: false } }] }, update: { $set: { nameHi } } },
    }));
  await Promise.all([Category.bulkWrite(ops(Category), { ordered: false }), MenuItem.bulkWrite(ops(MenuItem), { ordered: false })]);
}

module.exports = { backfillHindi };
