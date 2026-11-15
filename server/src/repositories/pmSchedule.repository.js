'use strict';

const { prisma } = require('../config/database');

class PMScheduleRepository {
  async findMany() {
    return prisma.pMSchedule.findMany({
      orderBy: { nextDueDate: 'asc' },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
            location: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
        checklistItems: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { workOrders: true },
        },
      },
    });
  }

  async findById(id) {
    return prisma.pMSchedule.findUnique({
      where: { id },
      include: {
        asset: {
          include: { location: true, category: true },
        },
        checklistItems: {
          orderBy: { order: 'asc' },
        },
        workOrders: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, status: true, createdAt: true, dueDate: true },
        },
      },
    });
  }

  async create(data, checklistItems = []) {
    return prisma.pMSchedule.create({
      data: {
        name: data.name,
        assetId: data.assetId,
        frequencyDays: parseInt(data.frequencyDays, 10),
        nextDueDate: new Date(data.nextDueDate || Date.now()),
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        checklistItems: {
          create: checklistItems.map((item, index) => ({
            description: typeof item === 'string' ? item : item.description,
            order: index + 1,
          })),
        },
      },
      include: {
        checklistItems: true,
        asset: true,
      },
    });
  }

  async update(id, data, checklistItems) {
    const updatePayload = {
      name: data.name,
      assetId: data.assetId,
      frequencyDays: data.frequencyDays ? parseInt(data.frequencyDays, 10) : undefined,
      description: data.description !== undefined ? data.description : undefined,
      isActive: data.isActive !== undefined ? data.isActive : undefined,
    };

    if (data.nextDueDate) {
      updatePayload.nextDueDate = new Date(data.nextDueDate);
    }

    if (checklistItems && Array.isArray(checklistItems)) {
      // Re-create checklist items
      await prisma.pMChecklistItem.deleteMany({ where: { scheduleId: id } });
      updatePayload.checklistItems = {
        create: checklistItems.map((item, index) => ({
          description: typeof item === 'string' ? item : item.description,
          order: index + 1,
        })),
      };
    }

    return prisma.pMSchedule.update({
      where: { id },
      data: updatePayload,
      include: { checklistItems: true, asset: true },
    });
  }

  async toggleActive(id, isActive) {
    return prisma.pMSchedule.update({
      where: { id },
      data: { isActive },
    });
  }
}

module.exports = new PMScheduleRepository();
