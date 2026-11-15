'use strict';

const { prisma } = require('../config/database');

class SupplierRepository {
  async findAll() {
    return prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { parts: true } },
      },
    });
  }

  async findById(id) {
    return prisma.supplier.findUnique({
      where: { id },
      include: { parts: true },
    });
  }

  async create(data) {
    return prisma.supplier.create({ data });
  }

  async update(id, data) {
    return prisma.supplier.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.supplier.delete({ where: { id } });
  }
}

module.exports = new SupplierRepository();
