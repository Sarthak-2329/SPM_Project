# Test Cases & Traceability Matrix — Campus CMMS

**Version:** 5.0 (Final Release Baseline)  
**Status:** All 13 Functional Requirements Verified (Pass in Jest Automated Suites & Demo Pass)

---

## 1. Test Execution Summary

| Module | Test File | Test Cases | Result |
|---|---|---|---|
| FR-01: Auth & RBAC | `auth.test.js`, `rbac.test.js` | 8 | ✅ PASS |
| FR-02, FR-04: Asset Registry & QR Codes | `assets.test.js` | 7 | ✅ PASS |
| FR-05, FR-06: Maintenance Requests & Approvals | `requests.test.js` | 4 | ✅ PASS |
| FR-07: Work Orders & State Machine | `workOrders.test.js` | 6 | ✅ PASS |
| FR-08: PM Scheduler & Idempotency | `pmScheduler.test.js` | 4 | ✅ PASS |
| FR-09: Inventory & Atomic Deductions | `inventory.test.js` | 4 | ✅ PASS |
| FR-11: Operations Dashboard | `dashboard.test.js` | 3 | ✅ PASS |
| FR-12: Reports & CSV/PDF Export | `reports.test.js` | 4 | ✅ PASS |
| **Total Automated Suite** | **9 Test Files** | **40 Tests** | **✅ 40 Passed, 0 Failed** |

---

## 2. Comprehensive Test Cases Table (FR-01 to FR-13)

### TC-01xx — Authentication & RBAC (FR-01)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0101 | Valid Login | POST `/api/auth/login` with valid email & password | 200 OK, JWT returned with user object | ✅ Pass (Jest) |
| TC-0102 | Invalid Password | POST `/api/auth/login` with wrong password | 401 Unauthorized | ✅ Pass (Jest) |
| TC-0103 | Unknown Email | POST `/api/auth/login` with unregistered email | 401 Unauthorized (generic message) | ✅ Pass (Jest) |
| TC-0104 | Protected Route Missing Token | GET `/api/users` without Authorization header | 401 Unauthorized | ✅ Pass (Jest) |
| TC-0105 | Role Access Violation | GET `/api/users` with Requester JWT | 403 Forbidden | ✅ Pass (Jest) |
| TC-0106 | Requester Self-Registration | POST `/api/auth/register` with student details | 201 Created with role REQUESTER | ✅ Pass (Jest) |

---

### TC-02xx — Asset Registry & QR Codes (FR-02, FR-03, FR-04)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0201 | Create Asset (Admin) | POST `/api/assets` with name, serialNo, location, category | 201 Created with auto-generated code and QR PNG | ✅ Pass (Jest) |
| TC-0202 | Asset Code / Serial Duplicate | POST `/api/assets` with existing serial number | 409 Conflict | ✅ Pass |
| TC-0203 | List Assets with Warranty Flag | GET `/api/assets` | 200 OK with `isWarrantyExpired` boolean flag | ✅ Pass (Jest) |
| TC-0204 | Non-Admin Blocked from Asset Creation | POST `/api/assets` with Requester token | 403 Forbidden | ✅ Pass (Jest) |
| TC-0205 | Printable QR Label Deep-Link | GET `/api/assets/:id/qr` | 200 OK with base64 PNG data URL | ✅ Pass (Jest) |

---

### TC-03xx — Maintenance Requests & Admin Approval (FR-05, FR-06)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0301 | Raise Maintenance Request | POST `/api/requests` with asset, description, priority | 201 Created in PENDING state | ✅ Pass (Jest) |
| TC-0302 | Atomic Approval & WO Conversion | POST `/api/requests/:id/approve` (Admin) | 200 OK, request marked APPROVED and work order created atomically | ✅ Pass (Jest) |
| TC-0303 | Reject Request with Reason | POST `/api/requests/:id/reject` with reason string | 200 OK, marked REJECTED with reason recorded | ✅ Pass (Jest) |
| TC-0304 | Prevent Re-Approval of Approved Request | POST `/api/requests/:id/approve` on approved request | 400 Bad Request error | ✅ Pass (Jest) |

---

