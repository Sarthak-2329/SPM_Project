'use strict';

const workOrderRepository = require('../repositories/workOrder.repository');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const emailService = require('./email.service');
const { isValidTransition } = require('../utils/workOrderStateMachine');
const { prisma } = require('../config/database');

class WorkOrderService {
  async getWorkOrders({ assigneeId, status, priority, assetId, isOverdue, search, skip, take }) {
    const { items, total } = await workOrderRepository.findMany({
      assigneeId,
      status,
      priority,
      assetId,
      search,
      skip,
      take,
    });

    const now = new Date();
    // Compute dynamic overdue flag
    const enriched = items.map((wo) => {
      const overdue =
        wo.dueDate &&
        new Date(wo.dueDate) < now &&
        !['COMPLETED', 'CLOSED'].includes(wo.status);
      return {
        ...wo,
        isOverdue: Boolean(overdue),
      };
    });

    // In-memory filter if specifically querying isOverdue
    let finalItems = enriched;
    if (isOverdue === 'true' || isOverdue === true) {
      finalItems = enriched.filter((i) => i.isOverdue);
    }

    return { items: finalItems, total };
  }

  async getWorkOrderById(id) {
    const wo = await workOrderRepository.findById(id);
    if (!wo) {
      const err = new Error('Work order not found');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const isOverdue =
      wo.dueDate &&
      new Date(wo.dueDate) < now &&
      !['COMPLETED', 'CLOSED'].includes(wo.status);

    return {
      ...wo,
      isOverdue: Boolean(isOverdue),
    };
  }

  /**
   * Manual creation by Admin
   */
  async createWorkOrder(data, adminId, clientIp) {
    const initialStatus = data.assigneeId ? 'ASSIGNED' : 'OPEN';

    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.create({
        data: {
          title: data.title,
          description: data.description,
          assetId: data.assetId || null,
          priority: data.priority || 'MEDIUM',
          status: initialStatus,
          assigneeId: data.assigneeId || null,
          createdById: adminId,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : null,
        },
        include: {
          assignee: true,
          asset: true,
        },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus: null,
          toStatus: initialStatus,
          changedById: adminId,
          reason: 'Manual creation by Administrator',
        },
      });

      return wo;
    });

    await auditService.log({
      userId: adminId,
      action: 'CREATE_WORK_ORDER',
      entityType: 'WorkOrder',
      entityId: result.id,
      details: { title: result.title, priority: result.priority, assigneeId: result.assigneeId },
      ipAddress: clientIp,
    });

    if (result.assignee) {
      await notificationService.notify({
        userId: result.assignee.id,
        type: 'ASSIGNMENT',
        title: 'New Work Order Assigned',
        message: `You were assigned Work Order: ${result.title}`,
        referenceId: result.id,
        referenceType: 'WORK_ORDER',
      });
      emailService.sendAssignmentEmail(result.assignee.email, result.assignee.name, result).catch(() => {});
    }

    return result;
  }

  /**
   * Enforces State Machine Transition rules
   */
  async transitionStatus(workOrderId, toStatus, reason, user, clientIp) {
    const wo = await workOrderRepository.findById(workOrderId);
    if (!wo) {
      const err = new Error('Work order not found');
      err.statusCode = 404;
      throw err;
    }

    // Role check: Technicians can only update WOs assigned to them
    if (user.role === 'TECHNICIAN' && wo.assigneeId !== user.id) {
      const err = new Error('Access denied. You can only transition work orders assigned to you.');
      err.statusCode = 403;
      throw err;
    }

    // Validate against state machine
    const fromStatus = wo.status;
    const isAllowed = isValidTransition(fromStatus, toStatus, user.role);
    if (!isAllowed) {
      const err = new Error(
        `Invalid status transition from ${fromStatus} to ${toStatus} for role ${user.role}`
      );
      err.statusCode = 400;
      throw err;
    }

    // Required reason for ON_HOLD
    if (toStatus === 'ON_HOLD' && (!reason || reason.trim().length === 0)) {
      const err = new Error('A reason is mandatory when placing a work order ON HOLD.');
      err.statusCode = 400;
      throw err;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const woUpdated = await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: toStatus },
        include: { assignee: true, asset: true, createdBy: true },
      });

      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId,
          fromStatus,
          toStatus,
          changedById: user.id,
          reason: reason || null,
        },
      });

      return woUpdated;
    });

    await auditService.log({
      userId: user.id,
      action: 'WORK_ORDER_STATUS_CHANGE',
      entityType: 'WorkOrder',
      entityId: workOrderId,
      details: { fromStatus, toStatus, reason },
      ipAddress: clientIp,
    });

    // Notify Admin and Assignee
    const notifyUserIds = new Set();
    if (wo.createdById && wo.createdById !== user.id) notifyUserIds.add(wo.createdById);
    if (wo.assigneeId && wo.assigneeId !== user.id) notifyUserIds.add(wo.assigneeId);

    for (const uid of notifyUserIds) {
      await notificationService.notify({
        userId: uid,
        type: 'STATUS_CHANGE',
        title: `Work Order Status: ${toStatus}`,
        message: `Work Order "${wo.title}" transitioned from ${fromStatus} to ${toStatus}.`,
        referenceId: workOrderId,
        referenceType: 'WORK_ORDER',
      });
    }

    return updated;
  }

  /**
   * Assign or Reassign Technician (Admin only)
   */
  async assignTechnician(workOrderId, technicianId, adminId, clientIp) {
    const wo = await workOrderRepository.findById(workOrderId);
    if (!wo) {
      const err = new Error('Work order not found');
      err.statusCode = 404;
      throw err;
    }

    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!technician || technician.role !== 'TECHNICIAN' || !technician.isActive) {
      const err = new Error('Invalid technician selected');
      err.statusCode = 400;
      throw err;
    }

    const newStatus = wo.status === 'OPEN' ? 'ASSIGNED' : wo.status;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          assigneeId: technicianId,
          status: newStatus,
        },
        include: { assignee: true, asset: true },
      });

      if (newStatus !== wo.status) {
        await tx.workOrderStatusHistory.create({
          data: {
            workOrderId,
            fromStatus: wo.status,
            toStatus: newStatus,
            changedById: adminId,
            reason: `Assigned to technician ${technician.name}`,
          },
        });
      }

      return result;
    });

    await auditService.log({
      userId: adminId,
      action: 'ASSIGN_WORK_ORDER',
      entityType: 'WorkOrder',
      entityId: workOrderId,
      details: { technicianId, technicianName: technician.name },
      ipAddress: clientIp,
    });

    await notificationService.notify({
      userId: technician.id,
      type: 'ASSIGNMENT',
      title: 'Work Order Assigned to You',
      message: `You were assigned Work Order: ${wo.title}`,
      referenceId: workOrderId,
      referenceType: 'WORK_ORDER',
      emailUser: true,
    });

    emailService.sendAssignmentEmail(technician.email, technician.name, updated).catch(() => {});

    return updated;
  }

  /**
   * Append technician or admin note
   */
  async addNote(workOrderId, content, userId) {
    if (!content || content.trim().length === 0) {
      const err = new Error('Note content cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    return workOrderRepository.addNote({
      workOrderId,
      authorId: userId,
      content,
    });
  }

  /**
   * Log technician time spent (in hours)
   */
  async logTime(workOrderId, hours, technicianId) {
    const wo = await workOrderRepository.findById(workOrderId);
    if (!wo) {
      const err = new Error('Work order not found');
      err.statusCode = 404;
      throw err;
    }

    const current = wo.timeSpent || 0;
    const added = parseFloat(hours);
    if (isNaN(added) || added < 0) {
      const err = new Error('Hours must be a valid positive number');
      err.statusCode = 400;
      throw err;
    }

    const updated = await workOrderRepository.update(workOrderId, {
      timeSpent: current + added,
    });

    return updated;
  }
}

module.exports = new WorkOrderService();
