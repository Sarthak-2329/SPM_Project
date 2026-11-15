# 15 — Analytics Dashboard & Report Generation Sequence Diagram

This sequence diagram depicts the chronological interaction between the Client (Browser), API Controllers, Business Logic Services, PostgreSQL Database, and Document Exporters (`pdfkit` and `csv-stringify`) during executive reporting and data analytics queries (FR-11, FR-12).

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Facilities Admin / User
    participant Router as Express API Router
    participant Service as DashboardService / ReportService
    participant DB as PostgreSQL (Prisma ORM)
    participant Exporter as Document Exporter (pdfkit / csv-stringify)

    %% Flow A: Analytics Dashboard Aggregation
    rect rgb(240, 248, 255)
        note over Admin,DB: FLOW A: Executive Analytics Dashboard (FR-11)
        Admin->>Router: GET /api/dashboard
        activate Router
        Router->>Service: getDashboardMetrics(user)
        activate Service

        par KPI Counts & Work Orders
            Service->>DB: count(assets, workOrders, overdue, lowStock)
            DB-->>Service: KPI totals
        and Distributions & Monthly Trends
            Service->>DB: findMany(workOrders: status, priority, actualCost, createdAt)
            DB-->>Service: Array of Work Orders
        and Top Cost Driver Assets
            Service->>DB: groupBy(workOrders by assetId, sum(actualCost), count)
            DB-->>Service: Top 10 Cost Records
        and Technician Workload
            Service->>DB: findMany(users role=TECHNICIAN with active WOs)
            DB-->>Service: Technicians with assignments
        end

        Service-->>Service: Compute PM Compliance % and aggregate monthly buckets
        Service-->>Router: { kpis, priorityDistribution, monthlyTrend, topAssetsByCost, technicianWorkload }
        deactivate Service
        Router-->>Admin: 200 OK (Render Recharts Bar & Pie Charts)
        deactivate Router
    end

    %% Flow B: Report Export (CSV / PDF)
    rect rgb(255, 250, 240)
        note over Admin,Exporter: FLOW B: Filtered Report Export (FR-12)
        Admin->>Router: GET /api/reports/export/pdf?type=WORK_ORDERS&status=OPEN
        activate Router
        Router->>Service: exportPdf(type, filters)
        activate Service

        Service->>DB: findMany(workOrders with relations matching filters)
        DB-->>Service: Matched Records

        Service->>Exporter: Initialize PDFDocument (pdfkit), layout tables, page numbering & headers
        activate Exporter
        Exporter-->>Service: Binary PDF Stream Buffer (%PDF-1.3)
        deactivate Exporter

        Service-->>Router: Buffer
        deactivate Service
        Router-->>Admin: 200 OK (Content-Type: application/pdf, Content-Disposition: attachment)
        deactivate Router
    end
```

---

### Plain-English Viva Walkthrough (5–10 Lines)
1. **Parallel Aggregations:** When an administrator opens the dashboard, `DashboardService` executes parallel database queries (`Promise.all`) covering asset counts, overdue work orders, low stock items, and historical cost groups.
2. **In-Memory Transformation:** Raw database counts are converted into structured formats matching **Recharts** chart requirements: donut charts for priority distribution and stacked bar charts for monthly trends.
3. **Role Awareness:** If accessed by a technician, the service aggregates personal workload and urgent assignments; for a student or staff requester, it summarizes personal fault tickets.
4. **Data Export Pipeline:** When exporting reports, `ReportService` queries filtered records and pipes the dataset directly into `csv-stringify` for tabular spreadsheets or `pdfkit` for styled executive documents.
5. **Direct Binary Streaming:** PDF documents are compiled in memory with headers, alternating row fills, and totals, then streamed with `Content-Type: application/pdf` for immediate browser download.
