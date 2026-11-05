'use strict';
const { toPaise, toRupees, percentOf } = require('../utils/money');

/**
 * Computes totals from line items. Prices are tax-exclusive.
 * No GST is charged; the gst fields are kept at zero so older orders and reports stay readable.
 */
function computeTotals(items, { serviceChargeRate = 0, roundTotal = true } = {}) {
  const gstRate = 0;
  const lines = items.map((i) => {
    const unit = toPaise(i.price);
    return { ...i, lineTotal: toRupees(unit * i.quantity), _line: unit * i.quantity };
  });
  const subtotalP = lines.reduce((sum, l) => sum + l._line, 0);
  const serviceP = percentOf(subtotalP, serviceChargeRate);
  const taxableP = subtotalP + serviceP;
  const cgstP = percentOf(taxableP, gstRate / 2);
  const sgstP = percentOf(taxableP, gstRate / 2);
  const taxP = cgstP + sgstP;
  const rawTotalP = taxableP + taxP;
  const totalP = roundTotal ? Math.round(rawTotalP / 100) * 100 : rawTotalP;

  return {
    items: lines.map(({ _line, ...rest }) => rest),
    subtotal: toRupees(subtotalP),
    serviceChargeRate: Number(serviceChargeRate) || 0,
    serviceCharge: toRupees(serviceP),
    gstRate: Number(gstRate) || 0,
    cgst: toRupees(cgstP),
    sgst: toRupees(sgstP),
    tax: toRupees(taxP),
    roundOff: toRupees(totalP - rawTotalP),
    totalAmount: toRupees(totalP),
  };
}

module.exports = { computeTotals };
