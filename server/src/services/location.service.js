'use strict';

const locationRepository = require('../repositories/location.repository');
const auditService = require('./audit.service');

class LocationService {
  async getAllLocations() {
    return locationRepository.findAll();
  }

  async createLocation(data, adminId, clientIp) {
    const location = await locationRepository.create(data);
    await auditService.log({
      userId: adminId,
      action: 'CREATE_LOCATION',
      entityType: 'Location',
      entityId: location.id,
      details: { name: location.name, type: location.type, parentId: location.parentId },
      ipAddress: clientIp,
    });
    return location;
  }

  async updateLocation(id, data, adminId, clientIp) {
    const existing = await locationRepository.findById(id);
    if (!existing) {
      const err = new Error('Location not found');
      err.statusCode = 404;
      throw err;
    }
    const updated = await locationRepository.update(id, data);
    await auditService.log({
      userId: adminId,
      action: 'UPDATE_LOCATION',
      entityType: 'Location',
      entityId: id,
      details: data,
      ipAddress: clientIp,
    });
    return updated;
  }

  async deleteLocation(id, adminId, clientIp) {
    const existing = await locationRepository.findById(id);
    if (!existing) {
      const err = new Error('Location not found');
      err.statusCode = 404;
      throw err;
    }
    if (existing.children && existing.children.length > 0) {
      const err = new Error('Cannot delete location with child locations. Delete or reassign children first.');
      err.statusCode = 400;
      throw err;
    }
    await locationRepository.delete(id);
    await auditService.log({
      userId: adminId,
      action: 'DELETE_LOCATION',
      entityType: 'Location',
      entityId: id,
      details: { name: existing.name },
      ipAddress: clientIp,
    });
    return true;
  }
}

module.exports = new LocationService();
