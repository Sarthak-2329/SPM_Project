'use strict';

const { prisma } = require('../config/database');

class AssetRepository {
  async findMany({ skip, take, search, categoryId, locationId, status }) {
    const where = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (locationId) where.locationId = locationId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetCode: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { manufacturer: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true } },
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              parent: { select: { id: true, name: true, type: true } },
            },
          },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id) {
    return prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        location: {
          include: {
            parent: {
              include: { parent: true },
            },
          },
        },
        workOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            dueDate: true,
          },
        },
        pmSchedules: {
          select: {
            id: true,
            name: true,
            frequencyDays: true,
            nextDueDate: true,
            isActive: true,
          },
        },
      },
    });
  }

  async findByCode(assetCode) {
    return prisma.asset.findUnique({
      where: { assetCode },
    });
  }

  async getLatestAssetSequence(prefix) {
    const latest = await prisma.asset.findFirst({
      where: {
        assetCode: { startsWith: prefix },
      },
      orderBy: { assetCode: 'desc' },
      select: { assetCode: true },
    });
    return latest?.assetCode || null;
  }

  async create(data) {
    return prisma.asset.create({
      data,
      include: {
        category: true,
        location: true,
      },
    });
  }

  async update(id, data) {
    return prisma.asset.update({
      where: { id },
      data,
      include: {
        category: true,
        location: true,
      },
    });
  }

  async delete(id) {
    return prisma.asset.delete({
      where: { id },
    });
  }
}

module.exports = new AssetRepository();
