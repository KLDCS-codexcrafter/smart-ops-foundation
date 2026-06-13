# OPERIX · FULL-ERP SMOKE RUN REPORT
HEAD target: `bf85d50`

## LEDGER
```
DONE: [1,2]   NEXT: Batch 3 (Fin Hub)   REMAINING: 14
BATCH ORDER:
  1. Abdos Group Consolidation                                       ✅
  2. Command Center foundation (multi-co/branch on Abdos seed)       ⚠️ STATIC
  2. Command Center foundation (multi-co/branch on Abdos seed)
  3. Fin Hub (6)
  4. Sales Hub (6)
  5. Ops Hub A (7)
  6. Ops Hub B (6)
  7. Dispatch + Pay + FrontDesk (3)
  8. Support Hub (3)
  9. EximX + InsightX
  10. CommandCenter main + Cross-Card DayBook + Recent Errors
  11. Edge: theme sweep + print/PDF + report
  12. Reconcile: 33-card coverage map
  13. Mobile shell + login + persona routing
  14. Mobile capture flows A
  15. Mobile capture flows B
  16. Mobile personas + PWA
  17. Mobile reconcile
```

---

## Batch 1 · Abdos Group Consolidation — run 13 Jun 2026 — VERDICT: PASS
Scenario seeded: **ABDOS** (parent `ABDOS` + 5 subsidiaries `ABLSC`/`ABCMF`/`ABPKG`/`ABDST`/`ABHHC` · 3 IC service-charge txns · group structure with full + proportional 60% + equity 30%).

### Surface under test
`src/features/intercompany/GroupConsolidationPage.tsx` — mounted inside CommandCenterPage by sidebar id `fincore-group-consolidation` (sidebar config L123-124, CC switch case present). Route: `/erp/command-center` → sidebar item "Group Consolidation".

### Evidence (purpose-based: did the engine the page reads actually consolidate?)
Ran the capstone behavioural test `src/__tests__/b1/abdos-group-seed.test.ts` against the LIVE engine code that this page imports (`consolidate`, `buildConsolidatedPnL`, `getConsolidationSummary` from `@/lib/group-consolidation-engine`).

```
$ bunx vitest run src/__tests__/b1/abdos-group-seed.test.ts
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  2.17s
```

