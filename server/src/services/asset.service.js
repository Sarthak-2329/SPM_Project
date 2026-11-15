'use strict';

const assetRepository = require('../repositories/asset.repository');
const categoryRepository = require('../repositories/category.repository');
const qrService = require('./qr.service');
const auditService = require('./audit.service');
const { env } = require('../config/env');

class AssetService {
  async getAssets({ page, limit, skip, take, search, categoryId, locationId, status }) {
    const { items, total } = await assetRepository.findMany({
      skip,
      take,
      search,
      categoryId,
      locationId,
      status,
    });

    // Compute warranty expiry status for each asset
    const now = new Date();
    const enriched = items.map((asset) => {
      let isWarrantyExpired = false;
      let warrantyDaysLeft = null;
      if (asset.warrantyExpiry) {
        const expiry = new Date(asset.warrantyExpiry);
        isWarrantyExpired = expiry < now;
        warrantyDaysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      }
      return {
        ...asset,
        isWarrantyExpired,
        warrantyDaysLeft,
      };
    });

    return { items: enriched, total };
  }

  async getAssetById(id) {
    const asset = await assetRepository.findById(id);
    if (!asset) {
      const err = new Error('Asset not found');
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    let isWarrantyExpired = false;
    let warrantyDaysLeft = null;
    if (asset.warrantyExpiry) {
      const expiry = new Date(asset.warrantyExpiry);
      isWarrantyExpired = expiry < now;
      warrantyDaysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    }

    return {
      ...asset,
      isWarrantyExpired,
      warrantyDaysLeft,
    };
  }

  async createAsset(data, file, adminId, clientIp) {
    const category = await categoryRepository.findById(data.categoryId);
    const prefix = category ? category.name.substring(0, 3).toUpperCase() : 'AST';

    // Auto-generate code e.g. HVA-0012 or AST-0001
    const latestCode = await assetRepository.getLatestAssetSequence(`${prefix}-`);
    let seq = 1;
    if (latestCode) {
      const parts = latestCode.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num)) seq = num + 1;
    }
    const assetCode = `${prefix}-${String(seq).padStart(4, '0')}`;

    let photoUrl = null;
    if (file) {
      photoUrl = `/uploads/assets/${file.filename}`;
    }

    // Step 1: Create asset record
    const createdAsset = await assetRepository.create({
      assetCode,
      name: data.name,
      categoryId: data.categoryId,
      locationId: data.locationId,
      manufacturer: data.manufacturer || null,
      serialNo: data.serialNo || null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
      status: data.status || 'ACTIVE',
      photoUrl,
      notes: data.notes || null,
    });

    // Step 2: Generate QR code pointing to asset detail URL
    const targetUrl = `${env.APP_BASE_URL}/assets/${createdAsset.id}`;
    let qrCodeUrl = null;
    try {
      qrCodeUrl = await qrService.generateQrCodeFile(targetUrl, createdAsset.assetCode);
      await assetRepository.update(createdAsset.id, { qrCodeUrl });
      createdAsset.qrCodeUrl = qrCodeUrl;
    } catch (qrErr) {
      console.error('[AssetService] QR code generation warning:', qrErr.message);
    }

    // Step 3: Record Audit Log
    await auditService.log({
      userId: adminId,
      action: 'CREATE_ASSET',
      entityType: 'Asset',
      entityId: createdAsset.id,
      details: {
        assetCode: createdAsset.assetCode,
        name: createdAsset.name,
        locationId: createdAsset.locationId,
        categoryId: createdAsset.categoryId,
      },
      ipAddress: clientIp,
    });

    return createdAsset;
  }

  async updateAsset(id, data, file, adminId, clientIp) {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      const err = new Error('Asset not found');
      err.statusCode = 404;
      throw err;
    }

    const updatePayload = {
      name: data.name,
      categoryId: data.categoryId,
      locationId: data.locationId,
      manufacturer: data.manufacturer !== undefined ? data.manufacturer : existing.manufacturer,
      serialNo: data.serialNo !== undefined ? data.serialNo : existing.serialNo,
      status: data.status || existing.status,
      notes: data.notes !== undefined ? data.notes : existing.notes,
    };

    if (data.purchaseDate) updatePayload.purchaseDate = new Date(data.purchaseDate);
    if (data.warrantyExpiry) updatePayload.warrantyExpiry = new Date(data.warrantyExpiry);
    if (file) {
      updatePayload.photoUrl = `/uploads/assets/${file.filename}`;
    }

    const updated = await assetRepository.update(id, updatePayload);

    await auditService.log({
      userId: adminId,
      action: 'UPDATE_ASSET',
      entityType: 'Asset',
      entityId: id,
      details: { previous: existing, updated },
      ipAddress: clientIp,
    });

    return updated;
  }

  async deleteAsset(id, adminId, clientIp) {
    const existing = await assetRepository.findById(id);
    if (!existing) {
      const err = new Error('Asset not found');
      err.statusCode = 404;
      throw err;
    }

    if (existing.workOrders && existing.workOrders.length > 0) {
      const err = new Error('Cannot delete asset with associated work orders. Retire the asset instead.');
      err.statusCode = 400;
      throw err;
    }

    await assetRepository.delete(id);

    await auditService.log({
      userId: adminId,
      action: 'DELETE_ASSET',
      entityType: 'Asset',
      entityId: id,
      details: { assetCode: existing.assetCode, name: existing.name },
      ipAddress: clientIp,
    });

    return true;
  }

  async getAssetQrLabel(id) {
    const asset = await this.getAssetById(id);
    const targetUrl = `${env.APP_BASE_URL}/assets/${asset.id}`;
    const dataUrl = await qrService.generateQrDataUrl(targetUrl);

    return {
      assetCode: asset.assetCode,
      name: asset.name,
      locationName: asset.location?.name,
      targetUrl,
      qrDataUrl: dataUrl,
    };
  }
}

module.exports = new AssetService();
