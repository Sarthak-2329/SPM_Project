'use strict';

const { Router } = require('express');
const dashboardService = require('../services/dashboard.service');
const { authenticate } = require('../middleware/auth');
const { sendSuccess } = require('../utils/response');

const router = Router();

router.use(authenticate);

/**
 * GET /api/dashboard
 * Role-aware endpoint returning tailored operational analytics.
 */
router.get('/', async (req, res, next) => {
  try {
    const metrics = await dashboardService.getDashboardMetrics(req.user);
    return sendSuccess(res, {
      message: 'Dashboard metrics retrieved successfully',
      data: metrics,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
