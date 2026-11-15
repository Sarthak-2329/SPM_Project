'use strict';

const { Router } = require('express');
const auditService = require('../services/audit.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { parsePagination, paginationMeta } = require('../utils/pagination');
const { sendSuccess } = require('../utils/response');

const router = Router();

router.use(authenticate);
router.use(rbac('ADMIN')); // Audit logs are strictly ADMIN accessible

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { entityType, action, userId } = req.query;

    const { items, total } = await auditService.getLogs({
      page,
      limit,
      skip,
      take,
      entityType,
      action,
      userId,
    });

    return sendSuccess(res, {
      message: 'Audit logs retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
