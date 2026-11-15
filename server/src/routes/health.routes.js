'use strict';

/**
 * Health-check router.
 * GET /api/health  — returns server + DB status (no auth required).
 * Used by the Phase 1 acceptance test and by monitoring tools.
 */

const { Router } = require('express');
const { prisma } = require('../config/database');

const router = Router();

router.get('/', async (req, res) => {
  let dbStatus = 'ok';
  let dbLatencyMs = null;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`; // simplest possible DB ping
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  const status = dbStatus === 'ok' ? 'healthy' : 'degraded';

  return res.status(dbStatus === 'ok' ? 200 : 503).json({
    success: dbStatus === 'ok',
    message: `CMMS API is ${status}`,
    data: {
      status,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(process.uptime())}s`,
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    },
  });
});

module.exports = router;
