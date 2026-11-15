'use strict';

const { Router } = require('express');
const reportService = require('../services/report.service');
const { authenticate } = require('../middleware/auth');
const { rbac } = require('../middleware/rbac');
const { sendSuccess } = require('../utils/response');

const router = Router();

router.use(authenticate);

// JSON Preview endpoint for UI table
router.get('/preview', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const { type, startDate, endDate, assetId, categoryId, technicianId, status } = req.query;
    const report = await reportService.getReportData(type || 'WORK_ORDERS', {
      startDate,
      endDate,
      assetId,
      categoryId,
      technicianId,
      status,
    });
    return sendSuccess(res, { message: 'Report data retrieved', data: report });
  } catch (err) {
    next(err);
  }
});

// CSV Export Download
router.get('/export/csv', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const { type, startDate, endDate, assetId, categoryId, technicianId, status } = req.query;
    const reportType = type || 'WORK_ORDERS';
    const csvContent = await reportService.exportCsv(reportType, {
      startDate,
      endDate,
      assetId,
      categoryId,
      technicianId,
      status,
    });

    const filename = `CMMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
});

// PDF Export Download
router.get('/export/pdf', rbac('ADMIN', 'TECHNICIAN'), async (req, res, next) => {
  try {
    const { type, startDate, endDate, assetId, categoryId, technicianId, status } = req.query;
    const reportType = type || 'WORK_ORDERS';
    const pdfBuffer = await reportService.exportPdf(reportType, {
      startDate,
      endDate,
      assetId,
      categoryId,
      technicianId,
      status,
    });

    const filename = `CMMS_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
