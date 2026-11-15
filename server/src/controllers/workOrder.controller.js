'use strict';

const workOrderService = require('../services/workOrder.service');
const { sendSuccess } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

class WorkOrderController {
  async list(req, res) {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { status, priority, assetId, isOverdue, search } = req.query;

    // Technician is scoped automatically to assigned work orders
    const assigneeId =
      req.user.role === 'TECHNICIAN' ? req.user.id : req.query.assigneeId;

    const { items, total } = await workOrderService.getWorkOrders({
      assigneeId,
      status,
      priority,
      assetId,
      isOverdue,
      search,
      skip,
      take,
    });

    return sendSuccess(res, {
      message: 'Work orders retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  }

  async getById(req, res) {
    const wo = await workOrderService.getWorkOrderById(req.params.id);

    // If technician, ensure assigned or return 403
    if (req.user.role === 'TECHNICIAN' && wo.assigneeId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this work order',
        data: null,
      });
    }

    return sendSuccess(res, {
      message: 'Work order retrieved',
      data: wo,
    });
  }

  async create(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const wo = await workOrderService.createWorkOrder(
      req.body,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Work order created successfully',
      data: wo,
      statusCode: 201,
    });
  }

  async transitionStatus(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { status, reason } = req.body;
    const wo = await workOrderService.transitionStatus(
      req.params.id,
      status,
      reason,
      req.user,
      clientIp
    );
    return sendSuccess(res, {
      message: `Work order transitioned to ${status}`,
      data: wo,
    });
  }

  async assign(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { technicianId } = req.body;
    const wo = await workOrderService.assignTechnician(
      req.params.id,
      technicianId,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Technician assigned successfully',
      data: wo,
    });
  }

  async addNote(req, res) {
    const { content } = req.body;
    const note = await workOrderService.addNote(
      req.params.id,
      content,
      req.user.id
    );
    return sendSuccess(res, {
      message: 'Note logged on work order',
      data: note,
      statusCode: 201,
    });
  }

  async logTime(req, res) {
    const { hours } = req.body;
    const wo = await workOrderService.logTime(
      req.params.id,
      hours,
      req.user.id
    );
    return sendSuccess(res, {
      message: 'Time logged successfully',
      data: wo,
    });
  }
}

module.exports = new WorkOrderController();
