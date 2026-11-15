'use strict';

const { prisma } = require('../config/database');

class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { assets: true } },
      },
    });
  }

  async findById(id) {
    return prisma.category.findUnique({
      where: { id },
      include: { children: true },
    });
  }

  async create(data) {
    return prisma.category.create({ data });
  }

  async update(id, data) {
    return prisma.category.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.category.delete({ where: { id } });
  }
}

module.exports = new CategoryRepository();
