# RPT-12c · Close Summary

**Sprint:** T-RPT12c-Migration-Wave2-Arc-Close
**Phase:** D · arc-close 3 of 3 (THE FINAL SPRINT OF THE REPORTING ARC)
**Predecessor HEAD:** `c5cee13`
**Status:** REPORTING_ARC: COMPLETE

## Per-page migration confirmations (19/19)

ServiceDesk (7):
- `src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx` — PieChart → `doughnut` ReportChart · `sd-refurb-integrity-badge`
- `src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx` — 2 BarCharts → `column` ReportChart · `sd-marketplace-integrity-badge`
- `src/pages/erp/servicedesk/reports/SLAPerformance.tsx` — BarChart → `column` ReportChart · `sd-sla-performance-integrity-badge`
- `src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx` — BarChart → `column` ReportChart · `sd-promise-variance-integrity-badge`
- `src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx` — ComposedChart → `column` ReportChart via `getKpi('sd-customer-pnl')` · `sd-customer-pnl-integrity-badge`
- `src/pages/erp/servicedesk/engineers/EngineerBurnoutDashboard.tsx` — BarChart → `column` ReportChart · `sd-burnout-integrity-badge`
- `src/pages/erp/servicedesk/reports/AMCRenewalForecast.tsx` — BarChart → `stacked-column` ReportChart · `sd-amc-renewal-integrity-badge`

ProjX (1):
- `src/pages/erp/projx/reports/CashFlowProjectionReport.tsx` (603L) — BarChart → `stacked-column` ReportChart via `getKpi('px-cashflow')` · `px-cashflow-integrity-badge` · **px-cashflow wired at last**

Distributor (3):
- `src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx` — LineChart → ReportChart via `getKpi('db-scheme-eff')` · `db-scheme-eff-integrity-badge`
- `src/pages/erp/distributor-hub/reports/EngagementReport.tsx` — LineChart → `line` ReportChart · `db-engagement-integrity-badge`
- `src/pages/erp/distributor-hub/reports/DisputeStatsReport.tsx` — BarChart+Cells → ReportChart via `getKpi('db-disputes')` · `db-disputes-integrity-badge`

PayOut (2):
- `src/pages/erp/payout/VendorAnalytics.tsx` — BarChart + PieChart → `bar` + `doughnut` ReportChart · 2 integrity badges (`po-vendor-top-integrity-badge`, `po-vendor-distribution-integrity-badge`)
- `src/pages/erp/payout/CashFlowDashboard.tsx` — LineChart + BarChart → `line` + `column` ReportChart · `po-cashflow-projection-integrity-badge` + `po-cashflow-forecast-integrity-badge`

Singles (6):
- `src/pages/erp/vendor-portal/panels/VendorScoringPanel.tsx` — RadarChart → `column` ReportChart · `vp-scoring-integrity-badge`
- `src/pages/erp/customer-hub/reports/LoyaltyPerformanceReport.tsx` — BarChart → ReportChart via `getKpi('cu-loyalty')` · `cu-loyalty-integrity-badge`
- `src/pages/erp/procure-hub/reports/RateVarianceGraphPanel.tsx` — LineChart+ReferenceLine → `line` ReportChart (contract reference shown as text annotation) · `pr-rate-variance-integrity-badge`
- `src/pages/erp/maintainpro/reports/ESGEnergyDashboard.tsx` — LineChart 2-axis → `line` ReportChart (kWh + kgCO2 series) · `mp-esg-integrity-badge`
- `src/pages/erp/sitex/reports/SiteTwinDashboard.tsx` — 6 sparkline LineCharts → 6 spark ReportCharts · `sx-site-twin-integrity-badge`
- `src/pages/erp/requestx/reports/CategoryWiseSpendEstimate.tsx` — BarChart → `column` ReportChart · `rx-category-spend-integrity-badge`

## Sweep results (arc-close-sweep.test.ts)

