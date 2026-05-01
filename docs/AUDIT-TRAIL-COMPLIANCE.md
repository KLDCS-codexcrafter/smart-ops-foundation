# Audit Trail Compliance · Operix ERP

Sprint T-Phase-1.2.5h-b1 · Card #2.5

## Regulatory Coverage

### MCA Rule 3(1) of Companies (Accounts) Rules, 2014
- Effective: 1 April 2023
- Applies to: every company registered under Companies Act 2013 using accounting software
- Requirement: audit trail of each and every transaction; edit log of every change with date and time; cannot be disabled
- Auditor reporting: Rule 11(g) of Companies (Audit and Auditors) Rules, 2014

### CGST Rule 56 (Maintenance of Accounts)
- Rule 56(8): records "shall not be erased, effaced or overwritten" — for electronic records, "log of every entry edited or deleted" must be maintained
- Rule 56(12): manufacturers must maintain monthly production accounts (raw materials + goods manufactured + waste/by-products)
- Rule 56(15): electronic records must be authenticated by digital signature (Phase 2 backend)

### Retention
- Section 128(5) Companies Act: 8 years minimum
- Section 36 CGST Act: 72 months from due date of annual return
- Phase 1: localStorage holds last ~5,000 entries hot; CSV export tool for offline archival
- Phase 2: backend retention with proper archival / Glacier tiering

## How Operix Implements

### Audit Trail Engine (`src/lib/audit-trail-engine.ts`)
- Append-only writer; no edit / delete / disable API
- Every voucher post + cancel triggers `logAudit()`
- Every 1.2.x transaction (MIN, CE, CycleCount) triggers logAudit
- Every master CRUD (employees, voucher types) triggers logAudit
- Captures: timestamp (ISO 8601 to second), user, role, action, entity type, record ID, before-state, after-state, reason, source module

### Edit/Delete Protection
- Soft-delete only via `is_cancelled` flag (existing pattern from 1.2.x)
- Posted records gain `superseded_by` chain when edited (new version inserted; original retained with link)
- Hard delete blocked at hook layer

### Reports
- Audit Trail Report (`/erp/finecore/reports/audit-trail`): filterable, drill-in JSON diff, CSV export
- Monthly Production Accounts (`/erp/finecore/reports/monthly-production-accounts`): CGST 56(12) compliance, manufacturer-auto-detect

### Phase 1 Limitations (acknowledged)
- localStorage cap (~5MB) means audit trail must be exported quarterly to remain comfortable
- Phase 2 backend (planned 1.4.x) takes over persistence with proper retention policy
- Digital signature (Rule 56(15)) is Phase 2
- "Cannot be disabled" is enforced by hardcoded engine calls; there is no admin toggle

## Auditor Walkthrough

When a statutory auditor or GST officer requests audit trail:
1. Open `/erp/finecore/reports/audit-trail`
2. Apply date range filter for the year under audit
3. Click "Export CSV"
4. Hand over the CSV; it contains every transaction's audit chain
5. For specific record investigations, filter by record label / ID and use the drill-in diff viewer

## Going Forward
- Each new module added to Operix MUST instrument its mutations with `logAudit()`
- This is enforced by code review; a lint rule will be added in 1.2.5h-c
