'use strict';
const multer = require('multer');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.uploadMaxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) return cb(ApiError.badRequest('Only JPEG, PNG, WebP or GIF images are allowed'));
    return cb(null, true);
  },
});

/** Checks magic bytes so a renamed file cannot masquerade as an image. */
function looksLikeImage(buf) {
  if (!buf || buf.length < 12) return false;
  const hex = buf.subarray(0, 12).toString('hex');
  return (
    hex.startsWith('ffd8ff') || // jpeg
    hex.startsWith('89504e470d0a1a0a') || // png
    hex.startsWith('47494638') || // gif
    (hex.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP')
  );
}

module.exports = { imageUpload, looksLikeImage };
