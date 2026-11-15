'use strict';

/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   router.post('/assets', authenticate, rbac('ADMIN'), validate(createAssetSchema), handler)
 *
 * On validation failure, throws a ZodError which is caught by errorHandler.
 * On success, attaches the parsed (coerced + stripped) data to req.body.
 */

const { ZodError } = require('zod');

/**
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate req.body against
 * @param {'body'|'query'|'params'} [source='body'] - Which part of req to validate
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // replace with coerced/stripped version
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(err); // forwarded to global errorHandler
      }
      next(err);
    }
  };
};

module.exports = { validate };
