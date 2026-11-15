'use strict';

const { prisma } = require('../config/database');

class AuditRepository {
  async create({ userId, action, entityType, entityId, details, ipAddress }) {
    return prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: details || undefined,
        ipAddress: ipAddress || null,
      },
    });
  }

  async findMany({ skip, take, entityType, action, userId }) {
    const where = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}

module.exports = new AuditRepository();