### TC-04xx — Work Orders & State Machine (FR-07, FR-10)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0401 | Create Work Order | POST `/api/work-orders` (Admin) | 201 Created in OPEN state | ✅ Pass (Jest) |
| TC-0402 | Assign Technician & Notify | PATCH `/api/work-orders/:id/assign` with tech ID | 200 OK, status ASSIGNED, email notification sent | ✅ Pass (Jest) |
| TC-0403 | Illegal Status Jump Rejected | Transition OPEN -> COMPLETED directly | 400 Bad Request (Invalid transition) | ✅ Pass (Jest) |
| TC-0404 | Mandatory Hold Reason | Transition to ON_HOLD without reason | 400 Bad Request | ✅ Pass (Jest) |
| TC-0405 | Tech Transition Restrictions | Tech attempts to transition another tech's WO | 403 Forbidden | ✅ Pass (Jest) |
| TC-0406 | Tech Blocked from Closing Completed WO | Tech attempts COMPLETED -> CLOSED transition | 400 Bad Request (Admin only signoff) | ✅ Pass (Jest) |

---

### TC-06xx — Preventive Maintenance Scheduler (FR-08)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0601 | Create PM Schedule with Checklist | POST `/api/pm-schedules` (Admin) | 201 Created with ordered checklist items | ✅ Pass (Jest) |
| TC-0602 | Execute Scheduler (Run Now) | POST `/api/pm-schedules/run-now` (Admin) | 200 OK, creates Work Order and copies checklist | ✅ Pass (Jest) |
| TC-0603 | Strict Idempotency | Trigger scheduler twice consecutively on same day | 200 OK, 0 duplicate work orders generated | ✅ Pass (Jest) |
| TC-0604 | Non-Admin Blocked from Manual Run | POST `/api/pm-schedules/run-now` (Tech) | 403 Forbidden | ✅ Pass (Jest) |

---

### TC-07xx — Inventory, Spare Parts & Atomic Deductions (FR-09)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-0701 | Deduct Part on Work Order | POST `/api/work-orders/:id/parts` with valid qty | 201 Created, stock deducted, job cost recomputed | ✅ Pass (Jest) |
| TC-0702 | Reject Insufficient Stock | POST `/api/work-orders/:id/parts` with qty > stock | 400 Bad Request (Stock never goes negative) | ✅ Pass (Jest) |
| TC-0703 | Remove Part & Restore Stock | DELETE `/api/work-orders/:id/parts/:partId` | 200 OK, stock restored, job cost recalculated | ✅ Pass (Jest) |
| TC-0704 | Low Stock Filter & Badge | GET `/api/parts?lowStock=true` | 200 OK, returns items with stockQty <= reorderLevel | ✅ Pass (Jest) |

---

### TC-11xx — Executive Dashboard Analytics (FR-11)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-1101 | Admin Dashboard KPIs & Charts | GET `/api/dashboard` (Admin) | 200 OK, returns KPIs, priority pie, 6-month trends, top-10 costs | ✅ Pass (Jest) |
| TC-1102 | Technician Personal Workload | GET `/api/dashboard` (Technician) | 200 OK, returns personal active tasks and urgent tickets | ✅ Pass (Jest) |
| TC-1103 | Requester Personal Summary | GET `/api/dashboard` (Requester) | 200 OK, returns submitted request history and statuses | ✅ Pass (Jest) |

---

### TC-12xx — Reports & CSV/PDF Document Export (FR-12)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-1201 | Report Data Preview | GET `/api/reports/preview?type=WORK_ORDERS` | 200 OK with filtered JSON preview | ✅ Pass (Jest) |
| TC-1202 | CSV Export Stream | GET `/api/reports/export/csv?type=WORK_ORDERS` | 200 OK with `Content-Type: text/csv` and valid rows | ✅ Pass (Jest) |
| TC-1203 | PDF Document Generation | GET `/api/reports/export/pdf?type=WORK_ORDERS` | 200 OK with `application/pdf` and `%PDF` binary header | ✅ Pass (Jest) |
| TC-1204 | Multi-report Format Support | Export INVENTORY (CSV) & COST_ANALYSIS (PDF) | 200 OK for both formats | ✅ Pass (Jest) |

---

### TC-13xx — Audit Logs (FR-13)
| ID | Feature | Test Steps | Expected Result | Status |
|---|---|---|---|---|
| TC-1301 | User Login Audit Record | POST `/api/auth/login` | Audit record logged with action `USER_LOGIN` | ✅ Pass (Jest) |
| TC-1302 | Asset Creation Audit Record | POST `/api/assets` | Audit record logged with action `CREATE_ASSET` | ✅ Pass (Jest) |
| TC-1303 | Query Audit Trail (Admin) | GET `/api/audit-logs` (Admin) | 200 OK with paginated audit logs | ✅ Pass (Jest) |
| TC-1304 | Forbidden to Non-Admin | GET `/api/audit-logs` (Technician) | 403 Forbidden | ✅ Pass (Jest) |
