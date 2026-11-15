# 40 Likely Viva Questions & Concise Answers — Campus CMMS

This document provides concise, technically precise answers to 40 likely viva examination questions, grouped by domain.

---

## 1. Requirements & Business Logic (Q01 – Q06)

### Q01: What are the three primary user roles in your CMMS, and how do their permissions differ?
**Answer:** The system defines `ADMIN`, `TECHNICIAN`, and `REQUESTER`. Admins have unrestricted access to configure users, locations, assets, inventory, approvals, and reports. Technicians see only their assigned work orders, update lifecycle status, log labor hours, and deduct replacement parts. Requesters (students and staff) can only submit fault tickets and track the progress of their own requests.

### Q02: What is the difference between a Maintenance Request and a Work Order in your system?
**Answer:** A Maintenance Request (`FR-05`) is an unconfirmed fault report submitted by a campus occupant requiring administrative triage. A Work Order (`FR-07`) is an approved, actionable maintenance job assigned to a qualified technician with a target due date, priority rating, checklist items, and budget tracking.

### Q03: Why is an administrative approval step required before a request becomes a work order?
**Answer:** To eliminate frivolous, duplicate, or misdiagnosed complaints. The Admin reviews incoming requests (`FR-06`) to either reject them with a mandatory explanation or convert them into a work order with priority, due date, and technician assignment.

### Q04: How does your system support physical QR codes for campus equipment?
**Answer:** Every asset is assigned a unique alphanumeric code upon creation. The server uses the `qrcode` library to generate a PNG barcode encoding a web deep-link (`/assets/:id`). Campus occupants scan the physical sticker using their phone camera to view asset details or submit a pre-populated fault report.

### Q05: How does the system compute and alert on asset warranty expiry?
**Answer:** The API computes a dynamic boolean flag `isWarrantyExpired` by comparing the asset's `warrantyExpiry` timestamp against `new Date()`. Additionally, a daily background cron job scans for assets expiring within 30 days and notifies administrators.

### Q06: What information is captured in an audit trail entry?
**Answer:** The `audit_logs` table records the acting user ID (nullable for automated scheduler tasks), action verb (e.g., `APPROVE`, `CREATE_ASSET`), target entity type, entity ID, JSON diff of updated fields, client IP address, and creation timestamp.

---

## 2. UML Diagrams & System Modeling (Q07 – Q12)

### Q07: Which diagrams represent the structural versus behavioural aspects of your CMMS?
**Answer:** Structural aspects are modeled by the ER Diagram (`02`), Class Diagram (`09`), and Deployment Diagram (`16`). Behavioural aspects are captured by Use Case (`01`), DFDs (`03`, `04`), Sequence Diagrams (`07`, `08`, `10`, `13`, `14`, `15`), Activity Diagrams (`11`, `12`), and the Work Order State Diagram (`06`).

### Q08: How are include and extend relationships modeled in your Use Case diagram?
**Answer:** In `01-use-case-diagram.md`, "Convert Request to Work Order" has a mandatory `<<include>>` relationship with "Assign Technician" and "Set Priority/Due Date". "Add Spare Parts" has an `<<extend>>` relationship with "Execute Work Order", as parts are only consumed when physical component replacement is necessary.

### Q09: What is the purpose of Level-0 and Level-1 Data Flow Diagrams (DFD)?
**Answer:** The Level-0 DFD (Context Diagram) establishes the system boundary, showing high-level data flows between external entities (Admin, Tech, Requester, Scheduler) and the CMMS process. The Level-1 DFD decomposes the system into 7 major sub-processes (Auth, Asset Management, Request Handling, Work Order Engine, PM Scheduler, Inventory, Reporting) and shows their data stores.

### Q10: Walk through the Work Order State Machine diagram.
**Answer:** Work orders start in `OPEN`. Upon technician assignment by an Admin, the state becomes `ASSIGNED`. The technician transitions to `IN_PROGRESS` when work begins. If blocked by missing parts or access issues, the technician moves it to `ON_HOLD` (requiring a mandatory reason). Once repaired, the technician transitions to `COMPLETED`. An Admin then conducts final sign-off to move it to `CLOSED`.

### Q11: Can a technician transition a work order directly from OPEN to COMPLETED or CLOSED?
**Answer:** No. The server enforces transition rules via `workOrderStateMachine.js`. Illegal transitions (e.g., skipping `IN_PROGRESS` or unauthorized closing) are rejected with a `400 Bad Request`. Only Admins can execute the final `CLOSED` transition.

