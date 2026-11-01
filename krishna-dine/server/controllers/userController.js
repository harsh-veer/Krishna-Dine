'use strict';
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

exports.list = async (_req, res) => {
  const users = await User.find().sort({ role: 1, name: 1 });
  res.json({ success: true, data: users.map((u) => u.toSafeJSON()) });
};

exports.create = async (req, res) => {
  const exists = await User.exists({ email: req.body.email });
  if (exists) throw ApiError.conflict('A user with this email already exists');
  const user = new User({ name: req.body.name, email: req.body.email, role: req.body.role, mustChangePassword: true });
  await user.setPassword(req.body.password);
  await user.save();
  res.status(201).json({ success: true, data: user.toSafeJSON() });
};

async function assertNotLastAdmin(user, next) {
  const leavingAdmin = user.role === 'admin' && user.isActive && (next.role === 'kitchen' || next.isActive === false);
  if (!leavingAdmin) return;
  const admins = await User.countDocuments({ role: 'admin', isActive: true, _id: { $ne: user._id } });
  if (admins === 0) throw ApiError.conflict('At least one active admin account is required');
}

exports.update = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id) && (req.body.isActive === false || (req.body.role && req.body.role !== user.role))) {
    throw ApiError.conflict('You cannot disable your own account or change your own role');
  }
  await assertNotLastAdmin(user, req.body);
  const revoke = (req.body.isActive === false && user.isActive) || (req.body.role && req.body.role !== user.role);
  Object.assign(user, req.body);
  if (revoke) user.tokenVersion += 1; // signs the user out everywhere
  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
};

exports.resetPassword = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  await user.setPassword(req.body.password);
  user.mustChangePassword = true;
  user.tokenVersion += 1;
  await user.save();
  res.json({ success: true, data: user.toSafeJSON() });
};

exports.remove = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (String(user._id) === String(req.user._id)) throw ApiError.conflict('You cannot delete your own account');
  await assertNotLastAdmin(user, { isActive: false });
  await user.deleteOne();
  res.json({ success: true, data: { id: user._id.toString() } });
};
