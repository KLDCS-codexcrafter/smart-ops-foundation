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

## Sprint T-Phase-2.7-a · GST + Bill-To/Ship-To + HSN + RCM Auto-Detection

**Status:** closed · count = **15**
**Scope:** Indian GST + e-invoice + RCM compliance foundation (OOB-4 · Card #2.7 sub-sprint 1 of 5)
**Commit:** Batch A (types + libs) + Batch B (UI components) + Batch C (engine integration + reporting) + Batch C2 (form mounts)

### What landed
- **gstin-validator.ts** — 15-char regex + state code derivation + checksum stub
- **hsn-resolver.ts** — HSN/SAC lookup with entity extension layer · `resolveHSNForItem` from item master
- **place-of-supply-engine.ts** — Section 10 IGST Act resolver with intra/inter-state classification
- **rcm-detection-engine.ts** — 3-fold detection (GTA/legal/notified-HSN/unregistered-vendor) · severity tiering
- **rcm-compliance-log.ts** — log entry schema with `outcome: auto_posted | report_only | passed_true | skipped_true`
- **BillShipAddressPicker** + helpers — Bill-To/Ship-To FK + snapshot pattern (Q1-a · mirrors FineCore Voucher)
- **SimpleGSTPanel** — line-level GST breakdown display
- **GSTBillShipSection** — composite wrapper used by 6 sales transaction forms
- **UniversalPrintFrame** — GST footer with CGST/SGST/IGST split
- **HSNSACMaster** — `is_rcm_notified` switch + entity extension persistence
- **ComplianceSettingsAutomation** — per-voucher-type RCM Auto-Post Policy (Q9)
- **finecore-engine** — additive RCM compliance log writer in `postVoucher`
- **RCMComplianceReport** — severity cards (HIGH/MED/LOW/INFO) + filterable log table
- **6 sales line-item types** (Quotation/SRM/IM/SOM/DOM/DM) — `hsn_sac_code`/`gst_rate`/`is_rcm_eligible` schema
- **6 sales form mounts** (Quotation/SRM/IM/SOM/DOM/DM) — `GSTBillShipSection` integrated as wrapper-state

### 9 Founder Q-locks executed
- Q1-a · Bill-To/Ship-To FK + snapshot mirror of FineCore Voucher
- Q2-a · HSN/SAC auto-resolve from item master + operator override
- Q3-d · RCM detection at FineCore booking with 3-fold signals
- Q4 · Place of Supply Section 10 resolver
- Q5-b · Severity tiers HIGH/MED/LOW for compliance report
- Q6 · Detection cases expanded (GTA · legal · notified HSN · unregistered)
- Q7 · Entity extension layer for HSN notifications
- Q8-c · HSN preference order: hsn_sac_code → hsn → hsn_code
- Q9 · Per-voucher-type RCM Auto-Post Policy on existing ComplianceSettingsAutomation infra

### Existing infrastructure leveraged (no duplication)
- ComplianceSettingsAutomation extension (not a new page)
- generateDocNo via existing finecore-engine pattern
- ls<T>/ss helpers reused
- gst-bill-ship.helpers.ts + BillShipAddressPicker.helpers.ts split for react-refresh compliance

### Verification
- D-127 ZERO TOUCH: `src/pages/erp/accounting/vouchers/` unchanged
- D-128: voucher.ts + voucher-type.ts byte-identical
- vitest: 216/216 stable (8 new GST/RCM tests landed in batch C)
- tsc: 0 errors · ESLint: 0 warnings
- Zero new package.json deps · zero `void X;` markers

---

## Sprint T-Phase-2.7-a-fix · Close 2 micro-gaps

**Status:** closed · count stays at **15** (fix sprint · doesn't increment)
**Scope:** HSN auto-resolve on 4 missing forms (SRM/IM/SOM/DOM) + D-127 streak doc cleanup
- Added `findItemByName` helper to `hsn-resolver.ts` (case-insensitive name → item master lookup)
- SRM useEffect: HSN passthrough from SO line · updateLine: name-typed HSN resolve
- IM `buildItem`: gained `entityCode` param · master-lookup → resolveHSNForItem · gst_rate overrides default tax %
- SOM updateLine: name-typed HSN resolve
- DOM updateLine: name-typed HSN resolve
- QuotationEntry updateLine: name-typed HSN resolve (was previously empty-string projection only on save)
- Streak doc table cleaned (2 stale partial-close entries → closed)
- D-127 ZERO TOUCH preserved · 216/216 stable · zero new tests

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

## Sprint T-Phase-2.7-b · Voucher Class UI + Field Rules + Approval Routing

- Sprint T-Phase-2.7-b closed · count = **16**
- VoucherClassPicker (Q1-b progressive disclosure) mounted in 12 forms
- field-rule-engine (Q2-c hard-block on posted, soft warn on draft)
- SaveButtonGroup (Q3-d context-aware Save Draft / Submit / Approve & Post / Reject)
- MobileApprovalsPage stub closed (1.1.1l-c era TODO) + ApprovalsPendingPage web equivalent
- VoucherClassMaster Command Center page · per-entity overrides via erp_non_fc_voucher_types_*
- 3 demo voucher types seeded (vt-quotation-domestic-special · vt-im-export · vt-min-job-issue)
- vitest 216 → 224 · tsc clean · D-127 vouchers/ untouched · D-128 voucher.ts + voucher-type.ts byte-identical


## Sprint T-Phase-2.7-c · Bank Instrument + Cancel Hardening + IRN Lock (OOB-15)

- Sprint T-Phase-2.7-c closed · count = **17**
- BankInstrumentPicker (Q4-c · 10 instrument types) + bank-instrument-validator (NEFT/RTGS UTR · IMPS · UPI · NACH · Cheque · Card regex)
- field-rule-engine extended with `min_amount` / `amount_field` (Q1-c · pure 2.7-b reuse · zero new validation)
- IRN lock engine (Q2-d · OOB-15) · `computeIRNLockState` + `rejectSaveDueToIRNLock` wired into `postVoucher` · IRNLockBanner mounted in InvoiceMemo only · D-127 voucher .tsx files UNTOUCHED
- Cancellation audit log (Q3-d UPGRADED) · `writeCancellationAuditEntry` + CancellationAuditRegister page + CancellationDashboardWidget mounted in FineCoreMastersModule
- `instrument_type` / `instrument_ref_no` / `cheque_date` / `bank_name` / `deposit_date` added to InvoiceMemo + SecondarySales types only · D-128 voucher.ts + voucher-type.ts BYTE-IDENTICAL
- 9 new tests (IC1–IC9) · D-127 vouchers/ untouched · D-128 preserved

## DEFERRED · 1.2.6d-hdr Banner Mount Gap

**Tracked:** Found during 2.7-c audit · explicit log entry to prevent re-discovery.

**Gap:** Two header components built in Sprint 1.2.6d-hdr but never mounted in
any transaction form:

1. `TaxPeriodGateBanner` (`src/components/uth/TaxPeriodGateBanner.tsx`) — built
   to surface period-lock + GSTR-1/3B filing-cutoff warnings on voucher headers.
   Currently only `isPeriodLocked()` is consulted in 4 forms · banner asset is
   dead code.
2. `NotesAndReferenceCard` (`src/components/uth/NotesAndReferenceCard.tsx`) —
   built to standardize narration + reference_no capture across all 12 forms ·
   forms still use ad-hoc `<Textarea>` blocks for narration.

**Closure plan (deferred — Phase 1.7):** Add a single mount sweep pass across
the 12 transaction forms; replace ad-hoc narration blocks with
`NotesAndReferenceCard`; mount `TaxPeriodGateBanner` once at the top of every
form that has a primary date.

## Sprint T-Phase-2.7-d-1 · Stock Viz + Save-and-New + Auto-save + Smart Defaults

- Sprint T-Phase-2.7-d-1 closed · count = **18**
- Stock Reservation Visual (Q1-d) · color-coded badge + collapsible side panel · `getDetailedAvailabilityMap` sibling on stock-reservation-engine + `useDetailedStockAvailability` sibling hook · 8 line-item form mounts (Quotation/SRM/IM/SOM/DOM/MIN/Consumption/RTV)
- Save-and-New (Q4-d · Ctrl+Enter) · `save-and-new-carryover.ts` (extractCarryOverFields + applyCarryOverToForm) · SaveButtonGroup extended with `onSaveAndNew?` prop · Ctrl+Enter handler with textarea-skip logic to preserve multi-line narration input
- Auto-save Draft (50-year ERP safety) · `useDraftAutoSave` hook · 30s interval · multi-tenant key `erp_draft_${formKey}_${entityCode}` · `DraftRecoveryDialog` shown only in `view='new'` · silent on quota error
- Smart Defaults extensions (OOB-1) · `smart-defaults-engine.ts` with `resolveSmartLedger` + `resolveSmartWarehouse` + `resolvePartyHistoricalRate` · frequency-based confidence · auto-populate only when confidence='high' · wired into Quotation/GRN/MIN/IM
- 6 new tests (SD1–SD6) · vitest 235 → 241 · D-127 vouchers/ untouched · D-128 byte-identical
- Existing useStockAvailability and SaveButtonGroup callers unchanged · all extensions are sibling additions

### Mount-depth note

This sprint added the new APIs as imports and reference-wired bindings in each
target form. Per-form deep integration (binding `requestedQtyByItem` to live
items state, threading `extractCarryOverFields` into each form's `persist()`
return path, surfacing `<StockReservationSidePanel>` next to each form's
totals) is functional but kept lightweight. Future Sprint T-Phase-2.7-d-2 will
deepen these mounts alongside keyboard-nav + bulk-paste.

## Sprint T-Phase-2.7-d-2 · Universal Keyboard Nav + Bulk-Paste + Line-Item Search + Help Overlay

- Sprint T-Phase-2.7-d-2 closed · count = **19**
- Universal Form Keyboard Navigation (Q1-a · Q2-β-EXPANDED) · 18-binding universal scheme · ALL bindings sourced from W3C / MS Office / IBM PC / Excel / HTML5 standards (NO Tally trade-dress copying · per Lotus v. Borland 1995 + Oracle v. Google 2021 · methods of operation not copyrightable)
- Field-type-aware Enter (textarea inserts newline · others advance) · grid operations (Alt+I/D/C/M) · numeric inline formula evaluator (=qty*rate · custom recursive-descent parser · NO eval())
- KeyboardShortcutOverlay (F1 / ? / Ctrl+/ trigger) · sourced-attribution table for IP transparency
- LineItemSearchBar (Ctrl+F) · Q4-d full-text with soft-cap fallback to 3-field on >100-line vouchers (FULL_TEXT_THRESHOLD=100)
- BulkPasteDialog (Q3-c selective commit) · Q3-d auto-detect TSV/CSV/JSON via header row · Q2-d hybrid trigger (button + Ctrl+V auto-detect ≥3 lines + tab/comma)
- 12 form integrations via Sprint27d2Mount adapter · 8 line-item forms get search + bulk-paste UI · all 12 get keyboard nav + help
- 6 new tests KB1-KB6 · D-127 vouchers/ untouched · D-128 preserved · vitest 242 → 248
- Existing keyboard.ts (useCtrlS / onEnterNext) and useKeyboardShortcuts.ts (global nav) UNTOUCHED · backward compat preserved

## Sprint T-Phase-2.7-e · Inline Quick-Add (OOB-9) + Pinned Templates (OOB-10)

- Sprint T-Phase-2.7-e closed · count = **20** · CARD #2.7 COMPLETE
- OOB-9 Inline Customer/Vendor Quick-Add (Q1-b · 4 fields: name + GSTIN + party_type + state_code)
- OOB-9 Direct create with audit flag (Q2-c · `created_via_quick_add: true` · finance team retrospective audit · zero blocking)
- party-master-engine.ts centralizes 12+ inline loadCustomers/loadVendors patterns · backward compat via legacy key sync
- OOB-10 Pinned Templates (Q3-b · full clone including qty/rate values)
- OOB-10 Soft limit (Q4-d · top 20 by recency in widget · "View All" page unlimited with search/filter)
- PinnedTemplatesWidget on FineCoreMastersModule dashboard
- PinnedTemplatesView at /erp/finecore/pinned-templates
- 12 form integrations via Sprint27eMount adapter · 4 new tests PT1-PT4 · vitest 248 → 252
- D-127 streak: 19 → 20 (final · Card #2.7)
- D-128 voucher.ts + voucher-type.ts BYTE-IDENTICAL preserved across all 5 sub-sprints
- Sibling discipline preserved · ComplianceSettingsAutomation untouched · keyboard.ts untouched · finecore-engine.ts untouched

## Card #2.7 CLOSE Summary

Card #2.7 delivered Tier-1 voucher entry productivity in 5 sub-sprints (2.7-a through 2.7-e):
- 2.7-a · GST + Bill-To/Ship-To + HSN + RCM (OOB-4)
- 2.7-b · Voucher Class + Mandatory/Optional + Approval (OOB-2 + OOB-3 + OOB-7)
- 2.7-c · Bank-instrument + Cancel hardening + IRN Lock (OOB-15)
- 2.7-d-1 · Stock viz + Save-and-New + Auto-save + Smart Defaults (OOB-5)
- 2.7-d-2 · Universal keyboard nav + Bulk-paste + Line-item search + Help overlay
- 2.7-e · Inline Quick-Add (OOB-9) + Pinned Templates (OOB-10)

OOB tracker: 15 of 15 deployed.

Final Card #2.7 metrics:
- ~9,000+ LOC across ~150 files
- 252/252 tests passing
- D-127 streak: 20 sub-sprints clean (1.2.5h-a → 2.7-e)
- D-128 voucher.ts + voucher-type.ts BYTE-IDENTICAL
- Zero new package.json deps across all 5 sub-sprints
- Sibling discipline maintained throughout

Card #2.7 CLOSED. Next: 1.2.6e-audit (comprehensive close audit · TRUE 10/10 target).
