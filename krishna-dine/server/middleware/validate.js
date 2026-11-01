'use strict';
const ApiError = require('../utils/ApiError');

/**
 * Validates and replaces req.body / req.query / req.params with the parsed (typed, stripped) values.
 * schemas: { body?, query?, params? } of Zod schemas.
 */
function validate(schemas) {
  return (req, _res, next) => {
    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (!result.success) {
        const details = result.error.issues.map((i) => ({ field: i.path.join('.') || part, message: i.message }));
        return next(ApiError.badRequest(details[0]?.message || 'Invalid input', details));
      }
      req[part] = result.data;
    }
    return next();
  };
}

module.exports = validate;
