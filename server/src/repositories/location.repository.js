'use strict';

const { prisma } = require('../config/database');

class LocationRepository {
  async findAll() {
    return prisma.location.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: {
        parent: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { assets: true, children: true },
        },
      },
    });
  }

  async findById(id) {
    return prisma.location.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  async create(data) {
    return prisma.location.create({ data });
  }

  async update(id, data) {
    return prisma.location.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.location.delete({ where: { id } });
  }
}

module.exports = new LocationRepository();
