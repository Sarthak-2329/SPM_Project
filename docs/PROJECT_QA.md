# Comprehensive Answers to the Five Core Evaluation Questions

**Project:** Campus Computerised Maintenance Management System (CMMS)  
**Authors:** Student Engineering Team  
**Evaluation:** Final Capstone Viva Examination  

---

## Question 1: What is the main objective of your project, and what real-world problem does it solve?

### Spoken Answer (First-Person Plural)
"In university institutions, physical campus maintenance across student hostels, academic lecture blocks, and scientific research laboratories has traditionally relied on fragmented, informal methods such as physical paper registers, unlogged phone calls, or ad-hoc WhatsApp chat groups. In our research and initial requirements gathering, we observed four major operational failures: first, maintenance complaints lacked precise spatial locations and photographs, causing confusion and triage delays; second, technicians serviced apparatus with zero access to historical breakdown records or warranty status; third, routine preventive maintenance—such as periodic AC filter cleaning, water booster pump greasing, and UPS battery discharge testing—was routinely overlooked until catastrophic breakdowns occurred; and fourth, institutions had no way of calculating how much money was being spent on specific assets in replacement spare parts and labor hours.

To solve this, we built the **Campus CMMS**, an enterprise-grade web platform that automates the entire maintenance lifecycle. Our system establishes a digital asset registry organized across a four-level location tree—Campus, Building, Floor, and Room. By generating physical QR code stickers for all 52 campus assets, students and faculty can instantly scan equipment using a mobile phone to report faults. Administrators review incoming requests, approve them into actionable work orders through atomic database transactions, and dispatch them to qualified technicians. The platform includes an autonomous background cron scheduler that auto-generates recurring preventive maintenance tickets with inspection checklists, enforces transactional inventory deductions so spare parts stock never drops below zero, and provides executive dashboards with instant CSV and PDF report exports. Ultimately, our system replaces chaos with accountability, reduces Mean Time to Repair, and provides total financial transparency."

### Quick Recall Cheat Sheet
- **Core Problems:** Paper-based complaints, lack of historical records, forgotten preventive maintenance, unquantified spare parts and labor costs.
- **Key Capabilities:** QR code scanning on 52 campus assets, 6-stage work order state machine, autonomous idempotent PM scheduler, transactional stock deductions, role-adaptive dashboards.
- **Measurable Outcomes:** Eliminates untracked verbal complaints, prevents stock overdrafts, automates routine servicing, and calculates exact equipment maintenance spend.

### Follow-Up Questions an Examiner May Ask
1. **How do you ensure non-technical students can report faults accurately without training?**  
   *Answer:* Scanning the physical QR code sticker on the asset opens a pre-populated form with the asset code, name, and exact campus location already filled in. The student only needs to add a short fault description, select a priority, and optionally upload a photograph.
2. **What measurable key performance indicators (KPIs) does your system track for college administrators?**  
   *Answer:* The dashboard displays total open vs. closed work orders, overdue tickets, preventive maintenance compliance percentage, low-stock spare parts, and the top 10 cost-driver assets based on cumulative parts and labor expenditure.
3. **Who are the primary beneficiaries of this system on a campus?**  
   *Answer:* Students and staff benefit from faster repair turnaround; maintenance technicians receive a clear, organized task queue with historical context; and facilities management gains full visibility into equipment health, technician productivity, and maintenance budgets.

---

## Question 2: Why did you choose this specific technology stack or methodology?

### Spoken Answer (First-Person Plural)
"We deliberately selected our technology stack based on the specific engineering requirements of an enterprise maintenance system: data integrity, relational consistency, transactional guarantees, and cross-platform accessibility. 

On the backend, we chose **Node.js with Express** because its asynchronous, event-driven non-blocking I/O model handles concurrent REST API requests and background schedulers efficiently within a single process. For the database, we chose **PostgreSQL 16 with Prisma ORM**. A relational database was essential because campus maintenance is inherently relational: assets belong to locations, work orders link to technicians, and parts deductions join work orders to inventory items. Prisma gave us complete type safety, automated migration management, and critical support for ACID database transactions (`prisma.$transaction`), which we required to guarantee that spare parts deductions and work order approvals never leave the system in an inconsistent state.

For authentication, we implemented **JWT with bcrypt** hashing (12 salt rounds) and server-side role-based access control middleware to separate Admin, Technician, and Requester capabilities. We selected **node-cron** for background automation because it provides a lightweight, in-process scheduler for daily PM generation and warranty checks without needing external queue brokers like Redis or RabbitMQ. For exports, we selected **pdfkit** and **csv-stringify** to stream formatted documents directly to the client without temporary file overhead. On the frontend, we used **React 18 with Vite and Tailwind CSS** for fast rendering and responsive layouts, and integrated **Recharts** for SVG-based analytics charts.

