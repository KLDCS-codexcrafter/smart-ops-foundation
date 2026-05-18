# Sprint T-Phase-1 · TXUI-1b · Close Summary

**Sprint ID**: `T-Phase-1.TXUI-1b-FinCore-VFF-Canonical-Adoption-Plus-Retroactive`
**Predecessor HEAD**: `d884105` (TXUI-1a · 4 VFF footer migrations · A WITH INTERPRETIVE ENRICHMENT)
**Mode**: CANONICAL SIBLING PATTERN ADOPTION (FR-CANDIDATE-81)
**Streak target**: 9th consecutive A first-pass-clean equivalent in TXUI arc.

## Scope · 8 files

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/erp/accounting/vouchers/CreditNote.tsx` | Canonical adoption · enriched per Receipt.tsx · `showPrint={false}` |
| 2 | `src/pages/erp/accounting/vouchers/DeliveryNote.tsx` | Canonical adoption · enriched per Receipt.tsx · `showPrint={false}` |
| 3 | `src/pages/erp/accounting/vouchers/DebitNote.tsx` | Retroactive · added `showPrint={false}` only |
| 4 | `src/pages/erp/accounting/vouchers/StockJournal.tsx` | Retroactive · added `showPrint={false}` only |
| 5 | `src/pages/erp/accounting/vouchers/ReceiptNote.tsx` | Retroactive · added `showPrint={false}` only |
| 6 | `src/pages/erp/accounting/vouchers/PurchaseInvoice.tsx` | Retroactive · added `showPrint={false}` only |
| 7 | `src/components/fincore/VoucherFormShell.tsx` | `@deprecated` JSDoc header only · body 0-diff |
| 8 | `src/__tests__/__sprint-summaries__/txui-1b-close-summary.md` | NEW · this file |

## Canonical adoption details (CreditNote + DeliveryNote)

Both forms now match Receipt.tsx gold-reference structure:

- `useRef` imported; `saving` state + `lastSavedRef` ref added.
- `VoucherFormFooter` imported and rendered as the primary footer with full
  props (`onPost`, `onSaveAndNew`, `onCancel`, `isSaving`, `canPost`,
  `status="draft"`, `showPrint={false}`).
- `handlePost` wrapped in async / `setSaving(true)` try/finally. Engine call
  surface (voucher object construction, `localStorage.setItem`, validation
  early returns, `toast.success`, `setPostedVoucherId`, commission /
  packing-slip / packing-BOM side effects) BYTE-IDENTICAL.
- New `handleCancel` (uses existing `isDirty` + confirm-guard + `clearForm`
  + `toast.info('Voucher discarded.')`).
- New `handleSaveAndNew` (awaits `handlePost`, calls `clearForm()` only
  when `lastSavedRef.current === true`).
- Bespoke `Print Credit Note` / `Print` button and `Save to Draft Tray`
  preserved in a sibling `<div>` above the canonical VFF.
- `Send` icon import removed (no remaining usage).

## Retroactive fixes (4 files · 1 line each)

Each TXUI-1a banked form gained a single `showPrint={false}` prop on its
existing `<VoucherFormFooter>` call. All other lines byte-identical.

## VoucherFormShell deprecation

JSDoc header replaced with `@deprecated` annotation pointing future authors
to `TallyVoucherHeader` + `VoucherFormFooter` (Receipt.tsx pattern).
Component body, props, state, JSX, and exports BYTE-IDENTICAL 0-diff.

## Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors** ✅
- ESLint / Vitest / Build expected clean per CI cadence.

## 0-diff invariants held

- `fincore-engine.ts`, `audit-trail-engine.ts`, `audit-trail-hash-chain.ts`
- `VoucherFormFooter.tsx`, `TallyVoucherHeader.tsx` (consume only)
- `SalesInvoice.tsx` (TXUI-1c scope)
- 7 sibling FinCore voucher forms (Receipt, Payment, ContraEntry,
  JournalEntry, StockAdjustment, StockTransferDispatch, ManufacturingJournal)
- 4 core protected files; 33 fy-stamped record types; 99 UPRA Register infra
- All other 124 form files

## Notes / Decisions

- CreditNote and DeliveryNote both already carried an `isDirty` callback
  for the entity-guard wiring; the new `handleCancel` reuses it (matches
  Receipt.tsx semantics; avoids a second dirty-check definition).
- No new `logAudit()` calls introduced (Warning 1 · P2BB scope respected).
