'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('Authentication & Profile Flows (FR-01)', () => {
  const uniqueSuffix = Date.now();
  const testRequester = {
    email: `requester.${uniqueSuffix}@campus.edu`,
    password: 'Password@123',
    name: 'Test Student Requester',
    phone: '+91 99999 88888',
  };

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({
      where: { email: { contains: `${uniqueSuffix}` } },
    });
  });

  it('TC-0110: should allow self-registration for a REQUESTER', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testRequester);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testRequester.email.toLowerCase());
    expect(res.body.data.user.role).toBe('REQUESTER');
    expect(res.body.data.token).toBeDefined();
  });

  it('TC-0102: should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequester.email,
        password: 'IncorrectPassword',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('TC-0101: should login successfully with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequester.email,
        password: testRequester.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testRequester.email.toLowerCase());
  });

  it('should fetch own profile via GET /api/auth/me', async () => {
    // First login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testRequester.email,
        password: testRequester.password,
      });

    const token = loginRes.body.data.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testRequester.email.toLowerCase());
  });
});