We followed an **iterative requirements-first development methodology** organized across six milestones. We authored the Software Requirements Specification (SRS), Entity-Relationship diagrams, and state models first, and wrote automated Jest integration tests alongside each phase, ensuring every functional requirement was verified before moving forward."

### Quick Recall Cheat Sheet
- **Backend & Database:** Node.js + Express (layered architecture) with PostgreSQL 16 + Prisma ORM (ACID transactions for stock deduction and approvals).
- **Security & Tools:** JWT + bcrypt (12 rounds) for RBAC; node-cron for in-process background scheduling; pdfkit and csv-stringify for streaming document exports.
- **Methodology:** Iterative 6-phase engineering lifecycle; requirements and UML modeling upfront, verified by 40 automated Jest integration tests.

### Follow-Up Questions an Examiner May Ask
1. **Why choose PostgreSQL over a NoSQL database like MongoDB?**  
   *Answer:* A CMMS requires strict relational integrity, foreign-key constraints, and ACID transactions across multiple tables (e.g. updating work order status, decrementing part stock, and inserting an audit log simultaneously). NoSQL document stores lack native relational foreign keys and require manual data validation in the application layer.
2. **Why use Prisma ORM instead of writing raw SQL queries?**  
   *Answer:* Prisma generates compile-time type-safe database queries, automates migration versioning (`prisma/migrations`), prevents SQL injection through automated parameterisation, and provides an intuitive transaction API (`prisma.$transaction`).
3. **Why did you use node-cron instead of an enterprise message queue like Celery or BullMQ?**  
   *Answer:* For a campus deployment running on an institutional server or virtual machine, `node-cron` runs within the existing Node.js runtime without requiring extra infrastructure (like Redis), keeping deployment simple and memory consumption low.

---

## Question 3: Can you explain the system architecture and data flow of your application?

### Spoken Answer (First-Person Plural)
"Our application follows a **4-tier layered architecture** designed for separation of concerns and maintainability. When an HTTP request enters the backend, it passes through four distinct tiers:
1. **The Route Layer** (`server/src/routes`): Defines endpoints, maps HTTP verbs, and attaches middleware including rate limiters, JWT authentication, role-based authorization, Multer file uploaders, and Zod input validation schemas.
2. **The Controller Layer** (`server/src/controllers`): Extracts sanitized request parameters, calls corresponding service methods, and wraps outputs into our standard `{ success, message, data }` JSON response envelope.
3. **The Business Service Layer** (`server/src/services`): Implements core domain logic, enforces the work order state machine rules, orchestrates multi-table database transactions, checks scheduler idempotency, and triggers notifications.
4. **The Repository Layer** (`server/src/repositories`): Encapsulates all Prisma ORM database queries, providing an abstracted interface to the persistent PostgreSQL storage.

To illustrate the complete data flow, let us trace an end-to-end fault lifecycle:
First, a student scans an asset's QR code and submits a fault report with a photograph. The route uploads the photo via Multer, validates the payload with Zod, and creates a record in `maintenance_requests` in `PENDING` state (matching `docs/diagrams/10`).
Second, an Admin reviews the request. Upon clicking 'Approve', `MaintenanceRequestService` initiates an ACID transaction that marks the request `APPROVED`, creates a new `WorkOrder` in `OPEN` state, and registers an entry in `work_order_status_history`.
Third, the Admin assigns the work order to a technician, transitioning the status to `ASSIGNED` and dispatching an in-app and email alert via Nodemailer.
Fourth, the technician starts work, transitioning to `IN_PROGRESS`, logs labor hours, and consumes replacement spare parts. During part deduction, `InventoryService` runs a transaction (matching `docs/diagrams/14`) that decrements `parts.stockQty`, records `work_order_parts` with a price snapshot (`unitCostAtTime`), and calculates the total work order cost using our formula: parts spend plus labor hours at 250 rupees per hour.
Finally, the technician completes the job (`COMPLETED`), the Admin signs off (`CLOSED`), and `DashboardService` updates the executive KPI charts and financial reports in real time (matching `docs/diagrams/15`)."

