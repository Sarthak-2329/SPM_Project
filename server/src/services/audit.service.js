'use strict';

const auditRepository = require('../repositories/audit.repository');

class AuditService {
  async log({ userId, action, entityType, entityId, details, ipAddress }) {
    try {
      return await auditRepository.create({
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err.message);
      // Non-blocking: audit failure should not abort primary transaction unless configured
      return null;
    }
  }

  async getLogs({ page, limit, skip, take, entityType, action, userId }) {
    return auditRepository.findMany({ skip, take, entityType, action, userId });
  }
}

module.exports = new AuditService();
