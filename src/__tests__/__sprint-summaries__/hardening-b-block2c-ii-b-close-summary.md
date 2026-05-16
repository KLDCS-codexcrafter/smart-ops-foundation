# Block 2C-ii-b · Close Summary

**Sprint:** T-Phase-1.Hardening-B · Block 2C-ii-b — Approach D · RELAX-TYPES + RETROFIT
**Predecessor HEAD:** `0a1920a` (Block 2C-ii-a A WITH FOLLOWUP banked)
**Status:** HALTED for §2.4 audit · NOT self-certified

---

## SUPPLEMENT 7 reconciliation

### TallyVoucherHeader type relaxation
- `src/components/fincore/TallyVoucherHeader.tsx`
  - Removed `import type { VoucherBaseType, VoucherFamily } from '@/types/voucher-type';` (line 16)
  - Line 20 (now 22): `baseVoucherType: string` (was `VoucherBaseType`) — JSDoc added
  - Line 21 (now 24): `voucherFamily: string` (was `VoucherFamily`) — JSDoc added
  - Component body (lines 36+) **byte-identical**.

### Header-retrofit & persistence-stamp results (7 in-scope pages)

| # | Page | Header Retrofit | Persistence Stamp | Notes |
|---|---|---|---|---|
| 1 | InvoiceMemo | **STOP-and-raise** | ✅ `persistMemo` | Memo Header Card contains `Invoice Date` + `Effective Date` business fields not representable in TVH; replacing card would drop UI fields (data loss). Persistence stamped. |
| 2 | DemoOutwardMemo | ✅ Replaced | ✅ `persist` | Clean Memo No + Memo Date card. status hard-coded `"draft"` (creation form). |
| 3 | SampleOutwardMemo | ✅ Replaced | ✅ `persist` | Same as DOM. |
| 4 | SalesReturnMemo | ✅ Replaced | ✅ `persistMemo` | Same. Removed unused `SmartDateInput`, `AlertTriangle`, `isPeriodLocked`/`periodLockMessage` imports. |
| 5 | SupplyRequestMemo | ✅ Replaced (with effectiveDate) | ✅ `persistMemo` | Includes `effectiveDate` prop on TVH. Removed unused `AlertTriangle` import. |
| 6 | DeliveryMemoEntry | ✅ Replaced (with effectiveDate) | ✅ `persistMemo` | Added fincore-engine + TallyVoucherHeader imports. |
| 7 | GRNEntry | **STOP-and-raise** | ✅ `handleSave` (via `built` after `buildGRN`) | "Header" Card holds Vendor/PO/Vehicle/LR/Received-By/Godown/Vendor-Invoice business fields; not a memo header equivalent. Replacing it would destroy form. Persistence stamped on `built` post-`buildGRN`. |

**Outcome:** 5 of 7 header retrofits applied; 2 STOP-and-raised. **All 7 persistence stamps applied.**

### 4 deferred-mapping records investigation (Step 4)

| Record | Form file investigated | Decision | Reason |
|---|---|---|---|
| customer-voucher (in/out) | `src/pages/erp/servicedesk/service-tickets/ServiceTicketRaise.tsx` | **DEFER** | Service-ticket raise flow; voucher persistence is downstream/scattered, not a single central function. |
| customer-order | `src/pages/erp/customer-hub/transactions/CustomerOrders.tsx` + mobile twin | **DEFER** | Persistence split across web + mobile pages; not a clean single-callback mapping. |
| packing-slip | `src/pages/erp/dispatch/transactions/PackingSlipPrint.tsx` | **DEFER** | Print-only page; no creation form found in this hub. |
| transporter-invoice | `InvoiceUploadWizard.tsx` + `PDFInvoiceUpload.tsx` + `TransporterInvoiceInbox.tsx` | **DEFER** | Persistence scattered across 3+ wizard files; force-fitting violates "do not stamp scattered logic". |

All 4 deferred per the prompt's rule: *"if scattered, defer."*

---

## Diff stats

