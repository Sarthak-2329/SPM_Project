'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('FR-08: Preventive Maintenance Scheduler & Idempotency', () => {
  let adminToken;
  let technicianToken;
  let testAsset;
  let testSchedule;

  beforeAll(async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'Campus@1234' });
    adminToken = adminRes.body.data.token;

    // 2. Login Technician
    const techRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tech.raj@campus.edu', password: 'Campus@1234' });
    technicianToken = techRes.body.data.token;

    // 3. Find an asset
    testAsset = await prisma.asset.findFirst();

    // 4. Create a PM schedule that is due today
    const scheduleRes = await request(app)
      .post('/api/pm-schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assetId: testAsset.id,
        name: 'Bi-Weekly AC Filter Cleaning & Inspection',
        description: 'Clean return air filters, check refrigerant pressure and amperage',
        frequencyDays: 14,
        nextDueDate: new Date().toISOString(),
        checklistItems: [
          'Power off indoor and outdoor unit',
          'Wash pre-filters with low-pressure water',
          'Measure running current with clamp meter',
        ],
      });

    expect(scheduleRes.statusCode).toBe(201);
    testSchedule = scheduleRes.body.data;
  });

  afterAll(async () => {
    // Cleanup generated work orders and schedule
    if (testSchedule) {
      const wos = await prisma.workOrder.findMany({
        where: { pmScheduleId: testSchedule.id },
        select: { id: true },
      });
      const woIds = wos.map((w) => w.id);
      if (woIds.length > 0) {
        await prisma.workOrderStatusHistory.deleteMany({
          where: { workOrderId: { in: woIds } },
        });
        await prisma.workOrder.deleteMany({
          where: { id: { in: woIds } },
        });
      }
      await prisma.pMChecklistItem.deleteMany({
        where: { scheduleId: testSchedule.id },
      });
      await prisma.pMSchedule.deleteMany({
        where: { id: testSchedule.id },
      });
    }
  });

  it('TC-0601: Admin can create and list PM schedules with checklist items', async () => {
    const res = await request(app)
      .get('/api/pm-schedules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    const found = res.body.data.find((s) => s.id === testSchedule.id);
    expect(found).toBeDefined();
    expect(found.checklistItems.length).toBe(3);
  });

  it('TC-0602: Scheduler creates a work order on first run (Run Now)', async () => {
    const runRes1 = await request(app)
      .post('/api/pm-schedules/run-now')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(runRes1.statusCode).toBe(200);
    expect(runRes1.body.success).toBe(true);
    expect(runRes1.body.data.scannedSchedules).toBeGreaterThanOrEqual(1);
    expect(runRes1.body.data.generatedCount).toBeGreaterThanOrEqual(1);

    // Verify work order created in DB
    const wo = await prisma.workOrder.findFirst({
      where: { pmScheduleId: testSchedule.id },
    });
    expect(wo).toBeDefined();
    expect(wo.title).toContain(testSchedule.name);
    expect(wo.description).toContain('Checklist Inspection Tasks');
    expect(wo.description).toContain('Power off indoor and outdoor unit');
  });

  it('TC-0603: Scheduler is strictly IDEMPOTENT — second run today creates 0 new work orders for this schedule', async () => {
    const countBefore = await prisma.workOrder.count({
      where: { pmScheduleId: testSchedule.id },
    });

    const runRes2 = await request(app)
      .post('/api/pm-schedules/run-now')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(runRes2.statusCode).toBe(200);
    expect(runRes2.body.success).toBe(true);

    const countAfter = await prisma.workOrder.count({
      where: { pmScheduleId: testSchedule.id },
    });

    // Count must be completely unchanged
    expect(countAfter).toBe(countBefore);
  });

  it('TC-0604: Non-admin users cannot trigger manual scheduler execution', async () => {
    const res = await request(app)
      .post('/api/pm-schedules/run-now')
      .set('Authorization', `Bearer ${technicianToken}`);

    expect(res.statusCode).toBe(403);
  });
});
