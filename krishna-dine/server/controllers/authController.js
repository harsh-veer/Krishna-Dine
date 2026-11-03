'use strict';
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { signToken, COOKIE_NAME } = require('../middleware/auth');
const { env } = require('../config/env');

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 12 * 60 * 60 * 1000,
  path: '/',
});

// Same response for unknown email and wrong password, to avoid account enumeration.
const INVALID = 'Invalid email or password';

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) {
    await new Promise((r) => setTimeout(r, 150));
    throw ApiError.unauthorized(INVALID);
  }
  const ok = await user.verifyPassword(password);
  if (!ok) throw ApiError.unauthorized(INVALID);
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Contact the administrator.', 'ACCOUNT_DISABLED');

  user.lastLoginAt = new Date();
  await user.save();
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, data: { token, user: user.toSafeJSON(), mustChangePassword: env.forcePasswordChange && user.mustChangePassword } });
};

exports.logout = async (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ success: true, data: { loggedOut: true } });
};

exports.me = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON(), mustChangePassword: env.forcePasswordChange && req.user.mustChangePassword } });
};

exports.changePassword = async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  const ok = await user.verifyPassword(req.body.currentPassword);
  if (!ok) throw ApiError.badRequest('Current password is incorrect');
  await user.setPassword(req.body.newPassword);
  user.mustChangePassword = false;
  user.tokenVersion += 1; // sign out other devices
  await user.save();
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ success: true, data: { token, user: user.toSafeJSON(), mustChangePassword: false } });
};
