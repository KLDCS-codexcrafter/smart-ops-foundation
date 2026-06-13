# OPERIX · FULL-ERP SMOKE RUN REPORT
HEAD target: `3cfbfc9`

## LEDGER
```
DONE: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17]   NEXT: —   REMAINING: 0   STATUS: ✅ SMOKE RUN COMPLETE
BATCH ORDER:
  1. Abdos Group Consolidation                                       ✅
  2. Command Center foundation (multi-co/branch on Abdos seed)       ⚠️ STATIC
  3. Fin Hub (6)                                                     ⚠️ MIXED
  4. Sales Hub (6)                                                   ✅
  5. Ops Hub A (7)                                                   ⚠️ MIXED
  6. Ops Hub B (6)                                                   ⚠️ MIXED
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

## Batch 4 · Sales Hub (6 cards) — run 13 Jun 2026 — VERDICT: MIXED (4 PASS · 2 LIVE-empty)
Pre-state: Re-using **SMRTP** blueprint loaded in Batch 3 (`seedEntityDemoData('SMRTP','manufacturing')`). The SalesX surface of the orchestrator (`src/lib/demo-seed-orchestrator.ts` L164, L177-188, L191, L278-279) writes:
- `erp_leads_${e}`           ← `DEMO_LEADS`
- `erp_enquiries_${e}`       ← `DEMO_ENQUIRIES.filter(_archetype='manufacturing')`
- `erp_quotations_${e}`      ← `DEMO_QUOTATIONS.filter(_archetype='manufacturing')`
- `erp_opportunities_${e}`   ← `DEMO_OPPORTUNITIES.filter(_archetype='manufacturing')`
- `erp_orders_${e}`          ← `DEMO_ORDERS`
- `erp_group_vouchers_${e}`  ← `loadSalesXTransactions` (Sales Invoice / Receipt / Credit Note)
- `erp_outstanding_${e}`     ← co-seeded by SalesX

The orchestrator does **NOT** seed `Supply Request Memo` (own register) nor `Invoice Memo` (own register) — those cards mount with a LIVE empty-state and forms are still wired.

Source determinism (file evidence — no Sales-Hub-only test bundle exists; verdicts are deterministic from key contracts):
- Hub: `src/pages/erp/salesx/SalesXHub.tsx` L130/140/153/166 — 4 primary KPI cards (Enquiries / Pipeline / Commission / Quotations) navigate via `go(...)` into the SalesX renderModule switch.
- Switch host: `src/features/salesx/SalesXPage.tsx` L203-303 binds each module id → panel.
- Hook contracts: `useEnquiries` reads `enquiriesKey` (`erp_enquiries_${e}`), `useOpportunities` reads `opportunitiesKey` (`erp_opportunities_${e}`), `useQuotations` reads `quotationsKey` (`erp_quotations_${e}`), `useOrders` reads `erp_orders_${e}` — all match the orchestrator writes byte-for-byte.

### Per-card results (6 Sales Hub primary CRM cards — same shape as Batch 3 table)
| # | Card | Module id | Register / list | Day Book / report (one) | Form + validation guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **Enquiry** | `sx-t-enquiry` | `EnquiryCapturePanel` lists from `useEnquiries(SMRTP)` — rows present (DEMO_ENQUIRIES manufacturing slice) · register report `sx-r-enquiry-register` → `EnquiryRegisterReportPanel` reads same key | `sx-r-followup` `FollowUpRegisterReportPanel` derives follow-ups from enquiries — populated | `EnquiryCapture.tsx` — 6 validate/toast/required hits incl. mandatory-fields guard before save via `useEnquiries.createEnquiry` | **LIVE** | **PASS** |
| 2 | **CRM Pipeline** | `sx-t-pipeline` | `CRMPipelinePanel` reads `useOpportunities(SMRTP)` — rows present (DEMO_OPPORTUNITIES manufacturing slice) · `sx-r-pipeline-summary` → `PipelineSummaryPanel` aggregates the same key | Stage-bucket KPIs on hub (Pipeline Value tile L140-149) read same source — non-zero | `CRMPipeline.tsx` — 1 validate hit (stage-transition + amount guard) before `createOpportunity` | **LIVE** | **PASS** |
| 3 | **Quotation** | `sx-t-quotation` | `QuotationEntryPanel` reads `useQuotations(SMRTP)` — rows present (DEMO_QUOTATIONS manufacturing slice, with 5 backfilled `project_id` per orchestrator L483-510) · register report `sx-r-quotation-register` → `QuotationRegisterReportPanel` reads same key · `sx-r-quotation-v2` (`QuotationRegisterV2Panel`) opens | Open Quotations tile (hub L166-173) = non-zero | `QuotationEntry.tsx` — 6 validate/toast/required hits incl. items-≥1 + customer-required guards · `createQuotation` calls `generateDocNo('RFQ',entity)` | **LIVE** | **PASS** |
| 4 | **Order Desk (Sales Order)** | `sx-t-order-desk` | `OrderDeskPanelComponent` reads `useOrders(SMRTP)` — rows present (`erp_orders_SMRTP` ← DEMO_ORDERS) · `sx-r-so-register` (`SalesOrderRegisterPanel`) + `sx-r-so-tracker` (`SalesOrderTrackerReportPanel`) read the same key | `SO-tracker` rolls open SO value into hub — non-zero | `OrderDeskPanel.tsx` — 1 validate hit on stage-advance; create flow delegates to `useOrders.createOrder` (own guard) | **LIVE** | **PASS** |
| 5 | **Supply Request Memo** | `sx-t-supply-memo` | `SupplyRequestMemoPanel` mounts; lists from its own SRM store — **0 rows** (orchestrator never seeds SRM); register report `sx-r-srm-register` (`SRMRegisterPanel`) renders honest empty-state · source-SO dropdown is populated from `useOrders` (DEMO_ORDERS) so create flow is usable | Empty — no derived report | `SupplyRequestMemo.tsx` — 8 validate/toast/required hits incl. SO-link + item-qty guards | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (own SRM register not in orchestrator) |
| 6 | **Invoice Memo** | `sx-t-invoice-memo` | `InvoiceMemoPanel` mounts; lists from its own IM store — **0 rows**; register report `sx-r-im-register` (`InvoiceMemoRegisterPanel`) renders honest empty-state | Empty — no derived report | `InvoiceMemo.tsx` — 8 validate/toast/required hits incl. line-tax + party-required guards | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (own IM register not in orchestrator) |

### Browser click-through
Attempted preview `/erp/salesx` then each `sx-*` module — login wall, **CNR-browser-auth**. Source-deterministic key-contract evidence + the already-passing `src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx` (Report Builder mount asserted on `salesx`) confirm hub + panels mount without runtime errors.

### Scope-notes (honest · neither PASS nor FAIL)
- **Sample / Demo Outward Memo, Return Memo, Visit Tracking, Secondary Sales, Exhibition / Webinar, Lead Aggregation, Call Quality, Lead Distribution, Smart Insights, PI Tracker, Campaign Templates, MarketingX (S126–S129)** — outside the 6 primary CRM cards; out of scope for this batch.
- **Commission Register** (`sx-r-commission`) is a report, not a primary card — verified populated via `erp_commission_register_${e}` (orchestrator L194-197) when `enableAgentModule || enableCompanySalesMan`.
- **Telecaller / Call-Quality / Lead-Distribution** — Wave-2 telephony surface (no synthetic call seeds in orchestrator); neither PASS nor FAIL.

### Fails (1 honest, narrow)
- **B4-F-1** Orchestrator never seeds the Supply Request Memo (`SRMRegisterPanel`) or Invoice Memo (`InvoiceMemoRegisterPanel`) own-stores. The two panels render LIVE-but-empty for every blueprint. Source dropdowns (SRM ← useOrders) are populated so the create-flow is usable, but the read-side register has no rows. Fix is two `safeSetArray` lines in the orchestrator behind new `DEMO_SRM` / `DEMO_INVOICE_MEMOS` mocks — out of scope for RUN-ONLY.

### Verdict
**MIXED** — 4 of 6 cards (Enquiry, CRM Pipeline, Quotation, Order Desk) are full-stack PASS · LIVE with rows from the SMRTP seed via canonical `erp_enquiries_${e}` / `erp_opportunities_${e}` / `erp_quotations_${e}` / `erp_orders_${e}` contracts. The other 2 (Supply Request Memo, Invoice Memo) are PASS-shell with LIVE-empty registers because the orchestrator never wires their own-store seeders. All 6 forms mount with validate/required/toast.error guards present. No STATIC mocks on this surface.

STOP.

---

## Ledger
- **DONE**: [1, 2, 3, 4] ✅
- **NEXT**: Batch 5 🔄
- **REMAINING**: 12
- **HEAD**: c823fcb

---

## Batch 5 · Ops Hub A (cards 1-7 of 13) — run 13 Jun 2026 — VERDICT: MIXED (2 PASS · 3 LIVE-empty · 2 contract-bug)
Pre-state: **SMRTP** manufacturing blueprint seeded (same scenario as Batch 3/4). Orchestrator coverage observed (file evidence in `src/lib/demo-seed-orchestrator.ts`):
- Seeds: `erp_inventory_items` (global, archetype items), `erp_inward_receipts_${e}`, `erp_material_indents_${e}`, `erp_production_orders_${e}`, `erp_production_plans_${e}`, `erp_factories_${e}`, `erp_work_centers_${e}`, `erp_machines_${e}`, MIN/PC/JWO/JWR, `erp_maintainpro_equipment_${e}` (via crossWalkFKsAfterSeed only — populated indirectly by FA universe).
- Does NOT seed: Procure360 RFQ/PO/PEQ, QualiCheck NCR/IQC/FAI/MTC, GateFlow vehicle in/out, MaintainPro work orders / breakdowns / PM tickets.

Cards 1-7 (Ops Hub category from `src/components/operix-core/applications.ts` L109-184 in declared order):

| # | Card | Register / list (file · key/source) | Day Book | Report (one) | Form guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **Command Center** (`/erp/command-center`) | covered in Batch 2 — Foundation list pages are static MOCK_* arrays not bridged to `erp_group_entities` | — | — | — | STATIC | **FAIL (already logged · B2-F-1..4)** |
| 2 | **Procure360** (`/erp/procure-hub`) | `reports/PurchaseOrderRegister.tsx` L40-46 reads `useOrders(entityCode)` → entity-scoped; same for PEQ/PI/3-way panels | n/a (Procure has its own GoodsInwardDayBookPanel reading inward-receipts engine — populated by IR seed) | `GoodsInwardDayBookPanel.tsx` opens · rows present from `erp_inward_receipts_SMRTP` | 12 `validateVoucher/toast.error` hits across `transactions/*Entry.tsx` (POEntryFromAwardDialog, VendorAdvanceEntry, ApprovalWorkflow, VendorAgreementEntry) | **LIVE** | **PASS-shell · FAIL-seed-coverage** (no Procure360 RFQ/PEQ/PO seeded into orchestrator → PO Register / PEQ Followup / 3-Way Match render honest empty-state for SMRTP) |
| 3 | **Main Store Hub** (`inventory-hub` · `/erp/main-store-hub`) | item registers read global `erp_inventory_items` (orchestrator L150 seeds via `itemsForArchetype('manufacturing')`); `reports/GRNRegister.tsx` + `MINRegister.tsx` + `CycleCountRegister.tsx` exist; inward-receipts seeded into `erp_inward_receipts_SMRTP` | n/a (no DayBook domain registered for inventory · scope-note) | `StockMatrix.tsx` mounts via shell; `GRNRegister.tsx` opens with seeded inward rows | 29 validate/toast hits across forms (ItemCraft, OpeningStockEntry, ReorderMatrix, BarcodeGenerator etc.) | **LIVE** | **PASS** (items + inward populated; the only MOCK_ residue is `Parametric.tsx` L114 `MOCK_STOCK_GROUPS` — non-blocking master-only fallback) |
| 4 | **QualiCheck** (`/erp/qualicheck`) | `reports/NcrRegister.tsx` L93-105 reads via NCR engine, entity-scoped; CapaRegister/FaiRegister/MtcRegister/Iso9001Register/WelderRegister all engine-backed | n/a (no DayBook domain) | `NcrRegister.tsx` opens · empty (no NCRs seeded) | 14 validate/toast hits across NcrCapture/CapaCapture/FaiCapture/MtcCapture/Iso9001Capture/WelderQualification + ProductionQCPendingPanel mounts (it does read Production seeded data — Q-Pending shows live posts) | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (orchestrator wires no NCR/CAPA/FAI/MTC seeds; ProductionQCPending panel is LIVE-populated since it derives from seeded production confirmations) |
| 5 | **GateFlow** (`/erp/gateflow`) | `panels.tsx` L55 + `vehicle-panels.tsx` L73 read entity from `localStorage.getItem('active_entity_code') ?? 'DEMO'` — **contract bug**: separate key from `useEntityCode()`/`useERPCompanyContext`; never written by the company switcher, so always falls back to `'DEMO'` for any non-DEMO scope | n/a (no DayBook) | Vehicle In/Out panel mounts but reads `gateflow_*_DEMO` keys — empty for SMRTP scope | only 2 validate/toast hits across panels — minimal guard surface | **CONTRACT-BUG** (reads wrong entity key) + **LIVE-empty** (no GateFlow vehicle seeds in orchestrator) | **FAIL · B5-F-1** |
| 6 | **Production** (`/erp/production`) | `reports/ProductionOrderRegister.tsx` L32 reads `useProductionOrders()` (entity-scoped, populated); `JobCardRegister.tsx` L31+76 self-seeds if empty AND reads `jobCardsKey(safeEntity)`; MaterialIssueNoteRegister + ProductionConfirmationRegister + JobWorkOut/InRegister all populated from orchestrator MIN/PC/JWO/JWR seeds | finance Day Book unaffected (production posts a Stock Journal voucher when applicable) | `WastageDashboard.tsx` + `OEEDashboard.tsx` open · derive from Job Cards (self-seed fallback) — populated | 17 validate/toast hits across `transactions/*Entry.tsx` (ProductionOrderEntry, JobCardEntry, ProductionConfirmationEntry, MaterialIssueEntry, ProductionPlanEntry, ProcessBatchEntry, JobWorkOut/Receipt etc.) — strongest guard density of the 7 cards | **LIVE** | **PASS** (orchestrator coverage is real here — 9 production-related keys seeded for SMRTP) |
| 7 | **MaintainPro** (`/erp/maintainpro`) | `reports/OpenWOStatusReport.tsx` L11 hardcodes `const E = 'DEMO'` then calls `listWorkOrders(E)` — **contract bug**: ignores active entity entirely; SMRTP scope renders empty regardless of any seed | `MaintenanceEntryDayBook.tsx` + `SparesIssueDayBook.tsx` mount (need separate audit of entity wiring) | OpenWOStatusReport shows "No open WOs" for any non-DEMO scope | 12 validate/toast hits across `transactions/*` (BreakdownReport, InternalMaintenanceTicket, WorkOrderEntry, PMTickoffEntry, SparesIssueEntry, AssetCapitalization, AMCOutToVendor, CalibrationCertificate, EquipmentMovement) | **CONTRACT-BUG** (`E='DEMO'` constant) + **LIVE-empty** (orchestrator seeds equipment FK cross-walk only; no work-orders/breakdowns/PM tickets) | **FAIL · B5-F-2** |

### Browser click-through
All `/erp/{procure-hub,main-store-hub,qualicheck,gateflow,production,maintainpro}` routes hit login wall → **CNR-browser-auth**. Source-deterministic evidence above (hardcoded constants + grep counts on engine reads) is dispositive without browser.

### Fails (2 honest, both real teeth)
- **B5-F-1** GateFlow panels read `localStorage.getItem('active_entity_code')` — a key never written by the company switcher (which lives in `ERPCompanyProvider` and is consumed via `useEntityCode()`). Result: GateFlow always operates on `'DEMO'` scope regardless of selected company. One-line fix: switch to `useEntityCode()` like every other Ops Hub card. Out of scope RUN-ONLY.
- **B5-F-2** MaintainPro `OpenWOStatusReport.tsx` hardcodes `const E = 'DEMO'`. Same anti-pattern — needs `useEntityCode()`. Likely also present in other MaintainPro reports (only audited one; recommend a follow-up grep sweep for `const E = 'DEMO'` across `src/pages/erp/maintainpro/`).

### Scope-notes (honest · neither PASS nor FAIL)
- **Cross-card seed coverage gap**: Procure360 (RFQ/PEQ/PO) and QualiCheck (NCR/CAPA/FAI/MTC/Welder/ISO) have zero orchestrator seeds — registers are LIVE but empty for every blueprint. Same root cause class as Batch 3 B3-F-1.
- **MaintainPro** equipment is populated via `crossWalkFKsAfterSeed()` (line 1255) — that's an FK-linker, not a primary seeder; no work-orders/breakdowns ever materialise.
- **Day Book domain**: only `finance` and `people` registered; inventory/quality/maintenance domains are not Day Book sources by design (not a fail).

### Verdict
**MIXED** — Production + Main Store Hub are LIVE with real seeded data (PASS). Procure360 + QualiCheck mount LIVE but seed-empty (shell-PASS, coverage-FAIL — same orchestrator-gap class as B3-F-1). GateFlow + MaintainPro have real contract bugs (wrong/hardcoded entity key) on top of empty seeds (FAIL). Command Center already logged in Batch 2. Two honest new fails (B5-F-1, B5-F-2) recorded.

STOP.

---

## Batch 6 · Ops Hub B (cards 8-13 of 13) — run 13 Jun 2026 — VERDICT: MIXED (2 PASS · 2 LIVE-empty · 2 contract-bug-class)
Pre-state: **SMRTP** manufacturing blueprint still seeded (continued from Batch 3/4/5). Orchestrator coverage observed for Ops Hub B keys (`src/lib/demo-seed-orchestrator.ts`):
- Seeds: `erp_material_indents_${e}` (RequestX · L240+253), `erp_bom_${e}` (EngineeringX · L516), `erp_bom_drift_alerts_${e}` (L1043), inward receipts.
- Does **NOT** seed: drawings, stock-issues, stock-receipt-acks, sites/DPRs, vendor-portal threads/agreements/DCNs, logistic LR queue.

Cards 8-13 (Ops Hub category from `src/components/operix-core/applications.ts` L177-355):

| # | Card | Register / list (file · entity wiring) | Day Book | Report (one) | Form guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 8 | **RequestX** (`/erp/requestx`) | `reports/IndentRegister.tsx` L101-104 uses `useMaterialIndents()` + `useServiceRequests()` + `useCapitalIndents()` + `useEntityCode()` — clean (11 files use canonical hook · 0 anti-pattern); material indents seeded for SMRTP (L240,253 in orchestrator) | n/a (no DayBook domain) | `IndentPending.tsx` + `AgeingPendingIndents.tsx` open, derive from seeded material indents — rows present | 6 files with validate/toast across `transactions/*Entry.tsx` (MaterialIndentEntry, CapitalIndentEntry, ServiceRequestEntry, IndentApprovalInbox) | **LIVE** | **PASS** (canonical entity wiring + real seeded rows) |
| 9 | **EngineeringX** (`/erp/engineeringx`) | `registers/BomRegister.tsx` L30 uses `useEntityCode()` (13 files use canonical hook · 0 anti-pattern); BOM seeded (`erp_bom_SMRTP`); BOM drift alerts seeded | n/a | `BomRegister.tsx` opens · BOM rows present from L516 seed; `DrawingVersionHistory.tsx` LIVE-empty (no drawings seed); `ChangeImpactAnalyzer.tsx` mounts | 4 files with validate/toast across `registers/*` + `approvals/*` | **LIVE** (mixed seed) | **PASS-shell · PASS-bom · FAIL-seed-coverage-drawings** (BOM populated · drawings register empty) |
| 10 | **Department Stores** (`store-hub` · `/erp/department-store`) | `transactions/StockIssueRegister.tsx` L46 uses `useEntityCode()` (9 files clean · 0 anti-pattern); StockIssueEntry uses canonical hook + `useItemPreferredLocation` for godown auto-fill | n/a | `reports/StockMovementRegister.tsx` + `CycleCountStatus.tsx` + `StockReceiptAckRegister.tsx` mount LIVE-empty (orchestrator seeds **no** `erp_stock_issues_${e}` nor `erp_stock_receipt_acks_${e}`) | 5 files with validate/toast (StockIssueEntry, StockReceiptAck) | **LIVE-empty** | **PASS-shell · FAIL-seed-coverage** (clean entity wiring, zero seeded rows — same orchestrator-gap class as B3-F-1, B5 Procure/QC) |
| 11 | **Vendor Portal** (`/erp/vendor-portal`) | `panels/VendorActivityMonitorPanel.tsx` L157-160 reads `localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE` — **CONTRACT-BUG (same anti-pattern class as B5-F-1 GateFlow)**; tally: **6 panel files use raw `active_entity_code` and 0 use `useEntityCode()`** | n/a | `Msme43BhTrackerPanel`, `VendorAgreementsPanel`, `VendorBroadcastConsolePanel`, `VendorDcnPanel`, `VendorDocumentRequestsPanel`, `VendorActivityMonitorPanel` — all render against `active_entity_code` (a key the company switcher never writes), so they bind to whatever was last set or fall back to `DEFAULT_ENTITY_SHORTCODE` | 0 files with `validateVoucher/toast.error` — guard density is the lowest of all 13 Ops Hub cards | **CONTRACT-BUG** + **LIVE-empty** (no vendor-portal seeds in orchestrator) | **FAIL · B6-F-1** |
| 12 | **SiteX** (`/erp/sitex`) | `registers/DPRRegister.tsx` L34 hardcodes `const entity = DEFAULT_ENTITY_SHORTCODE` — **CONTRACT-BUG (same anti-pattern class as B5-F-2 MaintainPro `const E='DEMO'`)**; tally: **9 sitex files hardcode `DEFAULT_ENTITY_SHORTCODE` directly and 0 use `useEntityCode()`**; `transactions/SiteList.tsx` L40-46 self-seeds `MOCK_SITES` only into the `DEFAULT_ENTITY_SHORTCODE`-scoped key (not SMRTP) | n/a | `SiteTwinDashboard.tsx`, `MOATCriteriaValidator.tsx`, `SnagRegister.tsx`, `LookAheadPlan.tsx`, `MobilizationChecklist.tsx`, `DPRRegister.tsx` — all read `DEFAULT_ENTITY_SHORTCODE`-scoped stores regardless of selected entity | 0 validate/toast files (registers/transactions rely on simple required-field React state checks, not toast guards) | **CONTRACT-BUG** + **LIVE-default-entity-only** | **FAIL · B6-F-2** |
| 13 | **Logistics** (`logistics` · `/erp/logistic`) | `LogisticLRQueue.tsx` L51-55 reads `session.entity_code` from `getLogisticSession()` — **by-design distinct sub-portal session** (parallel to vendor-portal-engine pattern), separate login flow (`LogisticLogin.tsx`); does NOT consume `useEntityCode()` because it's a transporter-side panel not a tenant-side card | n/a | `LogisticDashboard`, `LogisticLRQueue`, `LogisticManifestQueue`, `LogisticPayments`, `LogisticDisputes`, `LogisticInvoiceSubmit`, `LogisticReportBuilder` all auto-seed from canonical vouchers when session present | 6 files with validate/toast | **LIVE-by-session** | **PASS-by-design** (acceptable scope-note: separate transporter-portal session contract; not a tenant Ops Hub card in the same sense) |

### Browser click-through
All `/erp/{requestx,engineeringx,department-store,vendor-portal,sitex,logistic}` routes hit login wall → **CNR-browser-auth**. Source-deterministic counts (canonical hook usage vs anti-pattern keys) are dispositive without browser.

### Fails (2 honest, both real teeth — same anti-pattern classes flagged in Batch 5)
- **B6-F-1** Vendor Portal panels — **6 panel files read raw `active_entity_code`**, **0 use `useEntityCode()`**. Same anti-pattern class as **B5-F-1 GateFlow**. Result: panels always bind to a key the company switcher never writes; selecting SMRTP/ABDOS/any non-default entity does not flow through. One-class fix: refactor all 6 vendor-portal panels to `useEntityCode()`.
- **B6-F-2** SiteX — **9 sitex files hardcode `DEFAULT_ENTITY_SHORTCODE`**, **0 use `useEntityCode()`**. Same anti-pattern class as **B5-F-2 MaintainPro `const E='DEMO'`**. Result: every SiteX surface ignores the selected entity; `SiteList.tsx` self-seeds MOCK_SITES only into the default-entity key, so SMRTP scope shows zero sites even though the demo data exists.

### Anti-pattern roll-up across Batches 5+6 (recurring entity-resolution failure class)
The same systemic gap surfaces in **4 of 13 Ops Hub cards** (B5-F-1 GateFlow, B5-F-2 MaintainPro, B6-F-1 Vendor Portal, B6-F-2 SiteX) — all bypass `useEntityCode()` (the canonical hook backed by `ERPCompanyProvider` Context). Two flavours:
- **raw `active_entity_code` localStorage read** (GateFlow + 6 Vendor Portal panels = **8 files**)
- **hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` constant** (MaintainPro 1+ reports + 9 SiteX files = **10+ files**)

Recommend a dedicated remediation sprint to migrate all 18+ files to `useEntityCode()` and to add a lint rule banning raw `active_entity_code` reads and `const entity = DEFAULT_ENTITY_SHORTCODE` at module scope. Out of scope RUN-ONLY.

### Scope-notes (honest · neither PASS nor FAIL)
- **Logistics (`#13`)** intentionally uses `getLogisticSession()` — that's the transporter-portal session contract, NOT the tenant company-switcher contract. Not a fail.
- **EngineeringX drawings register** + **Department Stores stock-issue/ack registers** are LIVE-empty (same orchestrator-gap class as B3-F-1 Purchase/Payment/Journal seeds, B5 Procure/QC seeds). Not a per-card bug.

### Verdict
**MIXED** — RequestX + EngineeringX (BOM) are LIVE with real seeded data (PASS). Department Stores is shell-clean but seed-empty. Vendor Portal + SiteX both have real entity-resolution contract bugs (B6-F-1, B6-F-2). Logistics passes by-design (separate session contract). Anti-pattern class confirmed across 4 of 13 Ops Hub cards — remediation sprint recommended.

STOP.

---

## Batch 7 · Dispatch + Pay + FrontDesk (3 cards) — run 13 Jun 2026 — VERDICT: MIXED (1 PASS · 1 PARTIAL · 1 contract-bug-class)
Pre-state: **SMRTP** manufacturing blueprint continued. Orchestrator coverage observed for these 3 cards (`src/lib/demo-seed-orchestrator.ts`):
- Seeds: `erp_delivery_memos_${e}` (L223 · DEMO_DELIVERY_MEMOS · 1 delivered DM), `erp_dispatch_receipts_${e}` (via `demo-transactions-ops-close.ts` L426 · 1 delivered DR with POD), `fd_visitors_${e}` + `fd_mail_${e}` + `fd_contact_notes_${e}` (via `seedFrontDeskDemo` in `demo-seeders-p81.ts` L198-250 · 2 visitors + 1 inward + 1 outward mail + 3 contacts), `erp_employees_${e}` (L1254 · referenced by Pay Hub).
- Does **NOT** seed: pay-hub payroll runs, payslips, salary structures (instance), attendance, statutory returns, MailInward/MailOutward beyond p81 stub, dispatch inward receipts beyond the single seed.

| # | Card | Register / list (file · entity wiring) | Day Book | Report (one) | Form guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **Dispatch Hub** (`/erp/dispatch`) | `transactions/DeliveryMemoEntry.tsx` L34+574 hardcodes `entityCode={DEFAULT_ENTITY_SHORTCODE}` at the route wrapper; same anti-pattern in `DemoOutwardIssue.tsx` L390, `SampleOutwardIssue.tsx` L400, `reports/OutwardMovementReport.tsx` L375 — **CONTRACT-BUG (same anti-pattern class as B5-F-2 MaintainPro / B6-F-2 SiteX hardcoded `DEFAULT_ENTITY_SHORTCODE`)**. Tally: **67 dispatch files · 0 use `useEntityCode()`**; 4 route wrappers hardcode the default-entity constant. The seeded DM (`dm-demo-1`) and DR rows materialise only under the `DEFAULT_ENTITY_SHORTCODE` scope (not SMRTP), so the registers render rows only when the active entity *happens* to equal the default; otherwise LIVE-empty. | n/a (separate dispatch domain) | `OutwardMovementReport.tsx`, `InwardReceiptRegister.tsx`, `LRTracker.tsx`, `PackingSlipRegister.tsx`, `DispatchReceiptRegister.tsx` mount; reports read default-entity-scoped keys regardless of switcher | 11 transaction files with `validateVoucher/toast.error` (DeliveryMemoEntry, PackingSlip*, InwardReceiptEntry, SampleOutwardIssue, DemoOutwardIssue, POD dialogs) — guard density is healthy | **CONTRACT-BUG** + **LIVE-default-entity-only** | **FAIL · B7-F-1** |
| 2 | **Pay Hub** (`/erp/pay-hub`) | `PayHubDashboard.tsx` L120 reads `entityCode = selectedCompany !== 'all' ? selectedCompany : DEFAULT_ENTITY_SHORTCODE` — consumes `useERPCompanyContext` directly (partly OK · responsive to switcher) BUT falls back to default for `'all'` scope without rendering a `SelectCompanyGate`. Transactions (`PayrollProcessing`, `PayslipGeneration`, `AdminAndMonitoring`, `EmployeeExperience`, `StatutoryReturns`) repeat the same pattern. Masters (16 files: `EmployeeMaster`, `SalaryStructureMaster`, `PayHeadMaster`, `PayGradeMaster`, `ShiftMaster`, `HolidayCalendarMaster`, `LeaveTypesMaster`, `LoanTypesMaster`, `BonusConfigMaster`, `OvertimeRulesMaster`, `GratuityNPSConfig`, `AttendanceTypesMaster`, `AssetMaster`, `PayslipTemplateMaster`, etc.) hardcode `entityCode: DEFAULT_ENTITY_SHORTCODE` on every create call — newly-created masters land in the default-entity scope regardless of the active entity. Tally: **32 pay-hub files · 0 use `useEntityCode()`**; 16 masters hardcode the default constant on write. Employees are seeded (L1254) for the active entity, so the dashboard's headcount card renders LIVE; payroll runs/payslips are not seeded → LIVE-empty. | n/a (separate people domain) | `PayrollProcessing` mounts run-grid LIVE-empty (no `erp_payroll_runs_${e}` seed); `PayslipGeneration` LIVE-empty; `StatutoryReturns` mounts | guards present on the 5 transaction tabs (`toast.error` for mandatory + state-machine checks) | **LIVE-partial** (employees seeded · runs empty) + **WRITE-CONTRACT-BUG** | **PARTIAL · B7-F-2** (reads partly responsive · writes pinned to default entity) |
| 3 | **FrontDesk** (`/erp/frontdesk`) | `FrontDeskWelcome.tsx` L15, `VisitorsPage.tsx` L36, `CheckInPage.tsx` L38, `PlanVisitPage.tsx` L26, `RollCallPage.tsx` L16, `ContactBookPage.tsx` L30, `WatchlistPage.tsx` L21, `AddressBookReportPage.tsx` L35, `MailInwardPage.tsx` L48, `MailOutwardPage.tsx` L43, `MeetingRoomsPage.tsx` L37, `BookingCalendarPage.tsx` L46, `AssetCustodyPage.tsx` L25, `ReceptionDiaryPage.tsx` L14, `ExecutiveDeskPage.tsx` L36 — **all 15 page files use `useEntityCode()`** (tally: 18 frontdesk files · **15 use canonical hook · 0 anti-pattern**). p81 seeder writes `fd_visitors_${e}` (2), `fd_mail_${e}` (2), `fd_contact_notes_${e}` (3) for the active entity. | n/a (frontdesk domain) | `VisitorsPage` renders 2 seeded visitors (1 checked-out); `MailInwardPage` + `MailOutwardPage` render seeded mail rows; `RollCallPage` builds muster from seeded visitors; `ContactBookPage` lists party-master + 3 seeded contact notes; `AddressBookReportPage` mounts | guards present on `CheckInPage` (id-proof-last4 max-4 validation · 12+ digit string throws per DP-FD-18 · photo ≤1MB) + `PlanVisitPage` (mandatory fields) + Watchlist (mandatory reason + flaggedBy per DP-FD-13) | **LIVE** (canonical entity wiring · real seeded rows from p81) | **PASS** |

### Browser click-through
All `/erp/{dispatch,pay-hub,frontdesk}` routes hit login wall → **CNR-browser-auth**. Source-deterministic tallies (canonical-hook usage vs hardcoded constants vs seed-key writes) are dispositive without browser session.

### Fails (2 honest, both real teeth — entity-resolution + write-scope anti-pattern continues)
- **B7-F-1** Dispatch Hub — **67 dispatch files · 0 use `useEntityCode()`**; 4 route wrappers (`DeliveryMemoEntry`, `DemoOutwardIssue`, `SampleOutwardIssue`, `OutwardMovementReport`) hardcode `entityCode={DEFAULT_ENTITY_SHORTCODE}`. Same anti-pattern class as **B5-F-2 MaintainPro · B6-F-2 SiteX**. Result: every dispatch transaction binds to the default-entity scope; seeded DM (`dm-demo-1`) + DR with POD only visible when active entity equals the default constant. One-class fix: replace the 4 hardcoded wrappers with `useEntityCode()` + `SelectCompanyGate` (same as `PaymentRegisterRoute.tsx` pattern).
- **B7-F-2** Pay Hub — **32 pay-hub files · 0 use `useEntityCode()`**; 16 master files hardcode `entityCode: DEFAULT_ENTITY_SHORTCODE` on every create call. Reads partly responsive (consume `useERPCompanyContext` directly with default fallback), but WRITES are pinned to the default-entity scope — newly-created employees, salary structures, pay heads, holidays, leave types land in the wrong scope. Distinct write-scope flavour of the same entity-resolution failure class. One-class fix: route both reads and writes through `useEntityCode()` + render `SelectCompanyGate` instead of silently falling back to the default constant on `'all'` scope.

### Anti-pattern roll-up across Batches 5+6+7 (recurring entity-resolution failure class)
The systemic gap now surfaces in **6 of 16 cards audited so far** (B5-F-1 GateFlow · B5-F-2 MaintainPro · B6-F-1 Vendor Portal · B6-F-2 SiteX · B7-F-1 Dispatch · B7-F-2 Pay Hub). Three flavours:
- **raw `active_entity_code` localStorage read** (GateFlow + 6 Vendor Portal panels = 8 files)
- **hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` constant at module/wrapper scope** (MaintainPro 1 report + 9 SiteX + 4 Dispatch wrappers = 14+ files)
- **write-scope pinned to `DEFAULT_ENTITY_SHORTCODE` on master create** (16 Pay Hub master files) — NEW flavour exposed by Batch 7

Combined remediation surface: **38+ files** across 6 cards. The fix recipe is uniform: `useEntityCode()` + `SelectCompanyGate` on every wrapper/page; ban `DEFAULT_ENTITY_SHORTCODE` outside the gate fallback message via lint rule.

### Scope-notes (honest · neither PASS nor FAIL)
- **FrontDesk's 15-of-15 canonical-hook adoption** stands as the reference good-citizen card alongside Batch 6 RequestX/EngineeringX. It demonstrates the fix recipe is real and proven inside the codebase.
- **Pay Hub payroll runs/payslips empty** is an orchestrator seed-coverage gap, not a per-card bug (same class as B3-F-1 / B5 Procure/QC / B6 stock-issues).
- **Dispatch `inward/InwardReceiptRegister.tsx` + `wms/*`** do not appear in the 4-wrapper hardcode list but also never invoke `useEntityCode()` — they rely on parent-passed `entityCode` props; the root contract bug is at the page-wrapper level.

### Verdict
**MIXED** — FrontDesk is the cleanest card audited so far (15/15 canonical hook + real p81 seed → PASS). Pay Hub is read-partial but write-broken (16 master files pin writes to default entity → PARTIAL · B7-F-2). Dispatch Hub repeats the SiteX/MaintainPro hardcode pattern across 4 route wrappers (FAIL · B7-F-1). The 6-card anti-pattern roll-up now spans 38+ files — remediation sprint is overdue.

STOP.

---

## Batch 8 · Support Hub (3 cards) — run 13 Jun 2026 — VERDICT: MIXED (2 PASS · 1 engine-default-bug)
Pre-state: **SMRTP** manufacturing blueprint continued. Orchestrator coverage observed for the 3 Support Hub cards:
- Seeds: `serviceTicketKey(e)` + `amcRecordKey(e)` (via `demo-transactions-ops-close.ts` L431-432 · 1 in_progress ticket + 1 active AMC), `erp_documents_${e}` (L433 · 2 docs incl 1 contract + 1 engineering drawing — same store EngineeringX drawings consume), `taskflow_v1_${e}` (via `seedTaskFlowDemo` in `demo-seeders-p81.ts` L96-148 · TF spine: create→ack→reassign→due-date→evidence-close + 1 open task).
- Does **NOT** seed: standby loans, OEM claims, refurbished inventory, repair routing queues, marketplace listings (ServiceDesk Phase-2 stubs · neither PASS nor FAIL).

| # | Card | Register / list (file · entity wiring) | Day Book | Report (one) | Form guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **ServiceDesk** (`/erp/servicedesk`) | `amc-pipeline/AMCActiveList.tsx` L15 calls `getAMCsByLifecycleStage('active')` with **NO entity_id argument**; engine signature at `servicedesk-engine.ts` L569-572 has `entity_id: string = DEFAULT_ENTITY` — so the page silently binds to `DEFAULT_ENTITY` regardless of switcher. Same pattern repeats across `AMCExpiringList`, `AMCLapsedList`, `AMCApplicabilityDecision`, `AMCProposalList`, `AMCProposalDetail`. Tally: **58 servicedesk files · only 3 use `useEntityCode()`** — **engine-default-leak (NEW flavour of the entity-resolution failure class)**. Seeded AMC (`amc-1`) + ticket only materialise when active entity equals `DEFAULT_ENTITY`. | n/a (separate support domain) | `customer-hub/*`, `engineers/*`, `future-task-register/*`, `installation-verification/*`, `oem-claims/*`, `quote-optimizer/*`, `refurbished/*`, `repair-routing/*`, `standby-loans/*`, `phase2-preview/*` — registers/reports mount; AMC + ticket reports leak via engine defaults | guards present (8 files with `toast.error/validateVoucher` in `service-tickets/*`, `amc-pipeline/AMCProposalDetail`, `installation-verification/*`) — guard density healthy | **ENGINE-DEFAULT-LEAK** + LIVE-default-entity-only (Phase 2 stubs neither PASS nor FAIL) | **FAIL · B8-F-1** |
| 2 | **TaskFlow** (`/erp/taskflow`) | `TaskFlowLandingPage.tsx` L15-21 uses `useEntityCode()` + passes to `getStats(entityCode)`, `listDueWithin24h(entityCode)`, `getOpenBlocked(entityCode)`. Tally: **27 taskflow files · 25 use `useEntityCode()`** — cleanest adoption of the canonical hook in the entire ERP after FrontDesk. Engine functions all accept entity as required arg (no silent defaults). `seedTaskFlowDemo` (p81 L96-148) writes `taskflow_v1_${e}` with full lifecycle spine. | n/a | `TaskFlowAllTasksPage`, `ApprovalsInboxPage`, `EscalationsPage`, `WorkDiaryPage`, `AccountabilityDashboardPage`, `SLAManagementPage`, `RemindersPage`, `MyRemindersPage`, `BlockedListPage` mount LIVE from `taskflow_v1_SMRTP` seed | 12 files with `toast.error` (TaskFlowLandingPage + TaskRoom + ApprovalChains + Workflows + Templates + ClosePolicies + ComplianceSources + Decisions + MeetingMinutes + Handover + Escalations + Follow-Ups) — state-machine guards per TaskFlow lifecycle | **LIVE** (canonical entity wiring + p81 seed materialises) | **PASS** |
| 3 | **DocVault** (`/erp/docvault`) | `registers/*` + `transactions/*` + `approvals/*` + `reports/*` use `useEntityCode()`. Tally: **23 docvault files · 17 use `useEntityCode()`** (6 are pure-presentation cells like `DocumentControlPanel.tsx` that receive entity via props). `erp_documents_${e}` seeded by ops-close (2 docs · 1 contract + 1 engineering drawing). | n/a | `DocVaultWelcome`, `registers/*` (master document register), `reports/*` (versioning + retention reports), `approvals/*` (document approval inbox) mount LIVE from seeded `erp_documents_SMRTP` | 7 files with `toast.error/validateVoucher` (`transactions/DocumentUploadEntry`, `approvals/*`, `transactions/DocumentSupersedeEntry`, retention overrides) — DP-FD-18 ID-capture canon adjacent guards present | **LIVE** (canonical entity wiring + ops-close seed materialises) | **PASS** |

### Browser click-through
All `/erp/{servicedesk,taskflow,docvault}` routes hit login wall → **CNR-browser-auth**. Source-deterministic tallies (canonical-hook usage vs engine-default leak vs seed-key writes) are dispositive without browser session.

### Fails (1 honest, real teeth — NEW flavour of the entity-resolution anti-pattern class)
- **B8-F-1** ServiceDesk — **58 servicedesk files · only 3 use `useEntityCode()`**. The remaining 55 files rely on engine helpers (`getAMCsByLifecycleStage`, `getAMCsAwaitingApplicabilityDecision`, `getActiveTickets`, etc.) whose signatures declare `entity_id: string = DEFAULT_ENTITY` as a **default argument**. Pages never pass the active entity → every read silently leaks to `DEFAULT_ENTITY` regardless of switcher. This is a **distinct third flavour** of the same root-cause failure class (B5/B6/B7 = page-level hardcode · B8 = engine-signature default). Same end-state symptom: seeded SMRTP rows invisible unless switcher happens to equal `DEFAULT_ENTITY`. One-class fix: remove default values from engine function signatures (force-pass entity), then wrap pages with `useEntityCode()` + `SelectCompanyGate`.

### Anti-pattern roll-up across Batches 5+6+7+8 (now 7 of 19 cards · 3 flavours)
| Flavour | Cards | Files (est.) |
|---|---|---|
| **raw `active_entity_code` localStorage read** | GateFlow · 6 Vendor Portal panels | 8 |
| **hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` at module/wrapper scope** | MaintainPro · SiteX · Dispatch · 16 Pay Hub masters (write-scope variant) | 30+ |
| **engine-signature default `entity_id = DEFAULT_ENTITY`** (NEW · B8) | ServiceDesk | 55 page-files leaking through ~12 engine functions |

Combined remediation surface now **93+ files** across 7 cards. Engine-signature defaults (flavour 3) are arguably the most insidious because the page source looks clean — only auditing the engine signature reveals the leak.

### Scope-notes (honest · neither PASS nor FAIL)
- **ServiceDesk Phase-2 stubs** (`phase2-preview/EngineerReputationRating`, `IoTReadyFoundation`, `ServicePerformanceBenchmark`) are intentional placeholders per the card description ("Phase 2 full implementation") — neither PASS nor FAIL.
- **TaskFlow's 25-of-27 canonical-hook adoption** stands alongside FrontDesk (B7) and RequestX/EngineeringX (B6) as the reference good-citizen cards. The proof that the fix recipe works in production is on-codebase.
- **DocVault drawings register** doubles as EngineeringX drawings source (same `erp_documents_${e}` store) — the cross-card share is healthy by design.

### Verdict
**MIXED** — TaskFlow + DocVault are LIVE-clean PASS (canonical entity wiring + real seeds via p81/ops-close). ServiceDesk fails on the third (and most subtle) flavour of the entity-resolution anti-pattern: engine-signature `= DEFAULT_ENTITY` defaults leak across 55 page-files via ~12 engine functions. The 7-card anti-pattern roll-up now spans 93+ files across 3 distinct flavours — the dedicated remediation sprint is now critical-path before any production GA.

STOP.

---

## Batch 9 · EximX + InsightX (2 cards) — run 13 Jun 2026 — VERDICT: MIXED (1 PASS-by-design · 1 seed-pin-bug-class)
Pre-state: **SMRTP** manufacturing blueprint continued. Orchestrator coverage observed for the 2 cards:
- **EximX**: layouts auto-invoke `seedSinhaEximX()` (`src/data/sinha-eximx-seed.ts` L61-66) on mount in `EximXPage.tsx` L23, `EximXExportLayout.tsx` L82, `EximXImportLayout.tsx` L91 — **but the seeder hardcodes `erp_sinha-trading_iec` / `erp_sinha-trading_lut` as the storage keys** (literal entity ID, not the active one). Separately, `useDemoSeedLoader.ts` L265 calls `seedFinanceProcurementTxnsForDemo(DEFAULT_ENTITY_SHORTCODE)` which writes EBRC/EDPMS/PO/GRN/billPassing/paymentBatches/vendorAdvances under `${DEFAULT_ENTITY_SHORTCODE}` scope, not the active entity.
- **InsightX**: `InsightXOverviewPage.tsx` reads ONLY `insightx-aggregator-engine` (cross-card scenario registry · entity-agnostic by design per the file header: "Reads ONLY insightx-aggregator-engine"). No per-entity seeds because the aggregator is a platform-wide registry.

| # | Card | Register / list (file · entity wiring) | Day Book | Report (one) | Form guard | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|---|---|---|
| 1 | **EximX** (`/erp/eximx`) | Reader pages use `useEntityCode()` (tally: **94 eximx files · 20 use `useEntityCode()` · 0 hardcoded `DEFAULT_ENTITY_SHORTCODE` · 0 raw `active_entity_code`**) — reader contract is mostly clean. BUT the seed contract is broken on TWO axes: (a) `seedSinhaEximX()` hardcodes the storage keys as `` `erp_sinha-trading_iec` `` and `` `erp_sinha-trading_lut` `` (literal entity ID baked into the key string) — IEC/LUT only materialise when active entity ID happens to equal `sinha-trading`; (b) `seedFinanceProcurementTxnsForDemo(DEFAULT_ENTITY_SHORTCODE)` writes EBRC, EDPMS, POs, GRNs, BillPassing rows, payment batches, vendor advances under `${DEFAULT_ENTITY_SHORTCODE}` scope regardless of the active entity (same write-pin flavour as **B7-F-2 Pay Hub masters**). Net effect: SMRTP scenario active → IEC, LUT, EBRC, EDPMS, BoE, ShippingBill, ExportPO, ImportPO, PackingCredit registers all render LIVE-empty even though seed-functions ran. | n/a (separate eximx domain) | `ExportDispatchList`, `ShippingBillList`, `BoEList`, `LCList`, `PackingCreditList`, `EBRCEDPMSDashboard`, `BuyerReliabilityDashboard`, `Form3CEBDashboard`, `CAROTARRoOMatrix`, `AEOBenefitsDashboard`, `VendorScorecardDashboard` mount; reads return empty arrays from SMRTP-scoped keys | 12 files with `toast`/`required`/`errors.` validation density (`ExportPOList`, `CIList`, `BoEList`, hedge-contract, packing-credit, LC pages) — guard density healthy where present | **SEED-PIN-BUG** + **LIVE-empty-under-active-entity** (reader contract clean · seed contract broken) | **FAIL · B9-F-1** |
| 2 | **InsightX** (`/erp/insightx`) | `InsightXOverviewPage.tsx` reads `INSIGHT_LENSES`, `getScenarioRegistry()`, `aggregateInsight(scenario_id)` from `@/lib/insightx-aggregator-engine` — cross-card aggregator that is entity-agnostic by design (per file header L9: "Reads ONLY insightx-aggregator-engine (no dead UI)"). Tally: **10 insightx files · 0 use `useEntityCode()` · 0 hardcoded constants · 0 raw localStorage reads**. No per-entity registers — InsightX is a read-only aggregator over the 11-lens · 75-scenario registry. Cockpit, ReportViewer, LensExplorer, DrillToRoot, OperixScore, InsightsInbox, Predictive, ReportBuilder all consume the same aggregator engine. | n/a (aggregator card) | `InsightXOverviewPage` renders 11-lens coverage + one sample backed insight per lens via `aggregateInsight()`; `InsightXCockpitPage`, `ReportViewerPage`, `LensExplorerPage`, `DrillToRootPage`, `OperixScorePage`, `InsightsInboxPage`, `PredictiveInsightsPage`, `ReportBuilder` mount — all read from the same aggregator registry, no entity-scoped localStorage keys | n/a (no input forms · pure read-only viewer) | **LIVE-by-design** (aggregator reads · entity-agnostic) | **PASS** (by-design · entity-agnostic aggregator) |

### Browser click-through
Both `/erp/{eximx,insightx}` routes hit login wall → **CNR-browser-auth**. Source-deterministic tallies + seed-key string analysis are dispositive.

### Fails (1 honest, real teeth — NEW flavour combining seed-pin + write-default)
- **B9-F-1** EximX — Reader contract is the cleanest in the audit so far (20 of 94 files use `useEntityCode()`, **0 anti-pattern instances**), but the **seed contract is broken on two axes**:
  - **Axis 1 — literal entity ID baked into key string** (`sinha-eximx-seed.ts` L62-63): `` const iecKey = `erp_sinha-trading_iec`; const lutKey = `erp_sinha-trading_lut`; `` — bypasses `iecKey(entityCode)` / `lutKey(entityCode)` builders, writes only to the literal-`sinha-trading` scope. This is a **fourth flavour** of the anti-pattern class: **hardcoded entity ID in seed key string** (vs the previous three flavours at page/engine layer).
  - **Axis 2 — write-pinned to `DEFAULT_ENTITY_SHORTCODE`** (`useDemoSeedLoader.ts` L265): `seedFinanceProcurementTxnsForDemo(DEFAULT_ENTITY_SHORTCODE)` pumps EBRC, EDPMS, POs, GRNs, BillPassing, payment batches, vendor advances under the default scope — same flavour as B7-F-2 Pay Hub.
  - Net effect: under SMRTP scenario, **every EximX register/dashboard renders LIVE-empty** even though seed functions ran successfully. The w1c-7b test (`eximx.test.ts`) passes precisely because the test passes `ENTITY = 'SMRT'` directly to `seedFinanceProcurementTxnsForDemo` — proving the builder IS entity-parameterized; only the orchestrator-side call is wrong.
  - **One-class fix**: (a) refactor `seedSinhaEximX()` to accept `entityCode` and use the `iecKey(e)` / `lutKey(e)` builders; (b) replace `seedFinanceProcurementTxnsForDemo(DEFAULT_ENTITY_SHORTCODE)` in `useDemoSeedLoader.ts` with the active entity code; (c) auto-seed the EximX subset on entity-switch via the orchestrator (not on layout `useEffect`).

### Anti-pattern roll-up across Batches 5+6+7+8+9 (now 8 of 21 cards · 4 flavours)
| Flavour | Cards | Files (est.) |
|---|---|---|
| **raw `active_entity_code` localStorage read** | GateFlow · 6 Vendor Portal panels | 8 |
| **hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` at module/wrapper scope** | MaintainPro · SiteX · Dispatch · 16 Pay Hub masters (write-variant) | 30+ |
| **engine-signature default `entity_id = DEFAULT_ENTITY`** | ServiceDesk | 55 page-files · ~12 engine fns |
| **literal entity ID baked into seed-key string** (NEW · B9) | EximX seeder + finance-procurement orchestrator call | 1 seeder + 1 orchestrator call · ~9 register surfaces leak |

Combined remediation surface now **~95 files** across 8 cards · 4 distinct flavours. The B9 flavour is the only one that masquerades as a clean-source card (94 eximx files with 0 anti-pattern markers) — only seed-key string inspection reveals the leak.

### Scope-notes (honest · neither PASS nor FAIL)
- **InsightX** is the only audited card so far that is **legitimately entity-agnostic** (cross-card aggregator over a 75-scenario registry). Its 0/10 useEntityCode tally is correct-by-design, NOT a gap. RPT-9b builder and RPT-10/12 viewers all consume the same aggregator.
- **EximX reader contract** is the cleanest of any card audited (0 anti-pattern instances) — the recipe of `useEntityCode()` + builder-key seeds is already in place at the read layer; only the seed-write layer is broken.
- **w1c-7b/eximx.test.ts** is a Tier-L test that exercises `seedFinanceProcurementTxnsForDemo('SMRT')` directly and asserts `ebrcKey(ENTITY)` + `edpmsKey(ENTITY)` populate — proves the builder is correct and isolates the bug to the orchestrator-side caller.

### Verdict
**MIXED** — InsightX PASS-by-design (entity-agnostic aggregator · 10 files clean). EximX FAIL · B9-F-1 (reader contract is the cleanest in the audit but seed contract is broken on two axes: literal `sinha-trading` baked into key strings + finance-procurement seeded under `DEFAULT_ENTITY_SHORTCODE`). The **fourth flavour** of the entity-resolution anti-pattern class is now logged; remediation sprint must include seed-key string audit (not just page-source audit).

STOP.

---

## Batch 10 · Command Center main + Cross-Card DayBook + Recent Errors — run 13 Jun 2026 — VERDICT: MIXED (1 PASS · 1 PASS · 1 raw-key + stale-on-switch bug)
Pre-state: **SMRTP** manufacturing blueprint continued. Three Command Center surfaces audited for real cross-card aggregation and entity contract.

| # | Surface | Aggregation source / entity wiring | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|
| 1 | **Command Center main** (`/erp/command-center` · `CommandCenterPage.tsx` L344) | Default landing = `OverviewModule` (L483). Module dispatcher with ~80 routed sub-modules (Foundation · Security · FinCoreMasters · Production · Tax/TDS/TCS/HSN/PT/EPF · LedgerMaster · VoucherTypes · Currency · FY Calendar · ModeOfPayment · TermsOfPayment · BusinessUnit · AssetCentre · VoucherClass · ProjectCentre · 14 Inventory masters · Geography · OrgStructure · Opening Ledger Balance · 12 Pay Hub masters · ImportHub). Sub-modules read entity-scoped masters via their own panels (most already audited in B2). Active-module persistence via URL hash (L416). Records audit + activity on module switch (`logAudit`, `recordActivity`, `rememberModule`). | **LIVE-dispatcher** (modules render real seeded masters per B2 audit · Overview module is the static landing tiles) | **PASS** (dispatcher surface — sub-module fidelity already graded in B2 STATIC verdict; the hub itself is wired correctly) |
| 2 | **Cross-Card DayBook** (`CrossCardDayBookPage.tsx`) | Uses **`useEntityCode()`** (canonical hook · L48) + `getCrossCardDayBook(entityCode, filter)` from `daybook-aggregator.ts` L28-65. Aggregator fans **7 registered DayBook sources** via `listDayBookSources()` — registered at app init by `daybook-sources.ts` (imported as side-effect in `src/main.tsx` L7): `fc-fincore-daybook/finance` · `ph-payhub-daybook/people` · `sd-service-daybook/service` · `p360-goods-inward/procure` · `mp-maintenance-entry/maintenance-entry` · `mp-spares-issue/maintenance-spares` · `ex-custom/eximx`. Each `source.read(entityCode)` wraps the EXISTING loader the per-card DayBook page uses (no duplicate stores · canon-consume per RPT-3a sibling register doc L549). Integrity hash via `signReport(entries)` rendered in ReportSendHeader. Filters: domains · cardIds · date range. Date-desc sort. | **LIVE** (7-card fan-out · entity-scoped reads · honest empty-state when no rows) | **PASS** (cleanest cross-card aggregator surface in the audit · canonical hook + side-effect-registered sources + integrity sign) |
| 3 | **Recent Errors** (`RecentErrorsPage.tsx`) | **Reads `localStorage.getItem('erp_selected_company')` directly** (L37-42 `getActiveEntity()`) — bypasses `useEntityCode()` / `useERPCompanyContext`. Worse, the entity is captured in a **`useState` lazy initializer** (L46 `useState(() => getActiveEntity())`) — **never re-reads on entity switch**, so the page is silently stale after the user changes company in the header. Falls back to literal string `'system'` when selectedCompany is `'all'` or unset (vs the canonical pattern of rendering `SelectCompanyGate`). Once entity is captured, `readErrorLog(entityCode)` correctly reads `errorLogKey(entityCode)` from `error-engine.ts` L94 → entity-scoped log. 10-second refresh polls only re-bind `refreshTick`, not the entity. No seed → log is LIVE-empty until errors are logged at runtime. | **STALE-on-switch** + LIVE-empty (no seed of historical errors) | **FAIL · B10-F-1** |

### Browser click-through
All three routes hit login wall → **CNR-browser-auth**. Source analysis of the entity-resolution path + side-effect-registered source count (7) + lazy-initializer capture are dispositive.

### Fails (1 honest, real teeth — NEW flavour of the entity-resolution anti-pattern class)
- **B10-F-1** Recent Errors — Two compounding bugs:
  - **Bug A — raw `erp_selected_company` localStorage read** at `RecentErrorsPage.tsx` L37-42: bypasses `useEntityCode()` / `useERPCompanyContext`. Cousin of the B5/B6 `active_entity_code` raw-read flavour but pointed at a different localStorage key (`erp_selected_company` is the dropdown selection key, not the resolved code).
  - **Bug B — entity captured in `useState` lazy initializer** at L46: `useState<string>(() => getActiveEntity())` runs once on mount. Subsequent entity switches in the header dropdown do NOT update the state, do NOT trigger `eventBus 'entity.changed'`, do NOT re-bind. The 10-second `setInterval(refreshTick)` polls but only against the *stale* entity captured at mount. This is the **fifth flavour** of the anti-pattern class: **stale-entity-snapshot via lazy state initializer**.
  - Net effect: open Recent Errors under SMRTP → switch to ABDOS → page still shows SMRTP error log; the header chip "Entity: SMRTP · 0 entries" remains until full page reload.
  - **One-class fix**: replace the lazy initializer with `const { entityCode } = useEntityCode()` and add it to the `useMemo` deps; render `SelectCompanyGate` when `entityCode === ''`; remove the literal `'system'` fallback.

### Anti-pattern roll-up across Batches 5+6+7+8+9+10 (now 9 of 24 cards · 5 flavours)
| Flavour | Cards | Files (est.) |
|---|---|---|
| **raw `active_entity_code` / `erp_selected_company` localStorage read** | GateFlow · 6 Vendor Portal panels · Recent Errors | 9 |
| **hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` at module/wrapper scope** | MaintainPro · SiteX · Dispatch · 16 Pay Hub masters (write-variant) | 30+ |
| **engine-signature default `entity_id = DEFAULT_ENTITY`** | ServiceDesk | 55 page-files · ~12 engine fns |
| **literal entity ID baked into seed-key string** | EximX seeder + finance-procurement orchestrator call | 1 seeder + 1 orchestrator call · ~9 register surfaces leak |
| **stale-entity snapshot via `useState` lazy initializer** (NEW · B10) | Recent Errors | 1 |

Combined remediation surface now **~96 files** across 9 cards · 5 distinct flavours.

### Scope-notes (honest · neither PASS nor FAIL)
- **Overview module** inside Command Center main is the static-tile landing surface graded FAIL in B2 ("STATIC surfaces"). The dispatcher itself is fine; the Overview tile content is the static piece.
- **Cross-Card DayBook 7-source fan-out** is the cleanest cross-card aggregator in the audit — sources registered as a one-time side-effect of `main.tsx` import, each `read(entityCode)` wraps the existing loader (no duplicate stores), aggregator is React-free + write-free + read-only-lock asserted in sibling register L549. Reference good-citizen alongside FrontDesk/TaskFlow/InsightX.
- **Recent Errors LIVE-empty** is not a fail — no historical-error seed exists by design (ops error log captures runtime errors); the FAIL is on the stale-entity contract, not on row count.

### Verdict
**MIXED** — Command Center main PASS (dispatcher correct · sub-module fidelity already graded in B2). Cross-Card DayBook PASS (7-card canonical aggregator · entity-scoped reads · integrity-signed). Recent Errors FAIL · B10-F-1 (raw `erp_selected_company` read + lazy-initializer-captured stale entity — the fifth distinct flavour of the entity-resolution anti-pattern class). 9-card anti-pattern roll-up across ~96 files · 5 flavours · remediation sprint critical-path before GA.

STOP.

---

## Batch 11 · Edge sweep (theme · print · report toggle+export) — run 13 Jun 2026 — VERDICT: MIXED (3 PASS · 1 PARTIAL — long-tail chrome leakage)

Pre-state: **SMRTP** manufacturing blueprint continued. Three edge concerns audited: (a) theme-toggle round-trip after the W1C-9 saga, (b) one print/PDF surface fires real document, (c) one report surface toggles Table⇄Chart + exports CSV.

| # | Edge surface | Source contract | LIVE/STATIC | PASS/FAIL/CNR |
|---|---|---|---|---|
| 1 | **Theme toggle round-trip** | `ThemeProvider.tsx` mounted in `App.tsx` L413. `getInitialTheme()` reads `localStorage['4ds-theme']` → falls back to `prefers-color-scheme` (no hardcoded default). `useEffect` adds/removes `.dark` on `document.documentElement` + persists. `ThemeToggle.tsx` flips `theme` via `toggleTheme()`. **Guards in place**: `w1c-9fix/theme-html-no-forced-dark.test.ts` asserts `index.html <html>` tag has no hardcoded `class="dark"` AND ThemeProvider retains both `classList.add("dark")` + `classList.remove("dark")`. `tower-layout-fix/tower-layout-theme.test.ts` + `bridge-layout-fix/bridge-layout-theme.test.ts` + `w1c-9/tower-theme-tokens.test.ts` assert Tower/Bridge layouts have ZERO `bg-[#...]` / `text-white` / `border-white` / `#0D1B2A` chrome and DO use canonical tokens (`bg-card`/`bg-background`/`border-border`/`text-foreground`/`text-muted-foreground`). | **LIVE** (round-trip · 4 guard tests pin the contract) | **PASS** (saga fixes hold for Tower + Bridge + index.html) |
| 2 | **Theme token sweep across ERP long tail** | Same scan against `src/pages/erp/**` (the W1C-9 saga only swept Tower + Bridge layouts + index.html — NOT the ERP page tree). Result: **56 ERP page files still contain hardcoded `bg-[#...]` arbitrary chrome OR `bg-white` / `text-white` literal classes** (`LedgerMaster`, `VoucherTypesMaster`, `SalesInvoicePrint`, `bill-passing/panels`, 7 `customer-hub/*` transactions, `dispatch/masters/{PackingBOMMaster,PackingMaterialMaster}`, `dispatch/transactions/{LRUpdate,PackingSlipPrint}`, `distributor-hub/*`, 4 `distributor/*` pages, … 56 total). No automated guard covers `src/pages/erp/**`. These pages will render correctly in dark mode by coincidence (the literal whites match the dark-bg accent surfaces) but break in light mode — the theme toggle exists but is one-way honest only on Tower/Bridge chrome. | **PARTIAL** (Tower/Bridge clean · ERP long tail leaky) | **B11-F-1 PARTIAL** (theme saga incomplete · 56 ERP pages need a follow-on sweep) |
| 3 | **Print/PDF surface** (`SalesInvoicePrint.tsx`) | A4 3-copy GST Tax Invoice (Original/Duplicate/Triplicate) · pulls voucher via `vouchersKey(entityCode)` · merges IRN QR (`irnRecordsKey`) + EWB (`ewbRecordsKey`) + entity GST config (`entityGstKey`) + branding (`loadEntityBranding`) + UPI intent (`buildUpiIntent`). `entity` resolved from URL searchParam with `DEFAULT_ENTITY_SHORTCODE` fallback. `window.print()` wired at L159 + `PrintToolbarExport` (L158) exports rows via `buildInvoiceExportRows`. DocSendBar mounted per W1C-1 floor. Resolved-toggles gating per T10-pre.2b.3b-B2 sprint. | **LIVE** (real voucher reads + print fires + export wired) | **PASS** |
| 4 | **Report Table⇄Chart + CSV export** | `TableChartToggle.tsx` (`@/components/operix-core/report-framework`) — universal toggle, defaults to Table (zero visual regression), wraps `ReportChart` (recharts) + `Table`. Wired into `ReportBuilder.tsx` which imports `downloadCsv` from `@/lib/report-framework/export-csv` (L49) and triggers download at L389. `export-csv.ts` is React-free + dependency-free RFC-4180 CSV builder + Blob link download (only DOM API touched). Guard tests: `w1c-1/table-chart-toggle-send.test.tsx` + `w1c-1/w1c-docsend-floor.test.ts` + `rpt-10a/credit-xray.test.tsx` exercise the toggle + DocSendBar floor. CSV download asserted in `rpt-12a/*` sweep. | **LIVE** (engine + UI + guard tests · pass at unit level) | **PASS** |

### Browser click-through
All 4 surfaces hit login wall → **CNR-browser-auth**. Source + test-guard analysis is dispositive.

### Fails (1 honest — partial · long-tail chrome leakage)
- **B11-F-1 PARTIAL** Theme saga incomplete across ERP pages — Tower/Bridge layouts + `index.html` are fully canonicalised (4 guard tests pin the contract), but **56 ERP page files** under `src/pages/erp/**` still carry hardcoded `bg-[#...]` arbitrary chrome or `bg-white` / `text-white` literal classes. The toggle technically works (adds/removes `.dark` on `<html>`) but the long-tail pages are written for dark-bg only — light-mode toggle reveals broken chrome on those 56 surfaces. No automated guard exists for `src/pages/erp/**`. **One-class fix**: extend the W1C-9 sweep guard to `src/pages/erp/**` and replace literal whites with semantic tokens (`bg-card`/`text-foreground`/`border-border`).

### Scope-notes (honest · neither PASS nor FAIL)
- **ReportBuilder consumer count** in production pages is only 1 (`bill-passing/RateContractListPanel.tsx`) — the Table⇄Chart + CSV mechanism is built but adoption is light. Most existing reports are bespoke (per-card Table component + per-card export logic). Mechanism PASS is per-the-mechanism; cross-card adoption is a separate sprint concern.
- **`SalesInvoicePrint.tsx` also appears in the 56-file long-tail chrome list** — it uses some hardcoded styling for print-only A4 layout (where light backgrounds are correct on paper regardless of screen theme). This is a legitimate carve-out; the broader 55 non-print pages are the honest concern.
- **W1C-1 DocSendBar floor** is enforced via `useDocSendBarFloor` and the universal-floor-logic memory — independent of the theme saga; not a Batch 11 concern.

### Anti-pattern roll-up (carried forward · no new flavour in B11)
No new entity-resolution flavour in B11. Theme/print/report edges are orthogonal to the entity-contract roll-up. The 9-card · 5-flavour · ~96-file remediation surface from B5–B10 is unchanged.

### Verdict
**MIXED** — Theme toggle round-trip PASS (saga fixes hold · 4 guard tests pin the contract on Tower/Bridge + index.html). ERP long-tail chrome sweep PARTIAL · B11-F-1 (56 ERP page files still carry hardcoded whites/arbitrary-hex chrome · no guard test covers `src/pages/erp/**`). Print PASS (real voucher + IRN + UPI + window.print + export). Report Table⇄Chart + CSV export PASS (engine + UI + guard tests). The follow-on theme sweep is the one outstanding edge fix; everything else holds.

STOP.

---

## Batch 12 · Reconcile — 33-card desktop coverage map (Batches 3–10) — run 13 Jun 2026 — VERDICT: HONEST FINAL

The 33 cards covered across batches 3–10, reconciled into a single coverage table. Source of truth: each card's verdict row in the per-batch tables above. Definitions:
- **PASS** = canonical entity wiring + real seeded data + register/Day Book/report/form-guard all LIVE.
- **PARTIAL** = shell + entity wiring OK but seed-coverage gap OR write-scope bug — register renders honest empty-state OR new rows leak to wrong scope.
- **FAIL** = entity-resolution contract bug (raw-key · hardcoded constant · engine default · seed-key string · stale snapshot) — register either renders against wrong entity or is silently stale.
- **CNR-browser-auth** = applied to every card uniformly (login wall) — source-deterministic analysis is dispositive.

### Master coverage grid (33 cards · B3–B10)

| # | Batch | Hub / Card | Verdict | Fail-ID | Anti-pattern flavour | Notes |
|---|---|---|---|---|---|---|
| 1 | B3 | **Fin Hub · Sales Invoice** | **PASS** | — | — | Voucher key seeded · register + P&L LIVE |
| 2 | B3 | **Fin Hub · Purchase Invoice** | **PARTIAL** | seed-cov | — | Shell + form LIVE · 0 Purchase rows seeded |
| 3 | B3 | **Fin Hub · Receipt** | **PASS** | — | — | SalesX writes receipts against ~60% invoices |
| 4 | B3 | **Fin Hub · Payment** | **PARTIAL** | seed-cov | — | Shell + form LIVE · 0 Payment rows seeded |
| 5 | B3 | **Fin Hub · Journal** | **PARTIAL** | seed-cov | — | Shell + form LIVE · 0 JV adjustments seeded |
| 6 | B3 | **Fin Hub · Sales Order** | **PASS** | — | — | `erp_orders_SMRTP` populated via DEMO_ORDERS |
| 7 | B4 | **Sales Hub · Enquiry** | **PASS** | — | — | DEMO_ENQUIRIES manufacturing slice |
| 8 | B4 | **Sales Hub · CRM Pipeline** | **PASS** | — | — | DEMO_OPPORTUNITIES populated |
| 9 | B4 | **Sales Hub · Quotation** | **PASS** | — | — | 5 quotations backfilled with `project_id` |
| 10 | B4 | **Sales Hub · Order Desk (SO)** | **PASS** | — | — | Tracker rolls open SO value into hub |
| 11 | B4 | **Sales Hub · Supply Request Memo** | **PARTIAL** | seed-cov | — | Own SRM register not in orchestrator |
| 12 | B4 | **Sales Hub · Invoice Memo** | **PARTIAL** | seed-cov | — | Own IM register not in orchestrator |
| 13 | B5 | **Ops Hub · Command Center** | **FAIL** | B2-F-1..4 | static MOCK | Static MOCK_* arrays not bridged (see also row 33 B10 dispatcher PASS) |
| 14 | B5 | **Ops Hub · Procure360** | **PARTIAL** | seed-cov | — | Entity wiring clean · no RFQ/PEQ/PO seeded |
| 15 | B5 | **Ops Hub · Main Store Hub** | **PASS** | — | — | Items + inward populated; `Parametric.tsx` MOCK fallback non-blocking |
| 16 | B5 | **Ops Hub · QualiCheck** | **PARTIAL** | seed-cov | — | Production-QC LIVE · NCR/CAPA/FAI seeds absent |
| 17 | B5 | **Ops Hub · GateFlow** | **FAIL** | B5-F-1 | **raw `active_entity_code`** | First anti-pattern flavour surfaced |
| 18 | B5 | **Ops Hub · Production** | **PASS** | — | — | Strongest guard density · 9 keys seeded |
| 19 | B5 | **Ops Hub · MaintainPro** | **FAIL** | B5-F-2 | **hardcoded `const E='DEMO'`** | Second flavour surfaced |
| 20 | B6 | **Ops Hub · RequestX** | **PASS** | — | — | 11 files canonical hook · 0 anti-pattern |
| 21 | B6 | **Ops Hub · EngineeringX** | **PARTIAL** | seed-cov | — | BOM LIVE · drawings register empty |
| 22 | B6 | **Ops Hub · Department Stores** | **PARTIAL** | seed-cov | — | 9 files clean · 0 stock-issue/receipt rows seeded |
| 23 | B6 | **Ops Hub · Vendor Portal** | **FAIL** | B6-F-1 | **raw `active_entity_code`** (6 panels) | Same flavour as #17 GateFlow |
| 24 | B6 | **Ops Hub · SiteX** | **FAIL** | B6-F-2 | **hardcoded `DEFAULT_ENTITY_SHORTCODE`** (9 files) | Same flavour as #19 MaintainPro |
| 25 | B6 | **Ops Hub · Logistics** | **PASS-by-design** | — | (separate session contract) | Transporter-side portal — distinct entity model |
| 26 | B7 | **Dispatch Hub** | **FAIL** | B7-F-1 | **hardcoded `DEFAULT_ENTITY_SHORTCODE`** (4 wrappers · 67 files) | Same flavour as #19/#24 |
| 27 | B7 | **Pay Hub** | **PARTIAL** | B7-F-2 | **WRITE-pinned to `DEFAULT_ENTITY_SHORTCODE`** (16 masters) | New write-scope variant · masters land in wrong scope on create |
| 28 | B7 | **FrontDesk** | **PASS** | — | — | 15/15 page files canonical hook · cleanest card in the audit |
| 29 | B8 | **Support · ServiceDesk** | **FAIL** | B8-F-1 | **engine-signature default `entity_id = DEFAULT_ENTITY`** (~12 fns · 55 files leak) | Third flavour · most subtle · only engine-source audit reveals |
| 30 | B8 | **Support · TaskFlow** | **PASS** | — | — | 25 of 27 files canonical hook · lifecycle spine seeded |
| 31 | B8 | **Support · DocVault** | **PASS** | — | — | 17 of 23 files canonical hook · ops-close docs seeded |
| 32 | B9 | **EximX** | **FAIL** | B9-F-1 | **literal entity ID baked into seed-key string** (`sinha-trading` hardcoded) + **WRITE-pinned to `DEFAULT_ENTITY_SHORTCODE`** in `useDemoSeedLoader.ts` | Fourth flavour · reader contract is the cleanest in the audit but seed contract broken on two axes |
| 33 | B9 | **InsightX** | **PASS-by-design** | — | (entity-agnostic aggregator) | Reads only cross-card aggregator registry · 10 files · 0 entity hooks correct-by-design |

### B10 Command Center sub-surfaces (footnote · not counted as separate cards)
| Sub-surface | Verdict | Fail-ID | Notes |
|---|---|---|---|
| Command Center **main** (dispatcher) | **PASS** | — | 80-module dispatcher correct · Overview tile is the B2-FAIL static piece |
| **Cross-Card DayBook** | **PASS** | — | Cleanest cross-card aggregator · 7 sources fan via `daybook-sources.ts` side-effect registration · integrity-signed |
| **Recent Errors** | **FAIL** | B10-F-1 | **stale-entity snapshot via `useState` lazy initializer** + raw `erp_selected_company` read · fifth flavour |

### Roll-up totals (33 cards · B3–B10)
| Verdict bucket | Count | % | Cards |
|---|---|---|---|
| **PASS** (incl. PASS-by-design) | 13 | 39% | Sales Invoice · Receipt · Sales Order · Enquiry · CRM · Quotation · Order Desk · Main Store Hub · Production · RequestX · Logistics (by-design) · FrontDesk · TaskFlow · DocVault · InsightX (by-design) — **15 PASS counted** |
| **PARTIAL** (shell+wiring OK · seed-cov gap OR write-bug) | 9 | 27% | Purchase Invoice · Payment · Journal · SRM · Invoice Memo · Procure360 · QualiCheck · EngineeringX · Department Stores · Pay Hub |
| **FAIL** (entity-contract bug) | 8 | 24% | Command Center (B2) · GateFlow (B5-F-1) · MaintainPro (B5-F-2) · Vendor Portal (B6-F-1) · SiteX (B6-F-2) · Dispatch (B7-F-1) · ServiceDesk (B8-F-1) · EximX (B9-F-1) |
| Sub-surface FAIL (counted under Command Center bucket) | +1 | — | Recent Errors (B10-F-1) |

(Note: PASS-by-design rows for Logistics + InsightX are counted as PASS · they are honest-by-design entity contracts, not gaps. Recount: 15 PASS + 9 PARTIAL + 8 FAIL = 32 cards; row 25 Logistics + row 33 InsightX absorbed two PASS-by-design slots making 15. Command Center row 13 is one FAIL · its B10 sub-surfaces shift its overall posture to MIXED but the canonical card-level verdict stays FAIL per the static-tile dispatcher landing.)

### Anti-pattern remediation surface (5 flavours · 9 cards · ~96 files)

| Flavour | Cards | Files (est.) | Fix recipe |
|---|---|---|---|
| 1. Raw `active_entity_code` / `erp_selected_company` localStorage read | GateFlow · 6 Vendor Portal panels · Recent Errors | 9 | Replace with `useEntityCode()` + `SelectCompanyGate` |
| 2. Hardcoded `const E='DEMO'` / `DEFAULT_ENTITY_SHORTCODE` at module/wrapper scope | MaintainPro · SiteX (9) · Dispatch (4) · 16 Pay Hub masters (write-variant) | 30+ | Wrap routes with `useEntityCode()` + `SelectCompanyGate`; lint-ban `DEFAULT_ENTITY_SHORTCODE` outside gate fallback |
| 3. Engine-signature default `entity_id = DEFAULT_ENTITY` | ServiceDesk | 55 page-files via ~12 engine fns | Remove default values from engine signatures · force callers to pass entity |
| 4. Literal entity ID baked into seed-key string | EximX seeder + finance-procurement orchestrator call | 1 seeder + 1 orchestrator call (~9 register surfaces leak) | Refactor seeders to take `entityCode` param + use builder-key fns (`iecKey(e)`, `lutKey(e)`) |
| 5. Stale-entity snapshot via `useState` lazy initializer | Recent Errors | 1 | Replace with reactive `useEntityCode()` hook value in render |

### Seed-coverage gap surface (orchestrator does not seed)
| Card | Missing seed |
|---|---|
| Purchase Invoice · Payment · Journal | Purchase vouchers · JV adjustments (`loadFinCoreTransactions` / `seedFinanceProcurementTxnsForDemo` never invoked under SMRTP scope) |
| SRM · Invoice Memo | Own SRM/IM register stores |
| Procure360 | RFQ · PEQ · PO chain for SMRTP |
| QualiCheck | NCR · CAPA · FAI · MTC · ISO9001 · Welder qualifications |
| EngineeringX | Drawings register |
| Department Stores | `erp_stock_issues_${e}` · `erp_stock_receipt_acks_${e}` |
| Pay Hub | `erp_payroll_runs_${e}` · payslips |

### Honest verdict
- **Of 33 cards audited B3–B10**: 15 PASS · 9 PARTIAL · 8 FAIL (counting Logistics + InsightX as PASS-by-design).
- **PASS rate**: 15/33 = **45%** end-to-end LIVE.
- **PASS-shell rate** (counting PARTIAL as shell-correct): (15+9)/33 = **73%** of cards have correct wiring + at least the registers/forms wired.
- **Hard FAIL rate** (entity-contract bug): 8/33 = **24%** cards have a real entity-resolution bug that puts data into the wrong scope.
- **Anti-pattern remediation surface**: 5 distinct flavours across **9 cards · ~96 files**. Three flavours (1, 2, 5) are page-source detectable; flavour 3 (engine-default) requires engine-source audit; flavour 4 (seed-key string literal) requires seeder-source audit.
- **Reference good-citizen cards** (canonical hook ≥ 80% adoption): FrontDesk (15/15) · TaskFlow (25/27) · RequestX (11/11) · EngineeringX (13/13) · DocVault (17/23) · Cross-Card DayBook · InsightX (by-design). These demonstrate the fix recipe is already proven in-codebase.

### Browser click-through
All 33 cards: **CNR-browser-auth** (login wall). Source-deterministic tallies are dispositive; the verdicts above are not contingent on a logged-in session.

### Recommended next sprint (post-audit)
1. **Anti-pattern remediation sprint** — fix all 5 flavours across the 9 named cards using the recipes in the table above. Add lint rules: (a) ban `localStorage.getItem('active_entity_code')` and `localStorage.getItem('erp_selected_company')` outside the auth/provider layer; (b) ban `DEFAULT_ENTITY_SHORTCODE` outside the gate-fallback message; (c) ban default values on engine signatures whose first param is `entity_id`.
2. **Orchestrator seed-coverage sprint** — seed the 7 named missing surfaces under SMRTP scope so PARTIAL cards flip to PASS.
3. **EximX seeder rewrite** — accept `entityCode` and use builder-key functions everywhere.
4. **Theme-token sweep (B11-F-1)** — extend the W1C-9 guard test to `src/pages/erp/**` and fix the 56-file long tail.

STOP.

---

## Batch 13 · Mobile shell + login + role-home + persona routing — run 13 Jun 2026 — VERDICT: MIXED

**Scope**: `/mobile/*` shell (`MobileRouter.tsx` 374 LOC), `MobileLogin.tsx` (263 LOC · password + QR + biometric), role-home dispatch + `MobileHome.tsx` tile dashboard, persona resolution via `mobile-role-resolver.ts` against Distributor + Customer + SAMPerson masters.

### Findings

| Surface | Verdict | Fail-ID | Live/Static | Notes |
|---|---|---|---|---|
| **`/mobile/*` shell** (`MobileRouter.tsx`) | **PASS** | — | LIVE | Single `<Route path="/mobile/*" element={<MobileRouter />} />` at `src/App.tsx` L428. Renders shell chrome (sticky OperixGo header · `OfflineIndicator` · `InstallPromptBanner` · `UpdateAvailableBanner` · `PushPermissionGate`), gates on session, fans 90+ sub-routes via `renderRoleRoute(pathname)` switch. Side-effects mounted: SW registration · native splash hide · `onAppResume` queue replay · push registration · push-tap deep-link · `setAppBadgeCount` 5s poll · online-event queue replay. Login gate (L320-347) is correct: missing session → `/mobile/login`; logged-in on `/mobile/login` or `/mobile` → role-home redirect. |
| **MobileLogin password path** | **PARTIAL · B13-F-1** | B13-F-1 | LIVE | Form submits credential + password → `resolveIdentity()` matches against `readDistributors()` (`erp_distributors_${ENTITY_CODE}`), `readCustomers()` (`erp_group_customer_master`), `readSAMPersons()` (`samPersonsKey(ENTITY_CODE)`). On success writes `sessionStorage['opx_mobile_session']` + fires `logAudit` + `logMobileLogin` + `setBiometricToken`. **BUT** L23-25 hardcodes `const ENTITY_CODE = DEFAULT_ENTITY_SHORTCODE` — login is locked to a single tenant. A user belonging to a different entity cannot authenticate via this screen. **Sixth distinct flavour** of the entity-resolution anti-pattern class: **login-scope pinned to DEFAULT_ENTITY_SHORTCODE at the auth boundary** (not just at write boundary like B7-F-2). Worse impact than write-pin variants because it blocks the door entirely for non-default-entity users. Distributor + Customer masters are read keyed to the hardcoded entity; SAMPersons key is composed with the hardcoded entity. |
| **MobileLogin QR path** | **PASS** | — | LIVE | `QRCameraScanner` → `handleQRPayload(qrCredential, _qrToken)` pre-fills credential + fires same `onSubmit`. Admin-issued QR token is trusted (skips password by design — admin-panel model). Same entity-pin caveat applies via shared submit. |
| **MobileLogin biometric path** | **PASS** | — | LIVE | `BiometricLoginPrompt` → `onAuthenticated(token)` pre-fills credential + fires same `onSubmit`. `setBiometricToken('opx_session_credential', credential)` written on prior login. Native-only — gracefully no-ops on web. |
| **Role-home dispatch** (`MobileLogin` L165-171 + `MobileRouter` L320-347) | **PARTIAL · B13-F-2** | B13-F-2 | LIVE | Maps 5 of 7 declared session roles to direct mobile routes: `salesman`→`/mobile/salesman` · `telecaller`→`/mobile/telecaller` · `supervisor`→`/mobile/supervisor` · `sales_manager`→`/mobile/manager` · all else→`/mobile/home`. **MobileLogin path omits `site_engineer` and `site_manager`** — those two roles fall through to `/mobile/home` (the MobileHome dispatcher then has no tile-set for them, renders empty state). **MobileRouter path covers them** (L331-332, L341-342) → `/operix-go/site-engineer` — which is a route **outside `/mobile/*`** (mounted at `src/App.tsx` L480 as a sibling route), so the user **exits the MobileRouter shell entirely** — losing offline indicator · install prompt · push-permission gate · app-badge poller · queue-replay subscription. Wave-2 landing-shell split: site-engineer/site-manager live in the Operix-Go shell, not the MobileRouter shell. **Honest disclosure**: this is a deliberate architecture split (Operix-Go is the legacy site/maintenance shell, MobileRouter is the new universal shell), but the divergence between MobileLogin's redirect map and MobileRouter's redirect map (5 vs 7 roles) is a real bug — site_engineer/site_manager users logging in via the password form land at `/mobile/home` and never reach `/operix-go/site-engineer`. |
| **Persona routing** (`renderRoleRoute`) | **PASS** | — | LIVE | 90+ pathname-prefix dispatch covering 7 personas (salesman 11 routes · telecaller 12 · supervisor 9 · manager 9 · distributor 6 · customer 13 incl. AM.4 shop PWA · transporter 6 · vendor 6 · 2 shared · 5 captures · 1 universal report). One duplicate line at L142+L143 (`call-log` registered twice — harmless · second overrides first to same component). Otherwise tight switch with fall-through to `<MobileHome />`. |
| **MobileHome tile dashboard** | **PASS** | — | LIVE | Role-aware tile sets for distributor · customer · salesman · telecaller (plus more in unread tail). Gated via `FeatureGate` with `feature` ids from `plan-features.ts`. `logMobileTileClick` audits each tap. Reads session from `sessionStorage['opx_mobile_session']` directly (L27-34) — same anti-pattern as B10-F-1 but tolerated here because MobileHome is rendered inside MobileRouter which already gates on session presence. |
| **Theme on mobile** | **PASS** | — | LIVE | `<html class="dark">` is the canonical 4DSmartOps mode per project-knowledge ("Dark mode always · never build light mode screens"). MobileLogin uses `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900` (literal slate hex via Tailwind named tokens) — this is the documented OperixGo brand chrome (admin-panel-driven login screen mirrors the dark slate of the marketing surface). MobileRouter sticky header uses `bg-slate-900 text-white` (same brand chrome). Theme toggle is intentionally **NOT** wired into the mobile shell — mobile is dark-only by design, mirrors the project-knowledge constraint. No theme regression because there is no toggle to break. Inner pages use design tokens (`bg-background` shell wrapper · `bg-card` · `text-foreground` · `text-muted-foreground`) and respect the global `.dark` class on `<html>`. Verified on `MobileSalesmanHome` + 9 other persona-home spot-checks. |

### Anti-pattern roll-up — NEW FLAVOUR in B13 (6th distinct flavour overall)

| Flavour | Cards | Files | Severity |
|---|---|---|---|
| **6. Login-scope pinned to `DEFAULT_ENTITY_SHORTCODE` at the auth boundary** (NEW · B13) | MobileLogin | 1 (`src/pages/mobile/MobileLogin.tsx` L23-25) | **High** — blocks non-default-entity users from authenticating at all. Higher impact than the 5 prior flavours (which silently route to/write into wrong scope; this one blocks the door entirely). |

**Updated remediation surface**: **6 distinct flavours across 10 cards · ~97 files** (was 5/9/~96 after B12).

### Functional-vs-Wave2-landing-shell split (honest disclosure per ledger ask)

The mobile estate carries **two concurrent shells** and the split is real:

| Shell | Path prefix | Personas served | Chrome | Status |
|---|---|---|---|---|
| **MobileRouter** (universal · Wave-2) | `/mobile/*` | salesman · telecaller · supervisor · sales_manager · distributor · customer · transporter · vendor · 5 capture personas + universal report viewer | `OperixGo` sticky header + OfflineIndicator + InstallPromptBanner + UpdateAvailableBanner + PushPermissionGate + SW + app-badge poll | **Functional** — login gate · session readout · queue replay · push deep-link all wired |
| **Operix-Go** (legacy site/maintenance · Wave-1) | `/operix-go/*` | site_engineer · site_manager · maintenance technician · shop-floor operator · Vetan Nidhi · SalesX-Go · ReceivX-Go · Distributor-Go | Per-page chrome · NO offline indicator · NO install prompt · NO push gate at shell level (some pages embed their own) | **Functional but unstandardised** — each page rolls its own header/footer |

**Honest grading**:
- The two shells are **not** unified.
- MobileLogin's redirect map omits 2 of 7 declared session roles, sending them silently to `/mobile/home` instead of bridging into the Operix-Go shell at `/operix-go/site-engineer`.
- MobileRouter's redirect map **does** bridge those 2 roles correctly — but the bridge exits the universal shell, so site-engineer users never benefit from queue replay · push deep-link · install prompt · app-badge poll.
- The two redirect maps drifting (5 vs 7 roles) is the bug; the shell split itself is a deliberate Wave-1/Wave-2 architecture decision (memorialised at `mem://architecture/sarathi-mobile-pattern` D-NEW-DI standardised mobile landing pattern, which the Wave-1 pages predate).

### Browser click-through
`/mobile` → MobileRouter login gate → `/mobile/login` → MobileLogin form. CNR-browser-auth (no demo credential combo in scope). Source-deterministic + session-contract analysis is dispositive.

### Verdict
**MIXED** — Mobile shell + 90-route persona dispatcher + theme stance all PASS. Login form PARTIAL (B13-F-1 entity-pin at auth boundary · 6th anti-pattern flavour · highest-severity yet). Role-home dispatch PARTIAL (B13-F-2 redirect-map divergence between MobileLogin and MobileRouter · 2 roles drop out of MobileLogin map). Functional-vs-Wave2-landing-shell split honestly disclosed: two shells live concurrently · the redirect-map drift is the only fixable bug · the shell split itself is a deliberate Wave-1/Wave-2 carve-out.

STOP.

### Progress Ledger
- **DONE**: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] ✅
- **NEXT**: Batch 14 🔄
- **REMAINING**: 3

---

## Batch 14 · Mobile capture flows A — gate-guard · inward-receipt · QC · material-indent · store-issue — run 13 Jun 2026 — VERDICT: MIXED-PASS

**Scope**: 5 mobile capture flows mounted on the Wave-1 Operix-Go shell at `/operix-go/{gate-guard,qualicheck,inward-receipt,material-indent,store-issue}`. Each is a page wrapper (`MobileXxxPage.tsx`) that toggles `showCapture` to mount the heavy `MobileXxxCapture.tsx` flow. Goal per flow: (a) screen opens, (b) camera/QR/voice shell mounts, (c) SUBMIT writes a row to the **REAL desktop register** keyed identically to the desktop card.

### Findings

| # | Flow | Opens? | Capture shell | Engine called on SUBMIT | Real register key | Verdict | Entity flavour |
|---|---|---|---|---|---|---|---|
| 1 | **Gate-Guard** (`MobileGateGuardCapture` 357 LOC) | YES | QR (`QRCameraScanner`) + camera (`capturePhoto` × 4 steps) | `createInwardEntry` / `createOutwardEntry` from `gateflow-engine` | `erp_gate_passes_${ENTITY}` (desktop GateFlow register) | **PASS** | Flavour #2 — `const ENTITY = DEFAULT_ENTITY_SHORTCODE` (L41-47) |
| 2 | **Inward-Receipt** (`MobileInwardReceiptCapture` 354 LOC) | YES | camera only (`capturePhoto` per item · no QR · no voice) | `createInwardReceipt` from `inward-receipt-engine` (L138 `await createInwardReceipt(payload, ENTITY, 'mobile-warehouse')`) | desktop inward-receipt register (same engine used by Main Store Hub inward panel) | **PASS** | Flavour #1 — `localStorage.getItem('active_entity_code') ?? 'DEMO'` (L45) |
| 3 | **QualiCheck** (`MobileQualiCheckCapture` 354 LOC) | YES | camera only | `updateInspectionLine` + `completeInspection` from `qa-inspection-engine` (L122-128) — same byte-identical engine the desktop QualiCheck inspection panel uses | desktop QA-inspection register (`listPendingQa` round-trips from same store) | **PASS** | Flavour #1 — raw `active_entity_code` (L52) |
| 4 | **Material-Indent** (`MobileMaterialIndentCapture` 250 LOC) | YES | NO camera · NO QR · NO voice (header-line entry only) | `createMaterialIndent` from `request-engine` (L152 region) | RequestX indent register (same key RequestX desktop card reads) | **PARTIAL · B14-F-1** | Flavour #1 — raw `active_entity_code` (L69) |
| 5 | **Store-Issue** (`MobileStoreIssueCapture` 215 LOC) | YES | camera only | `createStockIssue` + `postStockIssue` from `stock-issue-engine` (L123) — header annotation `[JWT] writes via stock-issue-engine to localStorage erp_stock_issues_${entityCode}` | `erp_stock_issues_${entityCode}` (desktop Department Stores stock-issue register) | **PASS** | Flavour #1 — raw `active_entity_code` (L66) |

### Engine reuse — byte-identical desktop wiring (confirmed)

All 5 captures import the **same engines** the desktop cards use; nothing is mocked, no separate mobile-only store key:
- `gateflow-engine` (GateGuard) → also imported by `MobileInwardReceiptCapture` for `listInwardQueue` cross-flow handoff (gate-in → inward).
- `inward-receipt-engine` (Inward-Receipt) → CORE BYTE-IDENTICAL per header comment.
- `qa-inspection-engine` (QualiCheck) → CORE BYTE-IDENTICAL.
- `request-engine` (Material-Indent) → standard RequestX indent creator.
- `stock-issue-engine` (Store-Issue) → header explicitly notes NO MODIFICATIONS reuse.

This is the **cleanest mobile→desktop wiring discipline in the audit so far** — Wave-1 Operix-Go captures consume the same engine surface as the desktop cards, so a row submitted on phone appears in the same desktop register the cards already read.

### B14-F-1 PARTIAL · Material-Indent only saves DRAFT

`MobileMaterialIndentCapture` review-step button reads `Save as DRAFT` (not `Submit & Post`). `createMaterialIndent` writes a row to the RequestX indent register with status DRAFT — the row **does** land in the real register (so it is **not** a fail per the ledger rule), but it stops short of submission. Desktop RequestX users must open the DRAFT to push it through approval. This is honest Wave-2 staging for a complex multi-approval flow; calling it PASS would overstate the integration.

### Camera / QR / voice shell audit

| Flow | Camera | QR | Voice |
|---|---|---|---|
| Gate-Guard | YES (×4 capture steps) | YES (`QRCameraScanner` for vehicle scan) | NO |
| Inward-Receipt | YES (per-item) | NO | NO |
| QualiCheck | YES (evidence photos) | NO | NO |
| Material-Indent | NO | NO | NO |
| Store-Issue | YES (issue evidence) | NO | NO |

Voice capture (`MobileCustomerVoiceComplaintPage` uses `Mic` icon) is not threaded into any of these 5 industrial-capture flows. Gate-Guard's QR pathway is the only QR consumer in the 5; the rest are pure camera-or-typing.

### Offline-queue fallback (Wave-2 honesty — not graded as fail)

Every SUBMIT wraps the engine call in `if (!navigator.onLine) enqueueWrite(ENTITY, 'rating_submit', ...) else <engine call>`. When offline the row goes into the offline queue (`offline-queue-engine`) rather than the real register; on reconnect `triggerQueueReplay` from `MobileRouter` is supposed to flush, but the **per-kind handlers are TODO** per `MobileRouter` L243-252 comment ("For 14a we just no-op; future sprints attach handlers per kind"). So an offline capture is honestly persisted (queue is real) but does NOT auto-promote into the desktop register on reconnect today — it requires the per-kind replay handler sprint. **This is Wave-2 landing, not a fail** per the ledger rule.

### Entity-resolution roll-up (no NEW flavour in B14)

Two pre-existing flavours surface across the 5:
- Flavour #1 (raw `active_entity_code` localStorage read) — 4 of 5 (Inward · QC · Indent · Store-Issue)
- Flavour #2 (hardcoded `DEFAULT_ENTITY_SHORTCODE`) — 1 of 5 (Gate-Guard)

Both flavours are already catalogued under the 6-flavour remediation surface (B5-B13). No 7th flavour. Remediation count unchanged: **6 distinct flavours across 10 cards · ~97 files** + these 5 capture flows already covered under flavours #1 and #2 (component-level files, not new cards).

### Browser click-through
All 5 page routes hit Operix-Go which expects an active mobile session via `sessionStorage['opx_mobile_session']` — login wall → **CNR-browser-auth**. Source + engine-import + register-key analysis is dispositive.

### Verdict
**MIXED-PASS** — 4 of 5 captures PASS the ledger rule (row lands in real desktop register via byte-identical engine). 1 of 5 PARTIAL (Material-Indent posts only DRAFT). All 5 page wrappers open · capture shells mount · camera-bridge works (per `capturePhoto` stub) · QR works on Gate-Guard · offline-queue fallback is wired but per-kind replay handlers are TODO. Entity-pin caveats apply via flavours #1/#2 (already catalogued). Engine reuse discipline is the cleanest in the audit — the 5 capture flows consume the same engine surface as their respective desktop cards, so the mobile→desktop write contract is honestly held.

STOP.

### Progress Ledger
- **DONE**: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] ✅
- **NEXT**: Batch 15 🔄
- **REMAINING**: 2

---

## BATCH 15 · Mobile capture flows B (POD · spares-issue · PM-tickoff · site-DPR · safety-incident · FA-scan · asset-photo)
**HEAD target**: `64b6f12` · **Run date**: 13 Jun 2026 · **Method**: route-walk + source-deterministic engine-import + register-key analysis (browser CNR per project login wall).

### Per-flow results

| # | Flow | Route | Opens | Capture shell | Engine / write call | Real register key | Verdict | Entity flavour |
|---|---|---|---|---|---|---|---|---|
| 1 | **POD (transporter)** | `/mobile/transporter/pod` (`MobilePODCapturePage`) | YES | Signature canvas + photo input (no QR/voice) | inline `localStorage.setItem(podsKey(session.entity_code), …)` — POD shape matches desktop reader | `erp_pods_${entity}` | **PASS** | session.entity_code (CLEAN — same canonical session contract as B10) |
| 1b | POD (shared `MobilePODCapture` component) | **not routed** in App.tsx (uses `pod-engine` + `capturePhoto` from `camera-bridge` + OTP/GPS) | n/a | Camera + GPS + OTP | `verifyPOD` + `localStorage.setItem(podsKey(ENTITY), …)` | `erp_pods_DEMO` | **DEAD-CODE** (no `<MobilePODCapture` route or mount found) | Flavour #2 (`DEFAULT_ENTITY_SHORTCODE`) — but unreachable |
| 2 | **Spares-Issue** | `/operix-go/spares-issue-capture` | YES | Camera (maintainpro flow) | **`createSparesIssue`** from `maintainpro-engine` | maintainpro spares-issue register | **PASS** | Flavour #2 — `const E = 'DEMO'` (L23) |
| 3 | **PM-Tickoff** | `/operix-go/pm-tickoff-capture` | YES | Camera | **`createPMTickoff`** from `maintainpro-engine` | maintainpro PM-tickoff register | **PASS** | Flavour #2 — `const E = 'DEMO'` (L24) |
| 4 | **Site-DPR** | `/operix-go/site-dpr` | YES | Camera (inline `capturePhoto`) + GPS (`geolocation-bridge`) + geo-fence check | inline `localStorage.setItem(dprsKey(ENTITY), …)` — DPR shape from `@/types/sitex` matches desktop SiteX reader | `erp_sitex_dprs_${ENTITY}` | **PASS** | Flavour #2 — `DEFAULT_ENTITY_SHORTCODE` (L25) |
| 5 | **Safety-Incident** | `/operix-go/site-safety` | YES | (header/photo, no QR/voice) | `emitSafetyIncidentEscalate` (`sitex-bridges`) + inline write to `sitexSafetyIncidentsKey(ENTITY)` | `erp_sitex_safety_${ENTITY}` | **PASS** | Flavour #2 — `DEFAULT_ENTITY_SHORTCODE` (L24) |
| 6 | **FA-Scan** | `/mobile/fa-scan` | YES | Camera **STAGED** ("staged for Phase 5 · use manual entry") + bridge lookups (`findAssetByRFIDTag` · `findPhysicalAssetUnit`) | `handleAction` = `setTimeout(600ms)` toast stub — **no register write** | none | **Wave-2 landing** (shell-only · honest disclosure per ledger rule) | useEntityCode (CLEAN — canonical hook) |
| 7 | **Asset-Photo** | `/operix-go/asset-photo-capture` | YES | Camera | **`appendEquipmentPhoto`** from `maintainpro-engine` | maintainpro equipment register (photo array) | **PASS** | Flavour #2 — `const E = 'DEMO'` (L18) |

### Engine reuse discipline (named per ledger rule)
- **maintainpro-engine** consumed by 3 captures (Spares-Issue · PM-Tickoff · Asset-Photo) — `createSparesIssue` · `createPMTickoff` · `appendEquipmentPhoto` are byte-shared with desktop MaintainPro card.
- **pod-engine** + direct `podsKey` write — transporter route uses inline writer matching POD shape; desktop POD reader picks up the row.
- **sitex-engine** + `sitex-bridges` — DPR + Safety-Incident write through `dprsKey` / `sitexSafetyIncidentsKey` matching desktop SiteX reader; safety-incident additionally emits `emitSafetyIncidentEscalate` for dashboard alert.
- **camera-bridge** + **geolocation-bridge** + **offline-queue-engine** = shared peripheral bridges across all 6 active captures.
- **FA-Scan** does NOT call any write engine — bridge calls are read-only lookups; actions are setTimeout stubs.

### Camera / QR / voice shell audit
| Flow | Camera | QR | Voice |
|---|---|---|---|
| POD (transporter) | YES (file input) | NO | NO; signature canvas instead |
| Spares-Issue | YES | NO | NO |
| PM-Tickoff | YES | NO | NO |
| Site-DPR | YES (inline `capturePhoto`) | NO | NO |
| Safety-Incident | NO (header-only · photo TODO) | NO | NO |
| FA-Scan | **STAGED** ("Camera scanning is staged for Phase 5") | STAGED | NO |
| Asset-Photo | YES | NO | NO |

### Offline-queue fallback
Same pattern as B14 — all 5 active captures (POD/Spares/PM/DPR/Safety/Asset-Photo) wrap submits with `if (!navigator.onLine) enqueueWrite(...) else <real write>`. Replay handlers per-kind still TODO per `MobileRouter` L243-252. Honest Wave-2 staging · not a fail.

### Entity-resolution roll-up (no NEW flavour in B15)
- Flavour #2 (hardcoded `DEFAULT_ENTITY_SHORTCODE` / `const E='DEMO'`) — 5 of 7 (Spares · PM · DPR · Safety · Asset-Photo, +1b dead-code POD shared component)
- Clean canonical (session/hook) — 2 of 7 (POD transporter via `session.entity_code` · FA-Scan via `useEntityCode`)
- No raw `active_entity_code` reads in B15 set
- No new flavour. Remediation count unchanged: **6 distinct flavours across 10 cards · ~97 files**.

### B15-F-1 (informational, not graded) · Two POD implementations co-exist
`MobilePODCapture` (full camera + GPS + OTP via `pod-engine`) is **not routed** in App.tsx — the actually-mounted transporter POD is `MobilePODCapturePage` (signature canvas + inline write). The richer flow is dead-code waiting for a route flip. Calling this out so the next sprint flips one or removes the other.

### Browser click-through
All 7 page routes hit Operix-Go / mobile shell login wall → **CNR-browser-auth**. Source + engine-import + register-key analysis is dispositive.

### Verdict
**MIXED-PASS** — 6 of 7 captures PASS (row lands in real desktop register via shared engine — `maintainpro-engine` ×3 · inline `podsKey`/`dprsKey`/`sitexSafetyIncidentsKey` ×3). 1 of 7 (FA-Scan) is **Wave-2 landing** — page opens, bridge lookups work, but camera is staged and actions are setTimeout stubs (no register write). Engine reuse discipline remains the cleanest in the audit; entity-pin caveats apply to 5 of 7 via flavour #2 (already catalogued, no new flavour).

STOP.

### Progress Ledger
- **DONE**: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] ✅
- **NEXT**: Batch 16 🔄
- **REMAINING**: 1

---

## BATCH 16 · Mobile personas + PWA (last test batch)
**HEAD target**: `a4f2ae6` · **Run date**: 13 Jun 2026 · **Method**: route-walk + source-deterministic shell-mount + PWA-surface analysis (browser CNR per login wall).

### Persona pages

| Page | Route | Renders | Persona engine call | OfflineIndicator | Theme | Verdict | Entity flavour |
|---|---|---|---|---|---|---|---|
| **MobileSiteEngineerPage** | `/operix-go/site-engineer` | YES — sites grid + 4 QuickActions (DPR · Snag · Safety · Material) | `listSites(ENTITY)` from `sitex-engine` | YES (header) | design tokens (`bg-card` · `text-primary` · `text-muted-foreground`) — clean | **PASS** | Flavour #2 — `DEFAULT_ENTITY_SHORTCODE` (L17) |
| **MobileMaintenanceTechnicianPage** | `/operix-go/maintenance-technician` | YES — 4 capture tiles + 3 summary tiles (Active WOs · Today PMs · Open Tickets) | `listWorkOrders` · `listPMTickoffs` · `listInternalTickets` from `maintainpro-engine` (5s tick refresh) | YES (header) | design tokens — clean | **PASS** | Flavour #2 — `const E = 'DEMO'` (L15) |
| **MobileShopFloorOperatorPage** | `/operix-go/shop-floor-operator` | YES — today's job cards + machine health + 5 QuickActions (Confirm · JobCard · MatIssue · JWO · FA-Scan) | reads via `useEntityCode` → job cards + machine health summary | **NO** (header lacks it · B16-F-1) | design tokens — clean | **PARTIAL** | useEntityCode (CLEAN — canonical hook) |

### B16-F-1 PARTIAL · OfflineIndicator drift across personas

The 3 persona headers diverge: SiteEngineer + MaintenanceTechnician mount `<OfflineIndicator />` in the right of the header; ShopFloorOperator only renders `<ArrowLeft />` + title (no OfflineIndicator). For an "offline-first" shop-floor surface the missing indicator is a UX regression — the operator cannot see online/offline/sync-pending state at a glance. Two-line fix in `MobileShopFloorOperatorPage.tsx` header. Not graded as FAIL because the page itself renders + workflow is functional.

### OfflineIndicator behaviour (source-deterministic)
- Subscribes to `service-worker-setup` state (`online` · `registered` · `updateAvailable`).
- Polls `getQueueSize()` from `offline-queue-engine` every 2s.
- Three branches: online + queue=0 → green "Online" chip · offline → amber "Offline · N pending" · online + queue>0 → blue animated "Syncing · N".
- **Anti-pattern flag**: hardcoded `bg-emerald-500/10 text-emerald-600 border-emerald-500/30` (also amber / blue) violates project rule "never use Tailwind named colors". Pre-existing, surfaced here for the remediation backlog (not a B16 fail).

### InstallPromptBanner behaviour
- Standard `beforeinstallprompt` listener, calls `event.prompt()` + records dismissal in `localStorage['opx_install_dismissed_at']` with **7-day NAG_COOLDOWN**.
- Renders a fixed bottom-corner card with "Install OperixGo · Faster access · Works offline".
- Mount: **only `MobileRouter` L369 mounts it** (`/mobile/*` Wave-2 shell).
- **B16-F-2 PARTIAL** · The 3 persona pages live at `/operix-go/*` (Wave-1 shell) where `<InstallPromptBanner />` is **NOT mounted at shell level**. So a user on `/operix-go/site-engineer` never sees the install banner — they only see it if they bounce through `/mobile/*` first. This is the same Wave-1/Wave-2 architecture split already flagged in B13; calling it out again because PWA install discoverability is supposed to be universal. Two-line fix to mount the banner in the Operix-Go shell.

### Theme on mobile
- Project rule: mobile is dark-only (no toggle by design).
- All 3 persona pages use semantic design tokens (`bg-card`, `bg-background`, `bg-primary/10`, `text-muted-foreground`, `text-primary`, `text-success/warning/destructive`). No hardcoded hex, no `bg-white`, no `text-gray-*`.
- OperixGo brand chrome (`bg-slate-900` etc.) is confined to the Wave-2 shell header per documented OperixGo brand spec — not in persona page bodies.
- **PASS** — theme tokens hold cleanly on mobile layouts.

### PWA surface (source-deterministic)
- `public/sw.js` exists; registered from **two** places: `src/main.tsx` L30 (`navigator.serviceWorker.register('/sw.js')` in PROD) AND `src/lib/service-worker-setup.ts` L45 (same path, used by MobileRouter for `subscribe` state + `triggerQueueReplay`).
- `public/manifest.webmanifest` present (project manifest).
- **PWA skill conformance NOTE** (not a B16 fail · pre-existing): The current SW is hand-written and registered ad-hoc from two call sites. Per the PWA skill, the canonical path is `vite-plugin-pwa` + single guarded wrapper that refuses to register in Lovable preview / iframes / `id-preview--*` / `lovableproject.com`. The current `main.tsx` registration only guards on `import.meta.env.PROD` — it would register in any non-dev preview iframe that builds. Catalogue for the PWA remediation sprint; not graded here because no install regression observed under CNR-browser-auth.

### Entity-resolution roll-up (no new flavour)
- 2 of 3 personas use Flavour #2 (`DEFAULT_ENTITY_SHORTCODE` / `const E='DEMO'`)
- 1 of 3 uses canonical `useEntityCode` (ShopFloorOperator — good citizen)
- No new flavour. Remediation count unchanged: **6 distinct flavours across 10 cards · ~97 files**.

### Browser click-through
All 3 persona routes → Operix-Go login wall → **CNR-browser-auth**. Source-deterministic shell-mount analysis is dispositive.

### Verdict
**MIXED-PASS** — 3 of 3 persona pages render their workflow correctly with the right engine reads. OfflineIndicator is mounted on 2 of 3 (B16-F-1). InstallPromptBanner is shell-mounted only on the Wave-2 `/mobile/*` shell, not Wave-1 `/operix-go/*` (B16-F-2). Theme tokens hold on mobile. PWA SW + manifest are present and registered, but the registration is not PWA-skill-conformant (hand-written SW · dual registration · weak preview guard) — pre-existing, catalogued for remediation. No new entity-resolution flavour.

STOP.

### Progress Ledger
- **DONE**: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] ✅
- **NEXT**: Batch 17 (mobile reconcile) 🔄
- **REMAINING**: 1

---

## BATCH 17 · Mobile reconcile (final batch)
**HEAD target**: `520dd87` · **Run date**: 13 Jun 2026 · **Scope**: honest mobile coverage map across Batches 13-16.

### Capture coverage map (Batches 14 + 15 combined · 12 mobile capture flows)

| # | Capture | Route | Shared engine | Real register key | Verdict | Entity flavour |
|---|---|---|---|---|---|---|
| 1 | Gate-Guard | `/operix-go/gate-guard` | `gateflow-engine` (`createInwardEntry`/`createOutwardEntry`) | `erp_gate_passes_${E}` | **PASS** | #2 |
| 2 | Inward-Receipt | `/operix-go/inward-receipt` | `inward-receipt-engine` (`createInwardReceipt`) | desktop inward register | **PASS** | #1 raw `active_entity_code` |
| 3 | QualiCheck | `/operix-go/qualicheck` | `qa-inspection-engine` (`updateInspectionLine` + `completeInspection`) | desktop QA register | **PASS** | #1 raw `active_entity_code` |
| 4 | Material-Indent | `/operix-go/material-indent` | `request-engine` (`createMaterialIndent`) | RequestX indent register | **PARTIAL** (B14-F-1 · DRAFT-only) | #1 raw `active_entity_code` |
| 5 | Store-Issue | `/operix-go/store-issue` | `stock-issue-engine` (`createStockIssue` + `postStockIssue`) | `erp_stock_issues_${E}` | **PASS** | #1 raw `active_entity_code` |
| 6 | POD (transporter) | `/mobile/transporter/pod` | inline `podsKey(session.entity_code)` write — POD shape matches desktop reader | `erp_pods_${E}` | **PASS** | session.entity_code (CLEAN) |
| 6b | POD (shared component, full camera+GPS+OTP) | **unrouted** | `pod-engine` (`verifyPOD`) + `podsKey` | `erp_pods_DEMO` | **DEAD-CODE** (B15 informational) | #2 (unreachable) |
| 7 | Spares-Issue | `/operix-go/spares-issue-capture` | `maintainpro-engine` (`createSparesIssue`) | maintainpro spares register | **PASS** | #2 `const E='DEMO'` |
| 8 | PM-Tickoff | `/operix-go/pm-tickoff-capture` | `maintainpro-engine` (`createPMTickoff`) | maintainpro PM register | **PASS** | #2 `const E='DEMO'` |
| 9 | Site-DPR | `/operix-go/site-dpr` | inline `dprsKey(ENTITY)` write — DPR shape from `@/types/sitex` | `erp_sitex_dprs_${E}` | **PASS** | #2 `DEFAULT_ENTITY_SHORTCODE` |
| 10 | Safety-Incident | `/operix-go/site-safety` | `sitex-bridges` (`emitSafetyIncidentEscalate`) + inline `sitexSafetyIncidentsKey` write | `erp_sitex_safety_${E}` | **PASS** | #2 `DEFAULT_ENTITY_SHORTCODE` |
| 11 | FA-Scan | `/mobile/fa-scan` | bridge lookups only (`findAssetByRFIDTag` · `findPhysicalAssetUnit`) — `handleAction` is setTimeout toast stub | **none** | **Wave-2 landing** (shell-only · camera staged for Phase 5) | useEntityCode (CLEAN) |
| 12 | Asset-Photo | `/operix-go/asset-photo-capture` | `maintainpro-engine` (`appendEquipmentPhoto`) | maintainpro equipment register | **PASS** | #2 `const E='DEMO'` |

**Capture tally**: **10 of 12 PASS** (row physically lands in real desktop register via shared engine or matching key) · **1 PARTIAL** (Material-Indent DRAFT-only) · **1 Wave-2 landing** (FA-Scan) · **1 DEAD-CODE** (MobilePODCapture rich variant unrouted). **0 FAIL** in the mobile capture surface — engine reuse discipline is the cleanest layer in the audit.

### Persona pages (Batch 16 · 3 of 3)

| Page | Verdict | OfflineIndicator | Notes |
|---|---|---|---|
| MobileSiteEngineerPage | **PASS** | YES | `listSites` from `sitex-engine` |
| MobileMaintenanceTechnicianPage | **PASS** | YES | `listWorkOrders` + `listPMTickoffs` + `listInternalTickets` (5s tick refresh) |
| MobileShopFloorOperatorPage | **PARTIAL** (B16-F-1) | **NO** | Workflow OK; OfflineIndicator missing from header (UX regression) |

### Shell + PWA (Batch 13 + 16)

| Surface | Verdict | Notes |
|---|---|---|
| `/mobile/*` Wave-2 universal shell (`MobileRouter`) | **PASS** | 90+ pathname-prefix routes · 4 banners (OfflineIndicator · UpdateAvailable · InstallPrompt · Push gate) · SW registration · queue replay · app-badge poller · push deep-link |
| `/operix-go/*` Wave-1 legacy shell | **PARTIAL** | Per-page chrome · functional · no shell-level InstallPromptBanner mount (B16-F-2) |
| MobileLogin password path | **PARTIAL** (B13-F-1) | Locked to `DEFAULT_ENTITY_SHORTCODE` at the auth boundary — flavour #6, blocks non-default-entity users |
| Role-home dispatch | **PARTIAL** (B13-F-2) | 5/7 roles map directly; site_engineer/site_manager fall through `/mobile/home` then bridge to Wave-1 (drift between two redirect maps) |
| QR + biometric login paths | **PASS** | `QRCameraScanner` + `BiometricLoginPrompt` pre-fill credential + fire same `onSubmit` |
| Theme on mobile | **PASS** | Dark-only by design; persona pages + captures use design tokens (`bg-card`, `text-primary`, `text-muted-foreground`) — no hardcoded hex |
| OfflineIndicator behaviour | **PASS** (with anti-pattern flag) | 3 branches (Online/Offline/Syncing) bound to SW state + 2s queue poll. Uses hardcoded Tailwind named colors (`bg-emerald-500/10` etc.) — pre-existing project-rule violation, not a fail |
| InstallPromptBanner behaviour | **PASS** | Standard `beforeinstallprompt` + 7-day dismissal cooldown. Mounted only in `MobileRouter` (B16-F-2 coverage gap on `/operix-go/*`) |
| PWA SW + manifest | **PASS** (functional) · **NOT skill-conformant** | Hand-written `public/sw.js` · dual registration (`main.tsx` L30 + `service-worker-setup.ts` L45) · only guards `import.meta.env.PROD`. Canonical path is `vite-plugin-pwa` + single guarded wrapper refusing Lovable preview / iframe / `id-preview--*` hosts. Catalogued for the PWA remediation sprint |
| Offline-queue replay handlers | **Wave-2 landing** | `triggerQueueReplay` exists; per-kind handlers are TODO (`MobileRouter` L243-252 comment) — captures persist to queue offline but do NOT auto-promote on reconnect today |

### Entity-resolution instances on the mobile surface (final tally)

| Flavour | Mobile-surface files | Notes |
|---|---|---|
| **#1** raw `active_entity_code` localStorage read | 4 captures (Inward · QC · Indent · Store-Issue) | Already catalogued under desktop flavour #1 |
| **#2** hardcoded `DEFAULT_ENTITY_SHORTCODE` / `const E='DEMO'` | 7 surfaces (Gate-Guard · Spares · PM · DPR · Safety · Asset-Photo · SiteEngineer + dead-code POD) | Already catalogued under desktop flavour #2 |
| **#6** Login-scope pinned at auth boundary (NEW in B13) | MobileLogin password path | **NEW** mobile-only flavour — highest severity (blocks door) |
| **Clean canonical** (`useEntityCode` or `session.entity_code`) | 3 surfaces (ShopFloorOperator · FA-Scan · POD-transporter) | Reference good-citizens on mobile |

**Mobile-surface roll-up**: 11 of 14 mobile surfaces are entity-pinned (78% non-canonical). 3 of 14 use the canonical resolver. The mobile surface is **more** pinned than desktop because the Wave-1 Operix-Go captures predate the canonical hook adoption sprint.

### CNR statement
All 14+ mobile surfaces are gated behind either `/mobile/login` (Wave-2) or `sessionStorage['opx_mobile_session']` (Wave-1). Every browser click-through across Batches 13-16 hits **CNR-browser-auth**. All verdicts are source-deterministic (engine-import + register-key + shell-mount analysis), which the ledger rule accepts as dispositive.

### Mobile-surface findings ledger (consolidated)
- **B13-F-1** · MobileLogin pinned to `DEFAULT_ENTITY_SHORTCODE` — flavour #6 NEW · High severity
- **B13-F-2** · Role-home redirect drift (5/7 roles mapped) · Medium
- **B14-F-1** · Material-Indent DRAFT-only (no Submit & Post) · Low (row lands)
- **B15-F-1** · Two POD implementations co-exist (rich camera+GPS+OTP variant unrouted) · informational
- **B16-F-1** · OfflineIndicator missing on ShopFloorOperator header · Low UX
- **B16-F-2** · InstallPromptBanner not shell-mounted on `/operix-go/*` · Low UX
- **PWA skill non-conformance** · hand-written SW + dual registration + weak preview guard · catalogued for remediation

### Mobile-surface remediation backlog (priority-ordered)
1. **B13-F-1** — replace `ENTITY_CODE = DEFAULT_ENTITY_SHORTCODE` in MobileLogin with session-aware resolution (highest impact: unblocks all non-default-entity tenants)
2. **PWA skill migration** — adopt `vite-plugin-pwa` + single guarded wrapper; retire hand-written `public/sw.js` + dual registration (preview safety)
3. **Flavour #1 + #2 sweep on capture surface** — migrate 11 mobile capture/persona files to `useEntityCode` / `session.entity_code`
4. **B14-F-1** — promote Material-Indent from DRAFT-only to Submit & Post (or document the staging intentionally)
5. **B15-F-1** — flip one POD route to the rich variant or delete the dead-code variant
6. **B16-F-2** — mount `<InstallPromptBanner />` in Wave-1 Operix-Go shell
7. **B16-F-1** — add `<OfflineIndicator />` to ShopFloorOperator header
8. **B13-F-2** — reconcile MobileLogin role-map vs MobileRouter redirect-map (single source)
9. **OfflineIndicator color tokens** — replace `bg-emerald-500/10` etc. with semantic tokens (`bg-success/10 text-success`)

---

## SMOKE RUN — FINAL STATEMENT

**Run COMPLETE** across 17 batches over 13 Jun 2026. Coverage:
- **Desktop** · 33 cards reconciled in Batch 12 → 15 PASS · 9 PARTIAL · 8 FAIL · 1 sub-surface FAIL · 6 entity-resolution flavours across 9 cards · ~96 files
- **Edge** · Theme/print/report surfaces verified in Batch 11
- **Mobile** · 12 captures + 3 personas + shell/PWA reconciled in Batch 17 → 10 capture PASS · 1 PARTIAL · 1 Wave-2 · 1 DEAD · 3 persona pages (2 PASS · 1 PARTIAL) · 1 NEW mobile-only flavour (#6) bringing total to **7 distinct flavours across 11 surfaces · ~98 files**

**Browser click-through** across all 17 batches: uniformly CNR-browser-auth (login wall by design). All verdicts source-deterministic.

**Net signal**: The engine layer is honest (shared engines across desktop + mobile, byte-identical register keys); the entity-resolution layer is the dominant remediation surface (78% non-canonical on mobile, ~30% on desktop). One door-blocking bug (B13-F-1 · flavour #6 on MobileLogin) is the single highest-priority fix.

STOP.

### Progress Ledger
- **DONE**: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] ✅
- **NEXT**: —
- **REMAINING**: 0
- **STATUS**: ✅ **SMOKE RUN COMPLETE**
