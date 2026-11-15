'use strict';

const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/response');

class AuthController {
  async register(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await authService.register(req.body, clientIp);
    return sendSuccess(res, {
      message: 'Registration successful',
      data: result,
      statusCode: 201,
    });
  }

  async login(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await authService.login(req.body, clientIp);
    return sendSuccess(res, {
      message: 'Login successful',
      data: result,
    });
  }

  async logout(req, res) {
    return sendSuccess(res, {
      message: 'Logout successful',
      data: null,
    });
  }

  async getMe(req, res) {
    const user = await authService.getMe(req.user.id);
    return sendSuccess(res, {
      message: 'Current user profile',
      data: user,
    });
  }
}

module.exports = new AuthController();
