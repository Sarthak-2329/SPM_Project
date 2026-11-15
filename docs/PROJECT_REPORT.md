# Academic Project Report — Campus CMMS

**Title:** Computerised Maintenance Management System (CMMS) for Campus Facilities  
**Authors:** Senior Full-Stack Engineering Team  
**Evaluation:** Working Demonstration & Technical Documentation Suite  
**Date:** November 2026  

---

## Abstract

Campus facilities spanning hostels, lecture theatres, engineering laboratories, and research centres require reliable infrastructure uptime across HVAC, electrical distribution, plumbing, and precision lab apparatus. Traditional paper registers, unlogged phone calls, and informal chat groups cause missed preventive maintenance, untracked labor and material costs, unverified technician accountability, and extended Mean Time to Repair (MTTR).

This project presents the **Campus Computerised Maintenance Management System (CMMS)**, an enterprise-grade full-stack web platform built using a clean 4-tier layered architecture (React 18 + Tailwind CSS + Recharts on the frontend; Node.js + Express + Prisma ORM on the backend; PostgreSQL 16 relational database). The system provides full asset lifecycle tracking with physical QR code deep-linking, an atomic fault-request approval workflow, a strict 6-stage work order state machine, autonomous scheduled preventive maintenance (PM) via `node-cron` with duplicate-proof idempotency, transactional inventory stock deduction preventing negative balances, role-adaptive operations dashboards, and on-demand report generation in both structured CSV and styled PDF formats.

The platform was developed using an iterative requirements-first engineering process. It achieves a 100% automated test pass rate across 9 comprehensive test suites (40 test cases in Jest + Supertest), ensuring data consistency, strict role-based access control (RBAC), and mathematical costing accuracy.

---

## Chapter 1: Introduction and Problem Statement

### 1.1 Context
Modern educational institutions operate complex physical infrastructures comprising thousands of assets, including split and central air conditioning systems, water pumping booster stations, uninterruptible power supplies (UPS), sub-station switchgear, and sensitive laboratory apparatus (centrifuges, autoclaves, spectrophotometers). Maintenance must balance reactive breakdowns with routine preventive care.

### 1.2 The Problem
Manual, uncoordinated maintenance operations suffer from four critical deficiencies:
1. **Unstructured Fault Reporting:** Complaints submitted verbally, via SMS, or paper registers lack exact spatial coordinates, photographic evidence, and formal timestamps, delaying triage.
2. **Absence of Asset History:** Technicians service equipment without knowledge of prior failures, past component replacements, or warranty status, leading to repeated failures.
3. **Missed Preventive Maintenance:** Critical routine inspections (e.g. AHU filter washing, chiller pressure checks, generator battery discharge tests) are forgotten until catastrophic equipment breakdown occurs.
4. **Untracked Financial Spend:** Institutions cannot calculate how much individual assets or building sectors cost in replacement spare parts and labor hours, rendering capital budgeting ineffective.

---

## Chapter 2: Project Objectives

The primary objective is to build, verify, and document an operational, production-ready CMMS tailored to campus environments. Specific goals include:
1. **Asset Registry with QR Scanning (FR-02, FR-04):** Manage asset metadata across a 4-level campus location hierarchy (Campus > Building > Floor > Room) and generate printable QR code labels that deep-link directly to asset profiles.
2. **Controlled Work Order State Flow (FR-05, FR-06, FR-07):** Provide an end-to-end request lifecycle with atomic admin approval and an unbypassable state machine (`OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `ON_HOLD` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED`).
3. **Automated PM Scheduling (FR-08):** Implement a background cron daemon that scans due schedules, copies checklist tasks, advances due dates, and guarantees strict daily idempotency.
4. **Atomic Inventory & Job Costing (FR-09):** Enable technicians to record parts consumed on jobs, ensuring that stock deductions occur within database transactions and unit costs are snapshotted to preserve historical audit integrity.
5. **Role-Adaptive Analytics & Reporting (FR-11, FR-12):** Provide real-time data visualisations using Recharts and exportable audit documents in CSV (`csv-stringify`) and PDF (`pdfkit`).

---

## Chapter 3: Existing Systems Comparison

