# Maintenance Request Lifecycle Activity Diagram — Campus CMMS

## Title
**ACT-11: Activity Diagram with Actor Swimlanes for Maintenance Request & Work Order Lifecycle**

---

## Diagram

```mermaid
flowchart TD
    %% ─── Swimlanes ────────────────────────────────────────────────────────────
    subgraph REQ ["🎓 Requester (Student / Staff)"]
        A1([Start: Equipment Fault Observed])
        A2[Scan Asset QR Code OR Select Location]
        A3[Fill Fault Description & Priority]
        A4[Upload Optional Fault Photo]
        A5[Submit Maintenance Request]
        A6[Track Status on 'My Requests']
        A7([End: Notification of Resolution])
    end

    subgraph ADM ["👤 Facilities Administrator"]
        B1[Receive In-App Notification of New Ticket]
        B2[Inspect Request in Pending Queue]
        B3{Evaluate Validity}
        B4[Decline Request with Mandatory Reason]
        B5[Approve Ticket & Assign Maintenance Tech]
        B6[Inspect Finished Equipment on Site]
        B7{Quality Check Passed?}
        B8[Reopen to IN_PROGRESS with Rejection Note]
        B9[Verify Final Costs & Close Work Order]
    end

    subgraph SYS ["⚙️ CMMS System & Database ($transaction)"]
        C1[(Store Maintenance Request as PENDING)]
        C2[(Mark Request REJECTED & Write Audit Trail)]
        C3[(Atomic Transaction:\n1. Set Request = APPROVED\n2. Create Work Order\n3. Record Initial Status History)]
        C4[Send Email & In-App Alerts to Technician]
        C5[Verify State Machine Constraints]
        C6[(Record WorkOrderStatusHistory)]
        C7[(Mark Work Order CLOSED - Terminal State)]
    end

    subgraph TCH ["👷 Assigned Maintenance Technician"]
        D1[Receive Assignment Notification & Email]
        D2[Acknowledge Ticket & Move to IN_PROGRESS]
        D3[Perform On-Site Inspection & Diagnostic]
        D4{Parts / Access Available?}
        D5[Transition to ON_HOLD with Required Reason]
        D6[Procure Parts / Wait for Access]
        D7[Resume Work: Move to IN_PROGRESS]
        D8[Replace Parts & Complete Maintenance]
        D9[Log Technician Labor Hours & Field Notes]
        D10[Mark Work Order COMPLETED]
    end

    %% ─── Flow Connections ──────────────────────────────────────────────────────
    A1 --> A2 --> A3 --> A4 --> A5 --> C1
    C1 --> B1 --> B2 --> B3

    B3 -- "Invalid / Duplicate" --> B4 --> C2 --> A6
    B3 -- "Legitimate Fault" --> B5 --> C3
    
    C3 --> C4 --> D1
    C3 --> A6

    D1 --> D2 --> C5 --> C6 --> D3 --> D4
    D4 -- "No / Blocked" --> D5 --> C5 --> C6 --> D6 --> D7 --> D3
    D4 -- "Yes" --> D8 --> D9 --> D10 --> C5 --> C6 --> B6

    B6 --> B7
    B7 -- "Defect Found" --> B8 --> C5 --> C6 --> D3
    B7 -- "Satisfactory" --> B9 --> C7 --> A7
```

---

## Plain-English Walkthrough (Viva Notes)

This activity diagram utilizes **four distinct swimlanes** (`Requester`, `Admin`, `System`, `Technician`) to illustrate concurrency, decision gates, and role boundaries:

1. **Requester Swimlane:** The requester initiates the journey by scanning a physical QR sticker or selecting a room, specifying priority and description, and submitting the request. They observe status updates asynchronously.
2. **Admin Review Gate:** The administrator evaluates the pending ticket. If rejected, a reason is documented, the ticket terminates, and the requester is notified. If approved, the system takes over.
3. **System Transaction Swimlane:** The system performs transactional conversion—guaranteeing that exactly one work order is spawned and the initial status history is appended. The system automatically dispatches email and in-app alerts to the designated technician.
4. **Technician Workflow & Exception Handling:** The technician acknowledges the ticket, transitioning it to `IN_PROGRESS`. If parts or access are missing, the technician can trigger an `ON_HOLD` sub-loop with a mandatory reason. Once resolved, the technician logs labour time and notes and submits the work as `COMPLETED`.
5. **Quality Verification Gate:** The administrator inspects the repaired equipment. If quality standards are unmet, the administrator can reopen the work order back to `IN_PROGRESS`. If verified, the administrator executes the final transition to `CLOSED`, concluding the lifecycle.
