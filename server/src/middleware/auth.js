'use strict';

/**
 * JWT authentication middleware.
 * Verifies the Bearer token in the Authorization header and attaches
 * the decoded user payload to req.user.
 *
 * Usage: router.get('/protected', authenticate, handler)
 */

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Provide a valid Bearer token.',
      data: null,
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // Attach user info to request for downstream use
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
        data: null,
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      data: null,
    });
  }
};

module.exports = { authenticate };
