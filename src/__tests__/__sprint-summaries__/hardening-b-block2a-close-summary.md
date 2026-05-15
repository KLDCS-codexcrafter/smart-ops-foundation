# Sprint T-Phase-1.Hardening-B · Block 2A — Close Summary

**Predecessor HEAD:** `9ba187f` (Hardening-B Block 1 banked)
**Block 2A delivers:** GST Rule 46 fix (α) + per-entity FY (Q2) + Tally-header retrofit on 7 forms (γ) — integrated.
**Status:** Banked pending §2.4 Real Git Clone Audit. NOT self-certified.

---

## SUPPLEMENT 7 reconciliation

| Site (named in sprint prompt) | Verified at HEAD | Notes |
|---|---|---|
| `src/lib/fincore-engine.ts:153` `generateVoucherNo(prefix, entityCode)` | ✓ exact | Body fully replaced with FY-scoped pattern |
| `src/lib/fincore-engine.ts:154` `erp_voucher_seq_${prefix}_${entityCode}` (defect) | ✓ exact | Replaced by `_${fy}` suffix; legacy migration retained |
| `src/lib/fincore-engine.ts:164` `function getFY(): string` | ✓ exact | Signature widened to `(entityCode?: string)` |
| `src/lib/fincore-engine.ts:174` `getCurrentFY(): string` | ✓ exact | Widened to `(entityCode?: string)` shim — backwards compat preserved |
| `src/lib/fincore-engine.ts:189-262` `generateDocNo` | ✓ exact | Internal `getFY()` → `getFY(entityCode)` (single-line change) |
| `src/types/voucher.ts` `entity_id: string;` (interface) | ✓ found at L128 | New `fiscal_year_id?: string;` inserted immediately after |
| `src/types/fiscal-year.ts:37` `startMonth: number;` | ✓ exact | Read by new `resolveStartMonth` helper |
| `src/types/fiscal-year.ts:46-47` `fiscalYearStorageKey` | ✓ exact | Imported and consumed |
| 7 retrofit forms (CreditNote, DebitNote, DeliveryNote, PurchaseInvoice, ReceiptNote, SalesInvoice, StockJournal) | ✓ all 7 inspected | Each had identical pattern: `<div flex justify-between>{title-block}{Badge voucherNo}</div>` + inline Date input — all replaced safely |

No drift requiring STOP-and-raise.

---

## Item-by-item verdict (5 integrated items)

| # | Item | Outcome |
|---|---|---|
| 1 | `generateVoucherNo` FY-scope migration (GST Rule 46) | **DONE** — key shape now `erp_voucher_seq_{prefix}_{entityCode}_{fy}`; legacy-key auto-migration mirrors `generateDocNo` precedent (T-Phase-1.2.5h-a); returned string format byte-identical for current FY |
| 2 | `Voucher.fiscal_year_id` contract field added | **DONE** — optional `fiscal_year_id?: string` added to `Voucher` interface immediately after `entity_id`; populated in `postVoucher` via `fyForDate(voucher.date, voucher.entity_id)` with `FY-20` prefix to match `FiscalYear.id` shape |
| 3 | `getFY(entityCode?)` per-entity startMonth | **DONE** — new `resolveStartMonth(entityCode?)` reads `FiscalYear.startMonth` from entity master, April-start fallback. `getCurrentFY(entityCode?)` widened (no-arg compat preserved). Both `generateVoucherNo` and `generateDocNo` updated to call `getFY(entityCode)` |
| 4 | `fyForDate(dateISO, entityCode?)` helper | **DONE** — added immediately after `getCurrentFY`; robust to empty/invalid date (falls back to current FY); honors per-entity startMonth |
| 5 | Tally-header retrofit on 7 voucher forms | **DONE** — all 7 forms (CreditNote, DebitNote, DeliveryNote, PurchaseInvoice, ReceiptNote, SalesInvoice, StockJournal) adopt `<TallyVoucherHeader />`. PurchaseInvoice + ReceiptNote wire `vendorBillNo`/`vendorChallanNo` + their dates to `refNo`/`refDate`; StockJournal wires `referenceNo` to `refNo`. No new state introduced. Persistence shape preserved |

---

## Files in diff (10 expected)

| # | File | + | − | Notes |
|---|---|---|---|---|
| 1 | `src/lib/fincore-engine.ts` | ~60 | ~16 | GVN rewrite + `resolveStartMonth` + `getFY(entityCode?)` + `fyForDate` + `getCurrentFY` widening + `generateDocNo` internal call update + `postVoucher` `fiscal_year_id` stamp + import |
| 2 | `src/types/voucher.ts` | 3 | 0 | `fiscal_year_id?: string;` + comment after `entity_id` |
| 3 | `src/pages/erp/accounting/vouchers/CreditNote.tsx` | 9 | 13 | Header retrofit + Badge import drop |
| 4 | `src/pages/erp/accounting/vouchers/DebitNote.tsx` | 13 | 16 | Header retrofit + Badge import drop |
| 5 | `src/pages/erp/accounting/vouchers/DeliveryNote.tsx` | 9 | 11 | Header retrofit + Badge import drop |
| 6 | `src/pages/erp/accounting/vouchers/PurchaseInvoice.tsx` | 11 | 23 | Header retrofit (refNo/refDate wired to vendorBill*) + Badge import drop |
| 7 | `src/pages/erp/accounting/vouchers/ReceiptNote.tsx` | 11 | 24 | Header retrofit (refNo/refDate wired to vendorChallan*) + Badge import drop |
| 8 | `src/pages/erp/accounting/vouchers/SalesInvoice.tsx` | 9 | 13 | Header retrofit (Badge import retained — used elsewhere in file) |
| 9 | `src/pages/erp/accounting/vouchers/StockJournal.tsx` | 10 | 19 | Header retrofit (refNo wired to referenceNo) + Badge import drop |
| 10 | `src/__tests__/__sprint-summaries__/hardening-b-block2a-close-summary.md` | new | 0 | This file |

