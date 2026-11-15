# Wireframe: Inventory & Reports

## Inventory Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Inventory — Parts Catalogue                           [+ Add Part]         │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🔍 Search...   Low Stock Only ☐   Supplier ▾                               │
│                                                                             │
│  ⚠ 3 parts are below reorder level!                                        │  ← Alert banner
│                                                                             │
│  ┌──────────┬──────────────────┬──────┬────────┬────────┬──────────────┐  │
│  │ Part Code│ Name             │ Stock│Reorder │ Cost   │ Supplier     │  │
│  ├──────────┼──────────────────┼──────┼────────┼────────┼──────────────┤  │
│  │PRT-001   │ AC Filter (1-ton)│  12  │   5    │₹400    │ ABC Spares   │  │
│  │PRT-002   │ Refrigerant R32  │  3 🔴│   5    │₹1,000  │ CoolTech     │  │
│  │PRT-003   │ ELCB Breaker 32A │  8   │   3    │₹650    │ ElecMart     │  │
│  │PRT-004   │ PVC Pipe 1" (m)  │  2 🔴│   10   │₹80/m   │ PipeWorld    │  │
│  │  ...     │                  │      │        │        │              │  │
│  └──────────┴──────────────────┴──────┴────────┴────────┴──────────────┘  │
│                                                                             │
│  Showing 1–20 of 24   [< Prev]  1  2  [Next >]                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Reports Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Reports                                                                    │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Report Type ▾                Date Range                                   │
│  ┌──────────────────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │ Work Orders by Date  ▾   │  │  2024-10-01   │  │  2024-11-12   │        │
│  └──────────────────────────┘  └───────────────┘  └───────────────┘        │
│                                                                             │
│  Additional Filters: Technician ▾   Asset ▾   Priority ▾                   │
│                                                                             │
│  [🔍 Generate Report]      [📥 Export CSV]   [📄 Export PDF]               │
│                                                                             │
│  ── Preview ───────────────────────────────────────────────────────────    │
│  ┌────────┬──────────────────────┬──────────┬────────────┬────────────┐   │
│  │ WO ID  │ Title                │ Assignee │ Status     │ Cost       │   │
│  ├────────┼──────────────────────┼──────────┼────────────┼────────────┤   │
│  │WO-089  │ AC not cooling B204  │ Raj K.   │ In Progress│ ₹1,800     │   │
│  │WO-088  │ Water leak Hostel A  │ Priya S. │ Completed  │ ₹3,200     │   │
│  │  ...   │                      │          │            │            │   │
│  └────────┴──────────────────────┴──────────┴────────────┴────────────┘   │
│                                                                             │
│  Total WOs: 32   Total Cost: ₹45,600   Avg Resolution: 2.3 days            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Notes (FR-09, FR-12):**
- 🔴 highlights parts at or below reorder level.
- Clicking a part row opens an edit form.
- Reports are generated server-side; PDF uses pdfkit, CSV uses csv-stringify.
- Available report types: WOs by date, WOs by asset, WOs by technician, Inventory usage, PM compliance.