### Q12: Why did you create both Activity and Sequence diagrams for the PM Scheduler?
**Answer:** The Activity Diagram (`12`) illustrates operational logic, decision branching (checking if a job was already generated today), and loop iterations. The Sequence Diagram (`13`) shows the chronological message exchange between caller, service layer, database transactions, and notification dispatchers.

---

## 3. Database Design, Normalisation & Transactions (Q13 – Q18)

### Q13: How does your database schema satisfy Third Normal Form (3NF)?
**Answer:** All tables possess atomic scalar columns (1NF), all non-key fields depend entirely on the primary key (2NF), and there are no transitive dependencies among non-key attributes (3NF). Child collections like checklist items and notes are normalized into separate tables.

### Q14: Is there any deliberate denormalisation in your schema? If so, why?
**Answer:** Yes, in `work_order_parts`, we store `unitCostAtTime` alongside `partId` and `quantityUsed`. This snapshots the component price at the exact moment of maintenance execution. If the supplier's catalogue price in `parts.unitCost` changes later, historical work order costs remain accurate.

### Q15: Why are cuid identifiers preferred over auto-incrementing integer IDs?
**Answer:** CUIDs (`cuid()`) are collision-resistant, globally unique, URL-safe string identifiers. Unlike sequential integers (1, 2, 3), CUIDs prevent enumeration attacks where an attacker guesses IDs to scrape data.

### Q16: How do you prevent inventory stock from going negative under concurrent usage?
**Answer:** Deductions occur inside an ACID transaction (`prisma.$transaction`). The service reads the current stock quantity with an update lock, verifies that `stockQty >= requestedQty`, and aborts with an exception if insufficient, ensuring stock cannot fall below zero.

### Q17: What happens to inventory if a technician mistakenly records a part and deletes it?
**Answer:** The `DELETE /api/work-orders/:id/parts/:partId` endpoint executes a transaction that deletes the junction record, increments `part.stockQty` by the removed quantity, and recalculates the work order's total actual cost.

### Q18: What indexes were created in your Prisma schema and why?
**Answer:** Indexes were created on all foreign keys (`workOrderId`, `assetId`, `userId`, `supplierId`) to accelerate relational joins, as well as frequently filtered columns (`status`, `priority`, `stockQty`, `nextDueDate`, `createdAt`) to keep query times low as table volume grows.

---

## 4. Layered Software Architecture (Q19 – Q24)

### Q19: Explain the 4-tier backend layered architecture used in your application.
**Answer:** 
1. **Routes:** Define HTTP methods and URIs, attaching rate limiters, auth middleware, and Zod validators.
2. **Controllers:** Extract request params, invoke service methods, and format responses into `{ success, message, data }`.
3. **Services:** House pure business logic, enforce state machines, orchestrate transactions, and dispatch notifications.
4. **Repositories:** Encapsulate Prisma database queries, isolating data access from business rules.

### Q20: What are the main benefits of isolating Repositories from Services?
**Answer:** Separation of concerns and testability. Services can be unit-tested by mocking repositories. If the underlying data access mechanism changes in the future, the business logic remains untouched.

### Q21: How does the frontend communicate with the backend?
**Answer:** The React single-page application uses an Axios instance (`client/src/api/axios.js`) configured with a request interceptor that injects the JWT bearer token from `localStorage` and a response interceptor that redirects to `/login` upon receiving `401 Unauthorized`.

### Q22: How is error handling standardised across the entire API?
**Answer:** A global error-handling middleware (`server/src/middleware/errorHandler.js`) catches all forwarded errors. It formats Zod validation errors, Prisma database constraint violations, and custom operational exceptions into a consistent JSON response: `{ success: false, message: "...", data: null }`.

### Q23: How are file uploads managed on the backend?
**Answer:** We use **Multer** configured with disk storage (`server/src/middleware/upload.js`). Files are filtered by MIME type (JPEG, PNG, WebP) and size (max 5MB), given unique timestamped filenames, and saved to `/uploads`. Metadata is stored in the database.

### Q24: How does the client maintain authentication across page reloads?
**Answer:** `AuthContext.jsx` stores the JWT token and user profile in React state synchronized with browser `localStorage`. On application boot, it validates the token by requesting `GET /api/auth/me` before rendering protected routes.

---

## 5. Scheduler & Background Automation (Q25 – Q29)

### Q25: How does the Preventive Maintenance scheduler work?
**Answer:** Using `node-cron`, a background task runs on a configurable schedule (default midnight). It queries active PM schedules where `nextDueDate <= NOW()`, checks that no work order was generated today, creates an `OPEN` work order with cloned checklist items, advances `nextDueDate` by `frequencyDays`, and sends alerts.

