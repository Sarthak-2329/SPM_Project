# 10-Minute Click-by-Click Live Demo Script — Campus CMMS

This demo script provides an evaluator demonstration flow across the CMMS platform in under 10 minutes.

---

## Pre-Demo Setup Checklist (1 Minute Before Presentation)
1. **PostgreSQL running:** `docker ps` shows `cmms_postgres` up on port `5432`.
2. **Server running:** `cd server && npm run dev` (Listening on `http://localhost:3000`).
3. **Client running:** `cd client && npm run dev` (Listening on `http://localhost:5173`).
4. **Browser Ready:** Open `http://localhost:5173` in Google Chrome or Firefox.

---

## Demo Step 1: Requester Logs Fault Report via QR Code (2 Minutes)

- **Persona:** Student / Hostel Resident (`student.rahul@campus.edu` / `Campus@1234`).
- **Action:**
  1. Open `/login` and sign in as `student.rahul@campus.edu`.
  2. Navigate to **Asset Registry** (`/assets`).
  3. Search for `"Daikin"` or click on asset **`AST-HVAC-001` (Central Chiller Unit)**.
  4. Point out the **Printable QR Code** button: Click it to open the QR label view (`/assets/:id/qr`), demonstrating how a student scanning with a phone would be directed here.
  5. Click **"Raise Fault Request"**:
     - Title: *"Unusual vibrating sound and poor cooling in Room 204"*
     - Description: *"Compressor making rattling noise when activated."*
     - Priority: `HIGH`
     - Click **"Submit Maintenance Request"**.
  6. Navigate to **"Fault Requests"** (`/requests`) to show the ticket listed in `PENDING` state with a timestamp.
  7. Log out.
- **Viva Talking Point:** *"Requesters can self-register and quickly raise geolocated equipment tickets directly from QR tags on physical assets."*

---

## Demo Step 2: Facilities Admin Triages & Converts Request to Work Order (2 Minutes)

- **Persona:** Facilities Admin (`admin@campus.edu` / `Campus@1234`).
- **Action:**
  1. Sign in as `admin@campus.edu`.
  2. The system loads the **Executive Operations Dashboard** (`/dashboard`). Briefly note the live KPI counts.
  3. Navigate to **"Fault Requests"** (`/requests`).
  4. Find the newly submitted request at the top of the table.
  5. Click **"Review / Triage"** and select **"Approve & Create Work Order"**:
     - Priority: `HIGH`
     - Target Due Date: Pick a date next week.
     - Click **"Approve Request"**.
  6. The request status updates to `APPROVED`.
  7. Navigate to **"Work Orders"** (`/work-orders`) and show the newly created Work Order in state `OPEN`.
  8. Click on the Work Order to open its detail view (`/work-orders/:id`).
  9. In the Admin panel, click **"Assign Technician"** and select `Rajesh Verma (Senior HVAC Tech)`.
  10. Status changes to `ASSIGNED`, and an email notification is dispatched.
  11. Log out.
- **Viva Talking Point:** *"Converting a request to a work order runs inside an ACID database transaction, preventing duplicate tickets."*

---

## Demo Step 3: Technician Executes Job, Logs Labor, and Updates Status (2 Minutes)

- **Persona:** Senior HVAC Technician (`tech.raj@campus.edu` / `Campus@1234`).
- **Action:**
  1. Sign in as `tech.raj@campus.edu`.
  2. Point out the Technician Dashboard: displays active assigned tasks and urgent tickets.
  3. Navigate to **"Work Orders"** (`/work-orders`) and click on the assigned ticket.
  4. In the status action bar, click **"Start Work (IN_PROGRESS)"**:
     - Status updates to `IN_PROGRESS`.
  5. Scroll to **"Log Maintenance Labor Hours"**:
     - Enter `2.5` hours and click **"+ Add Hours"**.
  6. Scroll to **"Work Notes & Observations"**:
     - Enter: *"Diagnosed worn drive belt and loose mounting brackets. Tightening fasteners."*
     - Click **"Post Note"**.
- **Viva Talking Point:** *"Technicians can only update tickets assigned to them, and all progress is logged in an immutable status history audit log."*

---

## Demo Step 4: Spare Parts Consumption & Atomic Stock Deduction (1.5 Minutes)

- **Action (Continuing as Technician):**
  1. On the same Work Order Detail page, scroll to **"Spare Parts & Consumables Used"**.
  2. Select part: `[PRT-AC-FLT-01] High-Density AC Air Filter Mesh` (note displayed stock: 24).
  3. Set Quantity: `2` and click **"+ Consume Part"**:
     - Part appears in the table.
     - Remaining stock in dropdown decreases to `22`.
     - Point out the **Total Actual Cost** banner: updates to reflect `Parts Spend + (2.5 hrs × ₹250/hr)`.
  4. **Edge Case Verification:** Attempt to select a part with low stock (e.g. Capacitor, stock 4) and enter quantity `50`:
     - Click **"+ Consume Part"**.
     - System displays an error dialog: *"Insufficient stock. Available: 4, Requested: 50"*.
     - Point out that stock was preserved and never went negative.
  5. Click **"Complete Work (COMPLETED)"** to transition the ticket.
  6. Log out.
- **Viva Talking Point:** *"Part deductions run in a Prisma transaction that locks the record, snapshots historical unit cost, and rejects any request that would result in negative stock."*

---

## Demo Step 5: Automated PM Scheduler & Idempotency Live Trigger (1.5 Minutes)

- **Persona:** Facilities Admin (`admin@campus.edu` / `Campus@1234`).
- **Action:**
  1. Sign in as `admin@campus.edu`.
  2. Navigate to **"PM Schedules"** (`/pm-schedules`).
  3. Point out the schedule: *"Bi-Weekly Central AC Chiller & AHU Preventive Servicing"*, which has a pulsing **"Due Now"** badge.
  4. Click **"⚡ Run Scheduler Now"**:
     - Banner shows: *"PM Scheduler completed: 1 work order(s) generated."*
  5. Immediately click **"⚡ Run Scheduler Now"** a second time:
     - Banner shows: *"0 work orders generated. (All due schedules were already generated today - Idempotency confirmed!)"*
  6. Navigate to **"Work Orders"**: Show the newly generated PM ticket with all 6 checklist inspection tasks formatted in the description.
- **Viva Talking Point:** *"The scheduler enforces strict daily idempotency, preventing duplicate work orders even if cron or manual runs occur repeatedly."*

---

## Demo Step 6: Operations Dashboard & Filtered Report Exports (1 Minute)

- **Action (Continuing as Admin):**
  1. Navigate to **"Dashboard"** (`/dashboard`):
     - Show the **Priority Distribution Donut Chart** and hover over slices.
     - Show the **6-Month Maintenance Trend Bar Chart**.
     - Show the **Top Cost Driver Assets** ranking table.
  2. Navigate to **"Executive Reports"** (`/reports`):
     - Select **"Cost Analysis Report"**.
     - Click **"Download CSV"**: Opens clean spreadsheet in Excel/Sheets.
     - Click **"Download PDF"**: Opens styled document with institutional header, summary totals, and page numbering.
- **Closing Statement:** *"This completes our end-to-end demonstration of the Campus CMMS platform, covering fault triage, work order lifecycles, preventive scheduling, inventory protection, and analytics."*
