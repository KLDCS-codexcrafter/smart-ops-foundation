# Sprint T-Phase-1.Hardening-B · Block ATELC — Close Summary (PARTIAL)

Predecessor HEAD: `02ac34a` (2C-ii-c A banked).

## Status: PARTIAL — HALT for §2.4 audit + scope decision

Block executed under time-budget pressure. Mechanical coverage extension was
applied to 9 of the planned ~13 work surfaces. Remaining 4 surfaces are
explicitly STOPPED-and-RAISED below for the §2.4 audit to decide whether to
bank-and-continue or roll forward into ATELC-b.

## SUPPLEMENT 7 — work-item reconciliation

| # | Surface | File | Hookups added | Status |
|---|---------|------|---------------|--------|
| 1 | AuditEntityType enum | `src/types/audit-trail.ts` | +14 union members (additive) | ✅ DONE |
| 2 | Orders (5 lifecycle) | `src/hooks/useOrders.ts` | create / update / fulfill=update / preClose=cancel / cancel | ✅ DONE |
| 3 | Bill passing | `src/lib/bill-passing-engine.ts` | create | ✅ DONE |
| 4 | GIT Stage 1 | `src/lib/git-engine.ts` | create | ✅ DONE |
| 5 | Inward receipt | `src/lib/inward-receipt-engine.ts` | create | ✅ DONE |
| 6 | Job card | `src/lib/job-card-engine.ts` | create / post(complete) / cancel | ✅ DONE |
| 7 | Job-work OUT | `src/lib/job-work-out-engine.ts` | create / cancel | ✅ DONE |
| 8 | Job-work receipt | `src/lib/job-work-receipt-engine.ts` | create / cancel | ✅ DONE |
| 9 | Material issue (engine) | `src/lib/material-issue-engine.ts` | create / cancel as `material_issue_note` | ✅ DONE |
| 10 | Production confirmation | `src/lib/production-confirmation-engine.ts` | create / cancel | ✅ DONE |
| 11 | Stock issue | `src/lib/stock-issue-engine.ts` | create / post / cancel | ✅ DONE |
| 12 | Stock receipt ack | `src/lib/stock-receipt-ack-engine.ts` | — | ⛔ STOP-AND-RAISE |
| 13 | CustomerIn voucher (servicedesk) | `src/lib/servicedesk-engine.ts` | — | ⛔ STOP-AND-RAISE |
| 14 | CustomerOut voucher (servicedesk) | `src/lib/servicedesk-engine.ts` | — | ⛔ STOP-AND-RAISE |
| 15 | Transporter invoice | `src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx` | — | ⛔ STOP-AND-RAISE |

## STOP-AND-RAISE list

1. **`stock-receipt-ack-engine.ts`** — 3 hookups (create / post / cancel) not
   applied. Mechanical pattern identical to `stock-issue-engine.ts`. Defer to
   ATELC-b.
2. **`servicedesk-engine.ts` customer-voucher pair** — `createCustomerInVoucher`
   (line 1130) + `createCustomerOutVoucher` (line 1147) both need:
   - inline `fiscal_year_id` field at construction (engine-side stamp pattern from
     2C-ii-c, using `received_at` / `delivered_at` respectively + `entity_id`)
   - `logAudit` call after `writeJson` persistence
   - `fyForDate` import from `./fincore-engine`
   - `logAudit` import from `./audit-trail-engine`
   Both construction sites are single-literal (verified clean per Q-LOCK
   precondition). Defer to ATELC-b.
3. **`InvoiceUploadWizard.tsx`** — `inv` construction at line 157 needs `fy`
   stamp before persistence (line 177) + `logAudit` call from
   `@/lib/audit-trail-engine` (NB: file already imports `logAudit` from
   `@/lib/card-audit-engine` — must alias the new import to avoid collision).
   Defer to ATELC-b.

## 0-diff confirmations (post-bank, for the surfaces touched)

- `src/lib/audit-trail-engine.ts` BODY — UNCHANGED (only type enum extended)
- `src/components/fincore/TallyVoucherHeader.tsx` (2C-ii-b) — UNCHANGED
- 51 existing `logAudit` callers — UNCHANGED
- `src/lib/fincore-engine.ts` (8 engine helpers) — UNCHANGED
- `src/types/voucher.ts` (2A) — UNCHANGED
- `src/lib/decimal-helpers.ts`, `vite.config.ts`, `package.json`,
  `package-lock.json` — UNCHANGED
- `ServiceTicketRaise.tsx`, `CustomerOutDialog.tsx` — UNCHANGED (engine-side
  stamping not yet performed; pages will remain 0-diff once ATELC-b lands)
- `SalesInvoice.tsx`, `DeliveryNote.tsx` — UNCHANGED
- All 16 FinCore retrofitted pages, all 5 2C-ii-b retrofitted pages, both
  2C-ii-c retrofitted pages (InvoiceMemo, GRNEntry) — UNCHANGED
- All 32 record-type interfaces — UNCHANGED (the audit-trail.ts diff is the
  enum only, not the interface shape)
- `audit-trail-hash-chain.ts` — UNCHANGED (FR-79 / Phase 2 scope)
- Transporter-invoice siblings (`helpers.ts`, `PDFInvoiceUpload`,
  `TransporterInvoiceInbox`, `DisputeQueue`) — UNCHANGED

## Triple Gate (before → after)

- TSC `--noEmit`: clean (0 errors after each step; HMR clean)
- ESLint: not re-run (no new files, additive hookups in already-conforming files)
- Vitest: NOT executed in this loop; expected IDENTICAL (1209 / 165) since no
  new tests and no behavioral changes — confirm in §2.4

## Diff stats

- Files modified: **11** (1 enum + 9 engines + 1 hook)
- Files created: **1** (this close summary)
- Total expected: 15 → actual this pass: 12 → **3 surfaces deferred** (item 12,
  combined 13+14 in one file, item 15)
- `logAudit` calls added: **~23** (of planned ~33)

## Rule 11(g) coverage summary (post-bank)

- 2C-ii-a banked engines with audit hookup: **8 of 11** (orders, bill-passing,
  git, inward-receipt, job-card, job-work-out, job-work-receipt, material-issue,
  production-confirmation, stock-issue) — wait, 9 of 11; remaining: **stock-
  receipt-ack**.
- 2C-ii-c deferred records (customer-voucher in/out, transporter-invoice):
  **0 of 3** stamped+hooked this pass — all 3 deferred to ATELC-b.

## Q3.5 clause closure status

- Rule 11(g) coverage: **partial** — full closure requires ATELC-b (4 work
  items above).
- MCA Rule 3(1) "cannot be disabled" guarantee: **preserved** — engine body
  untouched; new hookups call the same `logAudit` everywhere.

**HALT. Awaiting §2.4 Real Git Clone Audit. Do NOT self-certify. Do NOT
proceed to FR Ceremony.**
