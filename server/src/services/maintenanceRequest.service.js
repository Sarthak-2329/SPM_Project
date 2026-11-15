'use strict';

const maintenanceRequestRepository = require('../repositories/maintenanceRequest.repository');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const emailService = require('./email.service');
const { prisma } = require('../config/database');

class MaintenanceRequestService {
  async createRequest(data, file, requesterId, clientIp) {
    let photoUrl = null;
    if (file) {
      photoUrl = `/uploads/assets/${file.filename}`;
    }

    const request = await maintenanceRequestRepository.create({
      requesterId,
      assetId: data.assetId || null,
      locationId: data.locationId || null,
      description: data.description,
      priority: data.priority || 'MEDIUM',
      status: 'PENDING',
      photoUrl,
    });

    await auditService.log({
      userId: requesterId,
      action: 'CREATE_MAINTENANCE_REQUEST',
      entityType: 'MaintenanceRequest',
      entityId: request.id,
      details: { priority: request.priority, assetId: request.assetId, locationId: request.locationId },
      ipAddress: clientIp,
    });

    // Notify admins of new pending request
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true },
    });

    for (const admin of admins) {
      notificationService.notify({
        userId: admin.id,
        type: 'GENERAL',
        title: `New Fault Request Submitted`,
        message: `A new maintenance request (${request.priority} priority) was submitted by ${request.requester.name}.`,
        referenceId: request.id,
        referenceType: 'MAINTENANCE_REQUEST',
        emailUser: false,
      }).catch(() => {});
    }

    return request;
  }

  async getRequests({ requesterId, status, priority, search, skip, take }) {
    return maintenanceRequestRepository.findMany({
      requesterId,
      status,
      priority,
      search,
      skip,
      take,
    });
  }

  async getRequestById(id, user) {
    const request = await maintenanceRequestRepository.findById(id);
    if (!request) {
      const err = new Error('Maintenance request not found');
      err.statusCode = 404;
      throw err;
    }

    // Requester can only view their own request
    if (user.role === 'REQUESTER' && request.requesterId !== user.id) {
      const err = new Error('Access denied to this maintenance request');
      err.statusCode = 403;
      throw err;
    }

    return request;
  }

  /**
   * Approves a request and creates a corresponding Work Order in ONE DB TRANSACTION.
   */
  async approveRequest(requestId, { title, assigneeId, dueDate, priority }, adminId, clientIp) {
    const existing = await maintenanceRequestRepository.findById(requestId);
    if (!existing) {
      const err = new Error('Maintenance request not found');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'PENDING') {
      const err = new Error(`Cannot approve request that is already ${existing.status}`);
      err.statusCode = 400;
      throw err;
    }

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update request status to APPROVED
      const updatedRequest = await tx.maintenanceRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED' },
      });

      const initialStatus = assigneeId ? 'ASSIGNED' : 'OPEN';
      const woTitle = title || `Resolve: ${existing.asset?.name || 'Facility Fault'} - ${existing.description.slice(0, 40)}`;

      // 2. Create Work Order
      const workOrder = await tx.workOrder.create({
        data: {
          title: woTitle,
          description: existing.description,
          maintenanceRequestId: existing.id,
          assetId: existing.assetId,
          priority: priority || existing.priority,
          status: initialStatus,
          assigneeId: assigneeId || null,
          createdById: adminId,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        include: {
          assignee: true,
          asset: true,
        },
      });

      // 3. Record initial WorkOrderStatusHistory
      await tx.workOrderStatusHistory.create({
        data: {
          workOrderId: workOrder.id,
          fromStatus: null,
          toStatus: initialStatus,
          changedById: adminId,
          reason: `Approved from Maintenance Request #${requestId.slice(-6)}`,
        },
      });

      return { request: updatedRequest, workOrder };
    });

    // 4. Audit Log
    await auditService.log({
      userId: adminId,
      action: 'APPROVE_MAINTENANCE_REQUEST',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      details: { workOrderId: result.workOrder.id, status: 'APPROVED' },
      ipAddress: clientIp,
    });

    // 5. Notify Requester
    await notificationService.notify({
      userId: existing.requesterId,
      type: 'STATUS_CHANGE',
      title: 'Maintenance Request Approved',
      message: `Your maintenance request has been approved and Work Order #${result.workOrder.id.slice(-6)} was generated.`,
      referenceId: result.workOrder.id,
      referenceType: 'WORK_ORDER',
    });

    // 6. If technician assigned, notify technician via in-app & email
    if (result.workOrder.assignee) {
      await notificationService.notify({
        userId: result.workOrder.assignee.id,
        type: 'ASSIGNMENT',
        title: 'New Work Order Assigned',
        message: `You were assigned Work Order: ${result.workOrder.title}`,
        referenceId: result.workOrder.id,
        referenceType: 'WORK_ORDER',
        emailUser: true,
      });

      emailService.sendAssignmentEmail(
        result.workOrder.assignee.email,
        result.workOrder.assignee.name,
        result.workOrder
      ).catch(() => {});
    }

    return result;
  }

  /**
   * Rejects a request with mandatory reason.
   */
  async rejectRequest(requestId, reason, adminId, clientIp) {
    if (!reason || reason.trim().length === 0) {
      const err = new Error('Rejection reason is required');
      err.statusCode = 400;
      throw err;
    }

    const existing = await maintenanceRequestRepository.findById(requestId);
    if (!existing) {
      const err = new Error('Maintenance request not found');
      err.statusCode = 404;
      throw err;
    }

    if (existing.status !== 'PENDING') {
      const err = new Error(`Cannot reject request that is already ${existing.status}`);
      err.statusCode = 400;
      throw err;
    }

    const updated = await maintenanceRequestRepository.update(requestId, {
      status: 'REJECTED',
      rejectionReason: reason,
    });

    await auditService.log({
      userId: adminId,
      action: 'REJECT_MAINTENANCE_REQUEST',
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      details: { rejectionReason: reason },
      ipAddress: clientIp,
    });

    // Notify Requester with reason
    await notificationService.notify({
      userId: existing.requesterId,
      type: 'STATUS_CHANGE',
      title: 'Maintenance Request Update',
      message: `Your maintenance request was declined. Reason: ${reason}`,
      referenceId: requestId,
      referenceType: 'MAINTENANCE_REQUEST',
    });

    return updated;
  }
}

module.exports = new MaintenanceRequestService();
