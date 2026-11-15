'use strict';

const { prisma } = require('../config/database');

class NotificationRepository {
  async create({ userId, type, title, message, referenceId, referenceType }) {
    return prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        referenceId: referenceId ? String(referenceId) : null,
        referenceType: referenceType ? String(referenceType) : null,
      },
    });
  }

  async findByUserId(userId, { skip = 0, take = 20 } = {}) {
    const [items, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, unreadCount };
  }

  async markAsRead(id, userId) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}

module.exports = new NotificationRepository();
