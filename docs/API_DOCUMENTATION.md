# REST API Documentation — Campus CMMS

This document provides a comprehensive reference of all REST API endpoints provided by the Campus CMMS server.

- **Base URL:** `http://localhost:3000/api`
- **Authentication:** Bearer token (`Authorization: Bearer <JWT>`)
- **Default Response Format:** All endpoints return a JSON payload with standard envelope:
```json
{
  "success": true,
  "message": "Human readable status message",
  "data": { ... }
}
```

---

## 1. System & Authentication Endpoints

### 1.1 Health Check
- **Endpoint:** `GET /health`
- **Access:** Public (Unauthenticated)
- **Description:** Returns server uptime and database connectivity status.
- **Response (200):**
```json
{
  "success": true,
  "message": "System healthy",
  "data": { "status": "UP", "timestamp": "2026-11-12T18:20:00.000Z" }
}
```

### 1.2 User Registration
- **Endpoint:** `POST /auth/register`
- **Access:** Public (Rate-limited: 30 attempts / 15 mins)
- **Description:** Self-registration for students and campus staff (`REQUESTER` role).
- **Request Body:**
```json
{
  "email": "student.neha@campus.edu",
  "password": "Password@123",
  "name": "Neha Joshi",
  "phone": "+91 98765 43299"
}
```
- **Response (201):** Returns user record and JWT token.

### 1.3 User Login
- **Endpoint:** `POST /auth/login`
- **Access:** Public (Rate-limited: 30 attempts / 15 mins)
- **Request Body:**
```json
{
  "email": "admin@campus.edu",
  "password": "Campus@1234"
}
```
- **Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "cmw...", "name": "Dr. Ramesh Kumar", "role": "ADMIN" }
  }
}
```

### 1.4 Current User Profile
- **Endpoint:** `GET /auth/me`
- **Access:** Authenticated (Any Role)
- **Response (200):** Returns full profile of authenticated user.

---

## 2. Asset Management & QR Codes (FR-02, FR-04)

### 2.1 List Assets
- **Endpoint:** `GET /assets`
- **Access:** All Roles
- **Query Parameters:** `page`, `limit`, `search`, `status`, `categoryId`, `locationId`
- **Response (200):** Paginated array of assets with computed `isWarrantyExpired` flag.

### 2.2 Get Asset Detail
- **Endpoint:** `GET /assets/:id`
- **Access:** All Roles
- **Response (200):** Full asset record including location tree, category, maintenance history.

### 2.3 Create Asset
- **Endpoint:** `POST /assets`
- **Access:** `ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `name`, `assetCode`, `categoryId`, `locationId`, `manufacturer`, `serialNo`, `purchaseDate`, `warrantyExpiry`, `photo` (file).
- **Response (201):** Asset created, QR code generated and saved to disk.

### 2.4 Update Asset
- **Endpoint:** `PUT /assets/:id`
- **Access:** `ADMIN`

### 2.5 Delete Asset
- **Endpoint:** `DELETE /assets/:id`
- **Access:** `ADMIN`
- **Constraint:** Rejects with 400 if asset has active work orders.

### 2.6 Printable QR Label
- **Endpoint:** `GET /assets/:id/qr`
- **Access:** All Roles
- **Response (200):** Returns QR code image DataURL, asset code, and direct scan deep-link.

---

## 3. Maintenance Requests (FR-05, FR-06)

### 3.1 Raise Request
- **Endpoint:** `POST /requests`
- **Access:** `REQUESTER`, `ADMIN`
- **Content-Type:** `multipart/form-data`
- **Form Fields:** `title`, `description`, `priority`, `assetId`, `locationId`, `photo`
- **Response (201):** Request submitted in `PENDING` status.

### 3.2 List Requests
- **Endpoint:** `GET /requests`
- **Access:** Role-filtered (Requesters see own; Admins see all).

### 3.3 Approve Request
- **Endpoint:** `POST /requests/:id/approve`
- **Access:** `ADMIN`
- **Description:** Atomically converts request to `APPROVED` and generates a linked `OPEN` Work Order.
- **Request Body:** `{ "priority": "HIGH", "dueDate": "2026-11-20" }`
- **Response (200):** Returns approved request and newly generated work order.

### 3.4 Reject Request
- **Endpoint:** `POST /requests/:id/reject`
- **Access:** `ADMIN`
- **Request Body:** `{ "rejectionReason": "Duplicate request; already scheduled." }`

---

## 4. Work Orders & State Machine (FR-07)

### 4.1 List Work Orders
- **Endpoint:** `GET /work-orders`
- **Access:** `ADMIN`, `TECHNICIAN`
- **Query Parameters:** `status`, `priority`, `assigneeId`, `assetId`, `isOverdue`

### 4.2 Create Work Order Manually
- **Endpoint:** `POST /work-orders`
- **Access:** `ADMIN`

