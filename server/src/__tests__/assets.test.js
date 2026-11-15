'use strict';

const request = require('supertest');
const app = require('../index');
const { prisma } = require('../config/database');

describe('Asset CRUD & QR Code Generation (FR-02, FR-04, FR-13)', () => {
  let adminToken;
  let requesterToken;
  let sampleCategory;
  let sampleLocation;
  let createdAssetId;

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

    sampleCategory = await prisma.category.findFirst();
    sampleLocation = await prisma.location.findFirst({ where: { type: 'ROOM' } });
  });

  afterAll(async () => {
    if (createdAssetId) {
      await prisma.asset.delete({ where: { id: createdAssetId } }).catch(() => {});
    }
  });

  it('TC-0208: should forbid a REQUESTER from creating an asset (403)', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        name: 'Unauthorized AC Installation',
        categoryId: sampleCategory.id,
        locationId: sampleLocation.id,
      });

    expect(res.status).toBe(403);
  });

  it('TC-0201: should allow ADMIN to create asset with auto-generated code and QR code (201)', async () => {
    const res = await request(app)
      .post('/api/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Precision Cleanroom AC Unit')
      .field('categoryId', sampleCategory.id)
      .field('locationId', sampleLocation.id)
      .field('manufacturer', 'Daikin India')
      .field('status', 'ACTIVE')
      .field('notes', 'Installed in high-spec test environment');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assetCode).toBeDefined();
    expect(res.body.data.qrCodeUrl).toMatch(/^\/uploads\/qrcodes\//);
    createdAssetId = res.body.data.id;
  });

  it('TC-0204: should list assets with pagination and warranty metadata', async () => {
    const res = await request(app)
      .get('/api/assets?page=1&limit=10')
      .set('Authorization', `Bearer ${requesterToken}`); // Requesters can view assets

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('isWarrantyExpired');
  });

  it('TC-0205: should fetch single asset details with QR code metadata', async () => {
    const res = await request(app)
      .get(`/api/assets/${createdAssetId}`)
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdAssetId);
    expect(res.body.data.qrCodeUrl).toBeDefined();
  });

  it('should generate printable QR label data', async () => {
    const res = await request(app)
      .get(`/api/assets/${createdAssetId}/qr`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
    expect(res.body.data.targetUrl).toContain(createdAssetId);
  });

  it('should verify audit log entry was created for the new asset (FR-13)', async () => {
    const res = await request(app)
      .get(`/api/audit-logs?entityType=Asset&action=CREATE_ASSET`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThan(0);
  });
});