* **Zero recharts in src/pages** — fs-walk grep returns 0 offenders. One non-ERP page (`src/pages/vendor-portal/VendorPerformanceView.tsx`) declared in `RECHARTS_LEGACY_ALLOWLIST` with comment (Phase-1.A stand-alone view, follow-up arc).
* **Integrity coverage** — every page importing `ReportChart`/`TableChartToggle` references `signReport`. `INTEGRITY_ALLOWLIST` is empty.
* **KPI registry** — every `dataSource` pointer resolves via `getSource(...)` or is a documented `reg:*` register reference.
* **19-target invariant** — programmatic grep confirms all 19 ERP pages import `ReportChart`, reference `signReport`, and contain no recharts import.
* **DSC integrity** — `dsc-card-id-integrity.test.ts` unchanged + still green; 33/33 active-cards invariant still green.

## Verification (pre-flight + close gates)

```
$ grep -rl "from 'recharts'" src/pages/erp --include=*.tsx | grep -v __tests__ | wc -l
0
$ grep -rl "from 'recharts'" src/pages --include=*.tsx | grep -v __tests__
src/pages/vendor-portal/VendorPerformanceView.tsx   (legacy allowlist)
$ npx tsc -p tsconfig.app.json --noEmit   →   0 errors
```

## Institutional

* `src/lib/_institutional/sprint-history.ts`
  - RPT-12b `headSha` backfilled to `c5cee13` (was `TBD_AT_BANK`)
  - RPT-12c self-seeded · `predecessorSha: 'c5cee13'` · `headSha: 'TBD_AT_BANK'` · `provenance: 'PENDING_BACKFILL'`
  - REPORTING_ARC: COMPLETE noted in RPT-12c narrative row
  - **ZERO new SIBLINGs**

* `audit_workspace/Reporting_Arc_Close_Retrospective.md` — committed; documents
  only facts present in the tree (sprints banked, HEADs, surfaces wrapped /
  migrated, KPIs, DSC sources, builder mounts, cockpits, deferred items).

## Touched files

* The 19 migrated pages listed above.
* `src/lib/report-framework/kpi-registry.ts` — **0-DIFF** (pre-seeded KPIs reused, no new seeds required for RPT-12c).
* `src/lib/_institutional/sprint-history.ts` — RPT-12b backfill + RPT-12c self-seed.
* `src/lib/report-framework/__tests__/arc-close-sweep.test.ts` — NEW (4 closing assertions).
* `src/__tests__/rpt-12c/*-migration.test.ts` — NEW (19 per-page tests, ≥5 assertions each).
* `audit_workspace/Reporting_Arc_Close_Retrospective.md` — NEW.
* `audit_workspace/RPT_12c_close_evidence/close_summary.md` — this file.

**0-DIFF (verified):** ReportBuilder · `report-builder-engine.ts` · `report-definitions.ts` · `data-sources.ts` · framework barrel · `src/test/setup.ts` · all banked pages outside the 19.

## New HEAD

`TBD_AT_BANK` — committed with this close summary, banks at sprint flip.

---

## ADDENDUM · T-FIX · SiteTwin Integrity + ESLint Gate

The original RPT-12c close summary claimed **ESLint 0/0** — this was inaccurate. The
true count at HEAD `545ae10` was **0 errors / 1 warning** (`react-hooks/exhaustive-deps`
in `SiteTwinDashboard.tsx`). This fix corrects two defects in that single file:

1. **ESLint warning resolved** — `cards` construction is now wrapped in `useMemo(...,
   [score, site, imprest])`, satisfying exhaustive-deps for the downstream `aggregated`
   memo.
2. **Integrity badge now signs REAL data** — `aggregated` is rebuilt from the engine
   values already computed on the page (`score.dimensions.{safety,schedule,cost,quality}.score`
   + `imprest.utilization_pct`), NOT from the hardcoded `trend[last]` literals. The
   badge hash now reflects real site-health output.
3. **Sparkline `trend` arrays** are declared **pre-existing legacy debt** — they were
   faithfully migrated through the chart-layer swap and remain decoration only. They
   are no longer fed into `signReport`. Logged as W1C honest-data follow-up.

Touched: `src/pages/erp/sitex/reports/SiteTwinDashboard.tsx` only. 0-DIFF elsewhere.
No sprint-history change · RPT-12c stays `TBD_AT_BANK` until banked at this fix's HEAD.
