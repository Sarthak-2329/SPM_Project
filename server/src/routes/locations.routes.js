'use strict';

const { Router } = require('express');
const { z } = require('zod');
const locationService = require('../services/location.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { sendSuccess } = require('../utils/response');

const router = Router();

const locationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['CAMPUS', 'BUILDING', 'FLOOR', 'ROOM']),
  parentId: z.string().nullable().optional(),
});

// Authenticated users can read locations (needed for filters and request form)
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const locations = await locationService.getAllLocations();
    return sendSuccess(res, { message: 'Locations retrieved', data: locations });
  } catch (err) {
    next(err);
  }
});

// Admin-only mutation routes
router.post('/', rbac('ADMIN'), validate(locationSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const location = await locationService.createLocation(req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Location created', data: location, statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rbac('ADMIN'), validate(locationSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const location = await locationService.updateLocation(req.params.id, req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Location updated', data: location });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    await locationService.deleteLocation(req.params.id, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Location deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
