'use strict';
const { Settings } = require('../models');

const pick = (s) => ({
  restaurantName: s.restaurantName,
  brandName: s.brandName,
  address: s.address,
  phone: s.phone,
  serviceChargeEnabled: s.serviceChargeEnabled,
  serviceChargeRate: s.serviceChargeRate,
  roundTotal: s.roundTotal,
  invoiceFooter: s.invoiceFooter,
  upiId: s.upiId,
});

exports.publicSettings = async (_req, res) => {
  const s = await Settings.get();
  res.json({
    success: true,
    data: { restaurantName: s.restaurantName, brandName: s.brandName, address: s.address, phone: s.phone, serviceChargeRate: s.serviceChargeEnabled ? s.serviceChargeRate : 0 },
  });
};

exports.get = async (_req, res) => {
  res.json({ success: true, data: pick(await Settings.get()) });
};

exports.update = async (req, res) => {
  const s = await Settings.get();
  Object.assign(s, req.body);
  await s.save();
  res.json({ success: true, data: pick(s) });
};
