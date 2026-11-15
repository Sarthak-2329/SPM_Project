'use strict';

const { prisma } = require('../config/database');

class DashboardService {
  /**
   * Retrieves role-aware metrics for the user dashboard.
   */
  async getDashboardMetrics(user) {
    const role = user.role;

    if (role === 'ADMIN') {
      return this.getAdminMetrics();
    } else if (role === 'TECHNICIAN') {
      return this.getTechnicianMetrics(user.id);
    } else {
      return this.getRequesterMetrics(user.id);
    }
  }

  /**
   * Aggregates comprehensive campus metrics for Facilities Administrators.
   */
  async getAdminMetrics() {
    const now = new Date();

    // 1. High-level KPI counters
    const [
      totalAssets,
      openWorkOrders,
      closedWorkOrders,
      allWorkOrders,
      overdueWorkOrders,
      lowStockPartsCount,
      allSchedules,
      allRequests,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.workOrder.count({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'] } },
      }),
      prisma.workOrder.count({
        where: { status: { in: ['COMPLETED', 'CLOSED'] } },
      }),
      prisma.workOrder.findMany({
        select: {
          id: true,
          status: true,
          priority: true,
          createdAt: true,
          dueDate: true,
          actualCost: true,
          pmScheduleId: true,
          assetId: true,
        },
      }),
      prisma.workOrder.count({
        where: {
          dueDate: { lt: now },
          status: { notIn: ['COMPLETED', 'CLOSED'] },
        },
      }),
      prisma.part.count({
        where: {
          stockQty: { lte: prisma.part.fields?.reorderLevel || 5 }, // fallback comparison in memory if needed
        },
      }),
      prisma.pMSchedule.findMany({ select: { id: true, isActive: true } }),
      prisma.maintenanceRequest.findMany({ select: { status: true } }),
    ]);

    // Memory-verified low stock calculation (in case raw column comparison varies by driver)
    const allParts = await prisma.part.findMany({ select: { stockQty: true, reorderLevel: true } });
    const preciseLowStockCount = allParts.filter((p) => p.stockQty <= p.reorderLevel).length;

    // 2. Work Orders by Priority
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    allWorkOrders.forEach((wo) => {
      if (priorityCounts[wo.priority] !== undefined) {
        priorityCounts[wo.priority]++;
      }
    });

