'use strict';

class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code || undefined;
    this.details = details || undefined;
    this.expose = true;
  }

  static badRequest(msg, details) { return new ApiError(400, msg || 'Bad request', 'BAD_REQUEST', details); }
  static unauthorized(msg) { return new ApiError(401, msg || 'Authentication required', 'UNAUTHORIZED'); }
  static forbidden(msg, code) { return new ApiError(403, msg || 'You do not have permission to do this', code || 'FORBIDDEN'); }
  static notFound(msg) { return new ApiError(404, msg || 'Not found', 'NOT_FOUND'); }
  static conflict(msg, details) { return new ApiError(409, msg || 'Conflict', 'CONFLICT', details); }
  static gone(msg) { return new ApiError(410, msg || 'Gone', 'GONE'); }
  static unprocessable(msg, details) { return new ApiError(422, msg || 'Unprocessable', 'UNPROCESSABLE', details); }
}

module.exports = ApiError;
