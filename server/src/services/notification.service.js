'use strict';

const notificationRepository = require('../repositories/notification.repository');
const emailService = require('./email.service');
const { prisma } = require('../config/database');

class NotificationService {
  async notify({ userId, type, title, message, referenceId, referenceType, emailUser = true }) {
    // 1. Write in-app notification record
    const notif = await notificationRepository.create({
      userId,
      type,
      title,
      message,
      referenceId,
      referenceType,
    });

    // 2. Dispatch email asynchronously (non-blocking)
    if (emailUser) {
      this.dispatchEmailAlert(userId, title, message).catch((err) => {
        console.warn(`[NotificationService] Email alert failed for user ${userId}:`, err.message);
      });
    }

    return notif;
  }

  async dispatchEmailAlert(userId, subject, message) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user && user.email) {
      await emailService.sendMail({
        to: user.email,
        subject: `[CMMS Notification] ${subject}`,
        text: message,
        html: `
          <div style="font-family: sans-serif; padding: 15px; border-left: 4px solid #2563eb;">
            <p>Hello <strong>${user.name}</strong>,</p>
            <p>${message}</p>
          </div>
        `,
      });
    }
  }

  async getUserNotifications(userId, pagination) {
    return notificationRepository.findByUserId(userId, pagination);
  }

  async markAsRead(id, userId) {
    return notificationRepository.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    return notificationRepository.markAllAsRead(userId);
  }
}

module.exports = new NotificationService();
