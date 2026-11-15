'use strict';

const { Router } = require('express');
const { z } = require('zod');
const assetController = require('../controllers/asset.controller');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const upload = require('../middleware/upload');

const router = Router();

const createAssetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  manufacturer: z.string().optional().nullable(),
  serialNo: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED']).optional(),
  notes: z.string().optional().nullable(),
});

const updateAssetSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  manufacturer: z.string().optional().nullable(),
  serialNo: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED']).optional(),
  notes: z.string().optional().nullable(),
});

// All routes require authentication
router.use(authenticate);

// Read endpoints accessible by all roles (Admin, Tech, Requester)
router.get('/', (req, res, next) => assetController.listAssets(req, res).catch(next));
router.get('/:id', (req, res, next) => assetController.getAsset(req, res).catch(next));
router.get('/:id/qr', (req, res, next) => assetController.getQrLabel(req, res).catch(next));

// Mutation endpoints restricted to ADMIN
router.post(
  '/',
  rbac('ADMIN'),
  upload.single('photo'),
  validate(createAssetSchema),
  (req, res, next) => assetController.createAsset(req, res).catch(next)
);

router.put(
  '/:id',
  rbac('ADMIN'),
  upload.single('photo'),
  validate(updateAssetSchema),
  (req, res, next) => assetController.updateAsset(req, res).catch(next)
);

router.delete('/:id', rbac('ADMIN'), (req, res, next) =>
  assetController.deleteAsset(req, res).catch(next)
);

module.exports = router;
