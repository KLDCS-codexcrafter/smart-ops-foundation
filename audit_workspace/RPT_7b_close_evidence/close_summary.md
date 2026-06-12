# RPT-7b · SalesX Analytical (cohort b) + ProjX Reports · CLOSE SUMMARY

**Predecessor HEAD:** `056371b`
**New HEAD:** `TBD_AT_BANK` (commit pending)
**Sprint:** T-RPT7b-SalesX-Analytical-ProjX · Reporting Arc · Phase C
**Date:** 2026-06-12

---

## Block 1 + Block 2 · Recipe applied PER PAGE (mechanical rule)

| # | Page | `<Table>` count | Recipe chosen | KPI |
|---|------|-----------------|---------------|-----|
| 1 | src/pages/erp/salesx/reports/TargetVsAchievement.tsx       | 21 | TOGGLE     | sx-target-ach |
| 2 | src/pages/erp/salesx/reports/PipelineSummary.tsx            | 15 | TOGGLE     | sx-pipeline |
| 3 | src/pages/erp/salesx/reports/CoverageReport.tsx             | 22 | TOGGLE     | sx-coverage |
| 4 | src/pages/erp/salesx/reports/BeatProductivityReport.tsx     | 21 | TOGGLE     | sx-beat |
| 5 | src/pages/erp/salesx/reports/SecondarySalesReport.tsx       | 35 | TOGGLE     | sx-secondary-rpt |
| 6 | src/pages/erp/salesx/reports/CrossDeptHandoffTracker.tsx    | 31 | TOGGLE     | sx-handoff |
| 7 | src/pages/erp/projx/reports/ProjectRegister.tsx             | 15 | TOGGLE     | px-projects |
| 8 | src/pages/erp/projx/transactions/ProjxDocumentsRegister.tsx | 19 | TOGGLE     | px-documents |
| 9 | src/pages/erp/projx/reports/ProjectPnLReport.tsx            |  0 | DASHBOARD  | px-pnl |
| 10| src/pages/erp/projx/reports/ProjectMarginReport.tsx         |  0 | DASHBOARD  | px-margin |
| 11| src/pages/erp/projx/reports/MilestoneStatusReport.tsx       |  0 | DASHBOARD  | px-milestones |
| 12| src/pages/erp/projx/reports/ResourceUtilizationReport.tsx   |  0 | DASHBOARD  | px-utilization |

**Per-page recipe choice — NOT a blanket** (RPT-7a T2 lesson honoured):
- 8 pages contain shadcn `<Table>` → TOGGLE (TableChartToggle defaultView="table" + integrity badge).
- 4 pages contain no shadcn `<Table>` (only HTML `<table>` / tile lists) → DASHBOARD (ReportChart + integrity badge).

### EXCLUSION (0-DIFF · documented)
- `src/pages/erp/projx/reports/CashFlowProjectionReport.tsx` — already imports `recharts` (legacy-recharts page). Per silent rule "no `recharts` import added", LEFT 0-DIFF. KPI `px-cashflow` seeded for future wiring when CashFlow is migrated to the framework recipe.

### ScorecardTile — OMITTED across all 12 pages
No page exposes a real bounded summary-% suitable for a Scorecard (mixes of status counts, value sums, and free-form metrics only). Honest omission, per the spec's "omit-and-say-so" clause.

### Resolved pages (12 of 13 requested; CashFlow excluded as above)

---

## Block 3 · DSC + KPI seeds

**KPI registry · 13 layer-tagged seeds appended (idempotent · seed data only):**
`sx-target-ach`*†, `sx-pipeline`, `sx-coverage`, `sx-beat`, `sx-secondary-rpt`, `sx-handoff`,
`px-projects`, `px-pnl`, `px-margin`*†, `px-cashflow`, `px-milestones`, `px-utilization`, `px-documents`

`*` = explicit `layers:` array · `†` = carries `thresholds` (`direction: 'higher-good'`, amber/red 75/50 for sx-target-ach, 25/10 for px-margin).

