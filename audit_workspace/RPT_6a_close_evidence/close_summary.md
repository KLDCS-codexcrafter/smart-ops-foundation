# RPT-6a · Production Reports + DSC/KPI Seeding — Close Summary

**Predecessor HEAD:** `3afd64a`
**Sprint:** RPT-6a · T-RPT6a-Production-Reports · Phase C (Ops Hub-2, cohort a — Production)
**Grade target:** A · Triple-Gate clean
**New HEAD:** TBD_AT_BANK (placeholder per institutional convention; backfilled at next sprint Block 3)

---

## Pre-flight (verified)

- HEAD: `3afd64a` ✓
- All 14 page paths resolved under `src/pages/erp/production/reports/`.
- Legacy-recharts importers (EXCLUDED 0-DIFF, all 9):
  - CapacityPlanningDashboard.tsx
  - CarbonAwareProductionPlanner.tsx
  - JobWorkAgeingAnalysis.tsx
  - ManpowerProductionReport.tsx
  - OEEDashboard.tsx
  - PlanActualRolling.tsx
  - ProductionCarbonDashboard.tsx
  - ShiftwiseProductionReport.tsx
  - WastageDashboard.tsx

---

## Block 1 — 14 pages chart-enabled

Recipe rule applied mechanically (shadcn `<Table>` → toggle · tile/list → dashboard).

### Toggle recipe (8)
| Page | data source on page | KPI id |
|---|---|---|
| DemandForecastDashboard.tsx | `filtered` (listForecasts) aggregated by horizon | `prod-demand-forecast` |
| MixedModeBUDashboard.tsx | `DEMO_BUS` allocation rows | `prod-mixed-bu` |
| ITC04Export.tsx | `rows` (buildITC04Rows) summed by selected quarter | `prod-itc04` |
| StockWithJobWorker.tsx | `filtered` pending stock by vendor | `prod-jw-stock` |
| ProductionPlanRegister.tsx | `filtered` plans by status (sum planned_qty) | `prod-plan` |
| JobWorkComponentsOrderSummary.tsx | `rows` by component | `prod-jw-components` |
| RepetitiveLineOEEReport.tsx | `rows` (PO+metrics) by line | `prod-line-oee` (+ scorecard Avg OEE %) |
| DailyWorkRegisterReport.tsx | `entries` aggregated by `date` | `prod-daily-work` |

### Dashboard recipe (6)
| Page | data source on page | KPI id |
|---|---|---|
| ProductionTraceRegister.tsx | `productionOrders` by status | `prod-trace` |
| ProcessBatchRegister.tsx | `batches` by status | `prod-batch` |
| ProductionConfirmationRegister.tsx | `rows` (productionConfirmationsKey) by status | `prod-confirmation` |
| JobWorkInRegister.tsx | `receipts` by vendor | `prod-jw-in` |
| JobCardRegister.tsx | `rows` (jobCardsKey) by status | `prod-jobcard` |
| ProcessGenealogyTracker.tsx | `batches` by status | `prod-genealogy` |

**ScorecardTile inclusion:** **only on RepetitiveLineOEEReport** (Avg OEE % computed from real `oee_total` values). On the other 13 pages, ScorecardTile is OMITTED — no page exposes a real bounded summary-% that isn't already shown in-table.

All wraps:
- Hooks at top level (rules-of-hooks clean).
- No `recharts` imported in wrapped pages.
- Existing tables, filters, CSV exports preserved (additive Card after main content).
- Honest empty-states ("No … yet") — no synthetic data.
- For MixedModeBU, the wrap renders in both the mixed_mode and the non-mixed_mode fallback branches so the report is reachable regardless of entity mode.

---

## Block 2 — KPI seeds + DSC sources

**14 KPI seeds appended** to `src/lib/report-framework/kpi-registry.ts` (verified `grep -c "^registerKpi({ id: 'prod-"` = **14**), each with explicit `layers`, `dataSource`, `defaultChart`. `prod-line-oee` carries `thresholds: { amber: 75, red: 60, direction: 'higher-good' }`.

**2 Production DSC sources registered** in `src/lib/report-framework/data-sources.ts`:
- `production.orders` → wraps `productionOrdersKey(entity)`.
- `production.jobwork` → wraps `jobWorkOutOrdersKey(entity)`.

Both `read()` return arrays from the SAME localStorage keys the wrapped pages already consume. No new engines.

---

## Block 3 — Institutional + tests

- `sprint-history.ts`: RPT-5d row backfilled to `headSha: '3afd64a'` (provenance flipped CONFIRMED). RPT-6a row self-seeded with `predecessorSha: '3afd64a'`, `headSha: 'TBD_AT_BANK'`. **Zero new SIBLINGs.**
- Tests added (verified on disk, all green):
  - 14 page tests under `src/pages/erp/production/reports/__tests__/` — render + assert `{kpi}-{recipe}-host` + `{kpi}-integrity-badge` testids.
  - 1 registry test `src/lib/report-framework/__tests__/production-kpis-and-sources.test.ts` — 14 prod-* KPIs present with layers, `prod-line-oee` thresholds direction = higher-good, idempotency, 2 production sources return arrays + expose card+dimensions.

---

## Triple-Gate evidence (re-run AFTER edits, BEFORE writing this summary)

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output — 0 errors)

$ npx eslint . --max-warnings 0
(no output — 0 errors / 0 warnings)

$ npx vitest run src/pages/erp/production/reports/__tests__ src/lib/report-framework/__tests__/production-kpis-and-sources.test.ts
 Test Files  15 passed (15)
      Tests  19 passed (19)
   Duration  6.09s
```

Tree verification:
```
$ ls src/pages/erp/production/reports/__tests__ | wc -l
14
$ ls src/lib/report-framework/__tests__/production-kpis-and-sources.test.ts
src/lib/report-framework/__tests__/production-kpis-and-sources.test.ts
$ grep -c "^registerKpi({ id: 'prod-" src/lib/report-framework/kpi-registry.ts
14
$ grep -c "production\.\(orders\|jobwork\)" src/lib/report-framework/data-sources.ts
2
```

---

## Touch report
Resolved Production pages (14) · `kpi-registry.ts` · `data-sources.ts` · `sprint-history.ts` · 15 new tests · this close summary. **0-DIFF everywhere else.**