### Q26: What is scheduler idempotency and how is it implemented?
**Answer:** Idempotency ensures that running a process multiple times produces the same outcome without unintended side effects. Before creating a work order, `PMSchedulerService` queries `prisma.workOrder.findFirst` for a ticket with matching `pmScheduleId` created since `startOfToday`. If found, it skips generation.

### Q27: Why did you provide an Admin "Run Scheduler Now" button?
**Answer:** Waiting for a midnight cron trigger during an evaluation or viva is impractical. The `POST /api/pm-schedules/run-now` endpoint allows administrators to trigger the scheduler on demand for live demonstrations while using the same underlying service logic.

### Q28: How does completing a PM work order affect future schedule due dates?
**Answer:** When the work order is auto-generated, the scheduler advances `nextDueDate` by adding `frequencyDays` to the scheduled timestamp within the creation transaction, ensuring the next cycle is pre-calculated.

### Q29: What other background cron jobs run in the application?
**Answer:** In `server/src/config/cron.js`, a second daily cron job runs `AlertSchedulerService.runDailyAlerts()`, which scans for overdue uncompleted work orders and assets whose warranty expires within 30 days, dispatching warning notifications.

---

## 6. Security, RBAC & Hardening (Q30 – Q34)

### Q30: How is Role-Based Access Control (RBAC) enforced on the server?
**Answer:** Through the `rbac(...allowedRoles)` middleware (`server/src/middleware/rbac.js`). It executes after `authenticate`, comparing `req.user.role` against the route's permitted roles and returning `403 Forbidden` if unauthorized.

### Q31: How are passwords stored and verified?
**Answer:** Passwords are never stored in plain text. On registration or user creation, `bcrypt.hash(password, 12)` computes a one-way salt and hash. On login, `bcrypt.compare()` verifies the plaintext submission against the stored hash.

### Q32: How is the application protected against brute-force login attacks?
**Answer:** Using `express-rate-limit`, we apply `authRateLimiter` to `/api/auth/login` and `/api/auth/register`, limiting requests from a single IP to 30 attempts per 15-minute window in production.

### Q33: How does the application protect against SQL Injection and Cross-Site Scripting (XSS)?
**Answer:** SQL Injection is prevented by Prisma ORM, which parameterises all database queries. XSS is mitigated by React's automatic string escaping in JSX, HTTP header hardening via `helmet`, and input schema sanitization using **Zod**.

### Q34: What security considerations apply to serving uploaded files?
**Answer:** Uploads are restricted to images (JPEG, PNG, WebP) with a 5MB size limit. `helmet({ crossOriginResourcePolicy: false })` is configured so that cross-origin client scripts can render images without exposing server headers.

---

## 7. Testing, Quality Assurance & Edge Cases (Q35 – Q40)

### Q35: What testing methodology and tools did you employ?
**Answer:** We implemented automated end-to-end API integration tests using **Jest** as the test runner and **Supertest** as the HTTP client. Tests execute against real PostgreSQL tables with automatic pre-test setup and post-test teardown.

### Q36: How many tests exist in your test suite, and what do they verify?
**Answer:** 40 automated tests across 9 test suites covering authentication, RBAC boundaries, asset CRUD, QR labels, request conversions, work order state transitions, PM scheduler idempotency, inventory stock deduction transactions, dashboard metrics, and PDF/CSV report exports.

### Q37: How did you test that stock never goes negative?
**Answer:** In `inventory.test.js` (TC-0702), we create a part with stock 3 and attempt to add 4 units to a work order. The API returns `400 Bad Request` with "Insufficient stock", and subsequent queries confirm the stock level remains untouched at 3.

### Q38: How did you test that the scheduler does not create duplicate work orders?
**Answer:** In `pmScheduler.test.js` (TC-0603), we invoke `POST /api/pm-schedules/run-now` once to generate a work order, record the count, and call it a second time. The second call reports 0 generated tickets and database counts remain unchanged.

### Q39: What edge case occurs if a user tries to approve an already approved request?
**Answer:** In `requests.test.js` (TC-0304), the approval service verifies that `request.status === 'PENDING'`. Attempting to re-approve returns a `400 Bad Request` stating "Cannot approve request that is already APPROVED", preventing duplicate work orders.

### Q40: What happens if an Admin tries to delete an asset that has existing work orders?
**Answer:** The asset service checks for linked work orders before deletion. If active records exist, the transaction aborts with a `400 Bad Request` to preserve historical referential integrity.