**Data Source Catalog · 2 ProjX sources registered (read-only wrappers):**
- `projx.projects` — wraps `projectsKey(entityCode)` (existing project storage; safeRead, idempotent registration)
- `projx.financials` — wraps `projectMilestonesKey(entityCode)` (existing milestone storage; safeRead, idempotent registration)

**SalesX sources REUSED (NOT duplicated):** all SalesX-analytical KPIs point to the existing `salesx.orders` / `salesx.pipeline` sources registered in RPT-7a via the `dataSource` pointer. Source count for `card === 'salesx'` remains exactly 2 (asserted in test).

---

## Block 4 · Institutional + tests + gates

### sprint-history.ts
- RPT-7a row: `headSha: 'TBD_AT_BANK'` → `'056371b'`, provenance `PENDING_BACKFILL` → `CONFIRMED`; forward-extension comment added pointing to RPT-7b.
- RPT-7b row appended: `headSha: 'TBD_AT_BANK'`, `predecessorSha: '056371b'`, `provenance: 'PENDING_BACKFILL'`, `newSiblings: []` (ZERO new SIBLINGs).

### Tests
- `src/lib/report-framework/__tests__/rpt-7b-kpis-and-sources.test.ts` — 6 § asserting:
  - All 13 KPI ids present with explicit `layers`
  - `sx-target-ach` + `px-margin` carry `direction: 'higher-good'` thresholds
  - Idempotency of registry (re-import is a no-op)
  - 2 ProjX sources registered, `read('SMRT')` returns arrays, ≥1 dimension field each
  - SalesX sources NOT duplicated — `card === 'salesx'` filter still equals `['salesx.orders','salesx.pipeline']`

### Triple Gate (pasted)
```
$ npx tsc -p tsconfig.app.json --noEmit
(no output — 0 errors)

$ npx vitest run src/lib/report-framework/__tests__/rpt-7b-kpis-and-sources.test.ts \
                src/lib/report-framework/__tests__/salesx-registers-kpis-and-sources.test.ts
 ✓ rpt-7b-kpis-and-sources.test.ts  (6 tests) 11ms
 ✓ salesx-registers-kpis-and-sources.test.ts  (4 tests) 2ms
 Test Files  2 passed (2)   Tests  10 passed (10)

$ npx eslint <13 changed files> --max-warnings 0
(no output — 0 errors / 0 warnings)
```

---

## TOUCH-ONLY audit · all other surfaces 0-DIFF
- 11 RPT-7a SalesX registers — untouched
- SalesXAnalytics + CampaignPerformanceReport (legacy-recharts) — untouched
- All SalesX/ProjX entry/detail/master/dialog pages — untouched
- CashFlowProjectionReport (legacy-recharts) — untouched (excluded)
- Distributor / Customer / EcomX (RPT-7c) and WebStoreX — untouched
- Framework files outside kpi-registry / data-sources — untouched
- `src/test/setup.ts` and all other hub tests — untouched

## Verification — ls of every created file
```
audit_workspace/RPT_7b_close_evidence/close_summary.md
src/lib/report-framework/__tests__/rpt-7b-kpis-and-sources.test.ts
```

## Edited files
- src/lib/report-framework/kpi-registry.ts
- src/lib/report-framework/data-sources.ts
- src/lib/_institutional/sprint-history.ts
- src/pages/erp/salesx/reports/TargetVsAchievement.tsx
- src/pages/erp/salesx/reports/PipelineSummary.tsx
- src/pages/erp/salesx/reports/CoverageReport.tsx
- src/pages/erp/salesx/reports/BeatProductivityReport.tsx
- src/pages/erp/salesx/reports/SecondarySalesReport.tsx
- src/pages/erp/salesx/reports/CrossDeptHandoffTracker.tsx
- src/pages/erp/projx/reports/ProjectRegister.tsx
- src/pages/erp/projx/reports/ProjectPnLReport.tsx
- src/pages/erp/projx/reports/ProjectMarginReport.tsx
- src/pages/erp/projx/reports/MilestoneStatusReport.tsx
- src/pages/erp/projx/reports/ResourceUtilizationReport.tsx
- src/pages/erp/projx/transactions/ProjxDocumentsRegister.tsx
