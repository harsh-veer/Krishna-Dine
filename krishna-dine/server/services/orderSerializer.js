'use strict';

function base(o) {
  return {
    id: o._id.toString(),
    orderNumber: o.orderNumber,
    tableId: o.table && o.table._id ? o.table._id.toString() : String(o.table),
    tableNumber: o.tableNumber,
    customerName: o.customerName,
    items: (o.items || []).map((i) => ({
      menuItem: String(i.menuItem),
      name: i.name,
      price: i.price,
      quantity: i.quantity,
      isVegetarian: i.isVegetarian,
      lineTotal: i.lineTotal,
      notes: i.notes || '',
    })),
    specialInstructions: o.specialInstructions || '',
    subtotal: o.subtotal,
    serviceChargeRate: o.serviceChargeRate,
    serviceCharge: o.serviceCharge,
    gstRate: o.gstRate,
    cgst: o.cgst,
    sgst: o.sgst,
    tax: o.tax,
    roundOff: o.roundOff,
    totalAmount: o.totalAmount,
    orderStatus: o.orderStatus,
    cancellationReason: o.cancellationReason || '',
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    isClosed: !!o.isClosed,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    feedback: o.feedback && o.feedback.rating ? { rating: o.feedback.rating, comment: o.feedback.comment || '', at: o.feedback.at } : null,
    version: o.__v ?? 0,
  };
}

/** Full order for authenticated staff. */
function toStaffOrder(o) {
  return {
    ...base(o),
    customerPhone: o.customerPhone || '',
    statusHistory: (o.statusHistory || []).map((h) => ({ status: h.status, at: h.at, byName: h.byName || '', note: h.note || '' })),
    invoiceNumber: o.invoiceNumber || null,
    billGeneratedAt: o.billGeneratedAt || null,
    paidAt: o.paidAt || null,
    closedAt: o.closedAt || null,
    localDate: o.localDate,
  };
}

/** Order as seen by the customer who placed it (no staff names, no phone). */
function toPublicOrder(o) {
  return {
    ...base(o),
    statusHistory: (o.statusHistory || []).map((h) => ({ status: h.status, at: h.at })),
  };
}

module.exports = { toStaffOrder, toPublicOrder };
