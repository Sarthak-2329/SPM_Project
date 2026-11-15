'use strict';

const pmScheduleRepository = require('../repositories/pmSchedule.repository');
const pmSchedulerService = require('../services/pmScheduler.service');
const auditService = require('../services/audit.service');

class PMScheduleService {
  async getSchedules() {
    return pmScheduleRepository.findMany();
  }

  async getScheduleById(id) {
    const s = await pmScheduleRepository.findById(id);
    if (!s) {
      const err = new Error('PM schedule not found');
      err.statusCode = 404;
      throw err;
    }
    return s;
  }

  async createSchedule(data, adminId, clientIp) {
    const schedule = await pmScheduleRepository.create(data, data.checklistItems || []);

    await auditService.log({
      userId: adminId,
      action: 'CREATE_PM_SCHEDULE',
      entityType: 'PMSchedule',
      entityId: schedule.id,
      details: { name: schedule.name, frequencyDays: schedule.frequencyDays, assetId: schedule.assetId },
      ipAddress: clientIp,
    });

    return schedule;
  }

  async updateSchedule(id, data, adminId, clientIp) {
    const existing = await pmScheduleRepository.findById(id);
    if (!existing) {
      const err = new Error('PM schedule not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await pmScheduleRepository.update(id, data, data.checklistItems);

    await auditService.log({
      userId: adminId,
      action: 'UPDATE_PM_SCHEDULE',
      entityType: 'PMSchedule',
      entityId: id,
      details: data,
      ipAddress: clientIp,
    });

    return updated;
  }

  async toggleActive(id, isActive, adminId, clientIp) {
    const updated = await pmScheduleRepository.toggleActive(id, isActive);
    await auditService.log({
      userId: adminId,
      action: 'TOGGLE_PM_SCHEDULE',
      entityType: 'PMSchedule',
      entityId: id,
      details: { isActive },
      ipAddress: clientIp,
    });
    return updated;
  }

  async runSchedulerNow(adminId, clientIp) {
    return pmSchedulerService.runDueSchedules(adminId, clientIp);
  }
}

module.exports = new PMScheduleService();
