'use strict';

const maintenanceRequestService = require('../services/maintenanceRequest.service');
const { sendSuccess } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

class MaintenanceRequestController {
  async create(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const request = await maintenanceRequestService.createRequest(
      req.body,
      req.file,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Maintenance request submitted successfully',
      data: request,
      statusCode: 201,
    });
  }

  async list(req, res) {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { status, priority, search } = req.query;

    // Requester only sees own requests; Admins see all
    const requesterId = req.user.role === 'REQUESTER' ? req.user.id : undefined;

    const { items, total } = await maintenanceRequestService.getRequests({
      requesterId,
      status,
      priority,
      search,
      skip,
      take,
    });

    return sendSuccess(res, {
      message: 'Maintenance requests retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  }

  async getById(req, res) {
    const request = await maintenanceRequestService.getRequestById(req.params.id, req.user);
    return sendSuccess(res, {
      message: 'Maintenance request details retrieved',
      data: request,
    });
  }

  async approve(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await maintenanceRequestService.approveRequest(
      req.params.id,
      req.body,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Request approved and work order generated',
      data: result,
    });
  }

  async reject(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await maintenanceRequestService.rejectRequest(
      req.params.id,
      req.body.reason,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Maintenance request rejected',
      data: result,
    });
  }
}

module.exports = new MaintenanceRequestController();
