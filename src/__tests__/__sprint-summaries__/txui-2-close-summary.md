# Sprint T-Phase-1 · TXUI-2 · Close Summary

**Sprint ID**: `T-Phase-1.TXUI-2-SalesReturnMemo-Canonical-Adoption-Option-β-3`
**Predecessor HEAD**: `4f97e2e` (TXUI-1c · A FIRST-PASS-CLEAN · 10th consecutive A · 14/14 FinCore canonical complete)
**Mode**: CANONICAL SIBLING PATTERN ADOPTION (FR-CANDIDATE-81 · 4th application)
**Streak target**: 11th consecutive A first-pass-clean · 15 canonical-adopted forms · TXUI arc 4-streak.

## §0 · Scope Rationale — Option β-3 (β minus floor plant)

Step 1 alignment locked **Option β** with floor plant for the 4 SalesX
memos. Step 2 pre-flight surfaced that the 5 affected record-type files
(`demo-outward-memo.ts`, `invoice-memo.ts`, `sample-outward-memo.ts`,
`supply-request-memo.ts`, `sales-return-memo.ts`) are inside the 33
fy-stamped record-type interfaces protected by the UPRA arc 0-diff
invariant.

To honor that invariant without breaking the canonical adoption cadence,
this sprint shipped **β-3**: SalesReturnMemo canonical adoption only.
The floor-plant work on the other 4 SalesX memos is **deferred to the
P2BB-Retention sub-arc**, where the fy-stamped invariant can be lifted
in coordination with the audit-trail / hash-chain owners.

## §1 · Scope · 2 files

| # | File | Change |
|---|------|--------|
| 1 | `src/pages/erp/salesx/transactions/SalesReturnMemo.tsx` | Canonical adoption · 12-row M12 contract |
| 2 | `src/__tests__/__sprint-summaries__/txui-2-close-summary.md` | NEW · this file |

## §2 · 12-row M12 contract applied

1. `useRef` added to React import; `VoucherFormFooter` imported.
2. `Send` icon import removed (no longer used post-migration).
3. `saving` state + `lastSavedRef` ref added next to header state.
4. `persistMemo` body BYTE-IDENTICAL except ONE additive line:
   `lastSavedRef.current = true;` immediately after the
   `localStorage.setItem(key, JSON.stringify(list));` push.
5. `handleSubmit` RENAMED to `handlePost` and wrapped async with
   `setSaving(true)` / `try` / `finally setSaving(false)`; deps
   `[persistMemo]` unchanged.
6. `useCtrlS(handleSubmit)` → `useCtrlS(handlePost)` reference update.
7. `validate` function · 0-diff.
8. `handleSaveDraft` · 0-diff.
9. NEW `isDirty` (5 signals: raisedById · againstInvoiceId · items
   length · reasonNote · attachments length).
10. NEW `clearForm` (7 setters + `lastSavedRef.current = false`).
11. NEW `handleCancel` with confirm-guard + `'Memo discarded.'` toast.
12. NEW `handleSaveAndNew` async wrapper (awaits `handlePost`, then
    `clearForm()` only when `lastSavedRef.current === true`).

## §3 · Footer markup

- Total card is now **display-only** (action buttons removed from it).
- **Save Draft** kept in its own sibling `<div>` (workflow-specific
  shortcut · still calls `handleSaveDraft`).
- `<VoucherFormFooter />` rendered with `postLabel="Submit"` and
  `showPrint={false}` (preserves workflow-appropriate UX label · no
  print scenario for memos).

## §4 · Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors** ✅
- ESLint / Vitest / Build expected clean per CI cadence.

## §5 · 0-diff invariants held

- 4 core: `voucher-type.ts`, `cc-masters.ts`, `applications.ts`,
  `cc-compliance-settings.ts`.
- 33 fy-stamped record-type interfaces in `src/types/` — including
  `sales-return-memo.ts`, `demo-outward-memo.ts`, `invoice-memo.ts`,
  `sample-outward-memo.ts`, `supply-request-memo.ts`.
- `fincore-engine.ts` (consume only), `audit-trail-engine.ts`,
  `audit-trail-hash-chain.ts`.
- `VoucherFormFooter.tsx`, `TallyVoucherHeader.tsx` (consume only),
  `VoucherFormShell.tsx` (deprecated at TXUI-1b).
- 14 FinCore voucher forms (Receipt · Payment · ContraEntry ·
  JournalEntry · StockAdjustment · StockTransferDispatch ·
  ManufacturingJournal · DebitNote · StockJournal · ReceiptNote ·
  PurchaseInvoice · CreditNote · DeliveryNote · SalesInvoice).
- 4 SalesX memos (DemoOutwardMemo · InvoiceMemo · SampleOutwardMemo ·
  SupplyRequestMemo) — **deferred to P2BB-Retention**.
- 99 UPRA arc Register infrastructure files.
- All other 122 non-target forms.

## §6 · P2BB-Retention deferral note

The 4 SalesX memos (DemoOutwardMemo · InvoiceMemo · SampleOutwardMemo ·
SupplyRequestMemo) remain on the canonical-adoption backlog. They will
be picked up under the **P2BB-Retention sub-arc**, alongside the
controlled lift of the fy-stamped record-type 0-diff invariant. Until
that arc opens, no further touches to those 4 memo forms or their
record-type files are permitted.

## §7 · Notes / Decisions

- `useVoucherEntityGuard` intentionally NOT added (memo is single-tenant
  per design; out of scope per §1 K9 of the prompt).
- No new `logAudit()` calls introduced (Warning 1 · P2BB scope respected).
- `persistMemo` toast / reset side-effects preserved verbatim — the
  canonical `clearForm` runs from `handleSaveAndNew` only after the
  successful-post marker flips.
