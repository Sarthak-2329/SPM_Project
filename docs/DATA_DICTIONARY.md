# Data Dictionary — Campus CMMS

**Source:** `server/prisma/schema.prisma` (migration `20261112162332_init`)  
**Database:** PostgreSQL 16  
**ORM:** Prisma 5.x  

> All tables use `cuid()` as the primary key type (collision-resistant, URL-safe IDs).  
> `createdAt` and `updatedAt` are auto-managed by Prisma.

---

## Table of Contents

1. [users](#1-users)
2. [locations](#2-locations)
3. [categories](#3-categories)
4. [assets](#4-assets)
5. [maintenance_requests](#5-maintenance_requests)
6. [work_orders](#6-work_orders)
7. [work_order_status_history](#7-work_order_status_history)
8. [work_order_notes](#8-work_order_notes)
9. [pm_schedules](#9-pm_schedules)
10. [pm_checklist_items](#10-pm_checklist_items)
11. [suppliers](#11-suppliers)
12. [parts](#12-parts)
13. [work_order_parts](#13-work_order_parts)
14. [notifications](#14-notifications)
15. [audit_logs](#15-audit_logs)
16. [attachments](#16-attachments)
17. [Enums](#17-enums)
18. [Indexes Summary](#18-indexes-summary)

---

## 1. `users`

Stores all system users regardless of role.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid — primary key |
| `email` | `TEXT` | `NOT NULL`, UNIQUE | Login email address |
| `name` | `TEXT` | `NOT NULL` | Display name |
| `password` | `TEXT` | `NOT NULL` | bcrypt hash (min 12 rounds); never stored plain |
| `role` | `UserRole` (enum) | `NOT NULL`, DEFAULT `REQUESTER` | Access level: ADMIN, TECHNICIAN, REQUESTER |
| `isActive` | `BOOLEAN` | `NOT NULL`, DEFAULT `true` | Soft-disable without deleting the record |
| `phone` | `TEXT` | nullable | Contact phone number |
| `avatarUrl` | `TEXT` | nullable | Path to profile photo in `/uploads` |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | Record creation time |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | Last modification time |

**Indexes:** `email` (unique), `role`

---

## 2. `locations`

Self-referential table representing the campus location hierarchy: Campus → Building → Floor → Room.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `name` | `TEXT` | `NOT NULL` | Location name, e.g. "Block B", "Floor 2", "Lab 204" |
| `type` | `LocationType` (enum) | `NOT NULL` | CAMPUS, BUILDING, FLOOR, or ROOM |
| `parentId` | `TEXT` | nullable, FK → `locations.id` | Parent in hierarchy; null for top-level campus nodes |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `parentId`

---

## 3. `categories`

Asset categories with optional parent for hierarchical categorisation (e.g. Electrical → HVAC).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `name` | `TEXT` | `NOT NULL`, UNIQUE | Category name |
| `description` | `TEXT` | nullable | Optional description |
| `parentId` | `TEXT` | nullable, FK → `categories.id` | Parent category |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `parentId`

---

## 4. `assets`

The core asset registry — each physical asset on campus.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `assetCode` | `TEXT` | `NOT NULL`, UNIQUE | Human-readable code, e.g. `AC-LAB-001` |
| `name` | `TEXT` | `NOT NULL` | Descriptive asset name |
| `categoryId` | `TEXT` | `NOT NULL`, FK → `categories.id` | Asset category |
| `locationId` | `TEXT` | `NOT NULL`, FK → `locations.id` | Physical location |
| `manufacturer` | `TEXT` | nullable | Make/brand |
| `serialNo` | `TEXT` | UNIQUE, nullable | Manufacturer serial number |
| `purchaseDate` | `TIMESTAMP(3)` | nullable | Date of purchase |
| `warrantyExpiry` | `TIMESTAMP(3)` | nullable | Warranty expiry date |
| `status` | `AssetStatus` (enum) | `NOT NULL`, DEFAULT `ACTIVE` | ACTIVE, UNDER_MAINTENANCE, RETIRED |
| `photoUrl` | `TEXT` | nullable | Path to asset photo in `/uploads` |
| `qrCodeUrl` | `TEXT` | nullable | Path to QR code PNG in `/uploads` |
| `notes` | `TEXT` | nullable | Free-form admin notes |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `categoryId`, `locationId`, `status`

---

## 5. `maintenance_requests`

Fault/maintenance requests submitted by Requesters.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `requesterId` | `TEXT` | `NOT NULL`, FK → `users.id` | User who submitted the request |
| `assetId` | `TEXT` | nullable, FK → `assets.id` | Asset the fault relates to (if known) |
| `locationId` | `TEXT` | nullable, FK → `locations.id` | Location of the fault (if no specific asset) |
| `description` | `TEXT` | `NOT NULL` | Fault description; Zod enforces min 10 chars |
| `priority` | `Priority` (enum) | `NOT NULL`, DEFAULT `MEDIUM` | LOW, MEDIUM, HIGH, CRITICAL |
| `status` | `RequestStatus` (enum) | `NOT NULL`, DEFAULT `PENDING` | PENDING, APPROVED, REJECTED |
| `rejectionReason` | `TEXT` | nullable | Required when status = REJECTED |
| `photoUrl` | `TEXT` | nullable | Path to uploaded photo |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `requesterId`, `status`, `assetId`

---

## 6. `work_orders`

The central work order entity — tracks all maintenance tasks.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `title` | `TEXT` | `NOT NULL` | Short WO title |
| `description` | `TEXT` | `NOT NULL` | Detailed description of the work |
| `maintenanceRequestId` | `TEXT` | UNIQUE, nullable, FK → `maintenance_requests.id` | Source request (null if manual or PM-generated) |
| `assetId` | `TEXT` | nullable, FK → `assets.id` | Asset being maintained |
| `priority` | `Priority` (enum) | `NOT NULL`, DEFAULT `MEDIUM` | LOW, MEDIUM, HIGH, CRITICAL |
| `assigneeId` | `TEXT` | nullable, FK → `users.id` | Assigned Technician (null until assigned) |
| `createdById` | `TEXT` | `NOT NULL`, FK → `users.id` | Admin who created the WO |
| `dueDate` | `TIMESTAMP(3)` | nullable | Target completion date |
| `status` | `WorkOrderStatus` (enum) | `NOT NULL`, DEFAULT `OPEN` | OPEN→ASSIGNED→IN_PROGRESS→ON_HOLD→COMPLETED→CLOSED |
| `estimatedCost` | `DOUBLE PRECISION` | nullable | Pre-work cost estimate (₹) |
| `actualCost` | `DOUBLE PRECISION` | nullable | **Deliberate denorm:** sum of parts + labour; stored for reporting flexibility |
| `timeSpent` | `DOUBLE PRECISION` | nullable | Total technician hours logged |
| `pmScheduleId` | `TEXT` | nullable, FK → `pm_schedules.id` | PM schedule that generated this WO (null otherwise) |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `assigneeId`, `status`, `priority`, `assetId`, `dueDate`, `pmScheduleId`

---

## 7. `work_order_status_history`

Immutable log of every status transition on a Work Order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `workOrderId` | `TEXT` | `NOT NULL`, FK → `work_orders.id` | Parent work order |
| `fromStatus` | `WorkOrderStatus` (enum) | nullable | Previous status (null for initial OPEN entry) |
| `toStatus` | `WorkOrderStatus` (enum) | `NOT NULL` | New status after transition |
| `changedById` | `TEXT` | `NOT NULL`, FK → `users.id` | User who triggered the transition |
| `reason` | `TEXT` | nullable | Explanation (required for ON_HOLD) |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | Transition timestamp |

**Indexes:** `workOrderId`  
**Note:** No `updatedAt` — this table is append-only.

---

## 8. `work_order_notes`

Threaded notes/comments on a Work Order.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `workOrderId` | `TEXT` | `NOT NULL`, FK → `work_orders.id` | Parent work order |
| `authorId` | `TEXT` | `NOT NULL`, FK → `users.id` | Note author |
| `content` | `TEXT` | `NOT NULL` | Note text |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `workOrderId`

---

## 9. `pm_schedules`

Preventive maintenance schedules — time-based recurrence per asset.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `name` | `TEXT` | `NOT NULL` | Schedule name, e.g. "Monthly AC Service" |
| `assetId` | `TEXT` | `NOT NULL`, FK → `assets.id` | Asset this schedule applies to |
| `frequencyDays` | `INTEGER` | `NOT NULL` | Recurrence interval in days (e.g. 30 = monthly) |
| `lastGeneratedAt` | `TIMESTAMP(3)` | nullable | Timestamp of last WO generated; used to prevent duplicate generation |
| `nextDueDate` | `TIMESTAMP(3)` | `NOT NULL` | Next date to generate a WO; updated after each generation |
| `isActive` | `BOOLEAN` | `NOT NULL`, DEFAULT `true` | Inactive schedules are skipped by the cron job |
| `description` | `TEXT` | nullable | General notes about the PM tasks |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `assetId`, `nextDueDate`, `isActive`

---

## 10. `pm_checklist_items`

Individual inspection/task items within a PM schedule checklist.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `scheduleId` | `TEXT` | `NOT NULL`, FK → `pm_schedules.id` | Parent PM schedule |
| `description` | `TEXT` | `NOT NULL` | Checklist step, e.g. "Check refrigerant level" |
| `order` | `INTEGER` | `NOT NULL`, DEFAULT `0` | Display order within the checklist |

**Indexes:** `scheduleId`

---

## 11. `suppliers`

Parts suppliers / vendors.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `name` | `TEXT` | `NOT NULL` | Supplier company name |
| `contactName` | `TEXT` | nullable | Primary contact person |
| `email` | `TEXT` | nullable | Contact email |
| `phone` | `TEXT` | nullable | Contact phone |
| `address` | `TEXT` | nullable | Postal/billing address |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

---

## 12. `parts`

Spare parts and consumables in the inventory catalogue.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `partCode` | `TEXT` | `NOT NULL`, UNIQUE | Human-readable code, e.g. `PRT-FILTER-001` |
| `name` | `TEXT` | `NOT NULL` | Part name |
| `description` | `TEXT` | nullable | Detailed description |
| `stockQty` | `INTEGER` | `NOT NULL`, DEFAULT `0` | Current stock level; decremented on WO part use |
| `reorderLevel` | `INTEGER` | `NOT NULL`, DEFAULT `5` | Alert threshold: low-stock flag when `stockQty ≤ reorderLevel` |
| `unitCost` | `DOUBLE PRECISION` | `NOT NULL` | Current cost per unit (₹) |
| `supplierId` | `TEXT` | nullable, FK → `suppliers.id` | Primary supplier |
| `isActive` | `BOOLEAN` | `NOT NULL`, DEFAULT `true` | Inactive parts not shown in WO part picker |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |
| `updatedAt` | `TIMESTAMP(3)` | `NOT NULL`, auto-updated | — |

**Indexes:** `supplierId`, `stockQty`

---

## 13. `work_order_parts`

Junction table: parts used on a Work Order. One row per (WO × Part) combination.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `workOrderId` | `TEXT` | `NOT NULL`, FK → `work_orders.id` | Parent work order |
| `partId` | `TEXT` | `NOT NULL`, FK → `parts.id` | Part used |
| `quantityUsed` | `INTEGER` | `NOT NULL` | Number of units consumed |
| `unitCostAtTime` | `DOUBLE PRECISION` | `NOT NULL` | **Deliberate denorm:** part price snapshot at time of use — preserved even if `parts.unitCost` changes later |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |

**Unique constraint:** `(workOrderId, partId)` — only one row per part per WO (use quantityUsed to accumulate).  
**Indexes:** `workOrderId`, `partId`

---

## 14. `notifications`

In-app and email notification records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `userId` | `TEXT` | `NOT NULL`, FK → `users.id` | Recipient user |
| `type` | `NotificationType` (enum) | `NOT NULL` | ASSIGNMENT, STATUS_CHANGE, OVERDUE, LOW_STOCK, GENERAL |
| `title` | `TEXT` | `NOT NULL` | Short notification title |
| `message` | `TEXT` | `NOT NULL` | Full notification body |
| `isRead` | `BOOLEAN` | `NOT NULL`, DEFAULT `false` | Whether the user has read it |
| `referenceId` | `TEXT` | nullable | ID of the entity this notification is about |
| `referenceType` | `TEXT` | nullable | Entity type string (e.g. `"WORK_ORDER"`, `"PART"`) |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |

**Indexes:** `userId`, `isRead`, `createdAt`

---

## 15. `audit_logs`

Immutable audit trail — all significant system actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `userId` | `TEXT` | nullable, FK → `users.id` | Actor (null for system/scheduler actions) |
| `action` | `TEXT` | `NOT NULL` | Verb: `CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `ASSIGN`, etc. |
| `entityType` | `TEXT` | `NOT NULL` | Model name: `Asset`, `WorkOrder`, `MaintenanceRequest`, etc. |
| `entityId` | `TEXT` | nullable | PK of the affected record |
| `details` | `JSONB` | nullable | Before/after diff or additional context |
| `ipAddress` | `TEXT` | nullable | Client IP address |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |

**Indexes:** `userId`, `(entityType, entityId)`, `createdAt`  
**Note:** No `updatedAt`, no soft-delete — this table is append-only and not deletable by any user.

---

## 16. `attachments`

Files attached to any entity (polymorphic association).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `TEXT` | PK, `NOT NULL` | cuid |
| `entityType` | `TEXT` | `NOT NULL` | Discriminator: `"ASSET"`, `"WORK_ORDER"`, `"MAINTENANCE_REQUEST"` |
| `entityId` | `TEXT` | `NOT NULL` | PK of the related entity — **no DB-level FK** (see note) |
| `fileName` | `TEXT` | `NOT NULL` | Original file name |
| `fileUrl` | `TEXT` | `NOT NULL` | Relative path under `/uploads`, e.g. `uploads/assets/photo.jpg` |
| `fileSize` | `INTEGER` | `NOT NULL` | File size in bytes |
| `mimeType` | `TEXT` | `NOT NULL` | MIME type, e.g. `image/jpeg` |
| `uploadedById` | `TEXT` | `NOT NULL`, FK → `users.id` | User who uploaded the file |
| `createdAt` | `TIMESTAMP(3)` | `NOT NULL`, DEFAULT `now()` | — |

**Indexes:** `(entityType, entityId)`, `uploadedById`  
**Design note:** The `(entityType, entityId)` pair is a polymorphic reference. No DB-level FK constraint exists on `entityId` because Prisma does not support multi-target polymorphic FK. The application layer validates that the referenced entity exists before creating an Attachment record.

---

## 17. Enums

| Enum | Values |
|---|---|
| `UserRole` | `ADMIN`, `TECHNICIAN`, `REQUESTER` |
| `LocationType` | `CAMPUS`, `BUILDING`, `FLOOR`, `ROOM` |
| `AssetStatus` | `ACTIVE`, `UNDER_MAINTENANCE`, `RETIRED` |
| `Priority` | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `RequestStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `WorkOrderStatus` | `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `ON_HOLD`, `COMPLETED`, `CLOSED` |
| `NotificationType` | `ASSIGNMENT`, `STATUS_CHANGE`, `OVERDUE`, `LOW_STOCK`, `GENERAL` |

---

## 18. Indexes Summary

| Table | Indexed Column(s) | Type | Purpose |
|---|---|---|---|
| `users` | `email` | UNIQUE | Login lookup |
| `users` | `role` | B-tree | Filter by role |
| `locations` | `parentId` | B-tree | Hierarchy traversal |
| `categories` | `parentId` | B-tree | Hierarchy traversal |
| `assets` | `categoryId`, `locationId`, `status` | B-tree | Filter on list page |
| `maintenance_requests` | `requesterId`, `status`, `assetId` | B-tree | Filter on request queue |
| `work_orders` | `assigneeId`, `status`, `priority`, `assetId`, `dueDate`, `pmScheduleId` | B-tree | WO list filters + overdue query |
| `work_order_status_history` | `workOrderId` | B-tree | WO timeline lookup |
| `work_order_notes` | `workOrderId` | B-tree | Note thread lookup |
| `pm_schedules` | `assetId`, `nextDueDate`, `isActive` | B-tree | Cron query (active + due) |
| `pm_checklist_items` | `scheduleId` | B-tree | Checklist fetch |
| `parts` | `supplierId`, `stockQty` | B-tree | Low-stock query |
| `work_order_parts` | `workOrderId`, `partId` | B-tree | Parts used lookup |
| `notifications` | `userId`, `isRead`, `createdAt` | B-tree | Notification feed query |
| `audit_logs` | `userId`, `(entityType, entityId)`, `createdAt` | B-tree | Audit log filters |
| `attachments` | `(entityType, entityId)`, `uploadedById` | B-tree | Polymorphic fetch |

---

*Generated from: `server/prisma/schema.prisma`*  
*Migration: `20261112162332_init`*  
*Last updated: Phase 1*
