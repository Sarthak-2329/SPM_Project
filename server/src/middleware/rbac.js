'use strict';

/**
 * Role-Based Access Control (RBAC) middleware factory.
 *
 * Usage: router.delete('/users/:id', authenticate, rbac('ADMIN'), handler)
 * Usage: router.patch('/wo/:id', authenticate, rbac('ADMIN', 'TECHNICIAN'), handler)
 *
 * Must be used AFTER the authenticate middleware (requires req.user).
 */

/**
 * Returns an Express middleware that allows only the specified roles.
 * @param {...string} allowedRoles - e.g. 'ADMIN', 'TECHNICIAN', 'REQUESTER'
 */
const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
        data: null,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}.`,
        data: null,
      });
    }

    next();
  };
};

module.exports = { rbac };
