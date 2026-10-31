'use strict';
const mongoose = require('mongoose');
const multer = require('multer');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl.split('?')[0]}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.expose ? err.message : 'Something went wrong. Please try again.';
  let code = err.code && typeof err.code === 'string' ? err.code : undefined;
  let details = err.details;

  if (err instanceof mongoose.Error.CastError) {
    status = 400; message = `Invalid ${err.path}`; code = 'INVALID_ID';
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400; code = 'VALIDATION';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = details[0]?.message || 'Validation failed';
  } else if (err && err.code === 11000) {
    status = 409; code = 'DUPLICATE';
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `A record with this ${field} already exists`;
  } else if (err instanceof multer.MulterError) {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400; code = err.code; message = err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large' : err.message;
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400; message = 'Malformed JSON body'; code = 'BAD_JSON';
  } else if (err && err.type === 'entity.too.large') {
    status = 413; message = 'Request body too large'; code = 'TOO_LARGE';
  } else if (status >= 500) {
    code = 'SERVER_ERROR';
    message = 'Something went wrong. Please try again.';
  }

  if (status >= 500 && !env.isTest) {
    // Log server-side only; never leak stack traces to clients.
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({ success: false, error: { message, code, details } });
}

module.exports = { notFound, errorHandler, ApiError };