### Quick Recall Cheat Sheet
- **Architecture Layers:** Routes (Auth/Zod) $\rightarrow$ Controllers (HTTP formatting) $\rightarrow$ Services (Business logic/Transactions) $\rightarrow$ Repositories (Prisma queries) $\rightarrow$ PostgreSQL 16.
- **End-to-End Flow:** QR Scan $\rightarrow$ Request (`PENDING`) $\rightarrow$ Admin Approval Transaction $\rightarrow$ Work Order (`OPEN` to `ASSIGNED`) $\rightarrow$ Tech Execution & Part Deduction Transaction $\rightarrow$ Job Cost Recomputation $\rightarrow$ Admin Closure $\rightarrow$ Real-Time Dashboard Analytics.
- **Supporting Diagrams:** Architecture (`05`), Request Conversion (`10`), Inventory Deduction (`14`), Dashboard Pipeline (`15`).

### Follow-Up Questions an Examiner May Ask
1. **What happens if the server crashes halfway through converting a request to a work order?**  
   *Answer:* Because the conversion is wrapped inside a single `prisma.$transaction`, PostgreSQL rolls back all partial writes automatically. The request remains in `PENDING` state and no orphaned work order is left behind.
2. **How does your architecture prevent a student from accessing an admin endpoint?**  
   *Answer:* The `authenticate` middleware decodes the JWT and attaches `req.user`. The subsequent `rbac('ADMIN')` middleware checks if `req.user.role === 'ADMIN'`. If a student token is present, the pipeline immediately halts and returns a `403 Forbidden` response.
3. **Where are uploaded asset and request photos stored in the architecture?**  
   *Answer:* Uploaded image files are handled by Multer and stored on the server's local filesystem in `/uploads/assets/` and `/uploads/qrcodes/`. The database stores only the relative URL path strings in the `Asset` and `Attachment` tables.

---

## Question 4: What major technical challenges or bugs did you face, and how did you overcome them?

### Spoken Answer (First-Person Plural)
"During development, we encountered and solved five major technical challenges, which we verified with automated regression tests:

1. **Scheduler Idempotency and Preventing Duplicate Work Orders:**
   - *Problem:* In our initial implementation of the background PM scheduler, triggering the job multiple times or having a short cron interval resulted in duplicate work orders for the same equipment on the same day.
   - *Fix:* In `PMSchedulerService.js`, we introduced an idempotency guard that queries `prisma.workOrder.findFirst` for any work order linked to the schedule's `pmScheduleId` with a creation timestamp within today's window (`createdAt >= startOfToday`). If found, generation is skipped. We verified this in `pmScheduler.test.js` (TC-0603), where calling the scheduler twice consecutively generates tickets only on the first run.
2. **Inventory Race Conditions and Preventing Negative Stock:**
   - *Problem:* Concurrent part deductions could result in negative stock balances if multiple users requested items simultaneously.
   - *Fix:* In `InventoryService.js`, we wrapped the stock check and update in an isolated `prisma.$transaction`. The service checks that `part.stockQty >= requestedQty`. If insufficient, it throws an operational exception that aborts the transaction before any write occurs. We verified this in `inventory.test.js` (TC-0702).
3. **Enforcing the State Machine Server-Side:**
   - *Problem:* A client could potentially send a `PATCH` request directly jumping from `OPEN` to `COMPLETED`, skipping the assignment and execution phases.
   - *Fix:* We implemented `workOrderStateMachine.js`, which strictly checks allowed transitions (`ALLOWED_TRANSITIONS[currentStatus]`) and verifies role authorizations (e.g. only Admins can execute the `CLOSED` transition). Invalid jumps return a `400 Bad Request`. Verified in `workOrders.test.js` (TC-0503, TC-0506).
4. **Historical Cost Corruption Due to Price Changes:**
   - *Problem:* If a work order was completed using a part costing 500 rupees, and months later the supplier raised the catalogue price to 750 rupees, calculating historic maintenance spend dynamically from the parts table altered past financial reports.
   - *Fix:* We added a deliberate audit field, `unitCostAtTime`, to the `work_order_parts` junction table. At deduction time, the service snapshots the part's current price into this column. Historical cost computations read from this snapshot rather than the live catalogue.
5. **Port Collisions and Async Cleanup During Automated Testing:**
   - *Problem:* During initial Jest test execution, Express attempted to call `app.listen(3000)` inside test workers, triggering `EADDRINUSE` port collision errors.
   - *Fix:* In `server/src/index.js`, we conditioned the listener with `if (process.env.NODE_ENV !== 'test' && require.main === module)`, allowing Supertest to bind the Express application to ephemeral ports cleanly."

### Quick Recall Cheat Sheet
- **Challenge 1:** Scheduler duplicate tickets $\rightarrow$ Fixed with date-window idempotency query (`pmScheduler.test.js`).
- **Challenge 2:** Negative stock balances $\rightarrow$ Fixed with ACID transaction locking and stock validation (`inventory.test.js`).
- **Challenge 3:** Illegal state transitions $\rightarrow$ Fixed with server-side state machine engine (`workOrders.test.js`).
- **Challenge 4:** Historical cost corruption $\rightarrow$ Fixed with `unitCostAtTime` price snapshot in junction table.
- **Challenge 5:** Test port collisions (`EADDRINUSE`) $\rightarrow$ Fixed by isolating `app.listen()` from test runners.

