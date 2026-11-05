'use strict';
const reports = require('../services/reportService');
const { toCsv } = require('../utils/csv');

function sendReport(res, report, format) {
  if (format !== 'csv') return res.json({ success: true, data: report });
  const s = report.summary;
  const sections = [
    {
      title: `Krishna Dine ${report.type} sales report: ${report.period.label}`,
      columns: [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }],
      rows: [
        { metric: 'Total orders', value: s.totalOrders },
        { metric: 'Completed (served)', value: s.completedOrders },
        { metric: 'Cancelled', value: s.cancelledOrders },
        { metric: 'Gross sales (INR)', value: s.revenue },
        { metric: 'Subtotal (INR)', value: s.subtotal },
        { metric: 'Service charge (INR)', value: s.serviceCharge },
        { metric: 'Collected (INR)', value: s.collected },
        { metric: 'Outstanding (INR)', value: s.outstanding },
        { metric: 'Average order value (INR)', value: s.averageOrderValue },
      ],
    },
  ];
  if (report.daily) {
    sections.push({
      title: 'Sales by day',
      columns: [{ key: 'date', label: 'Date' }, { key: 'orders', label: 'Orders' }, { key: 'cancelled', label: 'Cancelled' }, { key: 'revenue', label: 'Sales (INR)' }],
      rows: report.daily,
    });
  }
  if (report.hourly) {
    sections.push({
      title: 'Sales by hour',
      columns: [{ key: 'label', label: 'Hour' }, { key: 'orders', label: 'Orders' }, { key: 'revenue', label: 'Sales (INR)' }],
      rows: report.hourly.filter((h) => h.orders > 0),
    });
  }
  sections.push({
    title: 'Popular menu items',
    columns: [{ key: 'rank', label: 'Rank' }, { key: 'name', label: 'Item' }, { key: 'quantity', label: 'Quantity sold' }, { key: 'revenue', label: 'Sales (INR)' }],
    rows: report.topItems.map((t, i) => ({ ...t, rank: i + 1 })),
  });
  sections.push({
    title: 'Payments collected by method',
    columns: [{ key: 'method', label: 'Method' }, { key: 'orders', label: 'Orders' }, { key: 'amount', label: 'Amount (INR)' }],
    rows: report.paymentMethods.map((m) => ({ ...m, method: m.method.toUpperCase() })),
  });
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="krishna-dine-${report.type}-${report.period.label.replace(/\s+/g, '_')}.csv"`);
  return res.send(toCsv(sections));
}

exports.daily = async (req, res) => sendReport(res, await reports.dailyReport(req.query.date), req.query.format);
exports.weekly = async (req, res) => sendReport(res, await reports.weeklyReport(req.query.end), req.query.format);
exports.monthly = async (req, res) => sendReport(res, await reports.monthlyReport(req.query.month), req.query.format);
exports.dashboard = async (_req, res) => res.json({ success: true, data: await reports.dashboard() });
