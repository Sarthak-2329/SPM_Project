'use strict';

const workOrderController = require('../controllers/workOrder.controller');
const inventoryService = require('../services/inventory.service');
const { sendSuccess } = require('../utils/response');
const { Router } = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');

const router = Router();

const createWorkOrderSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  assetId: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedCost: z.number().or(z.string()).optional().nullable(),
});

const transitionStatusSchema = z.object({
  status: z.enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED']),
  reason: z.string().optional().nullable(),
});

const assignSchema = z.object({
  technicianId: z.string().min(1, 'technicianId is required'),
});

const noteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty'),
});

const logTimeSchema = z.object({
  hours: z.number().or(z.string()).refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Hours must be greater than 0',
  }),
});

const addPartSchema = z.object({
  partId: z.string().min(1, 'partId is required'),
  quantityUsed: z.number().or(z.string()).refine((val) => !isNaN(parseInt(val, 10)) && parseInt(val, 10) > 0, {
    message: 'Quantity must be a positive integer',
  }),
});

router.use(authenticate);

// Listing & View (Admin + Technician)
router.get('/', rbac('ADMIN', 'TECHNICIAN'), (req, res, next) =>
  workOrderController.list(req, res).catch(next)
);

router.get('/:id', rbac('ADMIN', 'TECHNICIAN'), (req, res, next) =>
  workOrderController.getById(req, res).catch(next)
);

// Admin-only creation & assignment
router.post(
  '/',
  rbac('ADMIN'),
  validate(createWorkOrderSchema),
  (req, res, next) => workOrderController.create(req, res).catch(next)
);

router.patch(
  '/:id/assign',
  rbac('ADMIN'),
  validate(assignSchema),
  (req, res, next) => workOrderController.assign(req, res).catch(next)
);

// Status transition (Admin + Technician per state machine rules)
router.patch(
  '/:id/status',
  rbac('ADMIN', 'TECHNICIAN'),
  validate(transitionStatusSchema),
  (req, res, next) => workOrderController.transitionStatus(req, res).catch(next)
);

// Notes & Time (Admin + Technician)
router.post(
  '/:id/notes',
  rbac('ADMIN', 'TECHNICIAN'),
  validate(noteSchema),
  (req, res, next) => workOrderController.addNote(req, res).catch(next)
);

router.patch(
  '/:id/time',
  rbac('ADMIN', 'TECHNICIAN'),
  validate(logTimeSchema),
  (req, res, next) => workOrderController.logTime(req, res).catch(next)
);

// Parts Used Management (FR-09)
router.post(
  '/:id/parts',
  rbac('ADMIN', 'TECHNICIAN'),
  validate(addPartSchema),
  async (req, res, next) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress;
      const result = await inventoryService.addPartToWorkOrder(
        req.params.id,
        req.body.partId,
        req.body.quantityUsed,
        req.user.id,
        clientIp
      );
      return sendSuccess(res, {
        message: 'Part added to work order and stock deducted',
        data: result,
        statusCode: 201,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/:id/parts/:partId',
  rbac('ADMIN', 'TECHNICIAN'),
  async (req, res, next) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress;
      const result = await inventoryService.removePartFromWorkOrder(
        req.params.id,
        req.params.partId,
        req.user.id,
        clientIp
      );
      return sendSuccess(res, {
        message: 'Part removed from work order and stock restored',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
