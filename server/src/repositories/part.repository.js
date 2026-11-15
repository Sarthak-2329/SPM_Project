'use strict';

const { prisma } = require('../config/database');

class PartRepository {
  async findMany({ skip, take, search, supplierId, lowStock }) {
    const where = {};
    if (supplierId) where.supplierId = supplierId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { partCode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.part.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          supplier: { select: { id: true, name: true, contactName: true, phone: true } },
          _count: { select: { workOrderParts: true } },
        },
      }),
      prisma.part.count({ where }),
    ]);

    // Enrich with dynamic lowStock flag
    const enriched = items.map((p) => ({
      ...p,
      isLowStock: p.stockQty <= p.reorderLevel,
    }));

    let finalItems = enriched;
    if (lowStock === 'true' || lowStock === true) {
      finalItems = enriched.filter((p) => p.isLowStock);
    }

    return { items: finalItems, total };
  }

  async findById(id) {
    const part = await prisma.part.findUnique({
      where: { id },
      include: {
        supplier: true,
        workOrderParts: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { workOrder: { select: { id: true, title: true, status: true } } },
        },
      },
    });

    if (!part) return null;
    return {
      ...part,
      isLowStock: part.stockQty <= part.reorderLevel,
    };
  }

  async create(data) {
    return prisma.part.create({
      data,
      include: { supplier: true },
    });
  }

  async update(id, data) {
    return prisma.part.update({
      where: { id },
      data,
      include: { supplier: true },
    });
  }

  async delete(id) {
    return prisma.part.delete({ where: { id } });
  }

  async getLatestSequence(prefix) {
    const latest = await prisma.part.findFirst({
      where: { partCode: { startsWith: prefix } },
      orderBy: { partCode: 'desc' },
      select: { partCode: true },
    });
    return latest?.partCode || null;
  }
}

module.exports = new PartRepository();
