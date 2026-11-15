# Wireframe: Login Page

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAMPUS CMMS                              │
│                 Maintenance Management System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                   ┌───────────────────────┐                     │
│                   │      🔧 CMMS Logo     │                     │
│                   └───────────────────────┘                     │
│                                                                 │
│               Sign in to your account                           │
│                                                                 │
│          Email Address                                          │
│          ┌─────────────────────────────────────┐               │
│          │ email@campus.edu                    │               │
│          └─────────────────────────────────────┘               │
│                                                                 │
│          Password                                               │
│          ┌─────────────────────────────────────┐               │
│          │ ••••••••••••               👁        │               │
│          └─────────────────────────────────────┘               │
│                                                                 │
│          ┌─────────────────────────────────────┐               │
│          │           Sign In →                 │               │  ← Primary button (blue)
│          └─────────────────────────────────────┘               │
│                                                                 │
│          ⚠  Error: Invalid email or password.                   │  ← Error state (red)
│                                                                 │
│          © 2026 Campus Maintenance Management System            │
└─────────────────────────────────────────────────────────────────┘
```

**Notes:**
- No public registration — Admins create accounts for Technicians.
- Requesters (students/staff) can self-register (FR-01).
- Form validates client-side before submit.
- On success → redirect to role-specific dashboard.

**Responsive:** Centred card on desktop; full-width on mobile.
