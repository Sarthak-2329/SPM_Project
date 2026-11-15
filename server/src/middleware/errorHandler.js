'use strict';

/**
 * Global Express error handler.
 * Must be registered LAST (after all routes) with app.use(errorHandler).
 *
 * Handles:
 *  - Prisma known errors (P2002 unique, P2025 not found, etc.)
 *  - Zod validation errors (forwarded from validate middleware)
 *  - Generic JS errors
 *
 * Always returns: { success: false, message: string, data: null }
 */

const { ZodError } = require('zod');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  // Log the full error in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[ErrorHandler]', err);
  }

  // ── Zod validation errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      data: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }

  // ── Prisma errors ─────────────────────────────────────────────────────────
  if (err.code) {
    switch (err.code) {
      case 'P2002': // Unique constraint violation
        return res.status(409).json({
          success: false,
          message: `A record with this ${err.meta?.target?.join(', ') || 'value'} already exists.`,
          data: null,
        });
      case 'P2025': // Record not found
        return res.status(404).json({
          success: false,
          message: err.meta?.cause || 'Record not found.',
          data: null,
        });
      case 'P2003': // Foreign key constraint failed
        return res.status(400).json({
          success: false,
          message: 'Related record does not exist.',
          data: null,
        });
      default:
        break;
    }
  }

  // ── Application-level errors (thrown with statusCode) ─────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      data: null,
    });
  }

  // ── Fallback: 500 Internal Server Error ───────────────────────────────────
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message || 'Internal server error',
    data: null,
  });
};

module.exports = errorHandler;
