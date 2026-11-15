# System Architecture Diagram — Campus CMMS

## Title
**ARCH-05: System Architecture — Layers, Components, and External Integrations**

---

## Diagram

```mermaid
flowchart TD
    %% ─── Client Layer ──────────────────────────────────────────────────────────
    subgraph CLIENT ["🌐 Client Layer — React / Vite (Port 5173)"]
        direction LR
        UI_Pages["Pages\n(Login, Dashboard,\nAssets, WOs, PM,\nInventory, Reports)"]
        UI_Comp["Reusable Components\n(Tables, Forms, Charts,\nNotification Bell, QR Display)"]
        UI_Hooks["Custom Hooks\n(useAuth, useApi,\nuseNotifications)"]
        UI_Router["React Router v6\n(Protected Routes\nper role)"]
        UI_Charts["Recharts\n(Bar, Line, Pie)"]
        UI_API["API Client Layer\n(fetch + interceptors\nfor JWT)"]

        UI_Pages --> UI_Comp
        UI_Pages --> UI_Hooks
        UI_Pages --> UI_Charts
        UI_Router --> UI_Pages
        UI_Hooks --> UI_API
    end

    %% ─── API Gateway Layer ─────────────────────────────────────────────────────
    subgraph API ["⚙️ API Layer — Express.js (Port 3000)"]
        direction TB
        MW_Helmet["Helmet\n(Security Headers)"]
        MW_CORS["CORS\nMiddleware"]
        MW_Morgan["Morgan\n(HTTP Logger)"]
        MW_Auth["JWT Auth\nMiddleware"]
        MW_RBAC["RBAC\nMiddleware"]
        MW_Validate["Zod Validation\nMiddleware"]
        MW_Upload["Multer\n(File Upload)"]
        MW_Audit["Audit Log\nMiddleware"]
        MW_Error["Global Error\nHandler"]

        ROUTES["Routes\n(auth, assets, locations,\ncategories, requests,\nworkOrders, pm, parts,\nsuppliers, notifications,\nreports, health)"]
    end

    %% ─── Business Logic Layer ──────────────────────────────────────────────────
    subgraph BIZ ["🧠 Business Logic — Controllers + Services"]
        direction LR
        CTRL["Controllers\n(HTTP handling,\nrequest parsing,\nresponse shaping)"]
        SVC["Services\n(Business rules,\ntransactions,\nvalidation logic)"]
        CTRL --> SVC
    end

    %% ─── Data Access Layer ─────────────────────────────────────────────────────
    subgraph DAL ["🗄️ Data Access — Repositories + Prisma ORM"]
        REPO["Repositories\n(DB queries,\nno business logic)"]
        PRISMA["Prisma Client\n(Type-safe queries,\nmigrations)"]
        REPO --> PRISMA
    end

    %% ─── Background Services ───────────────────────────────────────────────────
    subgraph BG ["🕐 Background Services"]
        CRON["node-cron\nScheduler\n(PM WO generation,\nOverdue check)"]
        EMAIL_SVC["Email Service\n(Nodemailer)"]
        NOTIF_SVC["Notification\nService"]
        QR_SVC["QR Code Service\n(qrcode library)"]
        PDF_SVC["PDF Service\n(pdfkit)"]
        CSV_SVC["CSV Service\n(csv-stringify)"]
    end

    %% ─── External Systems ──────────────────────────────────────────────────────
    subgraph EXT ["🔌 External Systems"]
        POSTGRES[("PostgreSQL\nDatabase\n:5432")]
        SMTP_SRV["Ethereal SMTP\n(dev)\nReal SMTP\n(prod)"]
        UPLOAD_DIR["Local Filesystem\n/uploads\n(photos, QR codes)"]
    end

    %% ─── Connections ───────────────────────────────────────────────────────────
    UI_API -->|"HTTP REST\nJSON + JWT"| ROUTES

    MW_Helmet & MW_CORS & MW_Morgan --> ROUTES
    ROUTES --> MW_Auth --> MW_RBAC --> MW_Validate
    MW_Validate --> CTRL
    MW_Upload --> CTRL
    MW_Audit --> CTRL

    SVC --> REPO
    SVC --> NOTIF_SVC
    SVC --> QR_SVC
    SVC --> PDF_SVC
    SVC --> CSV_SVC

    PRISMA -->|"SQL over TCP"| POSTGRES
    CRON --> SVC
    NOTIF_SVC --> EMAIL_SVC
    EMAIL_SVC -->|"SMTP"| SMTP_SRV
    QR_SVC -->|"write PNG"| UPLOAD_DIR
    MW_Upload -->|"write file"| UPLOAD_DIR
    UPLOAD_DIR -->|"serve static"| UI_API

    MW_Error -.->|"catches all\nthrown errors"| ROUTES

    %% ─── Testing Layer (dev only) ──────────────────────────────────────────────
    subgraph TEST ["🧪 Testing (Jest + Supertest)"]
        UNIT["Unit Tests\n(services, utils)"]
        INTEGRATION["Integration Tests\n(routes + DB)"]
    end
    TEST -.->|"test against"| API
```

---

## Plain-English Walkthrough (Viva Notes)

This diagram shows the full system architecture of the CMMS, divided into six layers/areas.

**Client Layer (React / Vite):** The user interacts with React pages (Dashboard, Assets, WOs, etc.) built with Tailwind CSS. React Router enforces role-based protected routes. Recharts renders dashboard charts. A thin API client layer attaches JWT tokens to every outbound request.

**API Layer (Express.js):** Incoming HTTP requests pass through a middleware chain: Helmet sets security headers, CORS allows the React origin, Morgan logs requests, JWT Auth verifies the token, RBAC checks the user's role against the route's required permission, and Zod Validation parses and validates the request body. Multer handles file uploads. An Audit middleware logs sensitive actions. A global error handler catches any unhandled exceptions and returns a consistent `{ success, message, data }` JSON response.

**Business Logic Layer (Controllers + Services):** Controllers are thin — they parse HTTP input and call the appropriate Service. Services contain all business rules, enforce transactions, and coordinate between multiple repositories and background services.

**Data Access Layer (Repositories + Prisma):** Repositories contain only database query logic (no business rules). They use Prisma Client to issue type-safe, parameterised SQL queries against PostgreSQL — preventing SQL injection.

**Background Services:** `node-cron` runs scheduled tasks (PM WO generation, overdue detection). The Notification Service writes in-app records and delegates email dispatch to Nodemailer. QR code, PDF, and CSV services are utility modules called by Services on demand.

**External Systems:** PostgreSQL is the sole datastore. Ethereal SMTP (a free test SMTP service) handles emails in development; a real SMTP provider is configured via `.env` for production. The local filesystem (`/uploads`) stores photos and generated QR code images.
