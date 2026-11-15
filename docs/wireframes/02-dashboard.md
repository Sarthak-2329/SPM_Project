# Wireframe: Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ☰  CAMPUS CMMS    🔔(3)   👤 Admin User ▾                                  │  ← Top Nav
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │  Dashboard                               📅 Last 30 days ▾   │
│  📊 Dashboard│                                                              │
│  🏗 Assets   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  📋 Requests │  │  OPEN WOs  │ │ OVERDUE WOs│ │ COMPLETED  │ │  PM DUE   │ │
│  🔧 Work     │  │            │ │            │ │   TODAY    │ │  THIS WEEK│ │
│     Orders   │  │    24  🔵  │ │    7   🔴  │ │   12   🟢  │ │   5   🟡  │ │
│  📅 PM       │  └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
│  📦 Inventory│                                                              │
│  📊 Reports  │  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│  📋 Audit Log│  │  Work Orders by Priority  │  │   WO Status Distribution │ │
│              │  │                           │  │                          │ │
│  ─────────── │  │  🔴 Critical  ████  8     │  │   ◉ Open      40%        │ │
│  👤 My Profile│ │  🟠 High      ███   12    │  │   ◉ In Prog   25%        │ │
│  🚪 Logout   │  │  🟡 Medium    █     6     │  │   ◉ On Hold   10%        │ │
│              │  │  🟢 Low       █     4     │  │   ◉ Completed 25%        │ │
│              │  └──────────────────────────┘  └──────────────────────────┘ │
│              │                                                              │
│              │  ┌──────────────────────────┐  ┌──────────────────────────┐ │
│              │  │  Technician Workload      │  │   WOs Over Last 30 Days  │ │
│              │  │                           │  │   (line chart)           │ │
│              │  │  Raj Kumar      ████  8   │  │                          │ │
│              │  │  Priya Sharma   ███   6   │  │      ╱╲    ╱╲            │ │
│              │  │  Amit Singh     █     3   │  │   ─╱──  ╲╱  ──           │ │
│              │  │                           │  │                          │ │
│              │  └──────────────────────────┘  └──────────────────────────┘ │
│              │                                                              │
│              │  ┌──────────────────────────────────────────────────────┐   │
│              │  │  PM Compliance (This Month)        ████████░░  78%   │   │
│              │  └──────────────────────────────────────────────────────┘   │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

**Notes (FR-11):**
- Stat cards link to filtered WO list when clicked.
- All charts use Recharts: BarChart (priority), PieChart (status), LineChart (trend).
- PM Compliance = completed-on-time PM WOs / total PM WOs due × 100%.
- Sidebar collapses to icon-only on mobile.
