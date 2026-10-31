'use strict';
const { Payment } = require('../models');
const billing = require('../services/billingService');
const { getGateway } = require('../services/paymentGateway');

exports.list = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.paymentStatus = String(req.query.status);
  const payments = await Payment.find(filter).sort({ createdAt: -1 }).limit(200).populate('order', 'orderNumber tableNumber');
  res.json({
    success: true,
    data: payments.map((p) => ({
      id: p._id.toString(),
      orderId: p.order?._id?.toString(),
      orderNumber: p.order?.orderNumber,
      tableNumber: p.order?.tableNumber,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paymentStatus: p.paymentStatus,
      verification: p.verification,
      transactionReference: p.transactionReference,
      recordedByName: p.recordedByName,
      createdAt: p.createdAt,
    })),
  });
};

exports.confirm = async (req, res) => {
  res.json({ success: true, data: await billing.confirmPayment(req.params.id, req.body, req.user) });
};

exports.fail = async (req, res) => {
  res.json({ success: true, data: await billing.failPayment(req.params.id, req.body) });
};

exports.verify = async (req, res) => {
  res.json({ success: true, data: await billing.verifyGatewayPayment(req.params.id, req.body) });
};

exports.gatewayInfo = async (_req, res) => {
  const g = getGateway();
  res.json({ success: true, data: { gateway: g.name, configured: g.configured } });
};
