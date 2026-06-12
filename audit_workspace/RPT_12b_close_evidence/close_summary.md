# RPT-12b · Migration Wave 1 · Close Summary

**Sprint:** T-RPT12b-Migration-Wave1 · Reporting Arc · Phase D arc-close 2 of 3
**Predecessor HEAD:** `22d6860` (RPT-12a backfilled in `sprint-history.ts`)
**New HEAD:** TBD_AT_BANK (self-seeded · backfill on bank)

## Per-page migration (charts swapped · KPI wired · layout preserved)

| # | Page | Charts swapped | KPI wired | Integrity testid |
|---|------|----------------|-----------|------------------|
| 1 | `production/reports/OEEDashboard.tsx` | 1 (A·P·Q BarChart) | `prod-line-oee` (pre-seeded) | `prod-oee-integrity-badge` |
| 2 | `production/reports/CapacityPlanningDashboard.tsx` | 1 (Top-10 BarChart + Cells) | `prod-capacity-utilization` (new) | `prod-capacity-integrity-badge` |
| 3 | `production/reports/PlanActualRolling.tsx` | 2 (BarChart + LineChart) | `prod-plan-actual` (new) | `prod-plan-actual-integrity-badge` |
| 4 | `production/reports/ManpowerProductionReport.tsx` | 1 (Top-10 BarChart) | `prod-manpower-output` (new) | `prod-manpower-integrity-badge` |
| 5 | `production/reports/ShiftwiseProductionReport.tsx` | 1 (Stacked BarChart) | `prod-shiftwise` (new) | `prod-shiftwise-integrity-badge` |
| 6 | `production/reports/WastageDashboard.tsx` | 1 (Pareto ComposedChart + threshold band) | `prod-wastage-pareto` (new) | `prod-wastage-integrity-badge` |
| 7 | `production/reports/CarbonAwareProductionPlanner.tsx` | 1 (24h LineChart) | `prod-carbon-grid-intensity` (new) | `prod-carbon-planner-integrity-badge` |
| 8 | `production/reports/ProductionCarbonDashboard.tsx` | 1 (12-mo LineChart) | `prod-carbon-trend` (new) | `prod-carbon-trend-integrity-badge` |
| 9 | `production/reports/JobWorkAgeingAnalysis.tsx` | 1 (Stacked BarChart) | `prod-jw-ageing` (new) | `prod-jw-ageing-integrity-badge` |
| 10 | `dispatch/reports/SavingsROIDashboard.tsx` | 1 (ComposedChart) | `dp-savings-roi` (new) | `dp-savings-roi-integrity-badge` |
| 11 | `dispatch/reports/TransporterScorecard.tsx` | 1 (12-mo LineChart) | `dp-transporter` (pre-seeded) | `dp-transporter-integrity-badge` |
| 12 | `dispatch/reports/ReconciliationSummaryReport.tsx` | 1 (6-mo LineChart) | `dp-recon-summary` (new) | `dp-recon-summary-integrity-badge` |
| 13 | `dispatch/reports/PackingConsumptionReport.tsx` | 1 (LineChart) | `dp-packing-consumption` (new) | `dp-packing-consumption-integrity-badge` |
| 14 | `salesx/SalesXAnalytics.tsx` | 1 (BarChart + Cell drill-down — drill replaced by parallel stage chips · `drillStage`/`drillRows` state preserved) | `sx-analytics-funnel` (new) | `sx-analytics-integrity-badge` |
| 15 | `salesx/reports/CampaignPerformanceReport.tsx` | 2 (BarChart + PieChart) | `sx-campaign-roi` (new) | `sx-campaign-roi-integrity-badge` · `sx-campaign-enq-integrity-badge` |

**Total chart blocks swapped:** 17 across 15 pages.

## Recipe compliance (per page)
1. Removed `from 'recharts'` import line entirely.
2. Replaced each `<ResponsiveContainer>...</ResponsiveContainer>` block with `<ReportChart data={…} config={defaultChartConfig({…})} />` — same series, same xKey, same computed rows.
3. Added `signReport(rows)` integrity badge in the chart's CardTitle (titled with full FNV-1a hash · short 10-char chip).
4. Layout / filters / tables / tabs / compute logic 0-DIFF outside the chart blocks.

## Gates
- TSC (`tsconfig.app.json --noEmit`): **0 errors**.
- Vitest (`src/__tests__/rpt-12b/`): **15 files · 75 tests passed · 0 failed**.
- 3-dir recharts grep across `src/pages/erp/production`, `src/pages/erp/dispatch`, `src/pages/erp/salesx` (non-test `.tsx`): **0 offenders** (asserted programmatically in `campaign-performance-migration.test.ts`).

```bash
$ grep -rl "from 'recharts'" src/pages/erp/production src/pages/erp/dispatch src/pages/erp/salesx --include=*.tsx | grep -v __tests__
# (empty)
```

## Institutional
- `kpi-registry.ts` — appended 13 layer-tagged KPI seeds (idempotent block). Pre-seeded `prod-line-oee` + `dp-transporter` reused.
- `sprint-history.ts` — RPT-12a backfilled to `headSha: '22d6860'`; self-seeded RPT-12b with `predecessorSha: '22d6860'`. **ZERO new SIBLINGs**.

## Walls held (0-DIFF)
- `src/components/operix-core/report-framework/*` (ReportChart · PivotMatrix · ChartLibrary).
- `src/lib/report-framework/{report-builder-engine,report-definitions,data-sources,chart-config,integrity-sign}.ts`.
- All 19 remaining recharts-bearing ledger pages reserved for RPT-12c.
- Every banked page outside the 15 migrated surfaces.
- `src/test/setup.ts`.