### 4.3 Transition Work Order Status
- **Endpoint:** `PATCH /work-orders/:id/status`
- **Access:** Role-checked state machine
- **Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "reason": "Commencing repairs on campus site"
}
```
- **Rules:** Enforces allowed transitions (`OPEN` -> `ASSIGNED` -> `IN_PROGRESS` -> `ON_HOLD` -> `COMPLETED` -> `CLOSED`).

### 4.4 Assign Technician
- **Endpoint:** `PATCH /work-orders/:id/assign`
- **Access:** `ADMIN`
- **Request Body:** `{ "technicianId": "<userId>" }`

### 4.5 Log Labor Hours
- **Endpoint:** `PATCH /work-orders/:id/time`
- **Access:** `TECHNICIAN`, `ADMIN`
- **Request Body:** `{ "hours": 2.5 }`

### 4.6 Append Notes
- **Endpoint:** `POST /work-orders/:id/notes`
- **Access:** `TECHNICIAN`, `ADMIN`
- **Request Body:** `{ "content": "Cleaned compressor fins. Replaced contactor." }`

### 4.7 Add Part to Work Order (FR-09)
- **Endpoint:** `POST /work-orders/:id/parts`
- **Access:** `TECHNICIAN`, `ADMIN`
- **Request Body:** `{ "partId": "<partId>", "quantityUsed": 2 }`
- **Response (201):** Deducts stock inside transaction, computes actual job cost.

### 4.8 Remove Part from Work Order (FR-09)
- **Endpoint:** `DELETE /work-orders/:id/parts/:partId`
- **Access:** `TECHNICIAN`, `ADMIN`
- **Response (200):** Restores inventory stock quantity and recalculates work order cost.

---

## 5. Preventive Maintenance Schedules (FR-08)

### 5.1 List PM Schedules
- **Endpoint:** `GET /pm-schedules`
- **Access:** `ADMIN`, `TECHNICIAN`

### 5.2 Create PM Schedule
- **Endpoint:** `POST /pm-schedules`
- **Access:** `ADMIN`
- **Request Body:**
```json
{
  "name": "Monthly HVAC Filter Inspection",
  "assetId": "<assetId>",
  "frequencyDays": 30,
  "nextDueDate": "2026-12-01",
  "checklistItems": ["Check air filter", "Clean drainage pan", "Measure motor amperage"]
}
```

### 5.3 Toggle Schedule Active Status
- **Endpoint:** `PATCH /pm-schedules/:id/toggle`
- **Access:** `ADMIN`
- **Request Body:** `{ "isActive": false }`

### 5.4 Execute Scheduler Now (Live Demo Trigger)
- **Endpoint:** `POST /pm-schedules/run-now`
- **Access:** `ADMIN`
- **Description:** Synchronously executes the due PM schedules with idempotency protection.
- **Response (200):**
```json
{
  "success": true,
  "message": "PM Scheduler executed: generated 1 work orders.",
  "data": { "scannedSchedules": 1, "generatedCount": 1, "workOrders": [...] }
}
```

---

## 6. Spare Parts & Inventory (FR-09)

### 6.1 List Parts Catalogue
- **Endpoint:** `GET /parts`
- **Access:** `ADMIN`, `TECHNICIAN`
- **Query Parameters:** `search`, `supplierId`, `lowStock` (`true` returns `stockQty <= reorderLevel`).

### 6.2 Create Spare Part
- **Endpoint:** `POST /parts`
- **Access:** `ADMIN`
- **Request Body:**
```json
{
  "partCode": "PRT-AC-01",
  "name": "Air Filter Mesh 2x2 ft",
  "unitCost": 350.00,
  "stockQty": 20,
  "reorderLevel": 8,
  "supplierId": "<supplierId>"
}
```

### 6.3 List & Create Suppliers
- **Endpoint:** `GET /suppliers` & `POST /suppliers`
- **Access:** `ADMIN`, `TECHNICIAN`

---

## 7. Operations Dashboard (FR-11)

### 7.1 Get Role-Adaptive Metrics
- **Endpoint:** `GET /dashboard`
- **Access:** Authenticated (Any Role)
- **Description:**
  - **ADMIN:** Overall KPIs (open, overdue, PM compliance), Priority distribution, 6-month trends, Top-10 cost driver assets, technician workload.
  - **TECHNICIAN:** Personal active assignments, critical tickets, hours logged.
  - **REQUESTER:** Personal ticket tracker.

---

## 8. Reports & Data Exports (FR-12)

### 8.1 Preview Report Data
- **Endpoint:** `GET /reports/preview`
- **Access:** `ADMIN`, `TECHNICIAN`
- **Query Parameters:** `type` (`WORK_ORDERS`, `ASSET_HISTORY`, `COST_ANALYSIS`, `INVENTORY`), `startDate`, `endDate`, `status`

### 8.2 Export CSV
- **Endpoint:** `GET /reports/export/csv`
- **Access:** `ADMIN`, `TECHNICIAN`
- **Response:** Raw UTF-8 CSV stream with `Content-Type: text/csv`.

### 8.3 Export PDF
- **Endpoint:** `GET /reports/export/pdf`
- **Access:** `ADMIN`, `TECHNICIAN`
- **Response:** Binary PDF stream with `Content-Type: application/pdf`.

---

## 9. In-App Notifications (FR-10)

### 9.1 List User Notifications
- **Endpoint:** `GET /notifications`
- **Access:** Authenticated (Returns unread count and latest alerts).

### 9.2 Mark as Read
- **Endpoint:** `PATCH /notifications/:id/read` & `PATCH /notifications/read-all`
- **Access:** Authenticated
