# Software Requirements Specification (SRS)
## Campus Maintenance Management System (CMMS)

**Version:** 3.0  
**Date:** 2026-11-12  
**Status:** Baseline — Phase 3 Updated

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [External Interface Requirements](#5-external-interface-requirements)
6. [Requirements-to-Module Traceability Matrix](#6-requirements-to-module-traceability-matrix)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the **Campus Maintenance Management System (CMMS)** — a web-based platform that computerises the maintenance lifecycle for campus facilities including hostels, classrooms, and laboratories. The document serves as the contract between stakeholders and the development team, and as the primary reference for design, implementation, and testing.

### 1.2 Scope

The CMMS covers:

- **Asset management** for physical equipment (ACs, plumbing, electrical, lab equipment) across all campus locations.
- **Maintenance request** submission by students and staff, with admin review and approval.
- **Work order** creation, assignment, tracking, and closure.
- **Preventive maintenance (PM)** scheduling with automatic work-order generation.
- **Inventory** management for spare parts with low-stock alerts.
- **Notifications** (in-app and email) for key lifecycle events.
- **Reporting and analytics** for management decision-making.
- **Audit logging** of all sensitive actions.

Out of scope: HR payroll, procurement (beyond parts catalogue), external vendor management portals, and IoT sensor integration.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|---|---|
| CMMS | Computerised Maintenance Management System |
| WO | Work Order — a formal task assigned to a technician |
| PM | Preventive Maintenance — scheduled, proactive maintenance |
| FR | Functional Requirement |
| NFR | Non-Functional Requirement |
| RBAC | Role-Based Access Control |
| JWT | JSON Web Token — stateless authentication token |
| ORM | Object-Relational Mapper (Prisma in this project) |
| SRS | Software Requirements Specification |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| QR | Quick Response (code) |
| 3NF | Third Normal Form — database normalisation level |

### 1.4 References

- Project Brief: `docs/PROJECT_BRIEF.md`
- ER Diagram: `docs/diagrams/02-er-diagram.md`
- Use Case Diagram: `docs/diagrams/01-use-case-diagram.md`
- Architecture Diagram: `docs/diagrams/05-system-architecture.md`
- Work Order State Machine: `docs/diagrams/06-work-order-state-diagram.md`
- Login Sequence: `docs/diagrams/07-login-sequence-diagram.md`
- Asset CRUD Sequence: `docs/diagrams/08-asset-crud-sequence-diagram.md`
- Class Diagram: `docs/diagrams/09-class-diagram.md`
- Request to Work Order Sequence: `docs/diagrams/10-request-to-workorder-sequence-diagram.md`
- Request Lifecycle Activity: `docs/diagrams/11-activity-diagram-request-lifecycle.md`

---

## 2. Overall Description

### 2.1 Product Perspective

The CMMS is a standalone web application that replaces manual, paper-based or ad-hoc maintenance tracking on campus. It integrates with:

- **Email (SMTP/Ethereal)** — for notification delivery.
- **File system** — for photo/document uploads via Multer.
- **QR code scanner** (device camera) — for asset lookup and quick-request initiation.

The system is built as a RESTful API backend (Node.js/Express) consumed by a Single-Page Application frontend (React/Vite). Both share a PostgreSQL database via Prisma ORM.

### 2.2 User Classes and Characteristics

| Role | Characteristics | Key Actions |
|---|---|---|
| **Admin** | Campus facilities manager or supervisor; high technical literacy; uses system daily. | Full CRUD on all entities; approves/rejects requests; generates reports; manages users. |
| **Technician** | Maintenance staff; moderate tech literacy; primarily mobile use. | Views assigned WOs; updates status; logs time, notes, parts used. |
| **Requester** | Students or non-technical staff; low tech literacy; occasional use. | Submits maintenance requests; tracks request status; scans QR codes. |
| **Scheduler** (System) | Background cron job; no human interaction. | Auto-generates PM work orders on schedule. |

### 2.3 Operating Environment

- **Backend runtime:** Node.js ≥ 18 LTS
- **Frontend runtime:** Modern browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- **Database:** PostgreSQL ≥ 14
- **Deployment:** Local (`npm` scripts) or containerised (`docker-compose`)
- **OS:** Linux / macOS / Windows (WSL2 for Windows)

### 2.4 Design and Implementation Constraints

| Constraint | Details |
|---|---|
| Technology stack | Fixed per project brief (React, Express, PostgreSQL, Prisma) |
| Authentication | JWT only; no OAuth or SSO |
| File storage | Local filesystem (`/uploads`); no cloud storage |
| Email | Ethereal SMTP in development; real SMTP via env config in production |
| Database migrations | Must use Prisma migrations; no raw DDL unless inside a migration |
| Secret management | All secrets via `.env`; `.env` must never be committed |

### 2.5 Assumptions and Dependencies

- PostgreSQL instance is available locally or via Docker.
- Node.js ≥ 18 is installed on the developer machine.
- For demo/evaluation, the seed script provides sufficient realistic data.
- QR code scanning assumes the user's device has a camera and a QR scanner app that opens URLs.
- Email notifications in development route to Ethereal (no real emails sent).
- All assets have a physical location within the campus hierarchy.

---

## 3. Functional Requirements

### 3.1 FR Table

| ID | Description | Priority | Actor(s) |
|---|---|---|---|
| **FR-01** | The system shall allow users to register (admin creates technician/requester accounts), log in with email+password, and log out. JWT access tokens shall be issued on login with a configurable expiry. Role-based access shall restrict endpoints to authorised roles. | High | All |
| **FR-02** | The system shall provide full CRUD operations for assets, including: asset code (auto-generated), name, category, location, manufacturer, serial number, purchase date, warranty expiry date, operational status (Active / Under Maintenance / Retired), and an optional photo. | High | Admin |
| **FR-03** | The system shall maintain a location hierarchy (Campus > Building > Floor > Room) allowing assets and requests to be tagged at any level. Asset categories shall also be maintainable (CRUD). | High | Admin |
| **FR-04** | The system shall generate a unique QR code for each asset. Scanning the QR code shall open the asset detail page in a browser. Any authenticated user shall be able to raise a maintenance request directly from the asset detail page. | Medium | All |
| **FR-05** | Requesters shall be able to submit maintenance requests specifying an asset or location, a description of the fault, priority (Low/Medium/High/Critical), and an optional photo. Requesters shall be able to list and track the status of their own requests. | High | Requester |
| **FR-06** | Admins shall be able to review pending maintenance requests, approve a request (which automatically creates a Work Order) or reject it with a mandatory reason. The requester shall be notified of the outcome. | High | Admin |
| **FR-07** | Work Orders shall have: title, description, linked asset, priority, assigned technician, due date, and a full status history. Status shall follow the flow: Open → Assigned → In Progress → On Hold → Completed → Closed. Technicians shall be able to log notes, time spent (in hours), and parts used on a WO. | High | Admin, Technician |
| **FR-08** | Admins shall be able to create Preventive Maintenance schedules, each linked to an asset and specifying a recurrence interval (every N days) and a checklist. A background job (cron) shall auto-generate work orders on the due date, preventing duplicate generation for the same schedule in the same cycle. | High | Admin, Scheduler |
| **FR-09** | The system shall maintain a parts catalogue with: part code, name, description, stock quantity, reorder level, unit cost, and supplier. When parts are recorded as used on a WO, stock quantity shall be deducted atomically (database transaction). Parts with stock ≤ reorder level shall be flagged as low-stock. | Medium | Admin |
| **FR-10** | The system shall send in-app notifications and email notifications for: WO assignment (to technician), WO status change (to requester and admin), overdue WO (to admin and assignee), and low-stock alert (to admin). | Medium | All |
| **FR-11** | The system shall provide a dashboard showing: open vs. closed WO count, overdue WO count, WOs by priority (chart), cost per asset, technician workload (WOs per technician), and PM compliance percentage (PM WOs completed on time / total PM WOs due). | High | Admin, Technician |
| **FR-12** | Admins shall be able to generate reports on: WOs by date range, WOs by asset, WOs by technician, inventory usage, and PM compliance. Reports shall be exportable as CSV and PDF. | Medium | Admin |
| **FR-13** | The system shall maintain an audit log recording: user, action type, affected entity type and ID, timestamp, and change details (JSON diff). The audit log shall be accessible to admins and shall not be deletable by any user. | Medium | Admin |

---

## 4. Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Security | Passwords shall be hashed using bcrypt (min 10 salt rounds). JWTs shall have a configurable expiry (default 24 h). All endpoints shall enforce RBAC via middleware. User input shall be validated with Zod schemas. SQL injection shall be prevented by using Prisma parameterised queries exclusively. Output encoding shall prevent reflected XSS. |
| NFR-02 | Performance | All list/collection endpoints shall support pagination (page + limit query params). Prisma migrations shall include indexes on all foreign-key columns and high-cardinality filter columns (status, priority, dueDate). |
| NFR-03 | Usability | The UI shall be responsive (mobile-first Tailwind CSS) and accessible on viewports ≥ 320 px wide. All tables shall be scrollable on small screens. Forms shall provide inline validation feedback. |
| NFR-04 | Reliability | Stock deduction and WO-part linking shall execute inside a PostgreSQL transaction; partial failure shall roll back the entire operation. Work-order creation from a maintenance request shall also be transactional. |
| NFR-05 | Maintainability | The backend shall follow a strict four-layer architecture (routes → controllers → services → repositories). No business logic shall appear in routes or repositories. All secrets shall be loaded from `.env`; a `.env.example` shall document every variable. Code shall be linted (ESLint) and formatted (Prettier) consistently. |
| NFR-06 | Portability | The project shall run with `npm run dev` (server) and `npm run dev` (client) for local development, and via `docker-compose up` for one-command startup. No environment-specific paths shall be hardcoded. |

---

## 5. External Interface Requirements

### 5.1 User Interfaces

- **Login / Register Page:** Email + password authentication with role-based routing.
- **User Directory:** Admin management of roles, provisioning technicians, and activating/deactivating accounts.
- **Location & Category Hierarchy:** Tree and list navigation for spatial nodes and equipment categories.
- **Asset Registry & Details:** Searchable, filterable catalogue with warranty expiry badges and printable QR sticker views.
- **Maintenance Requests Queue & Submission:** Fault reporting and tracking with administrator approve/reject dialogs.
- **Work Orders:** State machine progression, status history audit timeline, technician notes, and labour time counter.
- **Notifications Panel:** In-app notification bell with real-time unread badge and dropdown.

---

## 6. Requirements-to-Module Traceability Matrix

| FR | Backend Module(s) | Frontend Module(s) | DB Table(s) | Status |
|---|---|---|---|---|
| **FR-01** | `auth.routes`, `auth.controller`, `auth.service`, `user.repository`, `auth.middleware`, `rbac.middleware` | `pages/Login.jsx`, `pages/Register.jsx`, `context/AuthContext.jsx`, `components/common/ProtectedRoute.jsx` | `users` | ✅ Implemented (Phase 2) |
| **FR-02** | `assets.routes`, `assets.controller`, `assets.service`, `asset.repository`, `middleware/upload.js` | `pages/AssetList.jsx`, `pages/AssetDetail.jsx` | `assets`, `categories`, `locations` | ✅ Implemented (Phase 2) |
| **FR-03** | `locations.routes`, `categories.routes`, `location.service`, `category.service`, repositories | `pages/LocationsCategories.jsx` | `locations`, `categories` | ✅ Implemented (Phase 2) |
| **FR-04** | `services/qr.service.js`, `assets.routes`, `assets.controller` | `pages/PrintableQR.jsx`, `pages/AssetDetail.jsx` | `assets` (`qrCodeUrl`) | ✅ Implemented (Phase 2) |
| **FR-05** | `maintenanceRequests.routes`, `maintenanceRequests.service`, `maintenanceRequest.repository` | `pages/MaintenanceRequests.jsx` | `maintenance_requests` | ✅ Implemented (Phase 3) |
| **FR-06** | `maintenanceRequests.controller` (approve/reject), `maintenanceRequest.service` ($transaction) | `pages/MaintenanceRequests.jsx` (Admin modals) | `maintenance_requests`, `work_orders` | ✅ Implemented (Phase 3) |
| **FR-07** | `workOrders.routes`, `workOrders.controller`, `workOrders.service`, `workOrder.repository`, `workOrderStateMachine.js` | `pages/WorkOrders.jsx`, `pages/WorkOrderDetail.jsx` | `work_orders`, `work_order_status_history`, `work_order_notes` | ✅ Implemented (Phase 3) |
| **FR-08** | `pmSchedules.routes`, `pmSchedule.service`, `pmScheduler.service`, `pmSchedule.repository`, `node-cron` | `pages/PMSchedules.jsx` | `pm_schedules`, `pm_checklist_items`, `work_orders` | ✅ Implemented (Phase 4) |
| **FR-09** | `parts.routes`, `suppliers.routes`, `inventory.service`, `part.repository`, `supplier.repository` | `pages/Inventory.jsx`, `pages/WorkOrderDetail.jsx` | `parts`, `suppliers`, `work_order_parts` | ✅ Implemented (Phase 4) |
| **FR-10** | `notifications.service`, `email.service` (Nodemailer), `notification.repository` | `components/layout/Navbar.jsx` (Notification bell) | `notifications` | ✅ Implemented (Phase 3 & 4) |
| **FR-11** | `dashboard.routes`, `dashboard.service` | `pages/Dashboard.jsx` (Recharts) | All entities | ✅ Implemented (Phase 5) |
| **FR-12** | `reports.routes`, `report.service`, `pdfkit`, `csv-stringify` | `pages/Reports.jsx` | All entities | ✅ Implemented (Phase 5) |
| **FR-13** | `services/audit.service.js`, `repositories/audit.repository.js`, `routes/auditLogs.routes.js` | Admin Audit View | `audit_logs` | ✅ Implemented (Phase 2) |

---

*Document maintained by: Development Team*  
*Last updated: Phase 5 Final Release Baseline*
