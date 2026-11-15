'use strict';

const userService = require('../services/user.service');
const { sendSuccess } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

class UserController {
  async listUsers(req, res) {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { role, search, isActive } = req.query;

    const parsedIsActive =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    const { items, total } = await userService.getUsers({
      page,
      limit,
      skip,
      take,
      role,
      search,
      isActive: parsedIsActive,
    });

    return sendSuccess(res, {
      message: 'Users retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  }

  async createUser(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const user = await userService.createUser(req.body, req.user.id, clientIp);
    return sendSuccess(res, {
      message: 'User created successfully',
      data: user,
      statusCode: 201,
    });
  }

  async toggleStatus(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { id } = req.params;
    const { isActive } = req.body;

    const updated = await userService.toggleUserStatus(
      id,
      isActive,
      req.user.id,
      clientIp
    );

    return sendSuccess(res, {
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: updated,
    });
  }
}

module.exports = new UserController();