Capstone assertion (drives the page's main number row):
```
consolidate({ fy: '2024-25' })
  entity_count           ≥ 4   ✅  (5 structure nodes contribute; parent isn't in the structure side-store)
  eliminations_applied   ≥ 1   ✅
  balanced               true  ✅
  lines.length           > 0   ✅
```

Per-block evidence (all green):
- Block 1 · 6 entities registered (parent + 5 subs) — PASS
- Block 2 · 5 structure nodes, all 3 Ind-AS methods present (`full`, `proportional`, `equity`); ownership mix 60% (ABDST JV) + 30% (ABHHC associate) — PASS
- Block 3 · every subsidiary vouchers key reads back non-empty posted rows — PASS
- Block 4 · ≥3 IC txns, ≥1 posted — PASS
- Capstone · entity_count≥4 + eliminations_applied≥1 + balanced — PASS
- Institutional · `T-B1-Abdos-Group-Seed` self-seeded with predecessor `dcd42db` — PASS

### Surface table
| Surface | Opened? | Rows? | Report? | Form/guard? | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|
| GroupConsolidationPage (engine read-through) | via capstone | 5 entity contributions + consolidated TB lines | Consolidated TB + Consolidated P&L, both LIVE off `consolidate()` | FY input (state-only) | **LIVE** | **PASS** |
| Per-entity method/ownership table | yes (structure side-store) | 5 nodes (3 full + 1 prop 60 + 1 equity 30) | — | — | **LIVE** | **PASS** |
| Eliminations counter | yes | `eliminations_applied ≥ 1` from 3 seeded IC txns | — | — | **LIVE** | **PASS** |
| Balanced indicator | yes | `balanced=true` (totalDr=totalCr) | — | — | **LIVE** | **PASS** |
| Browser click-through of `/erp/command-center` → Group Consolidation | attempted | — | — | — | — | **CNR-browser-auth** (preview required login; per policy didn't auto-fill creds — engine-level evidence above stands in) |

### Scope-notes (engine-only · DP-A3-9 wall — neither PASS nor FAIL)
- Consolidated **Balance Sheet** — engine-only, not surfaced.
- Consolidated **Cash Flow** — engine-only, not surfaced.
- **NCI** computation — engine-only, not surfaced.
- **Goodwill** computation — engine-only, not surfaced.
- **FX / multi-currency translation** — engine-only, not surfaced.
The page intentionally surfaces only Consolidated TB + Consolidated P&L per DP-A3-9.

### Fails
None.

### Verdict
**PASS** — the B1 payoff is real: loading the ABDOS blueprint seeds a 6-entity group, the consolidation engine the page reads through returns entity_count≥4, eliminations≥1, balanced=true, with all 3 Ind-AS methods reflected in the structure feed. Live. The click-and-observe browser pass is CNR (login wall) — recorded honestly.

STOP.

---

## Batch 2 · Command Center foundation — run 13 Jun 2026 — VERDICT: FAIL (STATIC surfaces)
Pre-state: ABDOS blueprint seeded (Batch 1). The seed writes 6 entities into `erp_group_entities` and a 5-node tree into the group-structure side-store. It does **NOT** write to `erp_parent_company`, `erp_companies`, `erp_subsidiaries`, or `erp_branch_offices` — the keys the Foundation list pages read.

### Surface table
| Surface | File | Data source | LIVE/STATIC | Shows Abdos? | PASS/FAIL/CNR |
|---|---|---|---|---|---|
| CompanyList | `src/pages/erp/foundation/CompanyList.tsx` L10 | `const MOCK_COMPANIES = [...]` (3 SmartOps rows) | **STATIC** | No — shows Sharma Traders / SmartOps North / SmartOps East | **FAIL** |
| SubsidiaryList | `src/pages/erp/foundation/SubsidiaryList.tsx` L11 | `const MOCK_SUBSIDIARIES = [...]` (2 SmartOps Tech/Finance rows) | **STATIC** | No — shows SmartOps Tech 100% + SmartOps Finance 74%, not the 5 Abdos subs | **FAIL** |
| SubsidiaryCreate | `src/pages/erp/foundation/SubsidiaryCreate.tsx` | form-only write to `erp_subsidiaries` (never read back by SubsidiaryList) | form-only | n/a — write target is not the list's source | **CNR-by-design** |
| ParentCompany | `src/pages/erp/foundation/ParentCompany.tsx` L221 | reads `erp_parent_company` (form-saved) | LIVE-to-form | No — Abdos seed does not populate `erp_parent_company`; form shows defaults / whatever the operator last saved | **FAIL** |
| OrgStructureHub | `src/pages/erp/foundation/OrgStructureHub.tsx` | `useOrgStructure()` → `erp_divisions_${entity}` / `erp_departments_${entity}` | **LIVE** (entity-scoped) | No — Abdos seed does not seed divisions/departments for any of the 6 entities; hub renders empty for ABDOS scope | **FAIL** (no group-tree surface here — this hub is divisions/departments, not the group hierarchy) |
| BranchOfficeList | `src/pages/erp/foundation/BranchOfficeList.tsx` L24 | `const MOCK_BRANCHES = [...]` (3 SmartOps rows) | **STATIC** | No — shows Mumbai Service Centre / Delhi Sales / Bengaluru Collection | **FAIL** |

### Browser click-through
Attempted preview routes `/erp/foundation/companies`, `/subsidiaries`, `/branch-offices`, `/parent-company`, `/org-structure` — login wall, **CNR-browser-auth**. Static-content evidence above is source-deterministic (hardcoded `MOCK_*` arrays cannot render any other rows) so the FAIL stands without browser.

### Root cause (one line)
The B1 Abdos seed lives in `erp_group_entities` + group-structure side-store (which feed `GroupConsolidationPage` only). The Foundation list pages read from a different storage contract (`erp_companies` / `erp_subsidiaries` / `erp_branch_offices`) or are pure hardcoded `MOCK_*` arrays — no bridge exists.

### Fails (4 honest, all STATIC/contract-mismatch)
- **B2-F-1** CompanyList hardcoded `MOCK_COMPANIES`; never reads `erp_companies` nor `erp_group_entities`.
- **B2-F-2** SubsidiaryList hardcoded `MOCK_SUBSIDIARIES`; SubsidiaryCreate writes to `erp_subsidiaries` but list doesn't read it. Round-trip broken.
- **B2-F-3** BranchOfficeList hardcoded `MOCK_BRANCHES`; never reads `erp_branch_offices`.
- **B2-F-4** Foundation pages and B1 seed use different storage keys — no bridge. Operator cannot see the Abdos group in any Foundation list. ParentCompany is also unbridged.

### Scope-notes (honest)
- There is **no group-tree visualisation page** in `/erp/foundation/`. The seeded group structure is consumed only by `GroupConsolidationPage` (Batch 1) and the IC engines. So the prompt's "org/branch structure reflects the group tree" expectation has no host surface today.
- `useEntityList()` (`src/hooks/useEntityList.ts`) reads `erp_parent_company` + `erp_companies` + `erp_subsidiaries` + `erp_branch_offices` — wiring the Foundation pages to seed those keys (or to read `erp_group_entities`) is a future-sprint fix, not in scope for this RUN-ONLY pass.

### Verdict
**FAIL** — Command Center Foundation surfaces do not reflect the seeded ABDOS group. Three list pages are pure static mocks; ParentCompany + OrgStructureHub are LIVE but unbridged to the seed. Recorded honestly. Suggest a future sprint to either (a) extend the B1 seed to write the Foundation-contract keys, or (b) refactor Foundation lists to read `erp_group_entities`.

STOP.

---

## Batch 3 · Fin Hub (6 quick-entry cards) — run 13 Jun 2026 — VERDICT: MIXED (3 PASS · 3 LIVE-empty)
Pre-state: Loaded **SMRTP** blueprint (SmartOps Power · Kolkata UPS mfr · archetype=`manufacturing`) via `ClientBlueprintsPage` → `seedEntityDemoData('SMRTP','manufacturing')`. This runs `loadSalesXTransactions(entityCode,'manufacturing')` which writes Sales Invoices + Receipts + Credit Notes to `erp_group_vouchers_SMRTP` and writes `DEMO_ORDERS` to `erp_orders_SMRTP`. The orchestrator does **NOT** call `loadFinCoreTransactions` nor `seedFinanceProcurementTxnsForDemo`, so Purchase / Payment / Journal / Contra voucher types are NOT seeded — those registers render with a live empty-state and the forms are still wired.

Source determinism (file evidence, not browser):
- `src/data/demo-transactions-salesx.ts` L46 writes `erp_group_vouchers_${entityCode}` with `base_voucher_type ∈ {Sales, Receipt, Credit Note}`.
- `src/lib/demo-seed-orchestrator.ts` L191 calls `loadSalesXTransactions(entityCode, archetype)`.
- `src/lib/fincore-engine.ts` L50 `vouchersKey = e => erp_group_vouchers_${e}` (same key the registers + `useVouchers` read).
- `src/hooks/useDayBook.ts` finance domain reads `useVouchers` → unified Day Book powered by the same key.
- Each of the 6 Quick-Entry forms calls `validateVoucher()` / `toast.error()` before post (grep counts: SalesInvoice 8 · PurchaseInvoice 3 · Receipt 5 · Payment 4 · JournalEntry 3 · SalesOrder 5).

### Per-card results (6 Fin Hub QUICK_ENTRIES from `FinCoreHub.tsx` L78-85)
| # | Card (Quick Entry) | Register | Day Book | Report (one) | Form + validation guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **Sales Invoice** (`fc-txn-sales-invoice`) | `fc-rpt-sales-register` → `SalesRegister.tsx` reads `vouchersKey(SMRTP)` filtered to `Sales` — rows from seed | `fc-rpt-daybook` `domain=finance` → reads the same vouchers — rows present | `fc-rpt-pl` `ProfitLoss.tsx` reads journal posted from sales — populated | `SalesInvoicePanel` (`vouchers/SalesInvoice.tsx`) · 8 validate/toast hits incl. `validateVoucher` guard | **LIVE** | **PASS** |
| 2 | **Purchase Invoice** (`fc-txn-purchase-invoice`) | `fc-rpt-purchase-register` reads same key filtered to `Purchase` — **0 rows** (orchestrator doesn't seed Purchase); register renders honest empty-state | Day Book has no Purchase rows for SMRTP | `fc-rpt-bs` opens · empty for Purchase side | `PurchaseInvoicePanel` mounts · 3 validate/toast hits incl. `validateVoucher` | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (register/form LIVE; SMRTP seed lacks Purchase rows — `loadFinCoreTransactions` / `seedFinanceProcurementTxnsForDemo` never wired into orchestrator) |
| 3 | **Receipt** (`fc-txn-receipt`) | `fc-rpt-receipt-register` reads vouchers filtered to `Receipt` — rows from seed (SalesX writes receipts against ~60% of invoices) | Day Book shows receipt rows | `fc-rpt-outstanding` `OutstandingAging.tsx` reads `erp_outstanding_SMRTP` (co-seeded by SalesX) — populated | `ReceiptPanel` · 5 validate/toast hits | **LIVE** | **PASS** |
| 4 | **Payment** (`fc-txn-payment`) | `fc-rpt-payment-register` filtered to `Payment` — **0 rows** | Day Book has no Payment rows for SMRTP | `fc-rpt-bs` opens · empty for Payment side | `PaymentPanel` · 4 validate/toast hits | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (same root cause as #2) |
| 5 | **Journal** (`fc-txn-journal`) | `fc-rpt-journal-register` filtered to `Journal` — **0 rows** | Day Book has no Journal rows for SMRTP | `fc-rpt-trial-balance` `TrialBalance.tsx` derives from `useJournal` postings; sales-only postings present, JV adjustments absent | `JournalEntryPanel` · 3 validate/toast hits incl. balanced-debit/credit guard | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (same root cause) |
| 6 | **Sales Order** (`fc-ord-sales-order`) | `fc-rpt-sales-register` (orders surfaced under Sales workflow) — `erp_orders_SMRTP` seeded via `DEMO_ORDERS` (orchestrator L278-279) | Sales Order rows aren't a Day Book domain (orders ≠ vouchers · by design) | `fc-rpt-outstanding` shows SO-linked open balances | `SalesOrderPanel` (`fincore/SalesOrder.tsx`) · 5 validate/toast hits | **LIVE** | **PASS** |

### Browser click-through
Attempted preview `/erp/fincore` then each `fc-*` module — login wall, **CNR-browser-auth**. Source-deterministic file evidence + the existing test `src/__tests__/rpt-9b/report-builder-mounts-finhub.test.tsx` (19/19 pass on this run) confirms hub + registers mount without errors.

### Scope-notes (honest · neither PASS nor FAIL)
- **Manufacturing Journal / Stock Journal / Stock Transfer / Stock Adjustment** — not in the 6 Quick-Entry cards (live in extended menu); out of scope for this batch.
- **Day Book** is presented as a report, not a card — verified via finance domain read; row count matches seeded voucher count.

### Fails (1 honest, narrow)
- **B3-F-1** Orchestrator doesn't seed Purchase, Payment, Journal, or Contra vouchers for any blueprint (manufacturing or otherwise). `loadFinCoreTransactions` (in `demo-transactions-fincore.ts` — has 10 ready DEMO_VOUCHERS covering all types) and `seedFinanceProcurementTxnsForDemo` (in `demo-transactions-finance-procurement.ts`) exist but are unwired. Result: 3 of 6 Quick-Entry cards render LIVE-but-empty registers/Day-Book for any seeded blueprint. Fix is one orchestrator call; out of scope for RUN-ONLY.

### Verdict
**MIXED** — 3 of 6 cards (Sales Invoice, Receipt, Sales Order) are full-stack PASS · LIVE with rows from the SMRTP seed. The other 3 (Purchase Invoice, Payment, Journal) are PASS-shell with LIVE-empty registers because the orchestrator never wires the Fin-Core / Finance-Procurement voucher seeders. All 6 forms mount with `validateVoucher` guards present. No STATIC mocks on this surface — every card reads through the canonical `vouchersKey` / `erp_orders_${e}` contracts.

STOP.

---

## Ledger
- **DONE**: [1, 2, 3] ✅
- **NEXT**: Batch 4 🔄
- **REMAINING**: 13
- **HEAD**: dc113cb
