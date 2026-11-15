'use strict';

const partRepository = require('../repositories/part.repository');
const notificationService = require('./notification.service');
const auditService = require('./audit.service');
const { prisma } = require('../config/database');

const HOURLY_LABOUR_RATE = 250; // ₹250 per hour

class InventoryService {
  async getParts(query) {
    return partRepository.findMany(query);
  }

  async getPartById(id) {
    const part = await partRepository.findById(id);
    if (!part) {
      const err = new Error('Spare part not found');
      err.statusCode = 404;
      throw err;
    }
    return part;
  }

  async createPart(data, adminId, clientIp) {
    let partCode = data.partCode;
    if (!partCode) {
      const latest = await partRepository.getLatestSequence('PRT-');
      let seq = 1;
      if (latest) {
        const num = parseInt(latest.split('-')[1], 10);
        if (!isNaN(num)) seq = num + 1;
      }
      partCode = `PRT-${String(seq).padStart(4, '0')}`;
    }

    const part = await partRepository.create({
      partCode,
      name: data.name,
      description: data.description || null,
      stockQty: parseInt(data.stockQty || 0, 10),
      reorderLevel: parseInt(data.reorderLevel || 5, 10),
      unitCost: parseFloat(data.unitCost || 0),
      supplierId: data.supplierId || null,
      isActive: true,
    });

    await auditService.log({
      userId: adminId,
      action: 'CREATE_PART',
      entityType: 'Part',
      entityId: part.id,
      details: { partCode: part.partCode, stockQty: part.stockQty, unitCost: part.unitCost },
      ipAddress: clientIp,
    });

    return part;
  }

  async updatePart(id, data, adminId, clientIp) {
    const existing = await partRepository.findById(id);
    if (!existing) {
      const err = new Error('Spare part not found');
      err.statusCode = 404;
      throw err;
    }

    const updated = await partRepository.update(id, {
      name: data.name,
      description: data.description !== undefined ? data.description : existing.description,
      stockQty: data.stockQty !== undefined ? parseInt(data.stockQty, 10) : existing.stockQty,
      reorderLevel: data.reorderLevel !== undefined ? parseInt(data.reorderLevel, 10) : existing.reorderLevel,
      unitCost: data.unitCost !== undefined ? parseFloat(data.unitCost) : existing.unitCost,
      supplierId: data.supplierId !== undefined ? data.supplierId : existing.supplierId,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
    });

    // Check low stock
    if (updated.stockQty <= updated.reorderLevel) {
      this.checkAndAlertLowStock(updated);
    }

    await auditService.log({
      userId: adminId,
      action: 'UPDATE_PART',
      entityType: 'Part',
      entityId: id,
      details: { previous: existing, updated },
      ipAddress: clientIp,
    });

    return updated;
  }

  async deletePart(id, adminId, clientIp) {
    const existing = await partRepository.findById(id);
    if (!existing) {
      const err = new Error('Spare part not found');
      err.statusCode = 404;
      throw err;
    }

    await partRepository.delete(id);

    await auditService.log({
      userId: adminId,
      action: 'DELETE_PART',
      entityType: 'Part',
      entityId: id,
      details: { partCode: existing.partCode, name: existing.name },
      ipAddress: clientIp,
    });

    return true;
  }

