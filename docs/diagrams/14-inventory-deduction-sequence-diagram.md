# 14 — Inventory Stock Deduction & Cost Calculation Sequence Diagram

This sequence diagram illustrates the atomic transaction boundary, concurrency protection, low-stock threshold alerting, and work order cost recomputation when a technician records parts consumed on a work order (FR-09).

```mermaid
sequenceDiagram
    autonumber
    actor Tech as Technician / Admin
    participant Route as WorkOrders Router
    participant InvService as InventoryService
    participant DB as PostgreSQL (Prisma ORM)
    participant Notif as NotificationService
    participant Audit as AuditService

    Tech->>Route: POST /api/work-orders/:id/parts { partId, quantityUsed }
    activate Route

    Route->>InvService: addPartToWorkOrder(woId, partId, quantityUsed, userId, ip)
    activate InvService

    rect rgb(240, 248, 255)
        note over InvService,DB: ATOMIC DATABASE TRANSACTION BOUNDARY ($transaction)
        InvService->>DB: findUnique(Part where id = partId)
        DB-->>InvService: Part record (stockQty, unitCost, reorderLevel)

        alt stockQty < quantityUsed (Insufficient Stock Guard)
            InvService-->>Route: Throw 400 Bad Request: "Insufficient stock. Available: X, Requested: Y"
            Route-->>Tech: 400 Error (Stock never goes negative!)
        else stockQty >= quantityUsed (Sufficient Stock)
            InvService->>DB: update(Part: stockQty = stockQty - quantityUsed)
            DB-->>InvService: Updated Part

            InvService->>DB: upsert / create(WorkOrderPart: quantityUsed, unitCostAtTime)
            DB-->>InvService: WorkOrderPart record

            InvService->>DB: findMany(WorkOrderPart where workOrderId = woId)
            DB-->>InvService: [ allPartsUsed ]

            InvService->>DB: findUnique(WorkOrder where id = woId)
            DB-->>InvService: WorkOrder (timeSpent)

            InvService-->>InvService: Compute total cost = sum(qty * unitCost) + (timeSpent * ₹250/hr)
            InvService->>DB: update(WorkOrder: actualCost = totalComputedCost)
            DB-->>InvService: Updated WorkOrder
        end
    end

    opt Updated Part stockQty <= reorderLevel
        InvService->>Notif: dispatchLowStockAlert(partName, remainingStock, reorderLevel)
        Notif-->>InvService: Alerts sent to Admins
    end

    InvService->>Audit: log(ADD_PART_TO_WORK_ORDER, details)
    Audit-->>InvService: Logged

    InvService-->>Route: { workOrderPart, updatedPart, actualCost }
    deactivate InvService

    Route-->>Tech: 201 Created { success: true, data: { ... } }
    deactivate Route
```

---

### Plain-English Viva Walkthrough (5–10 Lines)
1. **Request Intake:** A technician adds consumable parts used during maintenance through `POST /api/work-orders/:id/parts`.
2. **Transaction Isolation:** All operations run within an ACID database transaction (`prisma.$transaction`) to guarantee atomicity and avoid race conditions or inventory inconsistency.
3. **No-Negative Stock Rule:** If the current `stockQty` is less than the requested quantity, the transaction throws an immediate 400 Bad Request exception, ensuring stock levels can never go negative.
4. **Unit Cost Snapshotting:** When deducted, the part's current `unitCost` is snapshotted into `unitCostAtTime` so subsequent supplier price hikes do not retroactively alter historic job costs.
5. **Dynamic Cost Recomputation:** The work order's `actualCost` is recalculated dynamically as: `(SUM(parts * unitCostAtTime)) + (labour hours * ₹250/hr)`.
6. **Low-Stock Notification:** If the remaining stock falls at or below `reorderLevel`, the service dispatches in-app alerts and warning emails to administrators.
