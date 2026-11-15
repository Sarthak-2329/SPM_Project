'use strict';

const { Router } = require('express');
const { z } = require('zod');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = Router();

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['ADMIN', 'TECHNICIAN'], {
    errorMap: () => ({ message: 'Role must be ADMIN or TECHNICIAN' }),
  }),
  phone: z.string().optional(),
});

const toggleStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive boolean flag is required' }),
});

router.use(authenticate);
router.use(rbac('ADMIN')); // All user management endpoints require ADMIN role

router.get('/', (req, res, next) => userController.listUsers(req, res).catch(next));

router.post('/', validate(createUserSchema), (req, res, next) =>
  userController.createUser(req, res).catch(next)
);

router.patch('/:id/status', validate(toggleStatusSchema), (req, res, next) =>
  userController.toggleStatus(req, res).catch(next)
);

module.exports = router;
