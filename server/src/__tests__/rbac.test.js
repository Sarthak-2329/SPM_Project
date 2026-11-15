'use strict';

const request = require('supertest');
const app = require('../index');

describe('Role-Based Access Control Middleware (RBAC) (FR-01)', () => {
  let adminToken;
  let requesterToken;
  let techToken;

  beforeAll(async () => {
    // Login as Admin
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@campus.edu',
      password: 'Campus@1234',
    });
    adminToken = adminRes.body.data?.token;

    // Login as Requester
    const reqRes = await request(app).post('/api/auth/login').send({
      email: 'student.rahul@campus.edu',
      password: 'Campus@1234',
    });
    requesterToken = reqRes.body.data?.token;

    // Login as Technician
    const techRes = await request(app).post('/api/auth/login').send({
      email: 'tech.raj@campus.edu',
      password: 'Campus@1234',
    });
    techToken = techRes.body.data?.token;
  });

  it('TC-0105: should reject requests without Authorization header (401)', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('TC-0107: should reject REQUESTER from accessing Admin User Management (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Access denied/i);
  });

  it('should reject TECHNICIAN from accessing Admin Audit Logs (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${techToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow ADMIN full access to User Management and Audit Logs (200 OK)', async () => {
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.success).toBe(true);

    const auditRes = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.success).toBe(true);
  });
});
