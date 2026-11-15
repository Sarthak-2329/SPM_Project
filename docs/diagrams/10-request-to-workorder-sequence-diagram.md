# Request to Work Order Lifecycle Sequence Diagram — Campus CMMS

## Title
**SEQ-10: End-to-End Maintenance Request to Work Order Lifecycle (FR-05, FR-06, FR-07, FR-10)**

---

## Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Requester as 🎓 Student / Staff
    actor Admin as 👤 Facilities Admin
    actor Tech as 👷 Assigned Technician
    participant Web as React Web App
    participant ReqCtrl as MaintenanceRequestController
    participant WOCtrl as WorkOrderController
    participant ReqSvc as MaintenanceRequestService
    participant WOSvc as WorkOrderService
    participant NotifSvc as NotificationService
    participant EmailSvc as EmailService
    participant DB as PostgreSQL (Prisma $transaction)

    %% 1. Submission
    Requester->>Web: Submits fault report (Asset, description, priority, photo)
    Web->>ReqCtrl: POST /api/requests (multipart/form-data)
    ReqCtrl->>ReqSvc: createRequest(data, file, requesterId)
    ReqSvc->>DB: INSERT INTO maintenance_requests (status = 'PENDING')
    ReqSvc->>NotifSvc: notify(admins, 'New Fault Ticket')
    NotifSvc->>DB: INSERT INTO notifications
    ReqSvc-->>Web: 201 Created (Request PENDING)
    Web-->>Requester: Ticket submitted with tracking ID

    %% 2. Admin Review & Atomic Conversion
    Admin->>Web: Views pending queue and clicks "Approve"
    Web->>ReqCtrl: POST /api/requests/:id/approve { title, assigneeId, dueDate, priority }
    ReqCtrl->>ReqSvc: approveRequest(requestId, params, adminId)
    
    rect rgb(240, 248, 255)
        note right of ReqSvc: Atomic Transaction (prisma.$transaction)
        ReqSvc->>DB: UPDATE maintenance_requests SET status = 'APPROVED'
        ReqSvc->>DB: INSERT INTO work_orders (status = 'ASSIGNED', assigneeId = techId)
        ReqSvc->>DB: INSERT INTO work_order_status_history (toStatus = 'ASSIGNED')
    end
    
    ReqSvc->>NotifSvc: notify(requesterId, 'Request Approved')
    ReqSvc->>NotifSvc: notify(techId, 'Work Order Assigned')
    ReqSvc->>EmailSvc: sendAssignmentEmail(techEmail, workOrder)
    ReqSvc-->>Web: 200 OK (Work Order created)
    Web-->>Admin: Work order created and dispatched

    %% 3. Technician Execution & Status Progression
    Tech->>Web: Views "My Work Orders" and clicks "Move to IN_PROGRESS"
    Web->>WOCtrl: PATCH /api/work-orders/:id/status { status: 'IN_PROGRESS' }
    WOCtrl->>WOSvc: transitionStatus(id, 'IN_PROGRESS', reason, techUser)
    WOSvc->>WOSvc: Validate transition against State Machine
    WOSvc->>DB: UPDATE work_orders SET status = 'IN_PROGRESS'
    WOSvc->>DB: INSERT INTO work_order_status_history
    WOSvc-->>Web: 200 OK

    Tech->>Web: Logs notes & hours spent
    Web->>WOCtrl: POST /api/work-orders/:id/notes & PATCH /api/work-orders/:id/time
    WOCtrl->>DB: INSERT INTO work_order_notes & UPDATE timeSpent

    Tech->>Web: Marks work order "COMPLETED"
    Web->>WOCtrl: PATCH /api/work-orders/:id/status { status: 'COMPLETED' }
    WOCtrl->>WOSvc: transitionStatus(id, 'COMPLETED')
    WOSvc->>DB: UPDATE work_orders SET status = 'COMPLETED'
    WOSvc->>NotifSvc: notify(adminId, 'Work Order Completed for Inspection')

    %% 4. Admin Final Verification & Closure
    Admin->>Web: Inspects completed task and verifies resolution
    Web->>WOCtrl: PATCH /api/work-orders/:id/status { status: 'CLOSED', reason: 'Verified OK' }
    WOCtrl->>WOSvc: transitionStatus(id, 'CLOSED', reason, adminUser)
    WOSvc->>DB: UPDATE work_orders SET status = 'CLOSED'
    WOSvc->>DB: INSERT INTO work_order_status_history (toStatus = 'CLOSED')
    WOSvc-->>Web: 200 OK (Terminal Closed State)
    Web-->>Admin: Work Order archived
```

---

## Plain-English Walkthrough (Viva Notes)

This sequence diagram depicts the end-to-end operational lifecycle from fault detection to final sign-off:

1. **Submission (FR-05):** A student or faculty member reports an issue through the web interface. The request enters the PostgreSQL database with a status of `PENDING`, and all system administrators receive an in-app alert.
2. **Atomic Approval (FR-06):** An administrator reviews the pending request and triggers approval. Crucially, this operation executes within a single **Prisma database transaction** (`prisma.$transaction`). It updates the request to `APPROVED`, instantiates the corresponding `WorkOrder`, logs the initial entry into `work_order_status_history`, and creates notification records. If any sub-query fails, the entire batch rolls back, guaranteeing that a request never produces multiple work orders or leaves orphaned records.
3. **Execution & State Machine (FR-07):** The assigned technician receives an email and an in-app alert. Using the role-scoped interface, the technician transitions the order from `ASSIGNED` to `IN_PROGRESS`, logs ongoing work notes and labour hours, and moves it to `COMPLETED`. Every transition is verified against the server-side state machine.
4. **Administrative Closure (FR-07):** The technician cannot arbitrarily close the ticket. The administrator inspects the completed work, logs a verification sign-off, and marks the work order `CLOSED`—the immutable terminal state.
