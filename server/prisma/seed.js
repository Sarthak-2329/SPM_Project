'use strict';

/**
 * Prisma Seed Script v2 (Phase 3):
 * - 3 User Roles (2 Admins, 3 Technicians, 3 Requesters)
 * - 14 Campus Spatial Locations
 * - 6 Categories
 * - 52 Assets with live QR codes
 * - 18 Maintenance Requests (PENDING, APPROVED, REJECTED)
 * - 65+ Work Orders spread across the last 3 months:
 *   - Statuses: OPEN, ASSIGNED, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED
 *   - Priorities: LOW, MEDIUM, HIGH, CRITICAL
 *   - 10+ Overdue work orders
 *   - Full status history and technician notes for realism
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

async function main() {
  console.info('🌱 Starting Phase 3 Comprehensive Seed Script...');

  const qrcodeDir = path.join(__dirname, '..', 'uploads', 'qrcodes');
  if (!fs.existsSync(qrcodeDir)) {
    fs.mkdirSync(qrcodeDir, { recursive: true });
  }

  // ── 1. Create Users ─────────────────────────────────────────────────────────
  console.info('👤 Seeding users...');
  const defaultPassword = await bcrypt.hash('Campus@1234', 10);

  const usersData = [
    { email: 'admin@campus.edu', name: 'Dr. Ramesh Kumar (Chief Warden & Facilities Admin)', role: 'ADMIN', phone: '+91 98765 43210' },
    { email: 'facilities.head@campus.edu', name: 'Smt. Sunita Rao (Campus Facilities Head)', role: 'ADMIN', phone: '+91 98765 43211' },
    { email: 'tech.raj@campus.edu', name: 'Rajesh Verma (Senior HVAC & AC Tech)', role: 'TECHNICIAN', phone: '+91 98765 43220' },
    { email: 'tech.priya@campus.edu', name: 'Priya Sundaram (Electrical & Lighting Tech)', role: 'TECHNICIAN', phone: '+91 98765 43221' },
    { email: 'tech.amit@campus.edu', name: 'Amit Patil (Plumbing & Water Systems Tech)', role: 'TECHNICIAN', phone: '+91 98765 43222' },
    { email: 'student.rahul@campus.edu', name: 'Rahul Sharma (Student, Hostel A-204)', role: 'REQUESTER', phone: '+91 98765 43230' },
    { email: 'staff.anita@campus.edu', name: 'Anita Deshmukh (Lab Assistant, Physics Lab)', role: 'REQUESTER', phone: '+91 98765 43231' },
    { email: 'prof.sharma@campus.edu', name: 'Prof. Vikram Sharma (HOD Mechanical Eng.)', role: 'REQUESTER', phone: '+91 98765 43232' },
  ];

  const users = {};
  for (const u of usersData) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, phone: u.phone, isActive: true },
      create: { ...u, password: defaultPassword, isActive: true },
    });
  }

  // ── 2. Create Locations ─────────────────────────────────────────────────────
  console.info('🏢 Seeding campus location tree...');
  const campus = await prisma.location.upsert({
    where: { id: 'loc-campus-main' },
    update: {},
    create: { id: 'loc-campus-main', name: 'Main Campus, Pune', type: 'CAMPUS' },
  });

  const bldgAcademicA = await prisma.location.upsert({
    where: { id: 'loc-bldg-acad-a' },
    update: {},
    create: { id: 'loc-bldg-acad-a', name: 'Academic Block A (Engineering)', type: 'BUILDING', parentId: campus.id },
  });

  const bldgAcademicB = await prisma.location.upsert({
    where: { id: 'loc-bldg-acad-b' },
    update: {},
    create: { id: 'loc-bldg-acad-b', name: 'Academic Block B (Computing & Labs)', type: 'BUILDING', parentId: campus.id },
  });

  const bldgHostelA = await prisma.location.upsert({
    where: { id: 'loc-bldg-hostel-a' },
    update: {},
    create: { id: 'loc-bldg-hostel-a', name: 'Mandakini Hostel (Boys)', type: 'BUILDING', parentId: campus.id },
  });

  const floorAcadA1 = await prisma.location.upsert({
    where: { id: 'loc-flr-acad-a1' },
    update: {},
    create: { id: 'loc-flr-acad-a1', name: 'Ground Floor, Block A', type: 'FLOOR', parentId: bldgAcademicA.id },
  });

  const floorAcadB2 = await prisma.location.upsert({
    where: { id: 'loc-flr-acad-b2' },
    update: {},
    create: { id: 'loc-flr-acad-b2', name: '2nd Floor, Block B', type: 'FLOOR', parentId: bldgAcademicB.id },
  });

  const floorHostelA2 = await prisma.location.upsert({
    where: { id: 'loc-flr-hostel-a2' },
    update: {},
    create: { id: 'loc-flr-hostel-a2', name: '2nd Floor, Mandakini Hostel', type: 'FLOOR', parentId: bldgHostelA.id },
  });

  const roomsData = [
    { id: 'loc-rm-101', name: 'Classroom 101 (Lecture Hall)', type: 'ROOM', parentId: floorAcadA1.id },
    { id: 'loc-rm-102', name: 'Classroom 102', type: 'ROOM', parentId: floorAcadA1.id },
    { id: 'loc-lab-iot', name: 'Advanced IoT & Embedded Systems Lab', type: 'ROOM', parentId: floorAcadB2.id },
    { id: 'loc-lab-ai', name: 'AI & Data Science Computing Lab', type: 'ROOM', parentId: floorAcadB2.id },
    { id: 'loc-rm-h204', name: 'Hostel Room A-204', type: 'ROOM', parentId: floorHostelA2.id },
    { id: 'loc-rm-h205', name: 'Hostel Room A-205', type: 'ROOM', parentId: floorHostelA2.id },
    { id: 'loc-utility-pump', name: 'Central Water Pump Station', type: 'ROOM', parentId: campus.id },
  ];

  const locations = [floorAcadA1, floorAcadB2, floorHostelA2];
  for (const r of roomsData) {
    const loc = await prisma.location.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
    locations.push(loc);
  }

  // ── 3. Create Categories ────────────────────────────────────────────────────
  console.info('🏷️ Seeding categories...');
  const categoriesData = [
    { name: 'HVAC & Air Conditioning', description: 'Split ACs, duct systems, chillers, tower fans' },
    { name: 'Electrical & Power Systems', description: 'Diesel generators, UPS, distribution boards, transformers' },
    { name: 'Plumbing & Water Supply', description: 'Water coolers, RO plants, booster pumps, sewer valves' },
    { name: 'Laboratory & Research Equipment', description: 'Oscilloscopes, 3D printers, CNC routers, spectrum analysers' },
    { name: 'Audio-Visual & Smart Classroom', description: 'Laser projectors, smart touch panels, motorized screens, mic receivers' },
    { name: 'Campus Infrastructure & Fixtures', description: 'Solar inverters, high-mast flood lights, fire alarms' },
  ];

  const categories = [];
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    categories.push(cat);
  }

  // ── 4. Seed 52 Assets with QR codes ─────────────────────────────────────────
  console.info('🛠️ Seeding 52 assets...');
  const appBaseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
  const assetBlueprints = [
    { name: '2.0 Ton Split AC (Inverter)', catIdx: 0, prefix: 'HVA', mfg: 'Daikin' },
    { name: '1.5 Ton Cassette AC Unit', catIdx: 0, prefix: 'HVA', mfg: 'Voltas' },
    { name: '250 kVA Silent Diesel Generator Set', catIdx: 1, prefix: 'ELE', mfg: 'Kirloskar' },
    { name: 'Commercial 150 LPH RO Water Purifier', catIdx: 2, prefix: 'PLU', mfg: 'Blue Star' },
    { name: '4-Channel 200 MHz Digital Storage Oscilloscope', catIdx: 3, prefix: 'LAB', mfg: 'Tektronix' },
    { name: 'High-Lumen Laser Ceiling Projector 5000lm', catIdx: 4, prefix: 'AVS', mfg: 'Epson' },
    { name: 'Roof-Mounted 50 kW Grid-Tied Solar Inverter', catIdx: 5, prefix: 'INF', mfg: 'Schneider Electric' },
  ];

  const seededAssets = [];
  for (let i = 1; i <= 52; i++) {
    const bp = assetBlueprints[(i - 1) % assetBlueprints.length];
    const category = categories[bp.catIdx];
    const location = locations[(i - 1) % locations.length];
    const assetCode = `${bp.prefix}-${String(i).padStart(4, '0')}`;

    const isExpired = i % 5 === 0;
    const purchaseYear = isExpired ? 2021 : 2024;
    const purchaseDate = new Date(`${purchaseYear}-0${(i % 9) + 1}-15`);
    const warrantyExpiry = new Date(purchaseDate);
    warrantyExpiry.setFullYear(warrantyExpiry.getFullYear() + (isExpired ? 2 : 3));

    const statusOptions = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED'];
    const status = statusOptions[i % statusOptions.length];

    const safeCode = assetCode.replace(/[^a-zA-Z0-9_-]/g, '_');
    const qrFilename = `qr-${safeCode}.png`;
    const qrFilePath = path.join(qrcodeDir, qrFilename);

    const asset = await prisma.asset.upsert({
      where: { assetCode },
      update: { status, warrantyExpiry },
      create: {
        assetCode,
        name: `${bp.name} #${i}`,
        categoryId: category.id,
        locationId: location.id,
        manufacturer: bp.mfg,
        serialNo: `SN-${bp.prefix}-${2024000 + i}`,
        purchaseDate,
        warrantyExpiry,
        status,
        qrCodeUrl: `/uploads/qrcodes/${qrFilename}`,
        notes: `Operational asset tagged to ${location.name}`,
      },
    });

    const assetDetailUrl = `${appBaseUrl}/assets/${asset.id}`;
    if (!fs.existsSync(qrFilePath)) {
      await QRCode.toFile(qrFilePath, assetDetailUrl, {
        errorCorrectionLevel: 'H',
        type: 'png',
        margin: 2,
        width: 300,
      });
    }

    seededAssets.push(asset);
  }

  // ── 5. Seed Maintenance Requests ────────────────────────────────────────────
  console.info('📋 Seeding maintenance requests...');
  const requesters = [users['student.rahul@campus.edu'], users['staff.anita@campus.edu'], users['prof.sharma@campus.edu']];
  const requestFaults = [
    { desc: 'AC leaking water from bottom grille onto student desks', prio: 'HIGH' },
    { desc: 'Flickering high-bay LED tube lights causing eye strain during lectures', prio: 'MEDIUM' },
    { desc: 'Water purifier dispenser button jammed; water overflow in corridor', prio: 'CRITICAL' },
    { desc: 'Oscilloscope channel 2 showing high ground noise and signal drift', prio: 'MEDIUM' },
    { desc: 'Ceiling projector HDMI port loose; disconnecting intermittently', prio: 'LOW' },
    { desc: 'Solar inverter humming loudly with amber fault light on panel', prio: 'HIGH' },
  ];

  const seededRequests = [];
  for (let i = 0; i < 18; i++) {
    const fault = requestFaults[i % requestFaults.length];
    const requester = requesters[i % requesters.length];
    const asset = seededAssets[i % seededAssets.length];

    const reqStatus = i < 5 ? 'PENDING' : i < 7 ? 'REJECTED' : 'APPROVED';
    const rejectionReason = reqStatus === 'REJECTED' ? 'Duplicate request or non-facility issue' : null;

    const reqRecord = await prisma.maintenanceRequest.create({
      data: {
        requesterId: requester.id,
        assetId: asset.id,
        locationId: asset.locationId,
        description: `${fault.desc} (${asset.name})`,
        priority: fault.prio,
        status: reqStatus,
        rejectionReason,
        createdAt: new Date(Date.now() - (18 - i) * 86400000 * 3),
      },
    });

    seededRequests.push(reqRecord);
  }

  // ── 6. Seed 65+ Work Orders Across Last 3 Months ────────────────────────────
  console.info('🔧 Seeding 65+ realistic Work Orders...');
  const techs = [users['tech.raj@campus.edu'], users['tech.priya@campus.edu'], users['tech.amit@campus.edu']];
  const adminUser = users['admin@campus.edu'];

  const woTemplates = [
    { title: 'Emergency Compressor Leak Repair', desc: 'Isolate refrigerant line and vacuum test suction valve', prio: 'CRITICAL', est: 4200 },
    { title: 'Replace Blown ELCB and Balance Phase Load', desc: 'Inspect LT breaker trip and replace auxiliary contactor', prio: 'HIGH', est: 2800 },
    { title: 'Submersible Pump Bearing Greasing & Vibration Check', desc: 'Lubricate bearings and measure axial play on motor', prio: 'MEDIUM', est: 1500 },
    { title: 'Digital Oscilloscope BNC Connector Soldering', desc: 'Resolder broken internal probe ground terminal', prio: 'LOW', est: 800 },
    { title: 'Laser Projector Optical Filter Cleaning', desc: 'Clean intake air filter and vacuum dust from DLP prism', prio: 'LOW', est: 500 },
    { title: 'Central RO Water Plant Micron Filter Replacement', desc: 'Replace 5-micron spun sediment cartridge and check TDS', prio: 'HIGH', est: 3200 },
    { title: 'Solar Inverter Cooling Fan Replacement', desc: 'Swap noisy DC brushless cooling fans and inspect heatsink', prio: 'MEDIUM', est: 2100 },
  ];

  const now = Date.now();
  let woCounter = 0;

  for (let i = 1; i <= 65; i++) {
    const tmpl = woTemplates[(i - 1) % woTemplates.length];
    const tech = techs[(i - 1) % techs.length];
    const asset = seededAssets[(i - 1) % seededAssets.length];

    // Spread creation dates over past 90 days
    const daysAgo = Math.floor(90 - (i * 85) / 65);
    const createdAt = new Date(now - daysAgo * 86400000);

    // Status distribution
    let status;
    if (i <= 20) {
      status = 'CLOSED';
    } else if (i <= 35) {
      status = 'COMPLETED';
    } else if (i <= 46) {
      status = 'IN_PROGRESS';
    } else if (i <= 54) {
      status = 'ON_HOLD';
    } else if (i <= 60) {
      status = 'ASSIGNED';
    } else {
      status = 'OPEN';
    }

    // Set Due Date: 12 of them in the past for non-completed -> OVERDUE
    let dueDate;
    const isOverdueTarget = (status === 'IN_PROGRESS' || status === 'ASSIGNED' || status === 'ON_HOLD') && i % 3 === 0;
    if (isOverdueTarget) {
      dueDate = new Date(now - (5 + (i % 10)) * 86400000); // 5 to 15 days overdue
    } else {
      dueDate = new Date(createdAt.getTime() + 10 * 86400000);
    }

    const timeSpent = ['COMPLETED', 'CLOSED'].includes(status)
      ? parseFloat((2 + (i % 6) * 1.5).toFixed(1))
      : status === 'IN_PROGRESS'
      ? parseFloat((1 + (i % 3) * 0.5).toFixed(1))
      : null;

    const actualCost = ['COMPLETED', 'CLOSED'].includes(status) ? tmpl.est + (i % 4) * 250 : null;

    // Link first 11 approved maintenance requests to work orders
    const linkedRequest = i <= 11 && seededRequests[i + 4] && seededRequests[i + 4].status === 'APPROVED'
      ? seededRequests[i + 4].id
      : null;

    const wo = await prisma.workOrder.create({
      data: {
        title: `${tmpl.title} #${i}`,
        description: `${tmpl.desc} on ${asset.name}.`,
        assetId: asset.id,
        maintenanceRequestId: linkedRequest,
        priority: tmpl.prio,
        status,
        assigneeId: status === 'OPEN' ? null : tech.id,
        createdById: adminUser.id,
        dueDate,
        estimatedCost: tmpl.est,
        actualCost,
        timeSpent,
        createdAt,
      },
    });

    // Seed Status History
    await prisma.workOrderStatusHistory.create({
      data: {
        workOrderId: wo.id,
        fromStatus: null,
        toStatus: 'OPEN',
        changedById: adminUser.id,
        reason: 'Work order initialized',
        createdAt,
      },
    });

    if (status !== 'OPEN') {
      const assignedTime = new Date(createdAt.getTime() + 3600000 * 2);
      await prisma.workOrderStatusHistory.create({
        data: {
          workOrderId: wo.id,
          fromStatus: 'OPEN',
          toStatus: 'ASSIGNED',
          changedById: adminUser.id,
          reason: `Assigned to ${tech.name}`,
          createdAt: assignedTime,
        },
      });

      if (['IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CLOSED'].includes(status)) {
        const inProgTime = new Date(assignedTime.getTime() + 3600000 * 4);
        await prisma.workOrderStatusHistory.create({
          data: {
            workOrderId: wo.id,
            fromStatus: 'ASSIGNED',
            toStatus: 'IN_PROGRESS',
            changedById: tech.id,
            reason: 'Technician on-site inspection begun',
            createdAt: inProgTime,
          },
        });

        if (status === 'ON_HOLD') {
          await prisma.workOrderStatusHistory.create({
            data: {
              workOrderId: wo.id,
              fromStatus: 'IN_PROGRESS',
              toStatus: 'ON_HOLD',
              changedById: tech.id,
              reason: 'Waiting for vendor spare part consignment delivery',
              createdAt: new Date(inProgTime.getTime() + 3600000 * 6),
            },
          });
        }

        if (['COMPLETED', 'CLOSED'].includes(status)) {
          const compTime = new Date(inProgTime.getTime() + 3600000 * 8);
          await prisma.workOrderStatusHistory.create({
            data: {
              workOrderId: wo.id,
              fromStatus: 'IN_PROGRESS',
              toStatus: 'COMPLETED',
              changedById: tech.id,
              reason: 'Component replaced and full load test verified',
              createdAt: compTime,
            },
          });

          if (status === 'CLOSED') {
            await prisma.workOrderStatusHistory.create({
              data: {
                workOrderId: wo.id,
                fromStatus: 'COMPLETED',
                toStatus: 'CLOSED',
                changedById: adminUser.id,
                reason: 'Verified by Facilities Supervisor. Signed off.',
                createdAt: new Date(compTime.getTime() + 3600000 * 12),
              },
            });
          }
        }
      }
    }

    // Add note for realistic audit trail
    if (i % 2 === 0) {
      await prisma.workOrderNote.create({
        data: {
          workOrderId: wo.id,
          authorId: tech.id,
          content: `On-site diagnostic complete. Measured operating temperature at 42°C. Next inspection required in 30 days.`,
          createdAt: new Date(createdAt.getTime() + 3600000 * 5),
        },
      });
    }

    woCounter++;
  }

  // ── 7. Seed Suppliers & Parts (Phase 4: FR-09) ──────────────────────────────
  console.info('📦 Seeding Suppliers and Inventory Parts...');
  const suppliersData = [
    {
      name: 'Apex Industrial & Electrical Spares',
      contactName: 'Mukesh Ambani / Rajesh Gupta',
      email: 'sales@apexspares.com',
      phone: '+91 98200 11223',
      address: 'Plot 42, MIDC Industrial Area, Phase II',
    },
    {
      name: 'Blue Star & Carrier Authorized Parts Ltd',
      contactName: 'Anand Kumar',
      email: 'supplies@bluestarparts.in',
      phone: '+91 98199 44556',
      address: 'Shed 12, HVAC Logistics Park',
    },
    {
      name: 'Supreme Pipes & Sanitary Hardware Hub',
      contactName: 'Sanjay Agarwal',
      email: 'orders@supremehardware.co.in',
      phone: '+91 98333 77889',
      address: 'Shop 7-9, Wholesale Market Road',
    },
    {
      name: 'Campus Scientific Instruments & Lab Consumables',
      contactName: 'Dr. Meena Iyer',
      email: 'labsupplies@campuslabcare.org',
      phone: '+91 98760 99887',
      address: 'Technology Park, Gate 4',
    },
  ];

  const seededSuppliers = [];
  for (const s of suppliersData) {
    let sup = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (!sup) {
      sup = await prisma.supplier.create({ data: s });
    }
    seededSuppliers.push(sup);
  }

  const partsData = [
    {
      partCode: 'PRT-AC-FLT-01',
      name: 'High-Density AC Air Filter Mesh (2x2 ft)',
      description: 'Washable nylon pre-filter for Daikin/Voltas split units',
      unitCost: 350.0,
      stockQty: 24,
      reorderLevel: 10,
      supplierId: seededSuppliers[1].id,
    },
    {
      partCode: 'PRT-AC-CAP-45',
      name: 'Dual Run Capacitor 45+5 MFD 440V',
      description: 'Motor compressor capacitor for 1.5 & 2.0 Ton ACs',
      unitCost: 480.0,
      stockQty: 4, // LOW STOCK! <= reorderLevel 8
      reorderLevel: 8,
      supplierId: seededSuppliers[1].id,
    },
    {
      partCode: 'PRT-AC-R410A',
      name: 'R410A Eco Refrigerant Gas Cylinder (10kg)',
      description: 'Refrigerant refill cylinder for VRV and split air conditioners',
      unitCost: 4200.0,
      stockQty: 2, // LOW STOCK! <= reorderLevel 3
      reorderLevel: 3,
      supplierId: seededSuppliers[1].id,
    },
    {
      partCode: 'PRT-EL-MCB-32',
      name: 'Schneider MCB 32A C-Curve 10kA (Triple Pole)',
      description: 'Heavy duty breaker for lab electrical distribution panels',
      unitCost: 1150.0,
      stockQty: 15,
      reorderLevel: 5,
      supplierId: seededSuppliers[0].id,
    },
    {
      partCode: 'PRT-EL-LED-18',
      name: 'Philips 18W T8 LED Batten Tube (Cool Daylight)',
      description: 'Classroom & hostel corridor energy-saving lights',
      unitCost: 220.0,
      stockQty: 60,
      reorderLevel: 25,
      supplierId: seededSuppliers[0].id,
    },
    {
      partCode: 'PRT-EL-CON-32',
      name: 'Siemens 3TF30 Power Contactor (240V Coil, 32A)',
      description: 'Magnetic starter contactor for water pump motors and chillers',
      unitCost: 1450.0,
      stockQty: 3, // LOW STOCK! <= reorderLevel 5
      reorderLevel: 5,
      supplierId: seededSuppliers[0].id,
    },
    {
      partCode: 'PRT-PL-VAL-01',
      name: 'Brass Ball Valve Full Bore 1-inch (PN25)',
      description: 'Quarter-turn shutoff valve for hostel riser pipes',
      unitCost: 550.0,
      stockQty: 18,
      reorderLevel: 6,
      supplierId: seededSuppliers[2].id,
    },
    {
      partCode: 'PRT-PL-TAP-SS',
      name: 'Hindware Heavy Brass Pillar Tap (Half-inch Chrome)',
      description: 'Washbasin taps for hostel bathrooms and lab wash stations',
      unitCost: 850.0,
      stockQty: 22,
      reorderLevel: 10,
      supplierId: seededSuppliers[2].id,
    },
    {
      partCode: 'PRT-PL-SEAL-TH',
      name: 'PTFE Teflon Thread Seal Tape (12mm x 10m roll)',
      description: 'Pipe joint plumbing seal roll pack',
      unitCost: 35.0,
      stockQty: 85,
      reorderLevel: 20,
      supplierId: seededSuppliers[2].id,
    },
    {
      partCode: 'PRT-LB-BLB-HAL',
      name: 'Microscope Halogen Bulb 6V 20W (G4 Base)',
      description: 'Illumination lamp replacement for Olympus biology microscopes',
      unitCost: 320.0,
      stockQty: 7,
      reorderLevel: 5,
      supplierId: seededSuppliers[3].id,
    },
    {
      partCode: 'PRT-LB-HE-COIL',
      name: 'Water Bath Immersion Heating Element (2000W SS304)',
      description: 'Precision chemistry lab water bath replacement element',
      unitCost: 1850.0,
      stockQty: 1, // CRITICAL LOW STOCK! <= reorderLevel 3
      reorderLevel: 3,
      supplierId: seededSuppliers[3].id,
    },
    {
      partCode: 'PRT-LB-FUS-10A',
      name: 'Fast-Blow Ceramic Fuse 10A 250V (5x20mm)',
      description: 'Apparatus protection fuse for oscilloscopes and centrifuges',
      unitCost: 45.0,
      stockQty: 50,
      reorderLevel: 15,
      supplierId: seededSuppliers[3].id,
    },
  ];

  const seededParts = [];
  for (const p of partsData) {
    let part = await prisma.part.findUnique({ where: { partCode: p.partCode } });
    if (!part) {
      part = await prisma.part.create({ data: p });
    }
    seededParts.push(part);
  }

  // ── 8. Seed Preventive Maintenance (PM) Schedules (Phase 4: FR-08) ──────────
  console.info('📅 Seeding PM Schedules and Checklists...');
  const activeAssets = await prisma.asset.findMany({ where: { status: 'ACTIVE' }, take: 10 });
  const chiefAdmin = users['admin@campus.edu'];

  const pmData = [
    {
      name: 'Bi-Weekly Central AC Chiller & AHU Preventive Servicing',
      description: 'Comprehensive inspection, coil cleaning, pressure verification, and belt tension check for central HVAC.',
      assetId: activeAssets[0].id,
      frequencyDays: 14,
      nextDueDate: new Date(), // ★ DUE TODAY! Ideal for live demo 'Run Scheduler Now' verification ★
      checklist: [
        'Isolate main circuit breaker and tag out (LOTO)',
        'Inspect AHU belt tension, alignment, and wear',
        'Clean air intake pre-filters with low-pressure wash',
        'Check refrigerant suction & discharge pressures',
        'Measure motor running current with calibrated clamp meter',
        'Verify condensate drain pan is flowing freely without sludge',
      ],
    },
    {
      name: 'Monthly Hostel Water Pumping Station & Pressure Vessel Check',
      description: 'Inspect booster pump seals, check check-valves, record vibration and electrical insulation resistance.',
      assetId: activeAssets[1].id,
      frequencyDays: 30,
      nextDueDate: new Date(Date.now() + 86400000 * 5), // due in 5 days
      checklist: [
        'Inspect mechanical shaft seal for drip leakage',
        'Check suction and delivery pressure gauges',
        'Grease motor drive end and non-drive end bearings',
        'Test auto-cut off float switch in overhead tank',
      ],
    },
    {
      name: 'Quarterly Physics Lab Centrifuge & Equipment Calibration',
      description: 'Precision rotor balance, optical speed verification, lid-lock interlock safety check.',
      assetId: activeAssets[2].id,
      frequencyDays: 90,
      nextDueDate: new Date(Date.now() + 86400000 * 18),
      checklist: [
        'Inspect centrifuge rotor cavity for corrosion or micro-cracks',
        'Verify emergency lid release and safety interlock cut-off',
        'Calibrate tachometer RPM using digital stroboscope',
        'Clean motor ventilation louvers and carbon brushes',
      ],
    },
    {
      name: 'Fortnightly Library Server Room UPS & Battery Bank Discharge Test',
      description: 'Check battery terminal torque, measure open-circuit cell voltages, and run 5-minute inverter load test.',
      assetId: activeAssets[3].id,
      frequencyDays: 14,
      nextDueDate: new Date(Date.now() + 86400000 * 9),
      checklist: [
        'Measure DC float voltage across each 12V SMF battery block',
        'Inspect battery terminals for sulphate oxidation and re-torque',
        'Perform 5-minute offline inverter battery discharge test',
        'Verify server room exhaust fan airflow and ambient temperature',
      ],
    },
    {
      name: 'Monthly Lecture Theatre Audiovisual & Projector Maintenance',
      description: 'Filter dust removal, lamp hour check, HDMI matrix switch test, and optical alignment.',
      assetId: activeAssets[4].id,
      frequencyDays: 30,
      nextDueDate: new Date(Date.now() + 86400000 * 12),
      checklist: [
        'Clean projector intake sponge filter',
        'Record lamp runtime hours and warning status',
        'Clean projection lens with lint-free microfiber cloth',
        'Test automated projection motorized screen limit switches',
      ],
    },
  ];

  for (const pm of pmData) {
    let existing = await prisma.pMSchedule.findFirst({ where: { name: pm.name } });
    if (!existing) {
      existing = await prisma.pMSchedule.create({
        data: {
          name: pm.name,
          description: pm.description,
          assetId: pm.assetId,
          frequencyDays: pm.frequencyDays,
          nextDueDate: pm.nextDueDate,
          isActive: true,
          checklistItems: {
            create: pm.checklist.map((desc, idx) => ({
              description: desc,
              order: idx + 1,
            })),
          },
        },
      });
    }
  }

  // ── 9. Attach Sample Parts to Existing In-Progress Work Orders ──────────────
  const sampleWOs = await prisma.workOrder.findMany({
    where: { status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    take: 4,
  });

  if (sampleWOs.length > 0 && seededParts.length > 0) {
    const wo1 = sampleWOs[0];
    const existingParts = await prisma.workOrderPart.findMany({ where: { workOrderId: wo1.id } });
    if (existingParts.length === 0) {
      await prisma.workOrderPart.create({
        data: {
          workOrderId: wo1.id,
          partId: seededParts[0].id,
          quantityUsed: 2,
          unitCostAtTime: seededParts[0].unitCost,
        },
      });
      // Update WO actual cost: 2 * 350 + labour
      const labourCost = (wo1.timeSpent || 1.5) * 250;
      await prisma.workOrder.update({
        where: { id: wo1.id },
        data: { actualCost: 700.0 + labourCost },
      });
    }
  }

  console.info(`✅ Phase 4 Seed complete! Added 4 Suppliers, 12 Parts (4 low-stock), 5 PM Schedules (1 DUE TODAY).`);
  console.info(`   Created ${seededRequests.length} requests and ${woCounter} work orders.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
