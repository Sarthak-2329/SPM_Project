# 12 — Preventive Maintenance (PM) Scheduler Activity Diagram

This activity diagram details the background automated Preventive Maintenance cycle (FR-08) orchestrated via `node-cron` and on-demand Admin trigger execution. It highlights query criteria, duplicate suppression (idempotency guard), checklist cloning, work order dispatch, and the next-due calculation.

```mermaid
flowchart TD
    Start([Trigger: Cron Midnight or Admin 'Run Now']) --> ScanDue[Query Active PM Schedules where nextDueDate <= NOW]
    ScanDue --> CheckEmpty{Any due schedules?}
    CheckEmpty -- No --> LogNoop[Log '0 due schedules found' & Exit]
    LogNoop --> Finish([End Process])

    CheckEmpty -- Yes --> LoopSchedules[Iterate through each Due Schedule]
    LoopSchedules --> CheckDup{Work Order already generated<br/>for this schedule TODAY?}
    
    CheckDup -- Yes (Duplicate) --> SkipLog[Log 'Skipping: Duplicate detected for today']
    SkipLog --> NextSchedule{More schedules?}

    CheckDup -- No (Unserviced) --> StartTx[(Begin DB Transaction)]
    StartTx --> CloneChecklist[Format PM Checklist into Work Order Description]
    CloneChecklist --> InsertWO[Insert Work Order:<br/>• Title: PM Schedule Name<br/>• Priority: Schedule Priority<br/>• AssetId & Checklist Tasks<br/>• Status: OPEN]
    InsertWO --> CalcNextDue[Calculate new nextDueDate =<br/>current nextDueDate + frequencyDays]
    CalcNextDue --> UpdateSchedule[Update PMSchedule with new nextDueDate]
    UpdateSchedule --> CommitTx[(Commit Transaction)]

    CommitTx --> SendAlert[Dispatch in-app notifications & email to Facilities Admins]
    SendAlert --> LogAudit[Write Audit Trail: TRIGGER_PM_SCHEDULER / AUTO_GENERATE]
    LogAudit --> NextSchedule

    NextSchedule -- Yes --> LoopSchedules
    NextSchedule -- No --> Summary[Return Execution Summary: Scanned & Generated Counts]
    Summary --> Finish
```

---

### Plain-English Viva Walkthrough (5–10 Lines)
1. **Trigger Mechanism:** The scheduler runs automatically on a scheduled cron cadence (default midnight daily) and can also be triggered synchronously by an Admin via `POST /api/pm-schedules/run-now`.
2. **Detection & Filtering:** The service queries all `PMSchedule` records that are active (`isActive = true`) and have reached or surpassed their scheduled due timestamp (`nextDueDate <= NOW()`).
3. **Strict Idempotency Guard:** To prevent duplicate work orders if the scheduler triggers multiple times within the same day, the query inspects whether a work order linked to `pmScheduleId` with `createdAt >= startOfToday` already exists.
4. **Atomic Transaction:** Inside a single PostgreSQL transaction (`prisma.$transaction`), the system creates an `OPEN` work order, copies all ordered checklist items into the task scope, advances `nextDueDate` by the schedule's `frequencyDays`, and registers the initial status history.
5. **Notification & Audit:** Facilities managers and technicians receive in-app notifications upon generation, and a permanent entry is recorded in `audit_logs` detailing the execution outcome.
