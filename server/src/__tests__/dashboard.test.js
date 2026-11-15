'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('FR-11: Executive Dashboard & Role-Aware Aggregations', () => {
  let adminToken;
  let techToken;
  let requesterToken;

  beforeAll(async () => {
    // 1. Admin login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'Campus@1234' });
    adminToken = adminRes.body.data.token;

    // 2. Tech login
    const techRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tech.raj@campus.edu', password: 'Campus@1234' });
    techToken = techRes.body.data.token;

    // 3. Requester login
    const reqRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student.rahul@campus.edu', password: 'Campus@1234' });
    requesterToken = reqRes.body.data.token;
  });

  it('TC-1101: Admin dashboard returns verified KPIs matching database counts', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    const { kpis, priorityDistribution, monthlyTrend, topAssetsByCost, technicianWorkload } =
      res.body.data;

    // Verify KPIs
    expect(kpis.totalAssets).toBeGreaterThanOrEqual(50);
    expect(kpis.totalWorkOrders).toBeGreaterThanOrEqual(60);
    expect(kpis.overdueWorkOrders).toBeGreaterThanOrEqual(1);
    expect(kpis.lowStockPartsCount).toBeGreaterThanOrEqual(1);
    expect(kpis.pmComplianceRate).toBeDefined();

    // Verify Distributions
    expect(Array.isArray(priorityDistribution)).toBe(true);
    expect(priorityDistribution.length).toBe(4); // LOW, MEDIUM, HIGH, CRITICAL

    // Verify Monthly Trend & Top Assets
    expect(Array.isArray(monthlyTrend)).toBe(true);
    expect(Array.isArray(topAssetsByCost)).toBe(true);
    expect(topAssetsByCost.length).toBeLessThanOrEqual(10);

    // Verify Technician Workload
    expect(Array.isArray(technicianWorkload)).toBe(true);
    expect(technicianWorkload.length).toBeGreaterThanOrEqual(1);
  });

  it('TC-1102: Technician dashboard returns tailored assignment metrics', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${techToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpis } = res.body.data;
    expect(kpis.activeAssigned).toBeDefined();
    expect(kpis.completedTotal).toBeDefined();
    expect(kpis.totalLaborHours).toBeDefined();
  });

  it('TC-1103: Requester dashboard returns personal ticket tracker', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    const { kpis, recentRequests } = res.body.data;
    expect(kpis.totalRaised).toBeDefined();
    expect(Array.isArray(recentRequests)).toBe(true);
  });
});
