# 16 — System Deployment Diagram

This UML deployment diagram depicts the physical and operational deployment topology of the Campus Computerised Maintenance Management System (CMMS), illustrating client web browsers, the Node.js Express application container, PostgreSQL database engine, file storage, and external SMTP services.

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (User Devices)"]
        BrowserA["Desktop / Tablet Browser\n(Admin & Facilities Management)"]
        BrowserB["Mobile / Tablet Browser\n(Maintenance Technicians on-site)"]
        BrowserC["Mobile Browser / QR Scanner\n(Students & Campus Staff)"]
    end

    subgraph HostServer["Host Environment / Container Cluster"]
        subgraph WebTier["Web & Application Tier (Port 3000 / 5173)"]
            ViteStatic["React 18 SPA (Vite)\nTailwind CSS + Recharts"]
            ExpressApp["Node.js Express API Server\n(Layered: Routes -> Controllers -> Services -> Repositories)"]
            CronWorker["Background Cron Engine (node-cron)\n• PM Scheduler (Midnight)\n• Overdue & Warranty Alerts (06:00 AM)"]
            RateLimiter["Rate Limiting & Security Shield\n(express-rate-limit, Helmet, CORS)"]
        end

        subgraph StorageTier["Data & File Persistence Tier"]
            PostgresDB[("PostgreSQL 16 Engine\n(Port 5432 - Docker cmms_postgres)\nPrisma ORM Client & Migrations")]
            LocalStorage["Local File Storage Volume (/uploads)\n• Asset Photo Files (/uploads/assets)\n• Generated QR Code PNGs (/uploads/qrcodes)"]
        end
    end

    subgraph ExternalServices["External Infrastructure Services"]
        SMTPServer["SMTP Mail Server\n(Nodemailer - Ethereal / Institutional Relay)"]
    end

    %% Network Connections
    BrowserA -->|HTTPS / REST API| ExpressApp
    BrowserB -->|HTTPS / REST API| ExpressApp
    BrowserC -->|HTTPS / QR URL Navigation| ExpressApp

    ExpressApp -->|Prisma Client / TCP 5432| PostgresDB
    ExpressApp -->|Disk I/O / fs Stream| LocalStorage
    ExpressApp -->|SMTP / TLS 587| SMTPServer

    CronWorker -->|Periodic Internal Trigger| ExpressApp
    RateLimiter -.->|Filter & Guard| ExpressApp
```

---

### Plain-English Viva Walkthrough (5–10 Lines)
1. **Client Tier:** End users interact with the system via standard desktop and mobile browsers. Students scan physical asset QR codes directly using device cameras, which deep-link into the React single-page application.
2. **Application Tier:** The Node.js Express server is built with a 4-tier clean architecture (Routes $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Repositories). It enforces role-based access control and rate limiting on sensitive authentication routes.
3. **Background Services:** Embedded within the server process, `node-cron` orchestrates autonomous jobs for midnight preventive maintenance generation and 6:00 AM overdue/warranty alert scanning.
4. **Data Persistence Tier:** All transactional relational entities are stored in a Dockerized PostgreSQL 16 database accessed through the Prisma ORM. Uploaded asset photographs and generated QR codes are persisted on the local volume (`/uploads`).
5. **External Integrations:** Outgoing assignment notices and status notifications are dispatched asynchronously via Nodemailer through an institutional or development SMTP service.
