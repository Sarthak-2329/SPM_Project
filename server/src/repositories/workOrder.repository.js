'use strict';

const { prisma } = require('../config/database');

class WorkOrderRepository {
  async create(data) {
    return prisma.workOrder.create({
      data,
      include: {
        asset: true,
        assignee: true,
        createdBy: true,
      },
    });
  }

  async findMany({ skip, take, assigneeId, status, priority, assetId, search }) {
    const where = {};
    if (assigneeId) where.assigneeId = assigneeId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assetId) where.assetId = assetId;

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { asset: { name: { contains: search, mode: 'insensitive' } } },
        { asset: { assetCode: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          asset: {
            select: {
              id: true,
              name: true,
              assetCode: true,
              location: { select: { id: true, name: true } },
            },
          },
          assignee: { select: { id: true, name: true, email: true, phone: true } },
          createdBy: { select: { id: true, name: true } },
          _count: {
            select: { notes: true, parts: true },
          },
        },
      }),
      prisma.workOrder.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id) {
    return prisma.workOrder.findUnique({
      where: { id },
      include: {
        asset: {
          include: {
            location: { include: { parent: true } },
            category: true,
          },
        },
        assignee: { select: { id: true, name: true, email: true, phone: true, role: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        maintenanceRequest: {
          select: {
            id: true,
            description: true,
            photoUrl: true,
            requester: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedBy: { select: { id: true, name: true, role: true } },
          },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true, role: true } },
          },
        },
        parts: {
          include: {
            part: true,
          },
        },
      },
    });
  }

  async update(id, data) {
    return prisma.workOrder.update({
      where: { id },
      data,
      include: {
        assignee: true,
        asset: true,
      },
    });
  }

  async addStatusHistory({ workOrderId, fromStatus, toStatus, changedById, reason }) {
    return prisma.workOrderStatusHistory.create({
      data: {
        workOrderId,
        fromStatus,
        toStatus,
        changedById,
        reason: reason || null,
      },
    });
  }

  async addNote({ workOrderId, authorId, content }) {
    return prisma.workOrderNote.create({
      data: {
        workOrderId,
        authorId,
        content,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });
  }
}

module.exports = new WorkOrderRepository();
