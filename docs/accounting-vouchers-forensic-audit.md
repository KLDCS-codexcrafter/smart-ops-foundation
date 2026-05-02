# Forensic Audit · `src/pages/erp/accounting/vouchers/`
## Sprint T-Phase-1.2.5h-a · Q2-c Lock

## Method
Reviewed every `.tsx` file currently present in
`src/pages/erp/accounting/vouchers/` (28 files total). Because git history is
managed by the platform and is not directly inspectable from inside the agent
sandbox, the audit classifies the **current state** of each file against the
original D-127 contract: the voucher form must remain a thin orchestrator
that delegates posting to `finecore-engine.ts`. Any file that embeds posting
logic, GL math, period-lock checks, or sequence generation inline is flagged
as `LOGIC` (potential drift) for human review.

Classification key:
- **SAFE** — file confined to render + form-state + props plumbing
- **TYPE-ONLY** — touches only imports, sibling-field references, or type narrowing
- **LOGIC** — embeds business behaviour (posting, math, validation) inline
- **BREAKING** — schema/contract change vs voucher.ts / voucher-type.ts

## Files in scope (28)

| # | File | Class | Notes |
|---|---|---|---|
| 1 | ContraEntry.tsx | SAFE | Form orchestrator; posts via finecore-engine |
| 2 | ContraEntryPrint.tsx | SAFE | Pure print template |
| 3 | CreditNote.tsx | SAFE | Delegates to engine |
| 4 | CreditNotePrint.tsx | SAFE | Print template |
| 5 | DebitNote.tsx | SAFE | Delegates to engine |
| 6 | DebitNotePrint.tsx | SAFE | Print template |
| 7 | DeliveryNote.tsx | SAFE | Inventory-only voucher; uses stock helpers |
| 8 | DeliveryNotePrint.tsx | SAFE | Print template |
| 9 | JournalEntry.tsx | SAFE | Canonical orchestrator pattern |
| 10 | JournalEntryPrint.tsx | SAFE | Print template |
| 11 | ManufacturingJournal.tsx | SAFE | BOM + stock journal flow |
| 12 | ManufacturingJournalPrint.tsx | SAFE | Print template |
| 13 | Payment.tsx | SAFE | Delegates to engine + outstanding allocation |
| 14 | PaymentPrint.tsx | SAFE | Print template |
| 15 | PurchaseInvoice.tsx | SAFE | Engine + GST registers via engine |
| 16 | PurchaseInvoicePrint.tsx | SAFE | Print template |
| 17 | Receipt.tsx | SAFE | Engine + outstanding allocation |
| 18 | ReceiptNote.tsx | SAFE | Stock receipt routing through engine |
| 19 | ReceiptNotePrint.tsx | SAFE | Print template |
| 20 | ReceiptPrint.tsx | SAFE | Print template |
| 21 | SalesInvoice.tsx | SAFE | Engine + outstanding + GST via engine |
| 22 | SalesInvoicePrint.tsx | SAFE | Print template |
| 23 | StockAdjustment.tsx | SAFE | Stock helpers; no ledger math |
| 24 | StockAdjustmentPrint.tsx | SAFE | Print template |
| 25 | StockJournal.tsx | SAFE | Stock helpers; no ledger math |
| 26 | StockJournalPrint.tsx | SAFE | Print template |
| 27 | StockTransferDispatch.tsx | SAFE | Stock movement via engine |
| 28 | StockTransferPrint.tsx | SAFE | Print template |

## Result
All 28 files classify as **SAFE** under the D-127 contract: each form is a
thin orchestrator that delegates GL/stock posting to `finecore-engine.ts`.
No `LOGIC` or `BREAKING` drift detected at the time of this audit.
- 1.2.5h-c1 fix · Decimal sweep coverage extended to 13/14 SalesX files (OrderDeskPanel + CampaignPerformanceReport excluded · pre-flight verified zero float-math hits). MONEY-MATH-AUDITED markers added to all 13 files.

## Streak Counter (Q2-c)
- Old streak under wrong path (`finecore/transactions/`): **VOID**
- New streak under corrected path (`accounting/vouchers/`):
  - Sprint T-Phase-1.2.5h-a closed · count = **1**
  - Sprint T-Phase-1.2.5h-b1 (+ fix) closed · count = **2**
- Each subsequent sprint must verify `git diff src/pages/erp/accounting/vouchers/`
  produces zero lines (or document and justify any touch in its close summary).

## Caveat
Because the agent sandbox does not expose `git log`, this audit is a current-
state inspection rather than a commit-by-commit replay. A follow-up review by
a human maintainer with full git access is recommended at the next quarterly
governance review.

## Streak Updates
- Sprint T-Phase-1.2.5h-a closed · count = **1**
- Sprint T-Phase-1.2.5h-b1 (+ fix) closed · count = **2**
- Sprint T-Phase-1.2.5h-b2 closed · count = **3**

## Sprint T-Phase-1.2.5h-c1 closed · count = 4

Engineering hardening sprint (Wave 3 part 1) closed with zero touches to
`src/pages/erp/accounting/vouchers/`. D-127 streak counter advances 3 → 4.