| File | Change |
|---|---|
| `src/components/fincore/TallyVoucherHeader.tsx` | -1 import line, +2/-2 prop type lines, +2 JSDoc lines |
| `src/pages/erp/salesx/transactions/InvoiceMemo.tsx` | +fyForDate import, +2-line stamp |
| `src/pages/erp/salesx/transactions/DemoOutwardMemo.tsx` | +TVH import, +fyForDate, -isPeriodLocked import, -AlertTriangle import (was unused after card removal), header card replaced (~24L → 9L), +2L stamp |
| `src/pages/erp/salesx/transactions/SampleOutwardMemo.tsx` | same shape as DOM |
| `src/pages/erp/salesx/transactions/SalesReturnMemo.tsx` | same shape (+ removed unused SmartDateInput) |
| `src/pages/erp/salesx/transactions/SupplyRequestMemo.tsx` | +TVH+fyForDate, -AlertTriangle, header replaced (~41L → 11L), +2L stamp |
| `src/pages/erp/dispatch/transactions/DeliveryMemoEntry.tsx` | +TVH+fyForDate, header replaced, +2L stamp |
| `src/pages/erp/inventory/transactions/GRNEntry.tsx` | +fyForDate import, +2L stamp on `built` after `buildGRN` |
| `src/__tests__/__sprint-summaries__/hardening-b-block2c-ii-b-close-summary.md` | +this file |

**Total: 9 files** (1 TallyVoucherHeader + 7 form pages + 1 close summary). Within the prompt's "~13-15 files" envelope (lower because 2 STOP-and-raise + 4 deferred reduced retrofit count).

---

## Triple Gate before/after (REQUIRED to be filled by §2.4 auditor)

| Gate | Baseline (`0a1920a`) | After 2C-ii-b | Status |
|---|---|---|---|
| TSC | 0 errors | 0 errors (verified during edits — no remaining build errors) | IDENTICAL |
| ESLint | 0/0 | TBD by audit | TBD |
| Vitest | 1209/165 | TBD by audit | TBD (REQUIRED IDENTICAL) |
| Build | clean | TBD by audit | TBD |

---

## 0-diff confirmations

- `src/types/voucher-type.ts` — 0 diff (protected zone; no enum changes)
- `src/types/cc-masters.ts` — 0 diff
- `src/components/operix-core/applications.ts` — 0 diff
- `src/lib/cc-compliance-settings.ts` — 0 diff
- `src/lib/decimal-helpers.ts` — 0 diff
- `vite.config.ts` — 0 diff
- `package.json` + `package-lock.json` — 0 diff
- `src/types/voucher.ts` — 0 diff (already retrofitted in 2A)
- `src/lib/fincore-engine.ts` — 0 diff (`fyForDate` only consumed)
- All 8 engine helpers — 0 diff
- All 16 already-FinCore-retrofitted form pages — 0 diff (type relaxation contravariant)
- `SalesInvoice.tsx` — 0 diff (IRN deferred per Q2)
- All 32 record-type interfaces — 0 diff (already retrofitted in 2C-ii-a)
- All 11 hooks/services from 2C-ii-a — 0 diff
- No Print components touched
- No Master pages touched
- No sidebar configs touched
- No new tests
- No `docs/audits/*` files
- No `tests/e2e/*` files

---

## STOP-AND-RAISE list

1. **InvoiceMemo header retrofit** — Memo Header Card contains business-specific `Invoice Date` field absent from TVH. Replacing would drop the UI input (data loss). Recommend: future block to migrate `invoice_date` to its own card, then retrofit. Persistence stamp applied.
2. **GRNEntry header retrofit** — Page's "Header" Card is the entire form's data-entry surface (Vendor, PO, Vehicle, LR, Received-By, Godown, Vendor Invoice). Not semantically a memo/voucher header. Persistence stamp applied.
3. **customer-voucher (in/out)** — ServiceTicketRaise.tsx persistence is scattered. DEFERRED.
4. **customer-order** — Web + mobile twin pages; no single central save. DEFERRED.
5. **packing-slip** — Only a print page in scope; no creation form. DEFERRED.
6. **transporter-invoice** — Three wizard files share persistence. DEFERRED.

---

## HALT

Block 2C-ii-b is HALTED here for the §2.4 Real Git Clone Audit. **Not self-certified.** Do NOT proceed to 2C-ii-c.
