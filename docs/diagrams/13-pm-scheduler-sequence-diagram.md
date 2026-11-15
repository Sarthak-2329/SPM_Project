# 13 — Preventive Maintenance (PM) Scheduler Sequence Diagram

This sequence diagram depicts the chronological interaction between the Cron/Admin caller, `PMSchedulerService`, PostgreSQL Database via Prisma, and `NotificationService` during periodic work order generation (FR-08).

```mermaid
sequenceDiagram
    autonumber
    actor Caller as Cron Job / Admin Web Client
    participant Scheduler as PMSchedulerService
    participant Repo as PMScheduleRepository
    participant DB as PostgreSQL (Prisma ORM)
    participant Notif as NotificationService
    participant Audit as AuditService

    Caller->>Scheduler: runDueSchedules(adminId?, clientIp?)
    activate Scheduler

    Scheduler->>DB: findMany active schedules where nextDueDate <= NOW()
    DB-->>Scheduler: [ dueSchedule_1, dueSchedule_2, ... ]

    loop For each dueSchedule
        Scheduler->>DB: count workOrders where pmScheduleId = id AND createdAt >= startOfToday
        DB-->>Scheduler: existingTodayCount

        alt existingTodayCount > 0 (Duplicate Check)
            Scheduler-->>Scheduler: Log "Already generated today, skipping"
        else existingTodayCount == 0 (Valid Due Cycle)
            Scheduler->>DB: $transaction(create WorkOrder, update nextDueDate, create History)
            activate DB
            DB-->>Scheduler: Created WorkOrder & Updated Schedule
            deactivate DB

            Scheduler->>Notif: notifyAdmins("PM Work Order Generated", woId)
            activate Notif
            Notif-->>Scheduler: Notification Dispatched
            deactivate Notif
        end
    end

    opt Caller is Admin
        Scheduler->>Audit: log(TRIGGER_PM_SCHEDULER, details)
        Audit-->>Scheduler: OK
    end

    Scheduler-->>Caller: { scannedSchedules: N, generatedCount: M, workOrders: [...] }
    deactivate Scheduler
```

---

### Plain-English Viva Walkthrough (5–10 Lines)
1. **Invocation:** The process starts when `node-cron` fires its scheduled event or an administrator clicks "Run Scheduler Now" in the UI.
2. **Identification:** `PMSchedulerService` queries the database for all enabled PM schedules whose `nextDueDate` has arrived.
3. **Deduplication Check:** Before generating any ticket, the scheduler checks if a work order with the same `pmScheduleId` was already generated earlier today. If found, the schedule is gracefully skipped.
4. **Atomic Provisioning:** If unserviced, the scheduler initiates an ACID transaction creating the new work order with all checklist tasks embedded and pushing `nextDueDate` forward by `frequencyDays`.
5. **Notification & Completion:** Notifications are emitted to relevant staff, the action is logged to the system audit trail, and a execution summary (`scanned` vs `generated`) is returned to the client.
