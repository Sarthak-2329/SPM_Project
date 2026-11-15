'use strict';

const { Router } = require('express');
const { z } = require('zod');
const pmScheduleService = require('../services/pmSchedule.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { sendSuccess } = require('../utils/response');

const router = Router();

const createScheduleSchema = z.object({
  name: z.string().min(3, 'Name is required'),
  assetId: z.string().min(1, 'Asset is required'),
  frequencyDays: z.number().or(z.string()).refine((val) => parseInt(val, 10) > 0, {
    message: 'Frequency must be at least 1 day',
  }),
  nextDueDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  checklistItems: z.array(z.string()).optional(),
});

router.use(authenticate);

// Listing accessible to Admin + Technician
router.get('/', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const schedules = await pmScheduleService.getSchedules();
    return sendSuccess(res, { message: 'PM schedules retrieved', data: schedules });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const schedule = await pmScheduleService.getScheduleById(req.params.id);
    return sendSuccess(res, { message: 'PM schedule details retrieved', data: schedule });
  } catch (err) {
    next(err);
  }
});

// Admin-only mutation
router.post('/', rbac('ADMIN'), validate(createScheduleSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const schedule = await pmScheduleService.createSchedule(req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'PM schedule created', data: schedule, statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rbac('ADMIN'), validate(createScheduleSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const schedule = await pmScheduleService.updateSchedule(req.params.id, req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'PM schedule updated', data: schedule });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const { isActive } = req.body;
    const schedule = await pmScheduleService.toggleActive(req.params.id, isActive, req.user.id, clientIp);
    return sendSuccess(res, { message: `PM schedule ${isActive ? 'activated' : 'deactivated'}`, data: schedule });
  } catch (err) {
    next(err);
  }
});

// Admin Live Trigger Endpoint for Demo
router.post('/run-now', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const result = await pmScheduleService.runSchedulerNow(req.user.id, clientIp);
    return sendSuccess(res, {
      message: `PM Scheduler executed: generated ${result.generatedCount} work orders.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
