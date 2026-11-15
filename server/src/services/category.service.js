'use strict';

const categoryRepository = require('../repositories/category.repository');
const auditService = require('./audit.service');

class CategoryService {
  async getAllCategories() {
    return categoryRepository.findAll();
  }

  async createCategory(data, adminId, clientIp) {
    const category = await categoryRepository.create(data);
    await auditService.log({
      userId: adminId,
      action: 'CREATE_CATEGORY',
      entityType: 'Category',
      entityId: category.id,
      details: data,
      ipAddress: clientIp,
    });
    return category;
  }

  async updateCategory(id, data, adminId, clientIp) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }
    const updated = await categoryRepository.update(id, data);
    await auditService.log({
      userId: adminId,
      action: 'UPDATE_CATEGORY',
      entityType: 'Category',
      entityId: id,
      details: data,
      ipAddress: clientIp,
    });
    return updated;
  }

  async deleteCategory(id, adminId, clientIp) {
    const existing = await categoryRepository.findById(id);
    if (!existing) {
      const err = new Error('Category not found');
      err.statusCode = 404;
      throw err;
    }
    if (existing.children && existing.children.length > 0) {
      const err = new Error('Cannot delete category with sub-categories.');
      err.statusCode = 400;
      throw err;
    }
    await categoryRepository.delete(id);
    await auditService.log({
      userId: adminId,
      action: 'DELETE_CATEGORY',
      entityType: 'Category',
      entityId: id,
      details: { name: existing.name },
      ipAddress: clientIp,
    });
    return true;
  }
}

module.exports = new CategoryService();