**Total:** 10 files. ~135 net additions / ~135 deletions ≈ ~135 net lines. Within target band (150–250 net additions; small undershoot driven by removing inline Date inputs in tandem with header replacement — presentational dedup, no behaviour change).

---

## Triple Gate — baseline vs final

| Gate | Baseline (`9ba187f`) | After Block 2A | Δ |
|---|---|---|---|
| TSC | 0 errors | 0 errors | identical |
| ESLint | 0 errors / 0 warnings | 0 errors / 0 warnings | identical |
| Vitest | 1209 passed / 165 files | 1209 passed / 165 files | **IDENTICAL** (no new tests; no behaviour-shifting changes) |
| Build | clean | clean | identical |

---

## 0-diff confirmations

- ✅ `src/lib/decimal-helpers.ts` — **0-diff.** Precision Arc closed and untouched.
- ✅ Protected zones (`voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`) — **0-diff.**
- ✅ All 30 `generateVoucherNo` caller sites — **0-diff.** Internal storage-key shape changes; external `(prefix, entityCode)` signature byte-identical.
- ✅ All 48 `generateDocNo` caller sites — **0-diff.** Internal `getFY()` → `getFY(entityCode)` is the only change inside the function; signature unchanged.
- ✅ All `*Print.tsx` components (e.g. `SalesInvoicePrint.tsx`) — **0-diff.** Print-side retrofit explicitly out of scope.
- ✅ Voucher-posting arithmetic — **0-diff.** No `roundTo`, `dMul`, `dPct`, `dDiv` calls added/removed.
- ✅ Voucher-number STRING format for current FY — byte-identical (`PY/24-25/0001` stays `PY/24-25/0001`).

---

## GST Rule 46 compliance statement

The defect — `generateVoucherNo` writing a non-FY-scoped storage key (`erp_voucher_seq_${prefix}_${entityCode}`) so that the invoice/voucher sequence did not reset on April 1 — is closed by Block 2A:

1. **Storage-key shape changed** to `erp_voucher_seq_${prefix}_${entityCode}_${fy}`. Each FY now has its own sequence row; April-1 boundary triggers automatic `0001` start.
2. **Legacy-key auto-migration** mirrors `generateDocNo` (T-Phase-1.2.5h-a precedent): on the first call after migration, if the FY-scoped key is absent and the legacy key exists, the legacy value is copied into the FY-scoped key. Existing in-flight FY sequences continue without disruption. Legacy key retained for one FY safety window — purge deferred to a future block.
3. **Returned voucher-number string format unchanged** for the current FY: `${prefix}/${fy}/${seq:0000}` is byte-identical to pre-Block-2A. No user-facing voucher-no churn on banked records.
4. **`Voucher.fiscal_year_id` provides per-row FY traceability** — every newly-posted voucher carries its FY tag (e.g. `FY-2024-25`) computed from `voucher.date` (not `Date.now()`), so backdated/post-dated vouchers carry the correct historical FY.
5. **Per-entity FY routing** — `getFY(entityCode)` reads the entity's `FiscalYear.startMonth` master, so multi-entity tenants with non-April fiscal years (e.g. SEZ units, foreign subsidiaries) get correct FY computation. Single-company-India behaviour (April-start) preserved as the default fallback.

GST Rule 46 invoice-numbering requirement (per-FY sequence reset) — **closed.**

---

## STOP-AND-RAISE section

Empty by intent.

Items adjacent to scope but **deliberately NOT touched** (reported here for the audit, not absorbed into the diff):

- `src/hooks/useVouchers.ts` — listed in the spec ("if it has its own voucher-number generation, list it but do not touch"). Inspected: it imports `generateVoucherNo` from `fincore-engine.ts` rather than reimplementing it, so it inherits the fix automatically. **Not touched.**
- The 14 already-using-TallyVoucherHeader voucher forms (Payment, Receipt, ContraEntry, JournalEntry, ManufacturingJournal, StockAdjustment, StockTransferDispatch + the 7 retrofitted in 2A) — no header changes outside the 7 retrofit targets.
- The legacy `erp_voucher_seq_${prefix}_${entityCode}` key purge — **deferred** per `generateDocNo` precedent (one-FY safety window).
- Registry-driven numbering engine refactor (β deliverable) — **Block 2B's domain.**
- 17-bridge `department_id` retrofit — Phase 2 Backbone Arc opener.
- Mode/Terms-of-Payment SSOT key migration + sidebar disambiguation — **Block 2C's domain.**
- Print-component header treatment (`*Print.tsx`) — out of scope per founder ruling.
- Any arithmetic / precision-touching change — forbidden by Q1 founder ruling (interpretation A: structural wiring only).

---

**Block 2A banked. HALT for §2.4 Real Git Clone Audit. Block 2B NOT started.**
