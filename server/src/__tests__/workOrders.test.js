'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('Work Orders State Machine & Life Cycle (FR-07, FR-10)', () => {
  let adminToken;
  let tech1Token;
  let tech2Token;
  let tech1User;
  let sampleAsset;
  let testWorkOrderId;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'Campus@1234',
    });
    adminToken = adminRes.body.data.token;

    const tech1Res = await request(app).post('/api/auth/login').send({
      email: 'tech.raj@campus.edu',
      password: 'Campus@1234',
    });
    tech1Token = tech1Res.body.data.token;
    tech1User = tech1Res.body.data.user;

    const tech2Res = await request(app).post('/api/auth/login').send({
      email: 'tech.priya@campus.edu',
      password: 'Campus@1234',
    });
    tech2Token = tech2Res.body.data.token;

    sampleAsset = await prisma.asset.findFirst({ where: { status: 'ACTIVE' } });
  });

  afterAll(async () => {
    if (testWorkOrderId) {
      await prisma.workOrderNote.deleteMany({ where: { workOrderId: testWorkOrderId } });
      await prisma.workOrderStatusHistory.deleteMany({ where: { workOrderId: testWorkOrderId } });
      await prisma.workOrder.deleteMany({ where: { id: testWorkOrderId } });
    }
  });

  it('TC-0501: should allow Admin to manually create a work order in OPEN state', async () => {
    const res = await request(app)
      .post('/api/work-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Emergency Generator Fuel Pump Overhaul',
        description: 'Conduct diagnostic check and replace secondary fuel filter',
        priority: 'CRITICAL',
        assetId: sampleAsset.id,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        estimatedCost: 3500,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('OPEN');
    testWorkOrderId = res.body.data.id;
  });

  it('TC-0503: should reject illegal direct jump from OPEN -> COMPLETED (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'COMPLETED' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid status transition/i);
  });

  it('TC-0502: should assign Technician and transition status to ASSIGNED', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ technicianId: tech1User.id });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ASSIGNED');
    expect(res.body.data.assigneeId).toBe(tech1User.id);
  });

  it('should prevent non-assigned technician from modifying work order (403)', async () => {
    const res = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech2Token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/Access denied/i);
  });

  it('should allow assigned technician to progress to IN_PROGRESS and then ON_HOLD with reason', async () => {
    // 1. Move to IN_PROGRESS
    const res1 = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('IN_PROGRESS');

    // 2. Fail ON_HOLD without reason
    const resFail = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'ON_HOLD' });

    expect(resFail.status).toBe(400);
    expect(resFail.body.message).toMatch(/reason is mandatory/i);

    // 3. Move to ON_HOLD with valid reason
    const res2 = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'ON_HOLD', reason: 'Waiting for Bosch fuel filter replacement part' });

    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('ON_HOLD');
  });

  it('should allow technician to log work notes and hours spent', async () => {
    const noteRes = await request(app)
      .post(`/api/work-orders/${testWorkOrderId}/notes`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ content: 'Disassembled old filter housing. Cleaned copper fuel line.' });

    expect(noteRes.status).toBe(201);
    expect(noteRes.body.data.content).toBe('Disassembled old filter housing. Cleaned copper fuel line.');

    const timeRes = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/time`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ hours: 2.5 });

    expect(timeRes.status).toBe(200);
    expect(timeRes.body.data.timeSpent).toBe(2.5);
  });

  it('should progress ON_HOLD -> IN_PROGRESS -> COMPLETED -> CLOSED and verify status history timeline', async () => {
    // 1. Resume to IN_PROGRESS
    await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'IN_PROGRESS' });

    // 2. Mark COMPLETED by Technician
    const compRes = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'COMPLETED' });

    expect(compRes.status).toBe(200);
    expect(compRes.body.data.status).toBe('COMPLETED');

    // 3. Technician cannot close directly (requires Admin verification)
    const closeFail = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${tech1Token}`)
      .send({ status: 'CLOSED' });

    expect(closeFail.status).toBe(400);

    // 4. Admin closes work order
    const closeRes = await request(app)
      .patch(`/api/work-orders/${testWorkOrderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CLOSED', reason: 'Verified generator output voltage is steady.' });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.data.status).toBe('CLOSED');

    // 5. Query status history and verify full audit trail
    const woDetails = await request(app)
      .get(`/api/work-orders/${testWorkOrderId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(woDetails.status).toBe(200);
    const history = woDetails.body.data.statusHistory;
    expect(history.length).toBeGreaterThanOrEqual(6);
    expect(history.some((h) => h.toStatus === 'ON_HOLD')).toBe(true);
    expect(history.some((h) => h.toStatus === 'CLOSED')).toBe(true);
  });
});
