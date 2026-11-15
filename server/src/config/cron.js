'use strict';

/**
 * Cron Job Configuration
 * Runs PM Scheduler daily or at configurable intervals to auto-generate work orders.
 */

const cron = require('node-cron');
const pmSchedulerService = require('../services/pmScheduler.service');
const alertSchedulerService = require('../services/alertScheduler.service');

let cronTask = null;
let alertCronTask = null;

function initScheduler() {
  if (process.env.NODE_ENV === 'test') {
    return; // Don't run background cron during unit/integration tests
  }

  // 1. PM Scheduler Job: midnight by default
  const scheduleExpr = process.env.PM_CRON_SCHEDULE || '0 0 * * *';
  cronTask = cron.schedule(scheduleExpr, async () => {
    console.info(`[CRON ${new Date().toISOString()}] Running preventive maintenance scheduler...`);
    try {
      const result = await pmSchedulerService.runDueSchedules();
      console.info(`[CRON] PM Scheduler completed: ${result.generatedCount} work order(s) created from ${result.scannedSchedules} due schedule(s).`);
    } catch (err) {
      console.error('[CRON ERROR] Failed to run PM scheduler:', err);
    }
  });

  // 2. Daily Overdue & Warranty Alerts Job (e.g. 06:00 AM daily)
  const alertScheduleExpr = process.env.ALERT_CRON_SCHEDULE || '0 6 * * *';
  alertCronTask = cron.schedule(alertScheduleExpr, async () => {
    try {
      await alertSchedulerService.runDailyAlerts();
    } catch (err) {
      console.error('[CRON ERROR] Failed to run alert scheduler:', err);
    }
  });

  console.info(`📅 PM Scheduler cron initialised with schedule: "${scheduleExpr}"`);
  console.info(`🔔 Alert Scheduler cron initialised with schedule: "${alertScheduleExpr}"`);
}

function stopScheduler() {
  if (cronTask) cronTask.stop();
  if (alertCronTask) alertCronTask.stop();
}

module.exports = {
  initScheduler,
  stopScheduler,
};
