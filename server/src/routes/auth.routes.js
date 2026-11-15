'use strict';

const { Router } = require('express');
const { z } = require('zod');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

router.post('/register', authRateLimiter, validate(registerSchema), (req, res, next) =>
  authController.register(req, res).catch(next)
);

router.post('/login', authRateLimiter, validate(loginSchema), (req, res, next) =>
  authController.login(req, res).catch(next)
);

router.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res).catch(next)
);

router.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res).catch(next)
);

module.exports = router;
