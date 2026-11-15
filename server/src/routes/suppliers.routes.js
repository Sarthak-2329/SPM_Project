'use strict';

const { Router } = require('express');
const { z } = require('zod');
const supplierRepository = require('../repositories/supplier.repository');
const auditService = require('../services/audit.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { sendSuccess } = require('../utils/response');

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

router.use(authenticate);

router.get('/', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const suppliers = await supplierRepository.findAll();
    return sendSuccess(res, { message: 'Suppliers retrieved', data: suppliers });
  } catch (err) {
    next(err);
  }
});

router.post('/', rbac('ADMIN'), validate(supplierSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const supplier = await supplierRepository.create(req.body);
    await auditService.log({
      userId: req.user.id,
      action: 'CREATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: { name: supplier.name },
      ipAddress: clientIp,
    });
    return sendSuccess(res, { message: 'Supplier created', data: supplier, statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rbac('ADMIN'), validate(supplierSchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const supplier = await supplierRepository.update(req.params.id, req.body);
    await auditService.log({
      userId: req.user.id,
      action: 'UPDATE_SUPPLIER',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: req.body,
      ipAddress: clientIp,
    });
    return sendSuccess(res, { message: 'Supplier updated', data: supplier });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    await supplierRepository.delete(req.params.id);
    await auditService.log({
      userId: req.user.id,
      action: 'DELETE_SUPPLIER',
      entityType: 'Supplier',
      entityId: req.params.id,
      ipAddress: clientIp,
    });
    return sendSuccess(res, { message: 'Supplier deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
