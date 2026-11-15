'use strict';

/**
 * Root router — mounts all feature routers under /api.
 */

const { Router } = require('express');
const healthRouter = require('./health.routes');
const authRouter = require('./auth.routes');
const usersRouter = require('./users.routes');
const locationsRouter = require('./locations.routes');
const categoriesRouter = require('./categories.routes');
const assetsRouter = require('./assets.routes');
const auditLogsRouter = require('./auditLogs.routes');
const maintenanceRequestsRouter = require('./maintenanceRequests.routes');
const workOrdersRouter = require('./workOrders.routes');
const notificationsRouter = require('./notifications.routes');
const pmSchedulesRouter = require('./pmSchedules.routes');
const partsRouter = require('./parts.routes');
const suppliersRouter = require('./suppliers.routes');
const dashboardRouter = require('./dashboard.routes');
const reportsRouter = require('./reports.routes');

const router = Router();

// ── Health check (unauthenticated) ────────────────────────────────────────────
router.use('/health', healthRouter);

// ── Feature routers (Active in Phase 2, 3, 4 & 5) ──────────────────────────────
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/locations', locationsRouter);
router.use('/categories', categoriesRouter);
router.use('/assets', assetsRouter);
router.use('/audit-logs', auditLogsRouter);
router.use('/requests', maintenanceRequestsRouter);
router.use('/work-orders', workOrdersRouter);
router.use('/notifications', notificationsRouter);
router.use('/pm-schedules', pmSchedulesRouter);
router.use('/parts', partsRouter);
router.use('/suppliers', suppliersRouter);
router.use('/dashboard', dashboardRouter);
router.use('/reports', reportsRouter);

// ── 404 handler for unknown /api/* routes ─────────────────────────────────────
router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    data: null,
  });
});

module.exports = router;