  /**
   * Add parts used on a work order inside an atomic transaction.
   * Decrements part stock and updates work order actualCost.
   */
  async addPartToWorkOrder(workOrderId, partId, quantityUsed, userId, clientIp) {
    const qty = parseInt(quantityUsed, 10);
    if (isNaN(qty) || qty <= 0) {
      const err = new Error('Quantity used must be a positive integer');
      err.statusCode = 400;
      throw err;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch part and verify stock
      const part = await tx.part.findUnique({
        where: { id: partId },
      });
      if (!part) {
        const err = new Error('Part not found');
        err.statusCode = 404;
        throw err;
      }

      if (part.stockQty < qty) {
        const err = new Error(
          `Insufficient stock for ${part.name} (${part.partCode}). Available: ${part.stockQty}, Requested: ${qty}`
        );
        err.statusCode = 400;
        throw err;
      }

      // 2. Decrement stock
      const updatedPart = await tx.part.update({
        where: { id: partId },
        data: { stockQty: part.stockQty - qty },
      });

      // 3. Upsert WorkOrderPart
      const existingEntry = await tx.workOrderPart.findUnique({
        where: {
          workOrderId_partId: {
            workOrderId,
            partId,
          },
        },
      });

      let workOrderPart;
      if (existingEntry) {
        workOrderPart = await tx.workOrderPart.update({
          where: { id: existingEntry.id },
          data: {
            quantityUsed: existingEntry.quantityUsed + qty,
            unitCostAtTime: part.unitCost, // keep updated or snapshot
          },
        });
      } else {
        workOrderPart = await tx.workOrderPart.create({
          data: {
            workOrderId,
            partId,
            quantityUsed: qty,
            unitCostAtTime: part.unitCost,
          },
        });
      }

      // 4. Recalculate total work order cost = parts + (labour hours * rate)
      const allPartsUsed = await tx.workOrderPart.findMany({
        where: { workOrderId },
      });
      const partsCostTotal = allPartsUsed.reduce(
        (sum, item) => sum + item.quantityUsed * item.unitCostAtTime,
        0
      );

      const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
      const labourCost = (wo.timeSpent || 0) * HOURLY_LABOUR_RATE;
      const actualCost = partsCostTotal + labourCost;

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { actualCost },
      });

      return { workOrderPart, updatedPart, actualCost };
    });

    // Check if part dropped into low-stock threshold
    if (result.updatedPart.stockQty <= result.updatedPart.reorderLevel) {
      this.checkAndAlertLowStock(result.updatedPart);
    }

    await auditService.log({
      userId,
      action: 'ADD_PART_TO_WORK_ORDER',
      entityType: 'WorkOrderPart',
      entityId: result.workOrderPart.id,
      details: { workOrderId, partId, quantityUsed: qty, remainingStock: result.updatedPart.stockQty },
      ipAddress: clientIp,
    });

    return result;
  }

  /**
   * Remove part from work order and restore stock.
   */
  async removePartFromWorkOrder(workOrderId, partId, userId, clientIp) {
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.workOrderPart.findUnique({
        where: {
          workOrderId_partId: { workOrderId, partId },
        },
      });

      if (!entry) {
        const err = new Error('Part is not recorded on this work order');
        err.statusCode = 404;
        throw err;
      }

      // 1. Delete junction row
      await tx.workOrderPart.delete({
        where: { id: entry.id },
      });

      // 2. Restore stock quantity
      const updatedPart = await tx.part.update({
        where: { id: partId },
        data: { stockQty: { increment: entry.quantityUsed } },
      });

      // 3. Recalculate actualCost
      const allPartsUsed = await tx.workOrderPart.findMany({
        where: { workOrderId },
      });
      const partsCostTotal = allPartsUsed.reduce(
        (sum, item) => sum + item.quantityUsed * item.unitCostAtTime,
        0
      );

      const wo = await tx.workOrder.findUnique({ where: { id: workOrderId } });
      const labourCost = (wo.timeSpent || 0) * HOURLY_LABOUR_RATE;
      const actualCost = partsCostTotal + labourCost;

      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { actualCost },
      });

      return { restoredQty: entry.quantityUsed, updatedPart, actualCost };
    });

    await auditService.log({
      userId,
      action: 'REMOVE_PART_FROM_WORK_ORDER',
      entityType: 'WorkOrderPart',
      entityId: `${workOrderId}:${partId}`,
      details: { restoredQty: result.restoredQty, newStock: result.updatedPart.stockQty },
      ipAddress: clientIp,
    });

    return result;
  }

  async checkAndAlertLowStock(part) {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true, email: true },
    });

    for (const admin of admins) {
      notificationService.notify({
        userId: admin.id,
        type: 'LOW_STOCK',
        title: `⚠️ Low Stock Alert: ${part.name}`,
        message: `Inventory stock for ${part.name} (${part.partCode}) is down to ${part.stockQty} units (Reorder Threshold: ${part.reorderLevel}).`,
        referenceId: part.id,
        referenceType: 'PART',
        emailUser: true,
      }).catch(() => {});
    }
  }
}

module.exports = new InventoryService();
