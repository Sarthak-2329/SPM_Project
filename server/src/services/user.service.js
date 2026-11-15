'use strict';

const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const auditService = require('./audit.service');
const { env } = require('../config/env');

class UserService {
  async getUsers({ page, limit, skip, take, role, search, isActive }) {
    return userRepository.findMany({ skip, take, role, search, isActive });
  }

  async createUser({ email, password, name, role, phone }, adminId, clientIp) {
    const existing = await userRepository.findByEmail(email.toLowerCase());
    if (existing) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const newUser = await userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: role || 'TECHNICIAN',
      phone: phone || null,
      isActive: true,
    });

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_CREATE_USER',
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role, name: newUser.name },
      ipAddress: clientIp,
    });

    return newUser;
  }

  async toggleUserStatus(userId, isActive, adminId, clientIp) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    if (user.id === adminId) {
      const err = new Error('Admins cannot deactivate their own account');
      err.statusCode = 400;
      throw err;
    }

    const updated = await userRepository.update(userId, { isActive });

    await auditService.log({
      userId: adminId,
      action: 'ADMIN_UPDATE_USER_STATUS',
      entityType: 'User',
      entityId: user.id,
      details: { previousStatus: user.isActive, newStatus: isActive },
      ipAddress: clientIp,
    });

    return updated;
  }
}

module.exports = new UserService();