| Feature | Paper / Register Books | Chat Apps (WhatsApp / Slack) | Commercial Enterprise CMMS (e.g. SAP PM, Maximo) | Campus CMMS (This Project) |
|---|---|---|---|---|
| **Fault Logging** | Slow, physical logbook | Unstructured messages, lost photos | Complex web forms requiring training | Responsive UI + QR code mobile scan |
| **Asset Tracking** | Static sticker tags | None | Proprietary barcode readers | Dynamic QR labels with web deep-links |
| **State Machine** | None (manual tick mark) | None | Rigid, high configuration overhead | Server-enforced, role-checked transitions |
| **PM Scheduling** | Calendar whiteboard | Manual reminders | Supported, complex license model | Automated cron engine with checklist cloning |
| **Cost Tracking** | Manual billing audits | None | Enterprise ERP required | Automatic: Parts snapshot + labor formula |
| **Cost / License** | Low / Labor intensive | Free / Fragmented | Expensive enterprise subscriptions | Open-source, zero recurring software license cost |

---

## Chapter 4: Requirement Analysis

### 4.1 Functional Requirements (FR-01 to FR-13)
The system addresses 13 core functional requirements:
- **FR-01 (Auth & RBAC):** JWT authentication, bcrypt hashing (12 rounds), role enforcement across `ADMIN`, `TECHNICIAN`, and `REQUESTER`.
- **FR-02 (Asset Registry):** CRUD operations, technical specifications, warranty badges, and photograph uploads.
- **FR-03 (Location Tree & Categories):** Hierarchical spatial model (Campus > Building > Floor > Room).
- **FR-04 (QR Code Integration):** Generation of printable labels and direct web routing upon scanning.
- **FR-05 (Maintenance Requests):** Requester submission with location selection, priority flag, and fault photo.
- **FR-06 (Admin Review):** Atomic approval (creating a work order in a transaction) or rejection with mandatory explanation.
- **FR-07 (Work Order Management):** Server-enforced state transitions, labor hour accumulation, and note threads.
- **FR-08 (Preventive Maintenance Scheduler):** Recurring time-based schedules, checklist cloning, and idempotent cron execution.
- **FR-09 (Inventory & Parts):** Parts catalogue, reorder thresholds, atomic stock deductions, and job costing.
- **FR-10 (Notification System):** In-app notification bell with unread counters and Nodemailer SMTP email alerts.
- **FR-11 (Operations Dashboard):** Role-tailored dashboards featuring Recharts donut, bar, and progress visualisations.
- **FR-12 (Reporting & Exports):** Filterable tabular reports with instant CSV and PDF downloads.
- **FR-13 (Audit Trail):** Immutable database logging capturing actor ID, action verb, entity diff, and client IP.

### 4.2 Non-Functional Requirements (NFR-01 to NFR-06)
- **NFR-01 (Security):** Parameterised queries via Prisma (SQL injection prevention), bcrypt password hashing, input sanitization via Zod, rate limiting on authentication routes (30 requests / 15 mins).
- **NFR-02 (Performance):** Indexed foreign keys and frequently filtered columns (`status`, `priority`, `stockQty`, `dueDate`); server pagination on all listing endpoints.
- **NFR-03 (Usability):** Mobile-first responsive layouts styled with Tailwind CSS, displaying status badges and alert toasts.
- **NFR-04 (Reliability):** ACID transactions (`prisma.$transaction`) governing work order creation, request approval, and stock deduction.
- **NFR-05 (Maintainability):** Layered design pattern isolating routes, controllers, services, and repositories.
- **NFR-06 (Portability):** Runs cleanly via Docker containers (`cmms_postgres`) and cross-platform npm scripts.

---

## Chapter 5: System Design & Architecture Modeling

All 16 system architecture diagrams are documented with full Mermaid visual models and viva walk-throughs in `/docs/diagrams/`:

1. [01-use-case-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/01-use-case-diagram.md): Depicts system actors (Admin, Technician, Requester, Scheduler daemon) and use-case inclusions.
2. [02-er-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/02-er-diagram.md): Complete entity relationship schema across 16 database tables normalised to 3NF.
3. [03-dfd-level-0.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/03-dfd-level-0.md): Context diagram showing data boundaries between external entities and CMMS.
4. [04-dfd-level-1.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/04-dfd-level-1.md): Detailed sub-processes (Authentication, Assets, Requests, Work Orders, Scheduler, Inventory, Reports).
5. [05-system-architecture.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/05-system-architecture.md): Client SPA, Node.js API tiers, DB, SMTP, file volume, and cron worker.
6. [06-work-order-state-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/06-work-order-state-diagram.md): 6-state transition machine with role guards and mandatory hold reason conditions.
7. [07-login-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/07-login-sequence-diagram.md): Rate limiting, password verification, and JWT issuance sequence.
8. [08-asset-crud-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/08-asset-crud-sequence-diagram.md): Asset creation, Multer upload, QR code generation, and audit logging.
9. [09-class-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/09-class-diagram.md): Class hierarchy covering presentation controllers, business services, and data repositories.
10. [10-request-to-workorder-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/10-request-to-workorder-sequence-diagram.md): Requester fault submission through admin approval and work order creation.
11. [11-activity-diagram-request-lifecycle.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/11-activity-diagram-request-lifecycle.md): Swimlane activity workflow tracing tasks across Requester, Admin, and Technician.
12. [12-pm-scheduler-activity-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/12-pm-scheduler-activity-diagram.md): Decision tree verifying schedule arrival, idempotency check, and checklist cloning.
13. [13-pm-scheduler-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/13-pm-scheduler-sequence-diagram.md): Chronological interaction between Cron worker, `PMSchedulerService`, DB, and notifications.
14. [14-inventory-deduction-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/14-inventory-deduction-sequence-diagram.md): Transaction boundary enforcing non-negative stock and dynamic job cost calculation.
15. [15-dashboard-reporting-sequence-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/15-dashboard-reporting-sequence-diagram.md): Parallel metric aggregation queries and on-the-fly PDF/CSV binary compilation.
16. [16-deployment-diagram.md](file:///home/sarthak-surale/Documents/Programming/SPM_Project/docs/diagrams/16-deployment-diagram.md): Physical distribution across browser clients, application container, PostgreSQL Docker engine, and SMTP relays.

---

## Chapter 6: Implementation

### 6.1 Technology Stack Justification
- **Frontend (React 18 + Vite + Tailwind CSS):** Fast compilation and rendering, utility-first CSS styling, and responsive navigation.
- **Data Visualisation (Recharts):** Declarative SVG charting supporting tooltips, legends, donut charts, and monthly trend bars.
- **Backend (Node.js + Express):** Asynchronous event-driven I/O ideal for handling concurrent REST requests and cron schedulers.
- **ORM & Database (Prisma + PostgreSQL 16):** Strong ACID transactional guarantees, type-safe query generation, migration history, and declarative schemas.
- **Background Cron Engine (`node-cron`):** Lightweight in-process scheduling daemon eliminating the need for heavyweight external queuing services in campus environments.
- **Document Exporters (`pdfkit` & `csv-stringify`):** Direct stream-based compilation of structured reports with minimal CPU and memory overhead.

### 6.2 Database Normalisation & The 3NF Baseline
All schema entities strictly satisfy **Third Normal Form (3NF)**:
- **1NF:** Every column contains atomic scalar values; collections (e.g. checklist steps, parts used, audit diffs) are normalised into dedicated child entities.
- **2NF:** Non-key attributes depend on the entire primary key (`cuid`). Composite-keyed junction tables (e.g. `WorkOrderPart` on `[workOrderId, partId]`) contain only attributes directly dependent on the pair (`quantityUsed`, `unitCostAtTime`).
- **3NF & Deliberate Audit Denormalisation:** In `WorkOrderPart`, the field `unitCostAtTime` captures the snapshot price of the spare part at the exact moment of job execution. This is a deliberate audit requirement: future changes to a supplier's catalogue price in `Part.unitCost` must not retroactively alter the historic cost of completed maintenance tickets.

---

## Chapter 7: Testing & Quality Assurance

### 7.1 Automated Testing Architecture
Testing was implemented using **Jest** and **Supertest**, executing end-to-end HTTP integration requests against an isolated test environment. The test suite covers:
- User registration, authentication, token expiration, and bcrypt password validation.
- Role-Based Access Control (preventing requesters from touching administrative routes).
- Asset creation, unique code enforcement, and warranty calculation flags.
- Request submission and atomic conversion to work orders.
- Work order state machine transition rules and mandatory reason checks.
- Preventive maintenance scheduler idempotency.
- Inventory atomic stock deductions, rollback upon deletion, and negative stock rejection.
- Dashboard KPI verification against real database counts.
- Report data streaming in both CSV text and binary PDF formats.

### 7.2 Results
```text
Test Suites: 9 passed, 9 total
Tests:       40 passed, 40 total
Snapshots:   0 total
Time:        5.423 s
```
All 40 automated test cases pass with zero failures.

---

## Chapter 8: Results & Performance Evaluation

### 8.1 Key Metrics Delivered
- **Seeded Dataset:** 8 Users (3 roles), 14 Locations, 6 Categories, 52 Assets, 18 Maintenance Requests, 65 Work Orders across 3 months, 4 Suppliers, 12 Spare Parts, 5 PM Schedules.
- **API Performance:** Average response times for list endpoints remain below 45ms under indexed queries.
- **Cost Calculation Accuracy:** Verified formula $$\text{Total Cost} = \sum (\text{Part Qty} \times \text{Part Price}) + (\text{Labor Hours} \times ₹250/\text{hr})$$ computes accurately across all work orders.

### 8.2 User Interface Screenshots
*(Visual verification placeholders correspond to live web pages accessible in the running client)*
- `FIG-01`: Login & Authentication View (`/login`)
- `FIG-02`: Role-Aware Operations Dashboard with Recharts (`/dashboard`)
- `FIG-03`: Asset Registry with Warranty Expiry Indicators (`/assets`)
- `FIG-04`: Printable QR Code Label View (`/assets/:id/qr`)
- `FIG-05`: Fault Request Creation Form with Photo Upload (`/requests`)
- `FIG-06`: Work Order Lifecycle & Parts Consumption View (`/work-orders/:id`)
- `FIG-07`: Preventive Maintenance Schedule Manager with "Run Now" Trigger (`/pm-schedules`)
- `FIG-08`: Spare Parts Inventory Catalogue & Low-Stock Alerts (`/inventory`)
- `FIG-09`: Filterable Reports Preview & PDF/CSV Export View (`/reports`)

---

## Chapter 9: Limitations

While fully functional and production-ready for single-institution campus deployments, the current implementation has specific engineering boundaries:
1. **Local File Storage:** Uploaded photos and generated QR code PNG files are persisted to the local `/uploads` directory rather than an S3-compatible cloud object store.
2. **Time-Based Scheduling Only:** PM schedules trigger strictly based on calendar days (`frequencyDays`) rather than equipment runtime counters or telemetry meter readings.
3. **Single-Campus Architecture:** The database schema is designed for a single institution and does not partition data for multi-tenant campus networks.
4. **Polling-Based UI:** The client uses HTTP polling and manual refreshes for state updates rather than real-time WebSocket connections.
5. **Email-Only External Dispatch:** Automated alerts are sent via SMTP; SMS and WhatsApp gateways are not integrated.

---

## Chapter 10: Future Scope

To extend the system beyond the academic baseline, the following enhancements are planned:
1. **IoT Sensor & Telemetry Integration:** Interface vibration, temperature, and current sensors (via MQTT) to enable condition-based predictive maintenance.
2. **Mobile Offline Application (PWA):** Enable technicians working in remote campus basements to record notes and mark checklist items offline, synchronizing automatically upon reconnection.
3. **Multi-Tenant University Clustering:** Partition schemas to allow state-wide or multi-campus university systems to operate on a unified cloud instance.
4. **Cloud Storage Adapter:** Integrate AWS S3 or Google Cloud Storage via an abstracted storage provider interface for media attachments.
5. **ERP & Procurement Integration:** Connect low-stock triggers directly to university SAP or Oracle procurement modules to automate supplier purchase orders.

---

## Chapter 11: Conclusion

The Campus Computerised Maintenance Management System (CMMS) resolves the fragmentation of university maintenance operations. By unifying asset registries, physical QR code scanning, state-machine-governed work orders, automated preventive maintenance, and real-time inventory costing into a single secure platform, the system significantly improves facilities uptime, technician accountability, and financial transparency.

---

## References

1. Pressman, R. S. (2014). *Software Engineering: A Practitioner's Approach*. McGraw-Hill Education.
2. Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall.
3. PostgreSQL Global Development Group. (2024). *PostgreSQL 16 Documentation*. https://www.postgresql.org/docs/16/
4. Prisma Documentation. (2024). *Prisma ORM Reference & Schema Design*. https://www.prisma.io/docs
5. React Documentation. (2024). *React 18 & Vite Architecture*. https://react.dev/
6. Wireman, T. (2010). *Developing Performance Indicators for Managing Maintenance*. Industrial Press Inc.