### Follow-Up Questions an Examiner May Ask
1. **Why not just add a unique database index on `(pmScheduleId, createdAt)` to prevent duplicates?**  
   *Answer:* `createdAt` is a precise millisecond timestamp (`DateTime`), meaning two records created seconds apart would have different timestamps and pass a unique constraint. Querying for records created within the current calendar day (`gte: startOfToday`) in application code provides the necessary day-level deduplication window.
2. **How did you test that illegal status transitions are rejected?**  
   *Answer:* In `workOrders.test.js`, we create an `OPEN` work order and issue a `PATCH` request attempting to transition directly to `COMPLETED`. The test expects and asserts a `400 Bad Request` status code with the error message 'Invalid status transition'.
3. **What happens if a technician goes offline while updating a ticket?**  
   *Answer:* In the current web architecture, requests fail with a network error toast and must be resubmitted when connectivity returns. In our future scope, we plan to implement an offline Progressive Web App (PWA) using IndexedDB to queue actions locally until reconnected.

---

## Question 5: What are the key limitations of your system, and what is its future scope?

### Spoken Answer (First-Person Plural)
"To evaluate our project objectively, we have identified five specific limitations in the current implementation, and we have paired each with a concrete engineering roadmap for future development:

First, **local file storage:** Currently, uploaded asset photographs and generated QR codes are stored on the server's local disk in the `/uploads` directory. While simple and effective for a single-server deployment, this does not scale across load-balanced multi-server clusters. In the future, we plan to implement a pluggable cloud storage adapter utilizing Amazon S3 or Google Cloud Storage.

Second, **time-based preventive maintenance only:** Our scheduler triggers work orders purely on calendar recurrence intervals (e.g. every 14 or 30 days). In industrial environments, maintenance is often condition-based or usage-based (e.g. servicing an air compressor after 500 operating hours). In our future scope, we plan to integrate IoT telemetry sensors using MQTT to trigger maintenance based on real runtime hours and vibration thresholds.

Third, **HTTP polling instead of real-time WebSockets:** In the current UI, updates to work order status and notification counts require page navigation or polling. Implementing WebSockets via Socket.io would allow live status updates and real-time technician location tracking on campus maps.

Fourth, **single-campus tenancy:** The current database schema serves a single educational institution. We plan to extend the schema to support multi-tenancy, allowing a university system with multiple distributed campuses to operate from a single shared deployment with isolated tenant partitions.

Fifth, **channel limitations for alerts:** Automated notifications are currently delivered in-app and via SMTP email. Integrating SMS or WhatsApp Business APIs would ensure urgent alerts reach on-duty technicians immediately in the field."

### Quick Recall Cheat Sheet
- **Limitation 1:** Local disk storage (`/uploads`) $\rightarrow$ *Future:* S3/GCS cloud object storage adapter.
- **Limitation 2:** Calendar recurrence only (time-based) $\rightarrow$ *Future:* IoT MQTT telemetry for condition-based predictive maintenance.
- **Limitation 3:** HTTP request-response UI $\rightarrow$ *Future:* WebSockets for real-time live updates and push notifications.
- **Limitation 4:** Single-campus architecture $\rightarrow$ *Future:* Multi-tenant data partitioning for university systems.
- **Limitation 5:** Email-only external alerts $\rightarrow$ *Future:* WhatsApp and SMS gateway integration for field technicians.

### Follow-Up Questions an Examiner May Ask
1. **How would you implement IoT sensor data integration in your existing architecture?**  
   *Answer:* We would introduce an MQTT broker (such as Eclipse Mosquitto) to ingest sensor readings (vibration, current, temperature) from microcontrollers on assets. A telemetry worker service would compare readings against operating thresholds and automatically invoke `WorkOrderService.createWorkOrder()` when anomalies are detected.
2. **How difficult would it be to migrate from local storage to Amazon S3?**  
   *Answer:* It requires minimal refactoring because Multer supports `multer-s3`. We would swap the storage engine in `server/src/middleware/upload.js` and update the URL builder to reference the S3 bucket URL instead of the local static mount.
3. **How does your system handle database backups and disaster recovery?**  
   *Answer:* In our production deployment configuration, the PostgreSQL container volume can be backed up using scheduled `pg_dump` cron jobs that export encrypted `.sql.gz` snapshots to external institutional backup storage.
