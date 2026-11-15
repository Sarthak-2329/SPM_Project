'use strict';

const { prisma } = require('../config/database');

class MaintenanceRequestRepository {
  async create(data) {
    return prisma.maintenanceRequest.create({
      data,
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
        location: { select: { id: true, name: true, type: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findMany({ skip, take, requesterId, status, priority, search }) {
    const where = {};
    if (requesterId) where.requesterId = requesterId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { asset: { name: { contains: search, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: search, mode: 'insensitive' } } },
        { location: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.maintenanceRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: { select: { id: true, name: true, assetCode: true, photoUrl: true } },
          location: { select: { id: true, name: true, type: true } },
          requester: { select: { id: true, name: true, email: true, phone: true } },
          workOrder: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              assignee: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.maintenanceRequest.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id) {
    return prisma.maintenanceRequest.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            category: true,
            location: true,
          },
        },
        location: true,
        requester: { select: { id: true, name: true, email: true, phone: true } },
        workOrder: {
          include: {
            assignee: { select: { id: true, name: true, email: true, phone: true } },
            statusHistory: {
              orderBy: { createdAt: 'asc' },
              include: { changedBy: { select: { id: true, name: true, role: true } } },
            },
          },
        },
      },
    });
  }

  async update(id, data) {
    return prisma.maintenanceRequest.update({
      where: { id },
      data,
    });
  }
}

module.exports = new MaintenanceRequestRepository();
