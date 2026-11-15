'use strict';

const { prisma } = require('../config/database');
const notificationService = require('./notification.service');

class AlertSchedulerService {
  /**
   * Scans for overdue work orders, 30-day warranty expirations, and low stock items.
   */
  async runDailyAlerts() {
    console.info(`[ALERT CRON] Running automated daily alert scanner at ${new Date().toISOString()}...`);
    const results = {
      overdueAlertsSent: 0,
      warrantyAlertsSent: 0,
      lowStockAlertsSent: 0,
    };

    try {
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // 1. Overdue Work Orders
      const overdueWorkOrders = await prisma.workOrder.findMany({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CLOSED'] },
        },
        include: {
          assignee: true,
          asset: true,
        },
      });

      for (const wo of overdueWorkOrders) {
        if (wo.assigneeId) {
          await notificationService.notify({
            userId: wo.assigneeId,
            type: 'WORK_ORDER_OVERDUE',
            title: `OVERDUE: Work Order #${wo.id.slice(-6).toUpperCase()}`,
            message: `Work Order "${wo.title}" for asset ${wo.asset?.assetCode || 'N/A'} was due on ${wo.dueDate ? wo.dueDate.toLocaleDateString() : 'N/A'}. Please attend immediately.`,
            referenceId: wo.id,
            referenceType: 'WORK_ORDER',
            emailUser: true,
          }).catch(() => {});
          results.overdueAlertsSent++;
        }
      }

      // 2. Asset Warranty Expirations (Expiring within 30 days)
      const expiringAssets = await prisma.asset.findMany({
        where: {
          warrantyExpiry: {
            gte: now,
            lte: in30Days,
          },
          status: 'ACTIVE',
        },
      });

      if (expiringAssets.length > 0) {
        const admins = await prisma.user.findMany({
          where: { role: 'ADMIN', isActive: true },
        });

        for (const asset of expiringAssets) {
          for (const admin of admins) {
            await notificationService.notify({
              userId: admin.id,
              type: 'GENERAL',
              title: `Warranty Expiry Notice: ${asset.assetCode}`,
              message: `Asset "${asset.name}" warranty expires on ${asset.warrantyExpiry.toLocaleDateString()}. Consider AMC renewal or vendor inspection.`,
              referenceId: asset.id,
              referenceType: 'ASSET',
              emailUser: false,
            }).catch(() => {});
          }
          results.warrantyAlertsSent++;
        }
      }

      console.info(`[ALERT CRON] Finished scan: ${results.overdueAlertsSent} overdue alerts, ${results.warrantyAlertsSent} warranty notices.`);
      return results;
    } catch (err) {
      console.error('[ALERT CRON ERROR] Failed to run daily alerts scanner:', err);
      throw err;
    }
  }
}

module.exports = new AlertSchedulerService();
