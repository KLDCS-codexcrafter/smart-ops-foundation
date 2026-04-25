# D-119 to D-124 — Sheet 8 Backfill Drafts (H1.5-D Decisions)

**Sprint:** T-H1.5-Z-Z1b
**Date:** Apr-2026
**Format:** OWW 10-column (Decision · Date · Question · Options · Resolution · Status · ISO impact · Thinking lens · Risk-if-wrong · Rollback) embedded in 6-column Sheet 8 layout
**Action required:** Founder pastes rows R139-R144 into Sheet 8 of v14 roadmap → produces v15.

---

## D-119 — Notional Interest Log Storage Pattern

```
D-119 || Apr-2026 || H1.5-D5 notional-interest log — unify with AccrualLog or dedicated store? || Unified with AccrualLog (single store) / Dedicated erp_notional_interest_log_{e} store / Inline in BorrowingLedger / In-memory only (no audit) || DEDICATED erp_notional_interest_log_{e} store — notional interest postings have distinct lifecycle (cron-driven, advance-aging-based, reversible) vs AccrualLog (loan-EMI accrual). Mixing the two stores would force union-type log entries and complicate cancel-cascade logic. Dedicated store keeps each posting engine's storage isolated per the engine-as-consumer pattern (Rule 1 spirit). Linked to D5 sprint deliverable advance-ageing-engine.ts. || LOCKED || Maintainability (HIGH+ modular) · Reliability (HIGH+ isolated cancel cascades) || Convergent + Analytical (decomposed cascade-risk scenarios) || Risk-if-wrong cross-store coupling complicates Phase 2 backend migration · Rollback re-merge stores during Sprint A-5 Engine Purity Refactor
```

---

## D-120 — IGST Default for GST on Loan Charges

```
D-120 || Apr-2026 || H1.5-D4 GST on loan charges — IGST default or per-state CGST+SGST? || IGST always (interstate default) / Capture lender state code per loan + branch logic / Defer to Phase 2 / Allow tenant config || IGST DEFAULT for D4 scope · per-state CGST+SGST deferred to D4-P5 polish item — most loan-providing entities (NBFCs, banks with central lending) operate cross-state. IGST is the safer default that posts mathematically identical totals. The few intra-state cases (local cooperative banks) are captured in D4-P5 future work item. Avoids needing lenderStateCode schema field in D4 scope. Linked to D4 sprint deliverable gst-on-charges-engine.ts. || LOCKED || Functional Suitability (HIGH covers 90%+ of cases) · Compatibility (intra-state correction available later without data migration) || Convergent + Pragmatic (80-20 rule) || Risk-if-wrong GST regulator audit flags wrong tax type on intra-state loan charges · Rollback D4-P5 sprint adds lenderStateCode + branch logic; existing IGST entries can be re-classified via amendment voucher
```

---

## D-121 — Auto-Create of New Ledger Types via Resolver Extension

```
D-121 || Apr-2026 || H1.5-D ledger-resolver pattern — add new ledger kinds via extension or via seed-data update? || Extend ledger-resolver.ts ExpenseLedgerKind union (purely additive) / Update finframe-seed-data.ts default ledger list / Both / Manual creation by user || EXTEND ledger-resolver.ts ONLY · D2 added 5 new kinds (interest_paid, penal_interest, bounce_charges, processing_fee, prepayment_charges); D5 added 2 more (notional_interest_income, advance_writeoff) — 10 total kinds. Pattern is purely additive — existing entries untouched. Auto-create on first use means no seed-data churn and no migration concern. seed-data updates are reserved for genuinely-new mandatory ledgers. Resolver extension is the right pattern for "this might be needed for some entities" categories. || LOCKED || Maintainability (HIGH+ additive scaling) · Reliability (HIGH+ zero migration risk) · Compatibility (Phase 2 portability preserved) || Abstract (resolver pattern) + Convergent (chose 1 of 4) || Risk-if-wrong explosion of ledger kinds eventually unmaintainable · Rollback at S7 Master Infrastructure sprint, audit kind list and consolidate any redundant entries
```

---

## D-122 — Duplicate Detector Tolerance Hardcoded

```
D-122 || Apr-2026 || H1.5-D3 duplicate-detector tolerance values (amount + days) — hardcoded or configurable? || Hardcoded ±₹0.50 amount + ±3 days (current) / System settings UI (D3-P3 polish) / Per-entity configurable / ML-based fuzzy match || HARDCODED for D3 scope · configurable UI deferred to D3-P3 polish item — current fixed thresholds match real-world EMI payment patterns (rounding to nearest rupee, 2-3 day banking delays). Adding configurability before any tenant has hit a false-positive or false-negative is premature. Future tunability via D3-P3 sprint when actual tenant data informs the right ranges. Linked to D3 sprint deliverable duplicate-detector.ts. || LOCKED || Usability (HIGH sensible defaults) · Functional Suitability (covers H1.5-D test scenarios) || Convergent + Pragmatic deferral || Risk-if-wrong tenant with unusual payment patterns hits false-match · Rollback D3-P3 promotes to settings UI without data migration (engine reads from config; falls back to hardcoded values if config absent)
```

---

## D-123 — Advance Aging Threshold Hardcoded

```
D-123 || Apr-2026 || H1.5-D5 advance aging threshold for notional interest — hardcoded or configurable? || Hardcoded 60 days + 9% pa / Settings UI (D5-P4) / Per-vendor / Per-industry / Tenant-level || HARDCODED 60 days + 9% pa for D5 scope · configurable UI deferred to D5-P4 polish — chosen values are tax-defensible defaults (60 days = roughly 2 GST cycles · 9% pa = SBI MCLR-aligned in Apr-2026). Premature configurability adds settings-UI surface without proven need. D5-P4 promotes to settings when first tenant requests deviation. Linked to D5 sprint deliverable advance-ageing-engine.ts. || LOCKED || Functional Suitability (defensible defaults) · Compatibility (config-fallback path keeps data forward-compatible) || Convergent + Pragmatic || Risk-if-wrong aggressive industries push back on 60-day threshold · Rollback D5-P4 settings UI; existing notional postings stay valid as historical entries (engine reads tenant override if set, falls back to hardcoded)
```

---

## D-124 — Dedicated Advance Register Storage

```
D-124 || Apr-2026 || H1.5-D5 advance register — unified employee+vendor+customer store or dedicated stores? || Unified erp_advances_{e} including employee advances / Dedicated erp_advances_{e} for vendor/customer · separate erp_employee_loans_{e} for employee / Per-party-type store / Single global store || DEDICATED stores per party-type · employee advances stay in EmployeeOpeningLoansModule per existing schema · vendor/customer advances in new erp_advances_{e} — employee advances have distinct lifecycle (salary deduction, employment-tenure scoping) vs vendor/customer advances (invoice settlement, aging-based). Forcing union schema would complicate both. D5-P1 future work item documents the eventual unification path with proper migration. Linked to D5 sprint deliverables advance-master + advance-ageing-engine. || LOCKED || Maintainability (HIGH separation of concerns) · Reliability (HIGH+ existing employee data untouched) · Compatibility (Phase 2 unification path documented) || Analytical (lifecycle decomposition) + Convergent || Risk-if-wrong AdvanceRegisterWidget doesn't show employee advances · Rollback D5-P1 unification sprint with migration script (employee_loans → unified_advances · party_type='employee')
```

---

**Founder action:** Paste D-119 to D-124 into Sheet 8 row R139-R144 of v14 roadmap. Claude will produce v15 after Z1b close.
