'use strict';
const { Order } = require('../models');
const { localDateKey, startOfLocalDay, addDays, dayRange, monthRange, mongoTz } = require('../utils/dates');

const NOT_CANCELLED = { orderStatus: { $ne: 'cancelled' } };
const r2 = (n) => Math.round((n || 0) * 100) / 100;

async function summary(match) {
  const [row] = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        pendingOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'pending'] }, 1, 0] } },
        inProgressOrders: { $sum: { $cond: [{ $in: ['$orderStatus', ['accepted', 'preparing', 'ready']] }, 1, 0] } },
        completedOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'served'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$totalAmount', 0] } },
        subtotal: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$subtotal', 0] } },
        tax: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$tax', 0] } },
        serviceCharge: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$serviceCharge', 0] } },
        collected: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$totalAmount', 0] } },
      },
    },
  ]);
  const s = row || {};
  const billable = (s.totalOrders || 0) - (s.cancelledOrders || 0);
  return {
    totalOrders: s.totalOrders || 0,
    cancelledOrders: s.cancelledOrders || 0,
    pendingOrders: s.pendingOrders || 0,
    inProgressOrders: s.inProgressOrders || 0,
    completedOrders: s.completedOrders || 0,
    revenue: r2(s.revenue),
    subtotal: r2(s.subtotal),
    tax: r2(s.tax),
    serviceCharge: r2(s.serviceCharge),
    collected: r2(s.collected),
    outstanding: r2((s.revenue || 0) - (s.collected || 0)),
    averageOrderValue: billable ? r2(s.revenue / billable) : 0,
  };
}

async function topItems(match, limit = 10) {
  const rows = await Order.aggregate([
    { $match: { ...match, ...NOT_CANCELLED } },
    { $unwind: '$items' },
    { $group: { _id: '$items.menuItem', name: { $last: '$items.name' }, quantity: { $sum: '$items.quantity' }, revenue: { $sum: '$items.lineTotal' } } },
    { $sort: { quantity: -1, revenue: -1 } },
    { $limit: limit },
  ]);
  return rows.map((r) => ({ menuItemId: String(r._id), name: r.name, quantity: r.quantity, revenue: r2(r.revenue) }));
}

async function byDay(start, end) {
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end } } },
    {
      $group: {
        _id: '$localDate',
        orders: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$orderStatus', 'cancelled'] }, 1, 0] } },
        revenue: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$totalAmount', 0] } },
        tax: { $sum: { $cond: [{ $ne: ['$orderStatus', 'cancelled'] }, '$tax', 0] } },
      },
    },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));
  const out = [];
  for (let d = start; d < end; d = addDays(d, 1)) {
    const key = localDateKey(d);
    const r = map.get(key) || {};
    out.push({ date: key, orders: r.orders || 0, cancelled: r.cancelled || 0, revenue: r2(r.revenue), tax: r2(r.tax) });
  }
  return out;
}

async function byHour(start, end) {
  const rows = await Order.aggregate([
    { $match: { createdAt: { $gte: start, $lt: end }, ...NOT_CANCELLED } },
    { $group: { _id: { $hour: { date: '$createdAt', timezone: mongoTz() } }, orders: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r]));
  return Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, '0')}:00`, orders: map.get(h)?.orders || 0, revenue: r2(map.get(h)?.revenue) }));
}

async function byPaymentMethod(match) {
  const rows = await Order.aggregate([
    { $match: { ...match, paymentStatus: 'paid' } },
    { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
  ]);
  return ['cash', 'upi', 'card'].map((m) => {
    const r = rows.find((x) => x._id === m) || {};
    return { method: m, orders: r.orders || 0, amount: r2(r.amount) };
  });
}

async function dailyReport(dateKey = localDateKey()) {
  const { start, end } = dayRange(dateKey);
  const match = { createdAt: { $gte: start, $lt: end } };
  const [s, items, hours, methods] = await Promise.all([summary(match), topItems(match), byHour(start, end), byPaymentMethod(match)]);
  return { type: 'daily', period: { label: dateKey, start, end }, summary: s, topItems: items, hourly: hours, paymentMethods: methods };
}

/** Seven days ending on `endKey` (inclusive). */
async function weeklyReport(endKey = localDateKey()) {
  const end = addDays(startOfLocalDay(endKey), 1);
  const start = addDays(end, -7);
  const match = { createdAt: { $gte: start, $lt: end } };
  const [s, items, days, methods] = await Promise.all([summary(match), topItems(match), byDay(start, end), byPaymentMethod(match)]);
  return { type: 'weekly', period: { label: `${localDateKey(start)} to ${endKey}`, start, end }, summary: s, topItems: items, daily: days, paymentMethods: methods };
}

async function monthlyReport(monthKey = localDateKey().slice(0, 7)) {
  const { start, end } = monthRange(monthKey);
  const match = { createdAt: { $gte: start, $lt: end } };
  const [s, items, days, methods] = await Promise.all([summary(match), topItems(match, 15), byDay(start, end), byPaymentMethod(match)]);
  return { type: 'monthly', period: { label: monthKey, start, end }, summary: s, topItems: items, daily: days, paymentMethods: methods };
}

/** Numbers for the admin dashboard home. */
async function dashboard() {
  const today = localDateKey();
  const { start, end } = dayRange(today);
  const todayMatch = { createdAt: { $gte: start, $lt: end } };
  const weekStart = addDays(start, -6);

  // Weekly totals for the last 8 weeks (rolling 7-day buckets ending today).
  const weeks = [];
  for (let i = 7; i >= 0; i -= 1) {
    const wEnd = addDays(end, -7 * i);
    const wStart = addDays(wEnd, -7);
    weeks.push({ wStart, wEnd });
  }
  const weekly = await Promise.all(
    weeks.map(async ({ wStart, wEnd }) => {
      const s = await summary({ createdAt: { $gte: wStart, $lt: wEnd } });
      return { label: localDateKey(wStart).slice(5), start: localDateKey(wStart), orders: s.totalOrders - s.cancelledOrders, revenue: s.revenue };
    })
  );

  const [todaySummary, bestSellers, last7, activeOrders] = await Promise.all([
    summary(todayMatch),
    topItems({ createdAt: { $gte: weekStart, $lt: end } }, 5),
    byDay(weekStart, end),
    Order.countDocuments({ isClosed: false, orderStatus: { $in: ['pending', 'accepted', 'preparing', 'ready'] } }),
  ]);

  return { date: today, today: todaySummary, activeOrders, bestSellers, daily: last7, weekly };
}

module.exports = { dailyReport, weeklyReport, monthlyReport, dashboard };
