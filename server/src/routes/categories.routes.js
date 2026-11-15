'use strict';

const { Router } = require('express');
const { z } = require('zod');
const categoryService = require('../services/category.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { sendSuccess } = require('../utils/response');

const router = Router();

const categorySchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories();
    return sendSuccess(res, { message: 'Categories retrieved', data: categories });
  } catch (err) {
    next(err);
  }
});

router.post('/', rbac('ADMIN'), validate(categorySchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const category = await categoryService.createCategory(req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Category created', data: category, statusCode: 201 });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', rbac('ADMIN'), validate(categorySchema), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    const category = await categoryService.updateCategory(req.params.id, req.body, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Category updated', data: category });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', rbac('ADMIN'), async (req, res, next) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress;
    await categoryService.deleteCategory(req.params.id, req.user.id, clientIp);
    return sendSuccess(res, { message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