Deliverables:
- Generalized approval workflow engine (M-4) — refactored useCycleCounts,
  useTimeEntries, EmployeeFinance to delegate audit-trail wiring
- 90+ new vitest tests covering decimal-helpers, period-lock, voucher-version,
  audit-trail-deep, storage-quota-deep, error-engine-deep, validate-first-deep,
  approval-workflow, consumption-intelligence, abc-classification,
  item-movement, stock-reservation, generateDocNo deeper, type contracts
- Architecture documentation (docs/ARCHITECTURE.md)


## Sprint T-Phase-1.2.5h-c2 closed · count = 5

FINAL Card #2.5 sub-sprint (Wave 3 part 2) closed with zero touches to
`src/pages/erp/accounting/vouchers/`. D-127 streak counter advances 4 → 5.

Deliverables:
- i18n framework (i18next + react-i18next) with Hindi MVP (208 keys, parity verified)
- LocaleToggle in ERPHeader (EN ↔ हिन्दी, persisted per-entity via Bucket C)
- 30 priority pages marked for migration; top strings wrapped in 8+ pages
- Inventory Hub Welcome refreshed with 7 production-grade KPI cards (L-3)
- docs/CODE-CONVENTIONS.md (L-2) · docs/I18N-MIGRATION-GUIDE.md · docs/PERFORMANCE-BASELINE.md (L-5)
- 6 new vitest tests (i18n.test.ts U1-U6) · target 132/132
- package.json adds i18next + react-i18next (Q1-a lock · first deps in 60+ sprints)

---

## Sprint T-Phase-1.2.6a · UTS Foundation

Sprint T-Phase-1.2.6a closed · count = 6.

## Sprint T-Phase-1.2.6b · Inventory Hub UTS Retrofit

Sprint T-Phase-1.2.6b closed · count = 7.

D-127 ZERO TOUCH preserved on `src/pages/erp/accounting/vouchers/`. UTS
foundation is a sibling abstraction (see D-226) — FineCore RegisterGrid
and the 13 voucher consumers are byte-identical to the prior sprint.

Deliverables:
- D-226 decision document (8 dimensions, hybrid ProjX treatment, sibling rationale)
- UniversalRegisterGrid<T> + UniversalRegisterTypes (sibling to FineCore RegisterGrid)
- universal-export-engine (Excel/PDF/Word/CSV) — zero new deps
- UniversalPrintFrame (letterhead + signatory + T&C + @media print)
- effective_date optional schema field on 15 type files (consumption.ts adds 2: MIN + ConsumptionEntry)
- SecondarySales doc-no consolidation onto generateDocNo('SEC', entityCode)
- 8 new vitest tests (UR1-UR8) → target 140/140

---

Sprint T-Phase-1.2.6c closed · count = 8.
Sprint T-Phase-1.2.6d closed · count = 9.
Sprint T-Phase-1.2.6d-hdr closed · count = 13 (cumulative through partial closes).
Sprint T-Phase-1.2.6e-tally-1 closed · count = **14**.

D-127 ZERO TOUCH preserved on `src/pages/erp/accounting/vouchers/`.
voucher_type_id + multi_source_refs added as sibling abstractions
(non-finecore-voucher-type-registry.ts + multi-source-ref.ts re-export of BillReference).

---

## DEFERRED · Voucher Numbering Behavior Parity (Phase 1.6 backlog)

**Tracked:** 1.2.6e-audit deferral list will pick this up explicitly.

**Gap:** `generateDocNo` + `generateVoucherNo` hard-code 4-digit zero-padded `{PREFIX}/{FY}/{NNNN}` format. They do NOT honor the 11 numbering-config fields on the FineCore `VoucherType` schema:

1. `numbering_method` (auto / manual / auto-with-override)
2. `use_custom_series` (per-series sequencing)
3. `numbering_prefix`
4. `numbering_suffix`
5. `numbering_start` (custom starting number)
6. `numbering_width` (configurable digit width, not always 4)
7. `numbering_prefill_zeros` (zero-pad toggle)
8. `prevent_duplicate_manual` (manual-entry duplicate guard)
9. `insertion_deletion_behaviour` (renumber vs gap)
10. `show_unused_numbers`
11. `current_sequence` (live counter persisted on the voucher type)

**NonFineCore symmetry gap:** `NonFineCoreVoucherType.prefix: string` only — same parity gap as the FineCore helper.

**Phase 1.6 closure plan:**
1. Extract a `resolveNumberingConfig(voucherTypeId, entityCode)` helper that reads either FineCore VoucherType or NonFineCoreVoucherType.
2. Refactor `generateDocNo` / `generateVoucherNo` to consume that config (prefix, suffix, width, prefill, start, current_sequence).
3. Honor `numbering_method` (auto vs manual) at the call sites; surface manual-entry UI in the form when method !== 'auto'.
4. Implement `prevent_duplicate_manual` lookup and `insertion_deletion_behaviour` policy on cancel/delete.
5. Backfill: a one-time sync pass to seed `current_sequence` from the highest existing `{NNNN}` per (voucher_type, FY).
