'use strict';

const { Router } = require('express');
const { z } = require('zod');
const inventoryService = require('../services/inventory.service');
const supplierRepository = require('../repositories/supplier.repository');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { sendSuccess } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

const router = Router();

const partSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  partCode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  stockQty: z.number().or(z.string()).optional(),
  reorderLevel: z.number().or(z.string()).optional(),
  unitCost: z.number().or(z.string()),
  supplierId: z.string().optional().nullable(),
});

router.use(authenticate);

// List parts (Admin + Technician)
router.get('/', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const { skip, take, page, limit } = parsePagination(req.query);
    const { search, supplierId, lowStock } = req.query;

    const { items, total } = await inventoryService.getParts({
      skip,
      take,
      search,
      supplierId,
      lowStock,
    });

    return sendSuccess(res, {
      message: 'Parts retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const part = await inventoryService.getPartById(req.params.id);
    return sendSuccess(res, { message: 'Part details retrieved', data: part });
  } catch (err) {
    next(err);
  }
});

// Admin-only Part Mutation
router.post('/', rbac('ADMIN'), validate(partSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const part = await inventoryService.createPart(req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Part created successfully', data: part, statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rbac('ADMIN'), validate(partSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const part = await inventoryService.updatePart(req.params.id, req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Part updated successfully', data: part });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    await inventoryService.deletePart(req.params.id, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Part deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
