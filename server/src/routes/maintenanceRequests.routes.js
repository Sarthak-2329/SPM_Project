'use strict';

const { Router } = require('express');
const { z } = require('zod');
const maintenanceRequestController = require('../controllers/maintenanceRequest.controller');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = Router();

const createRequestSchema = z.object({
  description: z.string().min(5, 'Description must be at least 5 characters'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assetId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
});

const approveRequestSchema = z.object({
  title: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

const rejectRequestSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
});

router.use(authenticate);

router.post(
  '/',
  upload.single('photo'),
  validate(createRequestSchema),
  (req, res, next) => maintenanceRequestController.create(req, res).catch(next)
);

router.get('/', (req, res, next) =>
  maintenanceRequestController.list(req, res).catch(next)
);

router.get('/:id', (req, res, next) =>
  maintenanceRequestController.getById(req, res).catch(next)
);

router.post(
  '/:id/approve',
  rbac('ADMIN'),
  validate(approveRequestSchema),
  (req, res, next) => maintenanceRequestController.approve(req, res).catch(next)
);

router.post(
  '/:id/reject',
  rbac('ADMIN'),
  validate(rejectRequestSchema),
  (req, res, next) => maintenanceRequestController.reject(req, res).catch(next)
);

module.exports = router;
