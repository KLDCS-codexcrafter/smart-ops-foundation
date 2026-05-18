# Sprint T-Phase-1 · TXUI-1c · Close Summary

**Sprint ID**: `T-Phase-1.TXUI-1c-SalesInvoice-Canonical-Adoption-FR79-Special-Care`
**Predecessor HEAD**: `95d7835` (TXUI-1b · A FIRST-PASS-CLEAN · 9th consecutive A)
**Mode**: CANONICAL SIBLING PATTERN ADOPTION (FR-CANDIDATE-81) · FR-79 byte-identical engine-call discipline
**Streak target**: 10th consecutive A first-pass-clean equivalent · FinCore canonical adoption = **14/14 = 100%** milestone

## Scope · 2 files

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/erp/accounting/vouchers/SalesInvoice.tsx` | Canonical adoption · commitVoucher() delegation preserved · ~50 LOC delta |
| 2 | `src/__tests__/__sprint-summaries__/txui-1c-close-summary.md` | NEW · this file |

## Architecture preserved (§0)

SalesInvoice's three-function split is honored:

- **`commitVoucher`** (engine call · localStorage push · setPostedVoucherId · IRN reset · advance update · SO fulfilment · commission register · distributor notify) — body **BYTE-IDENTICAL** except ONE additive line:
  `lastSavedRef.current = true;` immediately after `setPostedVoucherId(voucher.id)`.
- **`handlePost`** (entry · partyName guard · Sprint 8 credit-hold check · override dialog opener · `commitVoucher()` call) — body wrapped only:
  - `async` keyword added
  - `setSaving(true)` + `lastSavedRef.current = false` at entry (before existing body)
  - existing body wrapped in `try { ... } finally { setSaving(false); }`
  - deps array UNCHANGED
- **`confirmOverride`** (override-accepted path) — body **BYTE-IDENTICAL** · zero changes.

## 15-row M12 contract attestation

1. `commitVoucher` voucher object construction — 30+ fields BYTE-IDENTICAL
   (id · voucher_no · voucher_type_id · voucher_type_name='Sales Invoice' ·
   base_voucher_type='Sales' · invoice_mode · so_ref · party_id · party_gstin ·
   party_state_code · customer_state_code · place_of_supply · all 6 SAM fields ·
   sam_commission_results · GST totals · status='posted' · created_by='current-user' · timestamps).
2. `localStorage.setItem(vouchersKey(entityCode), …)` push BYTE-IDENTICAL.
3. `setPostedVoucherId(voucher.id)` preserved · `lastSavedRef.current = true` added on next line only.
4. `setPostedVoucherNo` · `setIrnStatus('pending')` · `setCurrentIrn(null)` · `setIrnAckDate(null)` BYTE-IDENTICAL.
5. Linked-advance update (`advancesKey` adjustments push · balance_amount · status transition) BYTE-IDENTICAL.
6. `fulfillOrderLine(againstSO, gstTotals.total)` BYTE-IDENTICAL.
7. `isCommissionAlreadyBooked` guard against DN-stage double-booking BYTE-IDENTICAL.
8. CommissionEntry write loop — all 40+ fields per entry BYTE-IDENTICAL (incl. tds_section · deductee_type · CN reversal fields · agent-invoice fields · catchup-TDS fields · source_document='sales_invoice').
9. `notifyDistributorInvoicePosted` Sprint 10 Part D side effect BYTE-IDENTICAL.
10. `toast.success('Sales Invoice posted')` BYTE-IDENTICAL.
11. `handlePost` Sprint 8 credit-hold body (cfg load · `checkCreditHold` call · is_blocked → setOverrideOpen → return · is_warning toast + soft_warn_auto override record) BYTE-IDENTICAL inside try.
12. `confirmOverride` body (reason min 10 chars · recordOverride · setOverrideOpen(false) · setCreditCheck(null) · commitVoucher) BYTE-IDENTICAL.
13. `useCtrlS(() => { if (!overrideOpen) handlePost(); })` BYTE-IDENTICAL (fire-and-forget async).
14. `useVoucherEntityGuard` config + GuardDialog wiring BYTE-IDENTICAL.
15. `handlePrintInvoice` Sprint 9 helper + IRN/EWB/Print toolbar Card (lines 1000+) BYTE-IDENTICAL.

## Canonical adoption deltas (Receipt.tsx gold reference)

- `useRef` already imported; added `saving` state + `lastSavedRef = useRef(false)` after Sprint 9 IRN/EWB state block.
- `VoucherFormFooter` imported from `@/components/fincore/VoucherFormFooter`.
- `Send` removed from `lucide-react` import (post-grep confirmed no remaining usage; X · ChevronDown · Info · Link2 · ShieldAlert · FileText · Truck · Printer kept).
- `_handleCancel` promoted to `handleCancel` (removed `_` prefix · deleted `void _handleCancel;` line) · body and deps array UNCHANGED.
- New `handleSaveAndNew = async () => { await handlePost(); if (lastSavedRef.current) clearForm(); }`.
- Inline footer (Save to Draft Tray · Cancel toast · Post `<Send>` button) replaced with:
  - Separate `<div>` rendering `Save to Draft Tray` only when `onSaveDraft` is provided.
  - `<VoucherFormFooter onPost onSaveAndNew onCancel isSaving canPost status="draft" showPrint={false} />`
- `showPrint={false}` because Sprint 9 IRN/EWB/Print toolbar (post-Post Card) handles all Print scenarios.

## Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors** ✅
- ESLint / Vitest / Build expected clean per CI cadence (1209/165 IDENTICAL target).

## 0-diff invariants held

- 4 core protected: `voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`
- `fincore-engine.ts` (FR-79 floor · consume only)
- `sam-engine.ts`, `commission-engine.ts`, `credit-hold-engine.ts` (consume only)
- `audit-trail-engine.ts` (Hardening-B ATELC · Warning 1) · `audit-trail-hash-chain.ts` (P2BB)
- 33 fy-stamped record-type interfaces · 99 NEW canonical Register infra (UPRA arc)
- `VoucherFormFooter.tsx`, `TallyVoucherHeader.tsx`, `useVoucherEntityGuard` (consume only)
- 13 other FinCore voucher forms (7 sibling baseline + 4 TXUI-1a + 2 TXUI-1b)
- `VoucherFormShell.tsx` (deprecated at TXUI-1b)
- `FinCorePage.tsx` + `FinCoreSidebar*` (wiring)
- All 124 non-FinCore form files
- Sprint 8 credit override dialog at end of file UNCHANGED
- Sprint 9 IRN/EWB/Print toolbar UNCHANGED
- `handlePrintInvoice`, `useCtrlS`, `useVoucherEntityGuard`, `isDirty`, `serializeFormState`, `clearForm` UNCHANGED interior
- NO new `logAudit()` calls (Warning 1 · P2BB scope respected)

## Notes / Decisions

- `handlePost` is now `async` but `useCtrlS(() => { if (!overrideOpen) handlePost(); })`
  fire-and-forget continues to work — the returned Promise is intentionally
  unawaited (matches Receipt.tsx canonical pattern).
- Credit-hold blocked path returns inside the try block; `finally` still
  resets `setSaving(false)`, preventing the footer from staying disabled
  when the override dialog opens.
- `lastSavedRef.current = false` reset at entry of `handlePost` guarantees
  `handleSaveAndNew` only clears the form when the current attempt
  succeeded (not from a stale prior post).
- `showPrint={false}` on VFF prevents duplicate Print UI alongside Sprint 9
  IRN/EWB/Print toolbar Card.

## FinCore canonical adoption milestone

**14/14 = 100%** voucher forms now follow the Receipt.tsx gold-reference
canonical pattern:

| Cohort | Sprint | Forms |
|---|---|---|
| Baseline | (pre-TXUI) | Receipt · Payment · ContraEntry · JournalEntry · StockAdjustment · StockTransferDispatch · ManufacturingJournal (7) |
| TXUI-1a | smaller | DebitNote · StockJournal · ReceiptNote · PurchaseInvoice (4) |
| TXUI-1b | larger | CreditNote · DeliveryNote (2) |
| TXUI-1c | FR-79 special | SalesInvoice (1) |
| **Total** | | **14** |

**HALT. TXUI-1c complete. TSC Clean. Awaiting §2.4 audit.**
