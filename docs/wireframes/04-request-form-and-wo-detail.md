# Wireframe: Maintenance Request Form & Work Order Detail

## Maintenance Request Form

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back                                                                      │
│                                                                             │
│  New Maintenance Request                                                    │
│  ─────────────────────────────────────────────────────────────────────      │
│                                                                             │
│  Asset (optional)                                                           │
│  ┌─────────────────────────────────────────────────┐                       │
│  │ 🔍 Search asset by name or code...              │                       │
│  └─────────────────────────────────────────────────┘                       │
│  — OR —                                                                     │
│  Location                                                                   │
│  ┌────────────────────┐  ┌────────────────────┐                            │
│  │ Building ▾         │  │ Floor ▾             │  Room ▾                   │
│  └────────────────────┘  └────────────────────┘                            │
│                                                                             │
│  Description of Problem *                                                   │
│  ┌─────────────────────────────────────────────────┐                       │
│  │ Describe the fault in detail...                 │                       │
│  │                                                 │                       │
│  └─────────────────────────────────────────────────┘                       │
│                                                                             │
│  Priority *           Photo (optional)                                      │
│  ◉ Low                ┌────────────────┐                                   │
│  ○ Medium             │  📷 Upload     │                                   │
│  ○ High               │  Photo         │                                   │
│  ○ Critical           └────────────────┘                                   │
│                                                                             │
│  ┌─────────────────────────────────────────────────┐                       │
│  │              Submit Request →                   │                       │
│  └─────────────────────────────────────────────────┘                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Work Order Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Work Orders                                                               │
│                                                                             │
│  WO-2024-089 — AC Not Cooling in Lab B-204          🔴 High   🔵 In Progress│
│                                                                             │
│  ┌────────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Details                   │  │  Timeline / Status History           │  │
│  │  Asset:    AC-LAB-001      │  │  ○ Nov 1  Admin → OPEN              │  │
│  │  Assignee: Raj Kumar       │  │  ● Nov 2  Admin → ASSIGNED (Raj)    │  │
│  │  Due Date: Nov 15, 2024    │  │  ● Nov 3  Raj → IN PROGRESS         │  │
│  │  Est Cost: ₹2,500          │  │  ○ Nov 5  Raj → ON HOLD             │  │
│  │  Time Spent: 3.5 hrs       │  │    Reason: Waiting for spare part   │  │
│  │  Actual Cost: ₹1,800       │  │  ● Nov 8  Admin → IN PROGRESS       │  │
│  │                            │  └─────────────────────────────────────┘  │
│  │  [Update Status ▾]         │                                           │
│  │  [Assign Technician ▾]     │  Parts Used                              │  │
│  └────────────────────────────┘  ┌──────────────┬────┬──────┬──────────┐  │
│                                   │  Part         │ Qty│ Cost │ Total    │  │
│  Description                      ├──────────────┼────┼──────┼──────────┤  │
│  ─────────────────────────────    │  AC Filter    │  2 │ ₹400 │ ₹800     │  │
│  The AC in Lab B-204 is not       │  Refrigerant  │  1 │₹1000 │ ₹1,000   │  │
│  producing cold air. Temperature  └──────────────┴────┴──────┴──────────┘  │
│  reads 32°C even at max setting.  [+ Add Part]                             │
│                                                                             │
│  Notes / Comments                                                           │
│  ─────────────────────────────                                             │
│  [Nov 8, Raj] Compressor gas was low. Refilled. Filter replaced.           │
│  [Nov 5, Raj] On hold — waiting for refrigerant delivery.                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────┐                      │
│  │ Add a note...                                   │   [Post Note]        │
│  └─────────────────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Notes (FR-05, FR-06, FR-07):**
- Status badge and "Update Status" button are role-aware (Technician sees different options than Admin).
- "Add Part" deducts from inventory atomically (FR-09).
- Technician logs time via a numeric input (hours) with a save button.
