# Wireframe: Asset List & Asset Detail

## Asset List Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰  CAMPUS CMMS    🔔(3)   👤 Admin User ▾                                  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│  [sidebar]   │  Assets                                   [+ New Asset]      │
│              │                                                              │
│              │  🔍 Search...   Category ▾   Location ▾   Status ▾   🔄     │
│              │                                                              │
│              │  ┌──┬────────────┬──────────┬──────────┬────────┬─────────┐ │
│              │  │☐ │ Asset Code │  Name    │ Location │Category│ Status  │ │
│              │  ├──┼────────────┼──────────┼──────────┼────────┼─────────┤ │
│              │  │☐ │ AC-LAB-001 │Split A/C │Lab B-204 │  HVAC  │🟢 Active│ │
│              │  │☐ │ AC-LAB-002 │Split A/C │Lab B-205 │  HVAC  │🟡 Maint │ │
│              │  │☐ │ PL-HST-012 │Water Pump│Hostel A  │Plumbing│🟢 Active│ │
│              │  │☐ │ EL-CLS-034 │Projector │Room 301  │Electrcl│🔴 Retired│ │
│              │  │  │  ...       │          │          │        │         │ │
│              │  └──┴────────────┴──────────┴──────────┴────────┴─────────┘ │
│              │                                                              │
│              │  Showing 1–20 of 54   [< Prev]  1  2  3  [Next >]           │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## Asset Detail Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Assets                                                            │
│                                                                             │
│  AC-LAB-001 — Split Air Conditioner                        [Edit] [Delete]  │
│                                                                             │
│  ┌─────────────────────────────┐  ┌──────────────────────────────────────┐ │
│  │                             │  │  Details                             │ │
│  │    [Asset Photo]            │  │  Category:    HVAC                   │ │
│  │                             │  │  Location:    Block B → Floor 2 →   │ │
│  │                             │  │               Lab 204               │ │
│  │                             │  │  Manufacturer: Daikin                │ │
│  │                             │  │  Serial No:   DK-2024-XYZ123        │ │
│  └─────────────────────────────┘  │  Purchase Date: 2024-03-15          │ │
│                                   │  Warranty Exp: 2027-03-14           │ │
│  ┌─────────────────────────────┐  │  Status:      🟢 Active             │ │
│  │    [QR Code Image]          │  └──────────────────────────────────────┘ │
│  │    Scan to open this page   │                                           │
│  │    [Download QR Code]       │  [🔧 Raise Maintenance Request]           │
│  └─────────────────────────────┘                                           │
│                                                                             │
│  ── Recent Work Orders ───────────────────────────────────────────────────  │
│  WO-2024-089  AC not cooling     High   Completed   2024-10-15             │
│  WO-2024-055  Routine PM check   Low    Closed      2024-09-01             │
│                                                                             │
│  ── PM Schedules ─────────────────────────────────────────────────────────  │
│  Monthly AC Service  Every 30 days  Next: 2024-12-01  🟢 Active            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Notes (FR-02, FR-04):**
- Asset code is auto-generated on creation (`{CATEGORY_PREFIX}-{LOCATION_CODE}-{SEQ}`).
- QR code links to `{APP_BASE_URL}/assets/{id}` — readable by any QR scanner.
- Status badge colour: 🟢 Active, 🟡 Under Maintenance, 🔴 Retired.
- "Raise Maintenance Request" button pre-fills the request form with this asset.
