'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const auditService = require('./audit.service');
const { env } = require('../config/env');

class AuthService {
  async register({ email, password, name, phone }, clientIp) {
    const existing = await userRepository.findByEmail(email.toLowerCase());
    if (existing) {
      const err = new Error('Email is already registered');
      err.statusCode = 409;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // Self-registration is strictly for REQUESTER role
    const newUser = await userRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      phone: phone || null,
      role: 'REQUESTER',
      isActive: true,
    });

    await auditService.log({
      userId: newUser.id,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: newUser.id,
      details: { email: newUser.email, role: newUser.role },
      ipAddress: clientIp,
    });

    const token = this.generateToken(newUser);

    return { user: newUser, token };
  }

  async login({ email, password }, clientIp) {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Account has been deactivated. Please contact campus admin.');
      err.statusCode = 403;
      throw err;
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      throw err;
    }

    const token = this.generateToken(user);

    await auditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress: clientIp,
    });

    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };

    return { user: userProfile, token };
  }

  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }
    return user;
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );
  }
}

module.exports = new AuthService();
