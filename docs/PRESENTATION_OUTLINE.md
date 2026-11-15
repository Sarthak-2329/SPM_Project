# Academic Presentation Outline — Campus CMMS

**Presentation Structure:** 14 Slides  
**Duration:** 15 Minutes (10 min Presentation + 5 min Demo & Q&A)

---

## Slide 1: Title & Project Overview
- **Header:** Computerised Maintenance Management System (CMMS) for Campus Facilities
- **Sub-bullets:**
  - Modern full-stack platform for higher-education physical infrastructure maintenance.
  - Covers HVAC, electrical, plumbing, and precision laboratory apparatus.
  - Built with React 18, Node.js Express, PostgreSQL 16, and Prisma ORM.
- **Visual:** Project branding banner & system metadata.

---

## Slide 2: Real-World Campus Problem Statement
- **Header:** The Challenge of Campus Maintenance Operations
- **Sub-bullets:**
  - Disconnected communication channels (WhatsApp, phone calls, paper complaint logs).
  - Lack of historical maintenance data leads to recurrent component failure.
  - Missed preventive servicing schedules causing unexpected outages.
  - Unquantified replacement parts expenditure and untracked technician labor.
- **Visual:** Comparison infographic: Fragmented Manual Triage vs. Unified CMMS.

---

## Slide 3: System Objectives & Target Personas
- **Header:** Objectives & Stakeholder Ecosystem
- **Sub-bullets:**
  - **Facilities Admin:** Triage requests, assign technicians, monitor inventory, review costs.
  - **Technicians:** Manage personal work order queue, log labor time, consume spare parts.
  - **Students & Staff (Requesters):** Scan QR codes, submit geolocated fault tickets, track status.
  - **Scheduler Daemon:** Autonomous background cron for routine preventive checks.
- **Diagram to Show:** `docs/diagrams/01-use-case-diagram.md` (Use Case Model).

---

## Slide 4: High-Level System Architecture
- **Header:** 4-Tier Layered Software Architecture
- **Sub-bullets:**
  - **Presentation Layer:** React 18 Single-Page Application styled with Tailwind CSS.
  - **API Layer:** Node.js + Express with rate limiting and Zod validation.
  - **Business & Domain Logic:** Services coordinating state machines and notifications.
  - **Data Access Layer:** Repositories querying PostgreSQL 16 via Prisma ORM.
- **Diagram to Show:** `docs/diagrams/05-system-architecture.md` (System Architecture).

---

## Slide 5: Data Architecture & Normalisation
- **Header:** Relational Database Design & Third Normal Form (3NF)
- **Sub-bullets:**
  - 16 relational entities capturing users, locations, assets, work orders, parts, and audit logs.
  - Strictly normalised to 3NF; eliminates redundancy and ensures data integrity.
  - Deliberate audit snapshot: `WorkOrderPart.unitCostAtTime` preserves historical job costs.
- **Diagram to Show:** `docs/diagrams/02-er-diagram.md` (Entity-Relationship Diagram).

---

## Slide 6: End-to-End Maintenance Data Flow
- **Header:** From Fault Reporting to Resolution
- **Sub-bullets:**
  - Context boundaries (Level-0 DFD).
  - Detailed sub-process decomposition across 7 major modules (Level-1 DFD).
  - Trace of data movement from client input into relational persistent stores.
- **Diagram to Show:** `docs/diagrams/04-dfd-level-1.md` (Level-1 Data Flow Diagram).

---

## Slide 7: Physical QR Code Asset Management
- **Header:** Equipment Identification & Mobile Dispatch (FR-02, FR-04)
- **Sub-bullets:**
  - 4-tier spatial hierarchy: Campus > Building > Floor > Room.
  - Server-side generation of printable QR code labels via `qrcode` library.
  - Camera scanning routes users directly to asset details and fault reporting.
- **Diagram to Show:** `docs/diagrams/08-asset-crud-sequence-diagram.md` (Asset CRUD & QR Generation).

---

## Slide 8: Work Order State Machine Engine
- **Header:** Enforcing Business Rules on Work Order Transitions (FR-07)
- **Sub-bullets:**
  - 6-state progression: `OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `ON_HOLD` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED`.
  - Server-side transition validation rejects invalid status jumps (400 Bad Request).
  - Role-based permissions: Technicians execute; Admins approve and close.
  - Mandatory reason required for putting jobs on hold.
- **Diagram to Show:** `docs/diagrams/06-work-order-state-diagram.md` (Work Order State Transition Model).

---

## Slide 9: Autonomous Preventive Maintenance (PM) Scheduler
- **Header:** Background Job Scheduling & Idempotency (FR-08)
- **Sub-bullets:**
  - Recurring time-based schedules (every $N$ days) with inspection checklists.
  - `node-cron` daemon runs at midnight; Admin "Run Now" trigger for live testing.
  - Strict daily idempotency: duplicate checks prevent repeated work order creation.
- **Diagram to Show:** `docs/diagrams/12-pm-scheduler-activity-diagram.md` (Scheduler Activity Flow).

---

## Slide 10: Inventory Control & Dynamic Job Costing
- **Header:** Atomic Stock Deduction & Cost Recomputation (FR-09)
- **Sub-bullets:**
  - Deductions run inside ACID transactions (`prisma.$transaction`).
  - Strict guard: stock can never go negative.
  - Dynamic costing formula: $\text{Total Cost} = \sum(\text{Parts} \times \text{Cost}) + (\text{Labor Hours} \times ₹250/\text{hr})$.
  - Automatic low-stock alerting when quantities reach reorder levels.
- **Diagram to Show:** `docs/diagrams/14-inventory-deduction-sequence-diagram.md` (Inventory Sequence Diagram).

---

## Slide 11: Executive Dashboard & Reporting Engine
- **Header:** Operational Analytics & Document Generation (FR-11, FR-12)
- **Sub-bullets:**
  - Recharts visualisations: Priority donut charts, monthly trend bar charts.
  - Top 10 high-maintenance cost driver assets ranking.
  - On-the-fly export: Structured CSV data and styled PDF reports (`pdfkit`).
- **Diagram to Show:** `docs/diagrams/15-dashboard-reporting-sequence-diagram.md` (Dashboard & Reporting Pipeline).

---

## Slide 12: Deployment Topology & Security Hardening
- **Header:** Production Deployment & Non-Functional Requirements (NFRs)
- **Sub-bullets:**
  - Containerised PostgreSQL 16 database running on port 5432.
  - Rate limiting on authentication routes (30 attempts / 15 mins).
  - HTTP security headers via `helmet` and parameterised queries via Prisma.
- **Diagram to Show:** `docs/diagrams/16-deployment-diagram.md` (Deployment Topology).

---

## Slide 13: Testing, Quality Assurance & Verification
- **Header:** Test Strategy & Automated Verification
- **Sub-bullets:**
  - Automated integration testing via Jest and Supertest.
  - 40 test cases across 9 suites covering all 13 Functional Requirements.
  - 100% pass rate achieved on a clean database build.
- **Visual:** Test summary table from `docs/TEST_CASES.md`.

---

## Slide 14: Summary, Limitations & Future Scope
- **Header:** Conclusion & Engineering Roadmap
- **Sub-bullets:**
  - **Delivered:** Complete working CMMS platform with 16 UML diagrams and full documentation.
  - **Current Limitations:** Local file storage, calendar-based PM only, HTTP polling.
  - **Future Scope:** IoT vibration/telemetry triggers, offline mobile PWA, multi-tenant university clustering.
- **Closing:** Thank you. Ready for live demonstration and Q&A.
