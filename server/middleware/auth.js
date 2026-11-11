'use strict';
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const COOKIE_NAME = 'kd_token';

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, tv: user.tokenVersion }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
    issuer: 'krishna-dine',
    audience: 'krishna-dine-staff',
  });
}

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  return null;
}

/** Verifies a JWT and loads the user. Returns null when invalid. Shared with Socket.IO. */
async function userFromToken(token) {
  if (!token) return null;
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { issuer: 'krishna-dine', audience: 'krishna-dine-staff' });
  } catch {
    return null;
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) return null;
  return user;
}

const PASSWORD_CHANGE_ALLOWED = new Set(['/api/auth/me', '/api/auth/logout', '/api/auth/change-password']);

/** Requires a valid staff JWT. */
async function authenticate(req, _res, next) {
  try {
    const user = await userFromToken(extractToken(req));
    if (!user) throw ApiError.unauthorized('Please sign in to continue');
    if (env.forcePasswordChange && user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(req.originalUrl.split('?')[0])) {
      throw ApiError.forbidden('You must change your password before continuing', 'PASSWORD_CHANGE_REQUIRED');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attaches req.user when a valid token is present, but never fails. */
async function optionalAuth(req, _res, next) {
  try {
    const user = await userFromToken(extractToken(req));
    if (user && !(env.forcePasswordChange && user.mustChangePassword)) req.user = user;
  } catch {
    /* ignore */
  }
  next();
}

/** Role-based access control. Usage: authorize('admin') or authorize('admin', 'kitchen'). */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden('Your role does not have access to this feature'));
    return next();
  };
}

/** Only the owner account (OWNER_EMAIL) may manage staff access. */
function ownerOnly(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.email !== env.ownerEmail) return next(ApiError.forbidden('Only the owner can manage staff access'));
  return next();
}

module.exports = { ownerOnly, signToken, userFromToken, authenticate, optionalAuth, authorize, COOKIE_NAME };
