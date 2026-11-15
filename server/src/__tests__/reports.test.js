'use strict';

const request = require('supertest');
const app = require('../index');

describe('FR-12: Reports & CSV/PDF Data Exports', () => {
  let adminToken;

  beforeAll(async () => {
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@campus.edu', password: 'Campus@1234' });
    adminToken = adminRes.body.data.token;
  });

  it('TC-1201: Retrieve JSON preview for Work Orders report', async () => {
    const res = await request(app)
      .get('/api/reports/preview?type=WORK_ORDERS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalCount).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  it('TC-1202: Export Work Orders report as CSV', async () => {
    const res = await request(app)
      .get('/api/reports/export/csv?type=WORK_ORDERS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('.csv');
    expect(res.text).toContain('Work Order ID,Title,Status,Priority');
  });

  it('TC-1203: Export Work Orders report as PDF', async () => {
    const res = await request(app)
      .get('/api/reports/export/pdf?type=WORK_ORDERS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    // PDF Magic bytes %PDF
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('TC-1204: Export Inventory and Cost Analysis reports in CSV & PDF', async () => {
    // Inventory CSV
    const invCsv = await request(app)
      .get('/api/reports/export/csv?type=INVENTORY')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(invCsv.statusCode).toBe(200);
    expect(invCsv.text).toContain('Part Code,Name,Unit Cost');

    // Cost Analysis PDF
    const costPdf = await request(app)
      .get('/api/reports/export/pdf?type=COST_ANALYSIS')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(costPdf.statusCode).toBe(200);
    expect(costPdf.headers['content-type']).toBe('application/pdf');
    expect(costPdf.body.slice(0, 4).toString()).toBe('%PDF');
  });
});
