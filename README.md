# Campus CMMS — Computerised Maintenance Management System

[![Build & Test Status](https://img.shields.io/badge/tests-40%20passed%20%7C%20100%25-brightgreen)](docs/TEST_CASES.md)
[![Database](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](docker-compose.yml)
[![ORM](https://img.shields.io/badge/Prisma-5.18-indigo.svg)](server/prisma/schema.prisma)
[![Frontend](https://img.shields.io/badge/React-18.3-61dafb.svg)](client/package.json)
[![Backend](https://img.shields.io/badge/Node.js-18%2F20-green.svg)](server/package.json)
[![License](https://img.shields.io/badge/License-MIT-gray.svg)](LICENSE)

An enterprise-grade, full-stack **Computerised Maintenance Management System (CMMS)** engineered specifically for university and higher education campus infrastructure. The platform digitizes physical asset tracking, fault ticketing, technician work order dispatch, autonomous preventive maintenance scheduling, spare parts inventory management, and executive financial reporting.

---

## 📑 Table of Contents
- [Core Capabilities](#-core-capabilities)
- [System Architecture & Tech Stack](#-system-architecture--tech-stack)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Running with Docker DB (Recommended)](#running-with-docker-db-recommended)
  - [Running Full Stack with Docker Compose](#running-full-stack-with-docker-compose)
- [Demo Credentials](#-demo-credentials)
- [Interactive Demonstration Script](#-interactive-demonstration-script)
- [Automated Testing & Quality Assurance](#-automated-testing--quality-assurance)
- [Project Documentation & Architecture Diagrams](#-project-documentation--architecture-diagrams)
- [Implementation Milestone Progress](#-implementation-milestone-progress)
- [Repository Structure](#-repository-structure)

---

## 🚀 Core Capabilities

1. **Spatial Asset Registry & QR Code Automation:**
   - 4-level campus hierarchy: `Campus` $\rightarrow$ `Building` $\rightarrow$ `Floor` $\rightarrow$ `Room`.
   - Dynamic printable QR codes generated for every asset; scanning opens the asset's live maintenance ledger and a pre-filled fault reporting form.
2. **Breakdown Ticketing & Administrative Triage:**
   - Fast self-service fault reporting with photo attachments, priority categorization, and real-time status tracking.
   - 1-click administrative review with atomic ACID conversion from maintenance request to assigned work order.
3. **Work Order State Machine Engine:**
   - Strict server-enforced lifecycle: `OPEN` $\rightarrow$ `ASSIGNED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED` $\rightarrow$ `CLOSED` (with `ON_HOLD` and `CANCELLED` branches).
   - Immutable audit trail (`WorkOrderStatusHistory`) recording timestamps, previous state, new state, and user IDs.
   - Labor tracking with configurable hourly wage rates (e.g. ₹250/hr).
4. **Autonomous Preventive Maintenance (PM) Scheduler:**
   - Recurring inspection schedules (Daily, Weekly, Monthly, Quarterly) with standardized multi-point checklists.
   - Background `node-cron` daemon with **Strict Daily Idempotency** (running multiple times never generates duplicate tickets).
   - Admin `⚡ Run Scheduler Now` endpoint for instant live demonstration.
5. **Transactional Inventory & Negative Stock Protection:**
   - Spare parts catalog with minimum reorder levels, unit costs, and supplier tracking.
   - Concurrency-safe atomic stock deduction inside `prisma.$transaction`; rejects requests exceeding warehouse stock with `400 Bad Request`.
   - Real-time job costing: $\text{Total Cost} = (\text{Labor Hours} \times \text{Rate}) + \sum (\text{Part Qty} \times \text{Unit Cost})$.
6. **Executive Dashboards & Compliance Export Center:**
   - Role-adaptive interactive visual dashboards powered by Recharts (KPI cards, Priority donut, 6-month trend bar chart, top 10 cost-driver assets).
   - Multi-filtered report generator with 1-click export to structured CSV and styled, university-branded PDF documents.

---

## 🛠️ System Architecture & Tech Stack

```
[ Client: React 18 + Vite + Tailwind + Recharts ]
                      │  HTTP / REST (JWT Bearer)
                      ▼
[ Server: Node.js 18 + Express (Layered MVC) ]
  ├── Routes & Zod Validation Schemas
  ├── Controllers & Standard Response Envelopes
  ├── Business Services & State Machine Logic
  ├── Background node-cron Daemons (Overdue & PM Scheduler)
  └── Repositories with Prisma ORM 5.18
                      │  ACID Transactions
                      ▼
[ Database: PostgreSQL 16 (16 Relational Tables with Indexes) ]
```

| Component | Technology | Description |
|---|---|---|
| **Frontend** | React 18.3, Vite, Tailwind CSS | Single Page Application (SPA) with responsive design |
| **Data Visualization** | Recharts | Dynamic SVG charts for priority distributions and trends |
| **HTTP Client** | Axios | Custom interceptors for token injection & 401/403 session handling |
| **Backend Runtime** | Node.js 18+ / Express | REST API following Controller-Service-Repository pattern |
| **Database & ORM** | PostgreSQL 16 + Prisma ORM | Relational engine with foreign key cascades & ACID transactions |
| **Authentication** | JWT + bcrypt (12 salt rounds) | Role-Based Access Control (`ADMIN`, `TECHNICIAN`, `REQUESTER`) |
| **Background Scheduler** | node-cron | In-process daemon for daily PM generation and overdue audits |
| **File Storage** | Multer | Multipart image uploads for equipment and breakdown photos |
| **QR Code Engine** | qrcode | Automatic generation of printable SVG/PNG asset tags |
| **Report Generation** | pdfkit + csv-stringify | Server-side streamed PDF reports and CSV spreadsheets |
| **Security Hardening** | Helmet, CORS, express-rate-limit | Production-ready HTTP security headers and rate limiting |
| **Test Framework** | Jest + Supertest | Comprehensive end-to-end integration test suites |

---

## 🏁 Quick Start Guide

### Prerequisites
- **Node.js** ≥ 18 LTS (`node -v`)
- **npm** ≥ 9 (`npm -v`)
- **Docker** (recommended for running PostgreSQL 16) or local PostgreSQL instance running on port 5432

---

### Running with Docker DB (Recommended)

#### 1. Start the PostgreSQL Container
```bash
docker run -d \
  --name cmms_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cmms_dev \
  -p 5432:5432 \
  postgres:16-alpine
```
*(If the container is already created, simply run: `docker start cmms_postgres`)*

#### 2. Backend Setup & Startup
```bash
cd server

# Install backend dependencies
npm install

# Run database migrations (creates 16 relational tables)
npm run prisma:migrate

# Seed demo dataset (52 assets, 14 locations, 65+ work orders, 5 PM schedules, 12 inventory parts)
npm run prisma:seed

# Start Express development server (runs on http://localhost:3000)
npm run dev
```

#### 3. Frontend Setup & Startup
Open a new terminal window:
```bash
cd client

# Install frontend dependencies
npm install

# Start Vite development server (runs on http://localhost:5173)
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`**

---

### Running Full Stack with Docker Compose
To run all services (PostgreSQL + Express Backend + React Frontend) simultaneously in containers:
```bash
# From the project root
docker compose up --build
```

| Service | Access URL | Description |
|---|---|---|
| **Frontend Web App** | `http://localhost:5173` | React Client Portal |
| **Backend REST API** | `http://localhost:3000/api` | Express API Base |
| **Health Check** | `http://localhost:3000/api/health` | System Status & DB Health |
| **Prisma Studio** | `cd server && npm run prisma:studio` | Database GUI Browser |

---

## 🔐 Demo Credentials

All seeded demo accounts use the standard password: **`Campus@1234`**  
*(The web login page features one-click buttons to instantly autofill these credentials).*

| Persona | Role | Email | Password | Primary Workflow |
|---|---|---|---|---|
| **Facilities Admin** | `ADMIN` | `admin@campus.edu` | `Campus@1234` | Full access, triage requests, assign WOs, run PM scheduler, exports |
| **Facilities Head** | `ADMIN` | `facilities.head@campus.edu` | `Campus@1234` | Executive oversight, cost audits, compliance analytics |
| **Rajesh Verma** | `TECHNICIAN` | `tech.raj@campus.edu` | `Campus@1234` | Senior HVAC Technician: Execute WOs, log labor hours, deduct spare parts |
| **Priya Nair** | `TECHNICIAN` | `tech.priya@campus.edu` | `Campus@1234` | Electrical Technician |
| **Rahul Verma** | `REQUESTER` | `student.rahul@campus.edu` | `Campus@1234` | Student Requester: Scan QR stickers, log defects, track status |
| **Anita Desai** | `REQUESTER` | `staff.anita@campus.edu` | `Campus@1234` | Staff Requester: Campus-wide requests |

---

## 🎬 Interactive Demonstration Script

The application includes an end-to-end demo flow that can be evaluated in under 10 minutes:

```
[Requester submits Request] ──> [Admin approves & spawns WO] ──> [Technician executes & logs parts] ──> [Admin triggers PM Scheduler] ──> [Executive Analytics & PDF Export]
```

1. **Student Fault Submission:**
   - Log in as `student.rahul@campus.edu`.
   - Navigate to **Asset Registry**, inspect Asset **`AST-HVAC-001` (Central Chiller Unit 01)** and view its printable QR sticker.
   - Go to **Fault Requests** $\rightarrow$ Click **+ New Request** $\rightarrow$ Select `AST-HVAC-001`, Priority: `HIGH`, add description and photo, submit. Request appears in `PENDING` state.
2. **Admin Triage & ACID Work Order Conversion:**
   - Log in as `admin@campus.edu`. Check the unread notification bell alert.
   - Open **Fault Requests**, select the pending ticket, click **Approve & Create Work Order**.
   - Assign technician `Rajesh Verma`, set due date, and confirm. Request transitions to `APPROVED` and generates Work Order in `ASSIGNED` status in a single database transaction.
3. **Technician Execution & Cost Tracking:**
   - Log in as `tech.raj@campus.edu`. Open the assigned chiller ticket.
   - Transition status to `IN_PROGRESS`. Log `2.5` hours of labor.
   - In **Parts Used**, consume `2` units of `[PRT-AC-FLT-01] Pleated Air Filter`.
   - Observe warehouse stock decrement and dynamic cost computation: $\text{Labor } (₹625.00) + \text{Parts } (₹900.00) = \mathbf{₹1,525.00}$.
4. **Negative Stock Guardrail Verification:**
   - Attempt to deduct `50` units of capacitor `PRT-ELEC-CAP-01` (only ~4 in stock).
   - System returns `400 Bad Request: Insufficient stock available`, proving database inventory guardrails.
   - Transition status to `COMPLETED` and enter resolution notes.
5. **Autonomous PM Scheduler & Idempotency Proof:**
   - Log in as `admin@campus.edu`. Navigate to **PM Schedules**.
   - Notice schedule `PMS-HVAC-001` with bright **DUE TODAY** badge.
   - Click **⚡ Run Scheduler Now** $\rightarrow$ 1 work order generated with multi-point inspection checklist pre-copied.
   - Click **⚡ Run Scheduler Now** a second time $\rightarrow$ 0 work orders generated, proving strict daily idempotency.
6. **Executive Dashboard & PDF/CSV Export:**
   - Navigate to **Dashboard** to view live Recharts priority donuts, 6-month volume trends, and top 10 cost-driver equipment.
   - Navigate to **Reports**, filter by date range and category, and click **Export as CSV** or **Export as PDF**.

---

## 🧪 Automated Testing & Quality Assurance

The codebase includes an automated Jest and Supertest integration suite with **100% passing test cases** across all core modules:

```bash
cd server
NODE_ENV=test npm test
```

### Verified Test Suite Breakdown:
| Test Suite | Module Under Test | Status | Tests |
|---|---|:---:|:---:|
| `assets.test.js` | Asset CRUD, QR generation, category/location filtering | ✅ PASS | 5 |
| `auth.test.js` | User registration, login, JWT validation, password hashing | ✅ PASS | 4 |
| `rbac.test.js` | Role-based authorization gates (`ADMIN`, `TECHNICIAN`, `REQUESTER`) | ✅ PASS | 4 |
| `requests.test.js` | Request submission, photo attachment, admin approval transaction | ✅ PASS | 5 |
| `workOrders.test.js` | Finite state machine validation, illegal transition rejection (400) | ✅ PASS | 6 |
| `pmScheduler.test.js` | Background PM generation, due-date calculation, daily idempotency | ✅ PASS | 4 |
| `inventory.test.js` | Atomic stock deduction, rollback, negative stock rejection (400) | ✅ PASS | 4 |
| `dashboard.test.js` | Metric aggregation, priority distribution, cost-driver rankings | ✅ PASS | 4 |
| `reports.test.js` | Multi-filtered query generation, CSV stringify, PDFkit streaming | ✅ PASS | 4 |
| **Total** | **Full System Integration Test Suite** | **✅ ALL PASS** | **40 / 40** |

---

## 📚 Project Documentation & Architecture Diagrams

Comprehensive system documentation and visual models are maintained in the [`/docs`](docs/) directory:

### Architecture & UML Diagrams
- [01-use-case-diagram.md](docs/diagrams/01-use-case-diagram.md) — Complete Actor Use Case Model (FR-01 to FR-13)
- [02-er-diagram.md](docs/diagrams/02-er-diagram.md) — 16-Table Relational Schema with Constraints
- [03-dfd-level-0.md](docs/diagrams/03-dfd-level-0.md) — Level 0 Context Data Flow Diagram
- [04-dfd-level-1.md](docs/diagrams/04-dfd-level-1.md) — Level 1 Decomposed Functional DFD
- [05-system-architecture.md](docs/diagrams/05-system-architecture.md) — 4-Tier Layered Backend Architecture
- [06-work-order-state-diagram.md](docs/diagrams/06-work-order-state-diagram.md) — Work Order State Machine Transitions
- [07-login-sequence-diagram.md](docs/diagrams/07-login-sequence-diagram.md) — JWT Authentication & Verification Flow
- [08-asset-crud-sequence-diagram.md](docs/diagrams/08-asset-crud-sequence-diagram.md) — Asset Management & QR Code Generation
- [09-class-diagram.md](docs/diagrams/09-class-diagram.md) — Object-Oriented Domain Class Model
- [10-request-to-workorder-sequence-diagram.md](docs/diagrams/10-request-to-workorder-sequence-diagram.md) — Request Approval ACID Transaction Flow
- [11-activity-diagram-request-lifecycle.md](docs/diagrams/11-activity-diagram-request-lifecycle.md) — Multi-Actor Cross-Functional Swimlane Diagram
- [12-pm-scheduler-activity-diagram.md](docs/diagrams/12-pm-scheduler-activity-diagram.md) — Autonomous PM Generation & Idempotency Pipeline
- [13-pm-scheduler-sequence-diagram.md](docs/diagrams/13-pm-scheduler-sequence-diagram.md) — Scheduler Service Database Interaction
- [14-inventory-deduction-sequence-diagram.md](docs/diagrams/14-inventory-deduction-sequence-diagram.md) — Atomic Stock Deduction & Rollback Boundary
- [15-dashboard-reporting-sequence-diagram.md](docs/diagrams/15-dashboard-reporting-sequence-diagram.md) — Real-Time Analytical Aggregation Flow
- [16-deployment-diagram.md](docs/diagrams/16-deployment-diagram.md) — Infrastructure Deployment & Container Topology

### Technical & Academic Specifications
- [SRS.md](docs/SRS.md) — Software Requirements Specification with Full Traceability
- [DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md) — Database Table Definitions, Types, and Index Specifications
- [API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) — Complete REST API Endpoint Reference with Request/Response Payloads
- [PROJECT_REPORT.md](docs/PROJECT_REPORT.md) — Comprehensive Capstone Project Report (11 Chapters)
- [TEST_CASES.md](docs/TEST_CASES.md) — Traceability Matrix & Test Results for Every Functional Requirement
- [VIVA_QA.md](docs/VIVA_QA.md) — 40 Exhaustive Viva Examination Questions & Concise Answers
- [PROJECT_QA.md](docs/PROJECT_QA.md) — Spoken Answers to the Five Core Viva Evaluation Questions
- [Campus_CMMS_Presentation.pptx](docs/Campus_CMMS_Presentation.pptx) — Formatted 8-Slide PowerPoint Presentation Deck
- [Campus_CMMS_Evaluation_Questions_and_Answers.docx](docs/Campus_CMMS_Evaluation_Questions_and_Answers.docx) — Formal Word Document of Viva Q&A

---

## 📈 Implementation Milestone Progress

| Milestone | Deliverables & Scope | Test Count | Status |
|---|---|:---:|:---:|
| **Phase 1 (Week 1)** | Repository skeleton, PostgreSQL 16 schema, SRS, Data Dictionary, initial UML diagrams | — | ✅ Complete |
| **Phase 2 (Week 2)** | JWT authentication, RBAC, Asset Registry, 4-level spatial hierarchy, QR generator | 13 | ✅ Complete |
| **Phase 3 (Week 3)** | Fault request portal, Admin triage, Work Order state machine, audit trail, Nodemailer | 11 | ✅ Complete |
| **Phase 4 (Week 4)** | Autonomous PM scheduler (node-cron), idempotency, inventory catalog, atomic deductions | 8 | ✅ Complete |
| **Phase 5 (Week 5)** | Recharts dashboard, multi-filtered CSV & PDF reporting, security hardening, full Jest suite | 8 | ✅ Complete |
| **Phase 6 (Week 6)** | Consistency audit, submission packaging, viva preparation, demo script, final documentation | 40 | ✅ Complete |

---

## 📁 Repository Structure

```
├── client/                      # React 18 Single Page Application (SPA)
│   ├── src/
│   │   ├── api/                 # Axios client & centralized endpoint definitions
│   │   ├── components/          # Reusable UI widgets, layout navbar & sidebar
│   │   ├── context/             # AuthContext (JWT session state & auto-login)
│   │   ├── pages/               # Role-adaptive dashboards, requests, WOs, assets, reports
│   │   └── App.jsx              # Protected route definitions with RBAC gates
│   ├── package.json
│   └── vite.config.js
├── server/                      # Node.js + Express REST API Backend
│   ├── prisma/
│   │   ├── schema.prisma        # 16-table PostgreSQL schema definition
│   │   ├── seed.js              # Comprehensive demo dataset seeder
│   │   └── migrations/          # Automated version-controlled database migrations
│   ├── src/
│   │   ├── __tests__/           # 9 automated Jest/Supertest integration test suites
│   │   ├── config/              # Database connection singleton & cron config
│   │   ├── controllers/         # Thin HTTP request/response handlers
│   │   ├── middleware/          # JWT auth, RBAC, Zod validation, Multer, rate-limiting
│   │   ├── repositories/        # Database query abstractions using Prisma ORM
│   │   ├── routes/              # Express API route declarations
│   │   ├── services/            # Business logic, state machine, ACID transactions, scheduler
│   │   └── utils/               # Pagination, standard response envelopes, state transitions
│   └── uploads/                 # Local directory for asset photos and generated QR PNGs
├── docs/                        # Complete technical and academic project documentation
│   ├── diagrams/                # 16 Mermaid architectural and UML sequence diagrams
│   ├── wireframes/              # UI/UX layout wireframes
│   ├── SRS.md                   # Software Requirements Specification
│   ├── DATA_DICTIONARY.md       # Column-level schema dictionary
│   ├── API_DOCUMENTATION.md     # REST API endpoint reference
│   ├── PROJECT_REPORT.md        # 11-chapter capstone project report
│   ├── TEST_CASES.md            # Verified test results & requirements traceability matrix
│   ├── VIVA_QA.md               # 40 viva preparation questions & answers
│   ├── PROJECT_QA.md            # Spoken answers to the 5 core viva questions
│   ├── Campus_CMMS_Presentation.pptx # 8-slide PowerPoint presentation deck
│   └── Campus_CMMS_Evaluation_Questions_and_Answers.docx # Word document of viva Q&A
├── scripts/
│   ├── package-submission.sh    # Builds verified clean submission ZIP archive
│   └── verify-submission.sh     # Unzips, migrates, seeds, and verifies clean build
├── docker-compose.yml           # Multi-container orchestration (DB + API + Client)
├── .env.example                 # Sanitized environment variable reference
├── .gitignore                   # Excludes node_modules, build outputs, and local secrets
└── README.md                    # Main project overview and setup documentation
```

---

## 📄 License
This project is developed for educational and institutional maintenance purposes under the **MIT License**.
