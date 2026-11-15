'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('FR-09: Inventory Management & Atomic Stock Deductions', () => {
  let adminToken;
  let technicianToken;
  let testSupplier;
  let testPart;
  let testWorkOrder;

  beforeAll(async () => {
    // 1. Logins
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'Campus@1234' });
    adminToken = adminRes.body.data.token;

    const techRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tech.raj@campus.edu', password: 'Campus@1234' });
    technicianToken = techRes.body.data.token;

    // 2. Create supplier
    testSupplier = await prisma.supplier.create({
      data: {
        name: 'Test Industrial Hardware Supplies',
        contactName: 'Ramesh Patel',
        email: 'ramesh.supplies@test.edu',
        phone: '+91 9876543299',
      },
    });

    // 3. Create part with exactly 5 in stock and reorderLevel of 3
    testPart = await prisma.part.create({
      data: {
        partCode: `PRT-TST-${Date.now().toString().slice(-4)}`,
        name: 'Schneider Contactor 32A',
        description: '3-pole motor contactor',
        unitCost: 750.0,
        stockQty: 5,
        reorderLevel: 3,
        supplierId: testSupplier.id,
      },
    });

    // 4. Create an open work order assigned to tech
    const adminUser = await prisma.user.findUnique({ where: { email: 'admin@campus.edu' } });
    const techUser = await prisma.user.findUnique({ where: { email: 'tech.raj@campus.edu' } });
    const asset = await prisma.asset.findFirst();

    testWorkOrder = await prisma.workOrder.create({
      data: {
        title: 'AC Motor Starter Replacement',
        description: 'Replace burned out contactor',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        assetId: asset.id,
        createdById: adminUser.id,
        assigneeId: techUser.id,
        timeSpent: 2.0, // 2 hours labour
      },
    });
  });

  afterAll(async () => {
    if (testWorkOrder) {
      await prisma.workOrderPart.deleteMany({ where: { workOrderId: testWorkOrder.id } });
      await prisma.workOrder.deleteMany({ where: { id: testWorkOrder.id } });
    }
    if (testPart) {
      await prisma.part.deleteMany({ where: { id: testPart.id } });
    }
    if (testSupplier) {
      await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
    }
  });

  it('TC-0701: Successfully add parts to a work order, deduct stock, and update total cost', async () => {
    const res = await request(app)
      .post(`/api/work-orders/${testWorkOrder.id}/parts`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        partId: testPart.id,
        quantityUsed: 2,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workOrderPart.quantityUsed).toBe(2);
    expect(res.body.data.workOrderPart.unitCostAtTime).toBe(750.0);

    // Verify stock deducted in DB: 5 - 2 = 3
    const updatedPart = await prisma.part.findUnique({ where: { id: testPart.id } });
    expect(updatedPart.stockQty).toBe(3);

    // Total cost calculation:
    // parts: 2 * 750 = 1500
    // labour: 2 hours * 250/hr = 500
    // total: 2000
    const updatedWO = await prisma.workOrder.findUnique({ where: { id: testWorkOrder.id } });
    expect(updatedWO.actualCost).toBe(2000.0);
  });

  it('TC-0702: Reject part deduction when stock is insufficient (stock must NEVER go negative)', async () => {
    // Current stock is 3, attempting to use 4
    const res = await request(app)
      .post(`/api/work-orders/${testWorkOrder.id}/parts`)
      .set('Authorization', `Bearer ${technicianToken}`)
      .send({
        partId: testPart.id,
        quantityUsed: 4,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');

    // Verify stock is untouched at 3
    const checkPart = await prisma.part.findUnique({ where: { id: testPart.id } });
    expect(checkPart.stockQty).toBe(3);
  });

  it('TC-0703: Removing a part from work order restores stock and recalculates cost', async () => {
    const res = await request(app)
      .delete(`/api/work-orders/${testWorkOrder.id}/parts/${testPart.id}`)
      .set('Authorization', `Bearer ${technicianToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    // Stock should be restored back to 5
    const restoredPart = await prisma.part.findUnique({ where: { id: testPart.id } });
    expect(restoredPart.stockQty).toBe(5);

    // Cost should now reflect only labour: 2 hours * 250 = 500
    const recalculatedWO = await prisma.workOrder.findUnique({ where: { id: testWorkOrder.id } });
    expect(recalculatedWO.actualCost).toBe(500.0);
  });

  it('TC-0704: Low-stock filter and badge returns parts with stock <= reorderLevel', async () => {
    // Set part stock to 2 (<= reorderLevel 3)
    await prisma.part.update({
      where: { id: testPart.id },
      data: { stockQty: 2 },
    });

    const res = await request(app)
      .get('/api/parts?lowStock=true')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const lowStockParts = res.body.data.items;
    const found = lowStockParts.find((p) => p.id === testPart.id);
    expect(found).toBeDefined();
    expect(found.isLowStock).toBe(true);
  });
});
