# Campus CMMS — Maintenance Management System

A web-based **Computerised Maintenance Management System** for campus facilities (hostels, classrooms, labs). Covers ACs, plumbing, electrical, and lab equipment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router + Recharts |
| Backend | Node.js 18 + Express (routes → controllers → services → repositories) |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | JWT + bcrypt, RBAC middleware |
| Scheduler | node-cron |
| Email | Nodemailer (Ethereal in dev) |
| File Uploads | Multer |
| QR Codes | qrcode library |
| PDF/CSV Export | pdfkit + csv-stringify |
| Validation | Zod |
| Testing | Jest + Supertest |

---

## Prerequisites

- **Node.js** ≥ 18 LTS
- **npm** ≥ 9
- **PostgreSQL** ≥ 14 OR **Docker** (recommended)

---

## Quick Start (Local — with Docker DB)

```bash
# 1. Clone the repo
git clone <repo-url> cmms
cd cmms

# 2. Start PostgreSQL via Docker
docker run -d \
  --name cmms_postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=cmms_dev \
  -p 5432:5432 \
  postgres:16-alpine

# 3. Configure server environment
cd server
cp .env.example .env
# Edit .env if you changed DB credentials above

# 4. Install server dependencies & run migrations
npm install
npm run prisma:migrate   # creates tables
npm run prisma:seed      # loads demo data

# 5. Start the backend (new terminal)
npm run dev              # → http://localhost:3000

# 6. Install client dependencies & start the frontend (new terminal)
cd ../client
npm install
npm run dev              # → http://localhost:5173
```

---

## Quick Start (Full Docker Compose)

```bash
# From the project root
cp server/.env.example server/.env   # review and edit if needed
docker-compose up --build            # starts DB + server + client
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/api/health |
| Prisma Studio | `cd server && npm run prisma:studio` |

---

## Demo Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@campus.edu | Admin@1234 |
| Technician | tech1@campus.edu | Tech@1234 |
| Requester | requester1@campus.edu | User@1234 |

> Full demo accounts are created by the Phase 2 seed script.

---

## Project Structure

```
/
├── client/               # React + Vite frontend
│   ├── src/
│   │   ├── pages/        # Page-level components
│   │   ├── components/   # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── api/          # API client + endpoint functions
│   │   ├── context/      # React context (auth, notifications)
│   │   └── utils/        # Helpers
│   └── ...
├── server/               # Express backend
│   ├── src/
│   │   ├── config/       # env.js, database.js (Prisma singleton)
│   │   ├── routes/       # Express routers
│   │   ├── controllers/  # HTTP handlers (thin)
│   │   ├── services/     # Business logic + transactions
│   │   ├── repositories/ # Prisma DB queries
│   │   ├── middleware/   # auth, rbac, validate, errorHandler, upload
│   │   └── utils/        # response.js, pagination.js
│   ├── prisma/
│   │   ├── schema.prisma # Database schema
│   │   └── seed.js       # Demo data seeder
│   ├── uploads/          # Multer upload destination (gitignored)
│   ├── .env.example      # Environment variable template
│   └── package.json
├── docs/
│   ├── PROJECT_BRIEF.md
│   ├── SRS.md
│   ├── DATA_DICTIONARY.md
│   ├── TEST_CASES.md
│   ├── diagrams/         # Mermaid diagram .md files
│   └── wireframes/       # ASCII/Markdown wireframes
├── docker-compose.yml
└── README.md
```

---

## Available Scripts

### Server (`/server`)

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon |
| `npm test` | Run Jest tests |
| `npm run lint` | ESLint check |
| `npm run prisma:migrate` | Run pending Prisma migrations |
| `npm run prisma:seed` | Seed demo data |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run prisma:reset` | Drop + recreate DB + re-seed |

### Client (`/client`)

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## API Conventions

All responses use the envelope: `{ success: boolean, message: string, data: any }`

```json
// Success
{ "success": true,  "message": "Asset created", "data": { "id": "..." } }

// Error
{ "success": false, "message": "Validation failed", "data": [{ "field": "name", "message": "Required" }] }
```

Pagination: `GET /api/assets?page=1&limit=20`  
Auth: `Authorization: Bearer <jwt_token>`

---

## Documentation

| File | Contents |
|---|---|
| `docs/SRS.md` | Full Software Requirements Specification |
| `docs/DATA_DICTIONARY.md` | Column-level DB documentation |
| `docs/TEST_CASES.md` | Manual and automated test cases |
| `docs/diagrams/01-use-case-diagram.md` | Use case diagram (FR-01..13) |
| `docs/diagrams/02-er-diagram.md` | Entity-relationship diagram |
| `docs/diagrams/03-dfd-level-0.md` | Context diagram |
| `docs/diagrams/04-dfd-level-1.md` | Level 1 DFD |
| `docs/diagrams/05-system-architecture.md` | Architecture diagram |
| `docs/diagrams/06-work-order-state-diagram.md` | WO state machine |

---

## Phase Status

| Phase | Description | Status |
|---|---|---|
| Phase 1 | Skeleton, DB schema, diagrams, SRS | ✅ Complete |
| Phase 2 | Auth, Assets, Locations, full seed | 🔲 Pending |
| Phase 3 | Requests, Work Orders, PM | 🔲 Pending |
| Phase 4 | Inventory, Notifications, Dashboard | 🔲 Pending |
| Phase 5 | Reports, Tests, Polish | 🔲 Pending |
