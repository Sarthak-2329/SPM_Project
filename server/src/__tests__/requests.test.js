'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('Maintenance Requests & Approval Transactions (FR-05, FR-06)', () => {
  let adminToken;
  let requesterToken;
  let sampleAsset;
  let createdRequestId;
  let createdWorkOrderId;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'Campus@1234',
    });
    adminToken = adminRes.body.data.token;

    const reqRes = await request(app).post('/api/auth/login').send({
      email: 'student.rahul@campus.edu',
      password: 'Campus@1234',
    });
    requesterToken = reqRes.body.data.token;

    sampleAsset = await prisma.asset.findFirst({ where: { status: 'ACTIVE' } });
  });

  afterAll(async () => {
    if (createdWorkOrderId) {
      await prisma.workOrderStatusHistory.deleteMany({ where: { workOrderId: createdWorkOrderId } });
      await prisma.workOrder.deleteMany({ where: { id: createdWorkOrderId } });
    }
    if (createdRequestId) {
      await prisma.maintenanceRequest.deleteMany({ where: { id: createdRequestId } });
    }
  });

  it('TC-0401: should allow a Requester to submit a maintenance request (201)', async () => {
    const res = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .field('description', 'AC in Classroom 101 is emitting a loud rattling noise and not cooling')
      .field('priority', 'HIGH')
      .field('assetId', sampleAsset.id);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.priority).toBe('HIGH');
    createdRequestId = res.body.data.id;
  });

  it('TC-0404: should reject a request when admin provides a valid reason', async () => {
    // Create temporary request to reject
    const tempReq = await prisma.maintenanceRequest.create({
      data: {
        requesterId: (await prisma.user.findUnique({ where: { email: 'student.rahul@campus.edu' } })).id,
        description: 'Duplicate fault report test',
        priority: 'LOW',
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .post(`/api/requests/${tempReq.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Duplicate issue already logged in WO-2024-001' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('REJECTED');
    expect(res.body.data.rejectionReason).toBe('Duplicate issue already logged in WO-2024-001');

    // Verify NO work order was created for this request
    const woCheck = await prisma.workOrder.findFirst({
      where: { maintenanceRequestId: tempReq.id },
    });
    expect(woCheck).toBeNull();

    await prisma.maintenanceRequest.delete({ where: { id: tempReq.id } });
  });

  it('TC-0403: should approve request and atomically generate EXACTLY ONE work order', async () => {
    const techUser = await prisma.user.findFirst({ where: { role: 'TECHNICIAN' } });

    const res = await request(app)
      .post(`/api/requests/${createdRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Repair noisy compressor unit',
        assigneeId: techUser.id,
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('APPROVED');
    expect(res.body.data.workOrder).toBeDefined();
    expect(res.body.data.workOrder.maintenanceRequestId).toBe(createdRequestId);
    expect(res.body.data.workOrder.status).toBe('ASSIGNED');

    createdWorkOrderId = res.body.data.workOrder.id;

    // Verify database has exactly 1 linked work order
    const totalWOs = await prisma.workOrder.count({
      where: { maintenanceRequestId: createdRequestId },
    });
    expect(totalWOs).toBe(1);

    // Verify status history row was created
    const history = await prisma.workOrderStatusHistory.findMany({
      where: { workOrderId: createdWorkOrderId },
    });
    expect(history.length).toBe(1);
    expect(history[0].toStatus).toBe('ASSIGNED');
  });

  it('should prevent re-approving an already APPROVED request (400)', async () => {
    const res = await request(app)
      .post(`/api/requests/${createdRequestId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Duplicate approve' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already APPROVED/i);
  });
});
