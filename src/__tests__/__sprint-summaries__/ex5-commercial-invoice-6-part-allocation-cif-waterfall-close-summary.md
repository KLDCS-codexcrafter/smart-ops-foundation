# Sprint EX-5 Close Summary · Commercial Invoice + 6-Part Allocation + CIF Waterfall (6-Basis · Founder Caveat) + Landed Cost Replay + CICustomeVal Audit

**Sprint**: T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
**Position**: 5th of 12-13 in EximX arc · LARGEST sprint of arc
**Predecessor HEAD**: 884ba51f (EX-4 banked)
**Streak target**: 28th consecutive first-pass-clean A

## Moats anchored
- **#15 Customs Revaluation Audit Trail · FULL ANCHOR** · CICustomeVal editable + emits ReconciliationEvent on linked MLGIT
- **#1 Replayable Landed Cost · FULL CONSUMER** · landed-cost-replay-engine reads MLGIT events + CI allocations + respects inventory-item.default_costing_method (READ-ONLY · Q15=a)
- **#9 Multi-Basis CIF Pro-Rata · ANCHORED** · 6 bases (Value · Weight · Volume · Quantity · Equal · Specific Assignment) per founder caveat May 19

## Files (15 NEW + 4 UPDATE)
**Types (4)**: commercial-invoice.ts · ci-item-allocation.ts · cif-waterfall.ts · duty-waterfall.ts
**Seed (1)**: sinha-commercial-invoice-seed-data.ts (3 CIs + 1 CICustomeVal event)
**Engines (4)**: commercial-invoice-engine.ts · cif-pro-rata-engine.ts (6-case exhaustive switch) · duty-waterfall-engine.ts (16 UDF chips + 4 TDL Gap Chips) · landed-cost-replay-engine.ts
**UI (8)**: CIList · CIDetail · CIItemAllocationDrilldown (tabs A-F) · CIFWaterfallPanel · DutyWaterfallPanel · CICustomsRevaluationDialog · LandedCostReplayView · CILineageBreadcrumb
**Saathi (1)**: CIAllocationSaathiPanel.tsx (6th surface · Superpowers 13→14 · 70%)
**Updates (4)**: eximx-import-sidebar-config.ts (+2 items) · EximX.types.ts (+2 IDs) · EximXImportLayout.tsx (+3 routes + 3 wires) · TDLGapsAtlasPreview.tsx (+1 crosslink)

## EX-5-Q lock verification (15 of 15)
| Q | Lock | Status |
|---|---|---|
| Q1 | sibling CommercialInvoice | ✅ |
| Q2 | embedded CIItemAllocation | ✅ |
| Q3 | **6 CIF pro-rata bases** (founder caveat) | ✅ exhaustive switch 6 cases |
| Q4 | CICustomeVal editable + emits event | ✅ |
| Q5 | Rule 10 Loadings visible (Royalty · License · SVB) | ✅ Part C |
| Q6 | 10-row hardcoded waterfall (16 UDF chips) | ✅ |
| Q7 | 4 TDL Gap Chips inline below waterfall | ✅ |
| Q8 | Replay engine point-in-time | ✅ |
| Q9 | Saathi on CI Detail | ✅ |
| Q10 | 3 Sinha CIs + 1 CICustomeVal event | ✅ |
| Q11 | 3 new routes (CIs · CIs/:id · landed-cost-replay) | ✅ |
| Q12 | 2 new sidebar items active | ✅ |
| Q13 | Vitest IDENTICAL (NO new tests) | ✅ |
| Q14 | NO PDF/CSV export | ✅ deferred EX-11 |
| **Q15** | **inventory-item.default_costing_method READ-ONLY** | ✅ 0-diff verified |

## 0-diff zones verified (60+)
po.ts · git.ts · git-engine.ts · ComplianceSettingsAutomation.tsx · inventory-item.ts · currency.ts · foreign-customer.ts · ALL EX-1/EX-2/EX-3/EX-4 NEW files · package.json · all existing tests.

## Triple Gate
- TSC: 0 errors
- ESLint: 0/0
- Vitest: 1215 IDENTICAL
- Build: clean
