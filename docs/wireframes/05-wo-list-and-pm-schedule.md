# Wireframe: Work Order List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰  CAMPUS CMMS    🔔(3)   👤 Admin User ▾                                  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│  [sidebar]   │  Work Orders                              [+ New Work Order] │
│              │                                                              │
│              │  🔍 Search...  Status ▾  Priority ▾  Assignee ▾  Due ▾  🔄  │
│              │                                                              │
│              │  ┌──┬──────────┬────────────────────┬──────┬──────────┬────┐│
│              │  │☐ │ WO ID    │ Title              │Prior.│ Assignee │Due ││
│              │  ├──┼──────────┼────────────────────┼──────┼──────────┼────┤│
│              │  │☐ │WO-089    │AC not cooling B204 │🔴High│ Raj K.   │Nov15│
│              │  │☐ │WO-088    │Water leak Hostel A │🟠High│ Priya S. │Nov12│
│              │  │☐ │WO-087    │Projector fault 301 │🟡Med │ Amit S.  │Nov20│
│              │  │☐ │WO-086    │Monthly AC PM Lab C │🟢Low │ Raj K.   │Nov30│
│              │  │  │  ...     │                    │      │          │    ││
│              │  └──┴──────────┴────────────────────┴──────┴──────────┴────┘│
│              │                                                              │
│              │  Quick Filters:  [🔵 Open]  [🔴 Overdue]  [📅 PM Only]      │
│              │                                                              │
│              │  Showing 1–20 of 67   [< Prev]  1  2  3  4  [Next >]        │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

**Notes (FR-07):**
- Rows are clickable → Work Order Detail.
- Colour coding: 🔴 Critical/Overdue, 🟠 High, 🟡 Medium, 🟢 Low.
- Status column shows badge (Open / Assigned / In Progress / On Hold / Completed / Closed).
- Technician view only shows their own assigned WOs.

---

# Wireframe: PM Schedule List & Form

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PM Schedules                                        [+ New PM Schedule]    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🔍 Search...   Active Only ☑                                               │
│                                                                             │
│  ┌──────────────────┬────────────┬──────────┬──────────────┬──────────────┐│
│  │ Schedule Name    │   Asset    │Freq(days)│  Next Due    │  Status      ││
│  ├──────────────────┼────────────┼──────────┼──────────────┼──────────────┤│
│  │ Monthly AC Svc   │ AC-LAB-001 │   30     │ Dec 01, 2024 │ 🟢 Active    ││
│  │ Quarterly Pump   │ PL-HST-012 │   90     │ Jan 15, 2025 │ 🟢 Active    ││
│  │ Annual Elec. Ins.│ EL-CLS-034 │  365     │ Mar 10, 2025 │ 🟢 Active    ││
│  └──────────────────┴────────────┴──────────┴──────────────┴──────────────┘│
│                                                                             │
│  ── Create / Edit PM Schedule ─────────────────────────────────────────────│
│  Schedule Name *       Asset *                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────────────┐        │
│  │ Monthly AC Svc   │  │ 🔍 Search asset...                       │        │
│  └──────────────────┘  └──────────────────────────────────────────┘        │
│                                                                             │
│  Frequency (every N days)*  Start Date *                                    │
│  ┌──────────┐               ┌──────────────┐                                │
│  │  30      │               │  2024-12-01  │                                │
│  └──────────┘               └──────────────┘                                │
│                                                                             │
│  Checklist Items                                                            │
│  ┌────────────────────────────────────────────────────────────┐            │
│  │ 1. ☐ Check refrigerant level                        [× del]│            │
│  │ 2. ☐ Clean air filter                               [× del]│            │
│  │ 3. ☐ Inspect electrical connections                 [× del]│            │
│  │ [+ Add Item]                                               │            │
│  └────────────────────────────────────────────────────────────┘            │
│                                                                             │
│  [Save Schedule]                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Notes (FR-08):** Checklist items are reordered by drag-and-drop in the final UI.
