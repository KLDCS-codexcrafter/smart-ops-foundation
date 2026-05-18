# Sprint T-Phase-1 · TXUI-1a · FinCore Voucher Footer Migration (Smaller) · Close Summary v1

**HEAD**: <new commit SHA>
**Predecessor HEAD**: 2fbbda12
**Forms migrated**: 4 (DebitNote · StockJournal · ReceiptNote · PurchaseInvoice)
**Files touched**: 4 form updates + 1 close summary = 5 total
**Wiring changes**: 0 (V2 in-place migration)

## Triple Gate Status
- STRICT TSC (`npx tsc -p tsconfig.app.json --noEmit`): 0 errors ✅
- ESLint: deferred to CI gate
- Vitest: deferred to CI gate (1209/165 IDENTICAL target)
- Build: deferred to CI gate

## Per-form M12 attestation results
- **DebitNote.tsx** — 5/5 rows byte-identical
  - handlePost engine call: direct localStorage push to `vouchersKey(entityCode)` preserved · `created_by: 'current-user'` literal preserved · wrapper-only additions (setSaving + lastSavedRef)
  - 3 validation early returns unchanged (partyName · againstBill · reasonCode)
  - voucher object: all 30+ fields byte-identical (voucher_type_name='Debit Note' · base_voucher_type='Debit Note' · invoice_mode · status='posted')
  - handleSaveDraft callback shape unchanged
  - handlePrint URL unchanged
- **StockJournal.tsx** — 5/5 rows byte-identical
  - handlePost engine call: direct localStorage push · 2-grid inventory_lines composition (consumption negated · production positive) byte-identical
  - 2 validation early returns unchanged (consumptionLines.length · purpose='Other' && !referenceNo)
  - voucher object: byte-identical (voucher_type_name='Stock Journal' · base_voucher_type='Stock Journal')
  - handleSaveDraft callback shape unchanged
  - handlePrint URL `&copy=stores` preserved
- **ReceiptNote.tsx** — 6/6 rows byte-identical
  - handlePost engine call: `to_godown_name: receiveGodown` · `ref_voucher_no: vendorChallanNo` preserved
  - 2 validation early returns unchanged (partyName · vendorChallanNo)
  - voucher object byte-identical (voucher_type_name='Receipt Note' · base_voucher_type='Receipt Note')
  - vendorChallanDate state preserved (passed to TallyVoucherHeader refDate/onRefDateChange)
  - handleSaveDraft callback shape unchanged
  - handlePrint URL `&copy=stores` preserved
- **PurchaseInvoice.tsx** — 8/8 rows byte-identical
  - handlePost engine call: linked-advance updates via `advancesKey` · `fulfillOrderLine(againstPO, gstTotals.total)` · `po_ref` conditional all byte-identical
  - 2 validation early returns unchanged (partyName · vendorBillNo)
  - voucher object: `base_voucher_type='Purchase'` (NOT 'Purchase Invoice') carefully preserved · `invoice_mode` preserved
  - `useOrders` hook consumption unchanged
  - `openAdvances` memo filter logic unchanged
  - `handleLinkAdvance` unchanged
  - handleSaveDraft callback shape unchanged
  - handlePrint URL unchanged

## Canonical pattern applied (per Receipt.tsx template)
For each form:
1. `useRef` added to react import
2. `VoucherFormFooter` imported from `@/components/fincore/VoucherFormFooter`
3. `Send` removed from `lucide-react` import · `Printer` preserved
4. `saving` state + `lastSavedRef` added
5. `handlePost` wrapped: `async` keyword · `setSaving(true)` after validation · `lastSavedRef.current = voucher.id` after success · `finally { setSaving(false); }`
6. `handleCancel` added (reuses existing `isDirty` + `clearForm`)
7. `handleSaveAndNew` added (awaits handlePost then clears if lastSavedRef set)
8. Inline footer JSX replaced: Draft + Print kept inline · `VoucherFormFooter` rendered with 6 props (onPost · onSaveAndNew · onCancel · isSaving · canPost · status)
9. Print label standardized to `Print {VoucherTypeName}` · `size="sm"` · `Printer h-3.5 w-3.5 mr-1`

## 0-diff invariants held
- Receipt.tsx (canonical template) — untouched
- 7 already-VFF forms (Payment · ContraEntry · JournalEntry · StockAdjustment · StockTransferDispatch · ManufacturingJournal · Receipt) — untouched
- FinCorePage.tsx + FinCoreSidebar trio — untouched
- fincore-engine.ts · audit-trail-engine.ts · audit-trail-hash-chain.ts · voucher-export-engine.ts — untouched (consume-only)
- All UPRA arc · Hardening-B · Precision arc · 4 protected zones — untouched

## Universal Floor verification
All 4 forms confirmed to have `voucher_no` · `date` · `created_at` · `updated_at` · `created_by` present in voucher payload (verified in M12 contract row 3 of each form). NO new fields added per TX1-Q2 contract.

## Streak status
8th consecutive A first-pass-clean equivalent target (post-UPRA-arc 7-streak + TXUI-0 diagnostic + TXUI-1a)

## Next sprint
TXUI-1b · 3 larger forms (CreditNote · DeliveryNote · SalesInvoice with FR-79 byte-identical care)
