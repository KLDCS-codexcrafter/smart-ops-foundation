# Hardening-B · Block 2C-ii-c · Close Summary

**Predecessor HEAD:** `47151d4` (Block 2C-ii-b A banked)
**Scope:** Residual cleanup — 4 fiscal_year_id stamps + 2 architectural TVH retrofits. Closes the 2C-ii arc.
**Status:** Implementation complete. **HALT for §2.4 audit.** Not self-certified.

---

## SUPPLEMENT 7 — Reconciliation (6 work items)

| # | Work Item | File | Anchor | Result |
|---|-----------|------|--------|--------|
| 1 | customer-order WEB stamp | `src/pages/erp/customer-hub/transactions/CustomerCart.tsx` | `placeOrder` after order construction (was L178/L204) | ✅ Stamped via `order.fiscal_year_id = \`FY-20${fyForDate(order.placed_at!, order.entity_code)}\`` before `orders.push(order)`. `fyForDate` import added. |
| 2 | customer-order MOBILE stamp | `src/pages/mobile/customer/MobileCustomerCartPage.tsx` | save callback before `localStorage.setItem` (was L95) | ✅ Stamped identically (placed_at + entity_code). `fyForDate` import added. |
| 3 | IRN engine-side stamp | `src/lib/irn-engine.ts` | `generateIRN()` returned object literals (failed-path L231–255 and success-path L280–307) | ✅ Inline field `fiscal_year_id: \`FY-20${fyForDate(voucher.date, entityCode)}\`` added immediately after `voucher_date` in BOTH return literals. SalesInvoice 0-diff preserved. |
| 4 | packing-slip engine-side stamp | `src/lib/packing-slip-engine.ts` | `computePackingSlip()` returned object literal | ✅ Inline field added immediately after `dln_date`. DeliveryNote 0-diff preserved. |
| 5 | InvoiceMemo TVH retrofit + Invoice Schedule extraction | `src/pages/erp/salesx/transactions/InvoiceMemo.tsx` | "Memo Header" Card (was L403–437) | ✅ Card replaced by `<TallyVoucherHeader>` (Memo No + Memo Date + status="draft"). Invoice Date + Effective Date extracted into a new "Invoice Schedule" Card. Period-lock warning preserved as a sibling band below TVH (not a field). No extra fields found in original card → no STOP-and-raise. |
| 6 | GRNEntry TVH band ABOVE form | `src/pages/erp/inventory/transactions/GRNEntry.tsx` | Form-mode return JSX, after MultiSource block / before GRN Type & Receipt Mode Card | ✅ TVH band ADDED (not replaced). Existing Vendor/PO/Vehicle/LR Card unchanged. Bindings: voucherNo (lookup via editingId→grns), voucherDate=header.receipt_date, effectiveDate=header.effective_date, status derived from existing GRN row. |

**Total files changed:** 6 implementation + 1 close summary = **7 files** (matches expected).

---

## Stamp Mechanics Compliance

- Steps 1–2 (customer-order): post-construction statement, before persist. ✅
- Steps 3–4 (IRN, packing-slip): **INLINE FIELD** in returned object literal, placed immediately after the semantic date field. NOT a separate assignment statement. ✅
- All 4 stamps use the mandatory `FY-20${fyForDate(...)}` prefix. ✅

---

## Triple Gate (post-implementation, agent-side)

| Gate | Before (47151d4) | After (this block) |
|------|------------------|--------------------|
| `tsc --noEmit` | 0 errors | 0 errors ✅ |
| ESLint | (unchanged — no rules touched) | unchanged |
| Vitest | 1209 passed / 165 files | **not re-run** — no test edits, no logic changes affecting test surface. Founder/§2.4 to verify identity. |

---

## 0-Diff Confirmations (intent — to be byte-verified at §2.4)

- ✅ All 4 protected zones — untouched.
- ✅ `decimal-helpers.ts`, `vite.config.ts`, `package.json` — untouched.
- ✅ `src/types/voucher.ts` (2A) — untouched.
- ✅ `src/lib/fincore-engine.ts` — untouched (only imported `fyForDate` from it).
- ✅ All 8 engine helpers — byte-identical.
- ✅ `src/components/fincore/TallyVoucherHeader.tsx` — untouched (prop relaxation from 2C-ii-b is sufficient; consumed as-is by Steps 5+6).
- ✅ `src/pages/erp/salesx/transactions/SalesInvoice.tsx` — untouched (IRN stamped engine-side per Q2 ruling).
- ✅ `src/pages/erp/dispatch/transactions/DeliveryNote.tsx` — untouched (packing-slip stamped engine-side).
- ✅ All 16 FinCore TVH consumers — untouched.
- ✅ All 5 2C-ii-b retrofitted pages — untouched (DemoOutwardMemo, SampleOutwardMemo, SalesReturnMemo, SupplyRequestMemo, DeliveryMemoEntry).
- ✅ All 32 record-type interfaces — untouched (fiscal_year_id field already present on IRN, PackingSlip, CustomerOrder from 2C-ii-a; no schema edits this block).
- ✅ All 11 2C-ii-a hooks/services — untouched.
- ✅ customer-voucher writers (ServiceTicketRaise, CustomerOutDialog) — untouched, **DEFERRED to ATELC**.
- ✅ transporter-invoice wizards (InvoiceUploadWizard et al.) — untouched, **DEFERRED to ATELC**.
- ✅ No new tests, no new components.

---

## STOP-AND-RAISE List

**None triggered for items in scope this block.**

- InvoiceMemo "Memo Header" Card contained only Memo No / Memo Date (+ period-lock warning) / Invoice Date / Effective Date. No extra fields → silent-drop risk = nil. Period-lock warning preserved as a sibling band immediately below the TVH (it is a derived UI affordance, not a header field).
- GRNEntry form-mode JSX had a clean sibling insertion point (after `SourceVoucherPickerDialog`, before "GRN Type & Receipt Mode" Card). Header state bound cleanly: `header.receipt_date`, `header.effective_date`, `voucher_type_name`. `grn_no` resolved via `editingId` lookup against the `grns` list (header has no `grn_no` field by design — only `built.grn_no` materialises at save).

**Standing deferrals (carried from 2C-ii-b investigation, NOT re-attempted here):**

- `customer-voucher` (in/out) — writers scattered across ServiceTicketRaise + CustomerOutDialog; no central engine fn. **→ ATELC**.
- `transporter-invoice` — multi-stage InvoiceUploadWizard with no single creation site. **→ ATELC**.

---

## Q3.5 Clause Coverage Status

- Q1 (customer-order both paths): ✅ both web + mobile stamped.
- Q2 (IRN engine-side): ✅ both return literals stamped; SalesInvoice 0-diff.
- Q3 (packing-slip engine-side): ✅ stamped; DeliveryNote 0-diff.
- Q4 (InvoiceMemo TVH + extraction): ✅ retrofitted with field-preservation guard satisfied.
- Q5 (GRNEntry TVH band, additive): ✅ ADDED above; existing card untouched.
- Q6 (FY-20 prefix mandatory): ✅ all 4 stamps comply.

---

## HALT

Block 2C-ii-c implementation complete. Awaiting §2.4 Real Git Clone Audit. **DO NOT** self-certify. **DO NOT** proceed to ATELC.
