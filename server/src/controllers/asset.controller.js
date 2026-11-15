'use strict';

const assetService = require('../services/asset.service');
const { sendSuccess } = require('../utils/response');
const { parsePagination, paginationMeta } = require('../utils/pagination');

class AssetController {
  async listAssets(req, res) {
    const { page, limit, skip, take } = parsePagination(req.query);
    const { search, categoryId, locationId, status } = req.query;

    const { items, total } = await assetService.getAssets({
      page,
      limit,
      skip,
      take,
      search,
      categoryId,
      locationId,
      status,
    });

    return sendSuccess(res, {
      message: 'Assets retrieved',
      data: paginationMeta(items, total, page, limit),
    });
  }

  async getAsset(req, res) {
    const asset = await assetService.getAssetById(req.params.id);
    return sendSuccess(res, {
      message: 'Asset details retrieved',
      data: asset,
    });
  }

  async createAsset(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const asset = await assetService.createAsset(
      req.body,
      req.file,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Asset created successfully',
      data: asset,
      statusCode: 201,
    });
  }

  async updateAsset(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const asset = await assetService.updateAsset(
      req.params.id,
      req.body,
      req.file,
      req.user.id,
      clientIp
    );
    return sendSuccess(res, {
      message: 'Asset updated successfully',
      data: asset,
    });
  }

  async deleteAsset(req, res) {
    const clientIp = req.ip || req.connection.remoteAddress;
    await assetService.deleteAsset(req.params.id, req.user.id, clientIp);
    return sendSuccess(res, {
      message: 'Asset deleted successfully',
      data: null,
    });
  }

  async getQrLabel(req, res) {
    const labelData = await assetService.getAssetQrLabel(req.params.id);
    return sendSuccess(res, {
      message: 'QR label data generated',
      data: labelData,
    });
  }
}

module.exports = new AssetController();