    const priorityDistribution = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    }));

    // 3. Work Orders by Status
    const statusCounts = {};
    allWorkOrders.forEach((wo) => {
      statusCounts[wo.status] = (statusCounts[wo.status] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // 4. Monthly Trend (Last 6 Months: Created vs Completed)
    const monthlyTrendMap = {};
    const monthsBack = 6;
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthlyTrendMap[key] = { month: key, created: 0, completed: 0 };
    }

    allWorkOrders.forEach((wo) => {
      const d = new Date(wo.createdAt);
      const key = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      if (monthlyTrendMap[key]) {
        monthlyTrendMap[key].created++;
        if (wo.status === 'COMPLETED' || wo.status === 'CLOSED') {
          monthlyTrendMap[key].completed++;
        }
      }
    });
    const monthlyTrend = Object.values(monthlyTrendMap);

    // 5. Top 10 High Cost Assets
    const assetCosts = await prisma.workOrder.groupBy({
      by: ['assetId'],
      _sum: { actualCost: true },
      _count: { id: true },
      where: { assetId: { not: null } },
      orderBy: { _sum: { actualCost: 'desc' } },
      take: 10,
    });

    const assetIds = assetCosts.map((a) => a.assetId).filter(Boolean);
    const assetDetails = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: { id: true, name: true, assetCode: true, location: { select: { name: true } } },
    });

    const topAssetsByCost = assetCosts.map((item) => {
      const detail = assetDetails.find((a) => a.id === item.assetId);
      return {
        assetId: item.assetId,
        assetCode: detail?.assetCode || 'UNKNOWN',
        name: detail?.name || 'Asset',
        location: detail?.location?.name || 'Campus',
        totalCost: item._sum.actualCost || 0,
        workOrderCount: item._count.id,
      };
    });

    // 6. Technician Workload
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN', isActive: true },
      select: {
        id: true,
        name: true,
        assignedWorkOrders: {
          select: { id: true, status: true },
        },
      },
    });

    const technicianWorkload = technicians.map((t) => {
      const activeCount = t.assignedWorkOrders.filter((w) =>
        ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status)
      ).length;
      const completedCount = t.assignedWorkOrders.filter((w) =>
        ['COMPLETED', 'CLOSED'].includes(w.status)
      ).length;

      return {
        technicianId: t.id,
        name: t.name,
        activeWorkOrders: activeCount,
        completedWorkOrders: completedCount,
        totalAssigned: t.assignedWorkOrders.length,
      };
    });

    // 7. PM Compliance %
    const pmWorkOrders = allWorkOrders.filter((w) => w.pmScheduleId !== null);
    const completedPMCount = pmWorkOrders.filter((w) =>
      ['COMPLETED', 'CLOSED'].includes(w.status)
    ).length;
    const pmComplianceRate =
      pmWorkOrders.length > 0 ? Math.round((completedPMCount / pmWorkOrders.length) * 100) : 100;

    return {
      kpis: {
        totalAssets,
        openWorkOrders,
        closedWorkOrders,
        totalWorkOrders: allWorkOrders.length,
        overdueWorkOrders,
        lowStockPartsCount: preciseLowStockCount,
        pmComplianceRate,
        activePMSchedules: allSchedules.filter((s) => s.isActive).length,
        totalRequests: allRequests.length,
        pendingRequests: allRequests.filter((r) => r.status === 'PENDING').length,
      },
      priorityDistribution,
      statusDistribution,
      monthlyTrend,
      topAssetsByCost,
      technicianWorkload,
    };
  }

  /**
   * Aggregates personalized metrics for Technicians.
   */
  async getTechnicianMetrics(userId) {
    const now = new Date();

    const [assignedWOs, myNotesCount] = await Promise.all([
      prisma.workOrder.findMany({
        where: { assigneeId: userId },
        include: { asset: { select: { assetCode: true, name: true, location: true } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.workOrderNote.count({ where: { authorId: userId } }),
    ]);

    const activeWOs = assignedWOs.filter((w) =>
      ['ASSIGNED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status)
    );
    const completedWOs = assignedWOs.filter((w) =>
      ['COMPLETED', 'CLOSED'].includes(w.status)
    );
    const overdueWOs = activeWOs.filter((w) => w.dueDate && new Date(w.dueDate) < now);
    const criticalWOs = activeWOs.filter((w) => w.priority === 'CRITICAL' || w.priority === 'HIGH');
    const totalLaborHours = assignedWOs.reduce((sum, w) => sum + (w.timeSpent || 0), 0);

    return {
      kpis: {
        activeAssigned: activeWOs.length,
        completedTotal: completedWOs.length,
        overdueCount: overdueWOs.length,
        highPriorityCount: criticalWOs.length,
        totalLaborHours,
        notesCount: myNotesCount,
      },
      urgentWorkOrders: criticalWOs.slice(0, 5),
      recentAssigned: activeWOs.slice(0, 8),
    };
  }

  /**
   * Aggregates personalized metrics for Requesters (Students/Staff).
   */
  async getRequesterMetrics(userId) {
    const requests = await prisma.maintenanceRequest.findMany({
      where: { requesterId: userId },
      include: {
        asset: { select: { assetCode: true, name: true } },
        workOrder: { select: { id: true, status: true, dueDate: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const approved = requests.filter((r) => r.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;

    return {
      kpis: {
        totalRaised: requests.length,
        pendingReview: pending,
        approvedAndActive: approved,
        rejectedCount: rejected,
      },
      recentRequests: requests.slice(0, 8),
    };
  }
}

module.exports = new DashboardService();
