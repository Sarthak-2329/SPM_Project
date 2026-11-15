'use strict';

const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify/sync');
const { prisma } = require('../config/database');

class ReportService {
  /**
   * Fetches data for reports based on type and filters.
   */
  async getReportData(type, filters = {}) {
    const { startDate, endDate, assetId, categoryId, technicianId, status } = filters;
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    switch (type) {
      case 'WORK_ORDERS': {
        const where = {};
        if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
        if (assetId) where.assetId = assetId;
        if (technicianId) where.assigneeId = technicianId;
        if (status) where.status = status;
        if (categoryId) where.asset = { categoryId };

        const workOrders = await prisma.workOrder.findMany({
          where,
          include: {
            asset: { include: { location: true, category: true } },
            assignee: { select: { id: true, name: true, email: true } },
            createdBy: { select: { id: true, name: true } },
            parts: { include: { part: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        return {
          title: 'Campus Maintenance Work Orders Report',
          generatedAt: new Date().toISOString(),
          filters,
          totalCount: workOrders.length,
          data: workOrders,
        };
      }

      case 'ASSET_HISTORY': {
        const where = {};
        if (assetId) where.id = assetId;
        if (categoryId) where.categoryId = categoryId;

        const assets = await prisma.asset.findMany({
          where,
          include: {
            location: true,
            category: true,
            workOrders: {
              include: {
                assignee: { select: { name: true } },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { name: 'asc' },
        });

        const enriched = assets.map((a) => {
          const totalSpent = a.workOrders.reduce((sum, wo) => sum + (wo.actualCost || 0), 0);
          const totalHours = a.workOrders.reduce((sum, wo) => sum + (wo.timeSpent || 0), 0);
          return {
            ...a,
            totalWorkOrders: a.workOrders.length,
            totalMaintenanceCost: totalSpent,
            totalLaborHours: totalHours,
          };
        });

        return {
          title: 'Campus Asset Maintenance History & Lifecycle Report',
          generatedAt: new Date().toISOString(),
          filters,
          totalCount: enriched.length,
          data: enriched,
        };
      }

      case 'COST_ANALYSIS': {
        const where = { status: { in: ['COMPLETED', 'CLOSED'] } };
        if (Object.keys(dateFilter).length > 0) where.createdAt = dateFilter;
        if (assetId) where.assetId = assetId;
        if (technicianId) where.assigneeId = technicianId;

        const workOrders = await prisma.workOrder.findMany({
          where,
          include: {
            asset: { include: { category: true, location: true } },
            parts: { include: { part: true } },
            assignee: true,
          },
        });

        let totalPartsCost = 0;
        let totalLaborCost = 0;
        let totalOverallCost = 0;

        const costItems = workOrders.map((wo) => {
          const pCost = wo.parts.reduce((s, p) => s + p.quantityUsed * p.unitCostAtTime, 0);
          const lCost = (wo.timeSpent || 0) * 250;
          const total = pCost + lCost;
          totalPartsCost += pCost;
          totalLaborCost += lCost;
          totalOverallCost += total;

          return {
            workOrderId: wo.id,
            title: wo.title,
            assetCode: wo.asset?.assetCode || 'N/A',
            assetName: wo.asset?.name || 'N/A',
            category: wo.asset?.category?.name || 'N/A',
            technician: wo.assignee?.name || 'Unassigned',
            laborHours: wo.timeSpent || 0,
            laborCost: lCost,
            partsCost: pCost,
            totalCost: total,
            completedAt: wo.updatedAt,
          };
        });

        return {
          title: 'Maintenance Cost Analysis Report',
          generatedAt: new Date().toISOString(),
          summary: { totalPartsCost, totalLaborCost, totalOverallCost, count: costItems.length },
          filters,
          totalCount: costItems.length,
          data: costItems,
        };
      }

      case 'INVENTORY': {
        const parts = await prisma.part.findMany({
          include: {
            supplier: true,
            _count: { select: { workOrderParts: true } },
          },
          orderBy: { name: 'asc' },
        });

        let totalInventoryValue = 0;
        const enriched = parts.map((p) => {
          const val = p.stockQty * p.unitCost;
          totalInventoryValue += val;
          return {
            ...p,
            totalValuation: val,
            isLowStock: p.stockQty <= p.reorderLevel,
          };
        });

        return {
          title: 'Spare Parts Inventory & Valuation Report',
          generatedAt: new Date().toISOString(),
          summary: { totalInventoryValue, totalItems: enriched.length },
          filters,
          totalCount: enriched.length,
          data: enriched,
        };
      }

      default: {
        const err = new Error(`Unsupported report type: ${type}`);
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Generates CSV format for the requested report.
   */
  async exportCsv(type, filters) {
    const report = await this.getReportData(type, filters);

    let rows = [];
    switch (type) {
      case 'WORK_ORDERS':
        rows = report.data.map((wo) => ({
          'Work Order ID': wo.id,
          'Title': wo.title,
          'Status': wo.status,
          'Priority': wo.priority,
          'Asset Code': wo.asset?.assetCode || '',
          'Asset Name': wo.asset?.name || '',
          'Location': wo.asset?.location?.name || '',
          'Assignee': wo.assignee?.name || 'Unassigned',
          'Created Date': wo.createdAt.toISOString().split('T')[0],
          'Due Date': wo.dueDate ? wo.dueDate.toISOString().split('T')[0] : '',
          'Labor Hours': wo.timeSpent || 0,
          'Actual Cost (INR)': wo.actualCost || 0,
        }));
        break;

      case 'ASSET_HISTORY':
        rows = report.data.map((a) => ({
          'Asset Code': a.assetCode,
          'Asset Name': a.name,
          'Category': a.category?.name || '',
          'Location': a.location?.name || '',
          'Status': a.status,
          'Manufacturer': a.manufacturer || '',
          'Serial Number': a.serialNo || '',
          'Purchase Date': a.purchaseDate ? a.purchaseDate.toISOString().split('T')[0] : '',
          'Warranty Expiry': a.warrantyExpiry ? a.warrantyExpiry.toISOString().split('T')[0] : '',
          'Total WOs': a.totalWorkOrders,
          'Total Labor Hours': a.totalLaborHours,
          'Total Maintenance Cost (INR)': a.totalMaintenanceCost,
        }));
        break;

      case 'COST_ANALYSIS':
        rows = report.data.map((c) => ({
          'WO Title': c.title,
          'Asset Code': c.assetCode,
          'Asset Name': c.assetName,
          'Category': c.category,
          'Technician': c.technician,
          'Labor Hours': c.laborHours,
          'Labor Cost (INR)': c.laborCost,
          'Parts Cost (INR)': c.partsCost,
          'Total Job Cost (INR)': c.totalCost,
          'Date': c.completedAt.toISOString().split('T')[0],
        }));
        break;

      case 'INVENTORY':
        rows = report.data.map((p) => ({
          'Part Code': p.partCode || '',
          'Name': p.name,
          'Unit Cost (INR)': p.unitCost,
          'Stock On Hand': p.stockQty,
          'Reorder Level': p.reorderLevel,
          'Inventory Valuation (INR)': p.totalValuation,
          'Supplier': p.supplier?.name || '',
          'Low Stock Status': p.isLowStock ? 'YES (REORDER)' : 'NORMAL',
        }));
        break;
    }

    return stringify(rows, { header: true });
  }

  /**
   * Generates formatted PDF document buffer using PDFKit.
   */
  async exportPdf(type, filters) {
    const report = await this.getReportData(type, filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      // Header Banner
      doc.fillColor('#1e3a8a').fontSize(18).font('Helvetica-Bold').text('CAMPUS CMMS', 40, 40);
      doc.fillColor('#4b5563').fontSize(10).font('Helvetica').text('Facilities & Equipment Maintenance Management System', 40, 62);
      doc.moveDown(0.5);

      // Report Title
      doc.fillColor('#111827').fontSize(14).font('Helvetica-Bold').text(report.title);
      doc.fillColor('#6b7280').fontSize(9).font('Helvetica').text(
        `Generated on: ${new Date(report.generatedAt).toLocaleString()} | Total Records: ${report.totalCount}`
      );
      doc.moveDown(1);

      // Line separator
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Render Table based on Type
      doc.fontSize(8);

      if (type === 'WORK_ORDERS') {
        // Table Header
        let y = doc.y;
        doc.fillColor('#1e40af').font('Helvetica-Bold');
        doc.text('WO #', 40, y, { width: 60 });
        doc.text('Title & Asset', 105, y, { width: 180 });
        doc.text('Status', 290, y, { width: 65 });
        doc.text('Assignee', 360, y, { width: 85 });
        doc.text('Labor', 450, y, { width: 45 });
        doc.text('Cost (INR)', 500, y, { width: 55, align: 'right' });
        doc.moveDown(0.8);

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);

        doc.font('Helvetica').fillColor('#334155');
        report.data.slice(0, 35).forEach((wo, idx) => {
          if (doc.y > 740) {
            doc.addPage();
          }
          y = doc.y;
          if (idx % 2 === 1) {
            doc.rect(40, y - 2, 515, 14).fill('#f8fafc');
            doc.fillColor('#334155');
          }
          doc.text(wo.id.slice(-6).toUpperCase(), 40, y, { width: 60 });
          doc.text(`${wo.title.slice(0, 28)} (${wo.asset?.assetCode || 'N/A'})`, 105, y, { width: 180 });
          doc.text(wo.status, 290, y, { width: 65 });
          doc.text(wo.assignee?.name || 'Unassigned', 360, y, { width: 85 });
          doc.text(`${wo.timeSpent || 0}h`, 450, y, { width: 45 });
          doc.text(`₹${(wo.actualCost || 0).toFixed(0)}`, 500, y, { width: 55, align: 'right' });
          doc.moveDown(0.7);
        });
      } else if (type === 'ASSET_HISTORY') {
        let y = doc.y;
        doc.fillColor('#1e40af').font('Helvetica-Bold');
        doc.text('Code', 40, y, { width: 70 });
        doc.text('Asset Name', 115, y, { width: 170 });
        doc.text('Location', 290, y, { width: 90 });
        doc.text('Status', 385, y, { width: 60 });
        doc.text('WOs', 450, y, { width: 40 });
        doc.text('Total Cost', 495, y, { width: 60, align: 'right' });
        doc.moveDown(0.8);

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);

        doc.font('Helvetica').fillColor('#334155');
        report.data.slice(0, 35).forEach((a, idx) => {
          if (doc.y > 740) doc.addPage();
          y = doc.y;
          if (idx % 2 === 1) {
            doc.rect(40, y - 2, 515, 14).fill('#f8fafc');
            doc.fillColor('#334155');
          }
          doc.text(a.assetCode, 40, y, { width: 70 });
          doc.text(a.name.slice(0, 26), 115, y, { width: 170 });
          doc.text(a.location?.name || 'N/A', 290, y, { width: 90 });
          doc.text(a.status, 385, y, { width: 60 });
          doc.text(String(a.totalWorkOrders), 450, y, { width: 40 });
          doc.text(`₹${a.totalMaintenanceCost.toFixed(0)}`, 495, y, { width: 60, align: 'right' });
          doc.moveDown(0.7);
        });
      } else if (type === 'COST_ANALYSIS') {
        // Summary block
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
        doc.text(
          `Total Maintenance Spend: ₹${report.summary.totalOverallCost.toFixed(2)} | Labor: ₹${report.summary.totalLaborCost.toFixed(2)} | Spare Parts: ₹${report.summary.totalPartsCost.toFixed(2)}`
        );
        doc.moveDown(0.8);

        let y = doc.y;
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(8);
        doc.text('Asset & Work Order', 40, y, { width: 190 });
        doc.text('Technician', 235, y, { width: 95 });
        doc.text('Labor Hrs', 335, y, { width: 55 });
        doc.text('Parts (₹)', 395, y, { width: 55, align: 'right' });
        doc.text('Labor (₹)', 455, y, { width: 50, align: 'right' });
        doc.text('Total (₹)', 510, y, { width: 45, align: 'right' });
        doc.moveDown(0.8);

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);

        doc.font('Helvetica').fillColor('#334155');
        report.data.slice(0, 35).forEach((c, idx) => {
          if (doc.y > 740) doc.addPage();
          y = doc.y;
          if (idx % 2 === 1) {
            doc.rect(40, y - 2, 515, 14).fill('#f8fafc');
            doc.fillColor('#334155');
          }
          doc.text(`${c.assetCode}: ${c.title.slice(0, 24)}`, 40, y, { width: 190 });
          doc.text(c.technician, 235, y, { width: 95 });
          doc.text(`${c.laborHours}h`, 335, y, { width: 55 });
          doc.text(`₹${c.partsCost.toFixed(0)}`, 395, y, { width: 55, align: 'right' });
          doc.text(`₹${c.laborCost.toFixed(0)}`, 455, y, { width: 50, align: 'right' });
          doc.text(`₹${c.totalCost.toFixed(0)}`, 510, y, { width: 45, align: 'right' });
          doc.moveDown(0.7);
        });
      } else if (type === 'INVENTORY') {
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
        doc.text(`Total Inventory Valuation: ₹${report.summary.totalInventoryValue.toFixed(2)} across ${report.summary.totalItems} spare part items`);
        doc.moveDown(0.8);

        let y = doc.y;
        doc.fillColor('#1e40af').font('Helvetica-Bold').fontSize(8);
        doc.text('Code', 40, y, { width: 75 });
        doc.text('Part Description', 120, y, { width: 180 });
        doc.text('Unit Cost', 305, y, { width: 60 });
        doc.text('Stock', 370, y, { width: 45 });
        doc.text('Reorder', 420, y, { width: 45 });
        doc.text('Valuation', 470, y, { width: 85, align: 'right' });
        doc.moveDown(0.8);

        doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.4);

        doc.font('Helvetica').fillColor('#334155');
        report.data.forEach((p, idx) => {
          if (doc.y > 740) doc.addPage();
          y = doc.y;
          if (idx % 2 === 1) {
            doc.rect(40, y - 2, 515, 14).fill('#f8fafc');
            doc.fillColor('#334155');
          }
          doc.text(p.partCode || 'N/A', 40, y, { width: 75 });
          doc.text(p.name.slice(0, 30), 120, y, { width: 180 });
          doc.text(`₹${p.unitCost.toFixed(2)}`, 305, y, { width: 60 });
          doc.text(String(p.stockQty), 370, y, { width: 45 });
          doc.text(String(p.reorderLevel), 420, y, { width: 45 });
          doc.text(`₹${p.totalValuation.toFixed(2)}`, 470, y, { width: 85, align: 'right' });
          doc.moveDown(0.7);
        });
      }

      // Footer
      doc.fontSize(8).fillColor('#94a3b8').text('Campus CMMS Automated Reports • Confidential Internal Document', 40, 780, {
        align: 'center',
        width: 515,
      });

      doc.end();
    });
  }
}

module.exports = new ReportService();
