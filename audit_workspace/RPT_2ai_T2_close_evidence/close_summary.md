# RPT-2a-i · T2 Close Summary · Brittle Dashboard Test Assertions

**Predecessor HEAD:** `64d3efa` ("Added ResizeObserver polyfill")
**Scope:** Test files only (6 comply360 dashboard tests). No app/framework/dashboard-page changes.
**Status:** RPT-2a-i row remains `TBD_AT_BANK` (backfills at RPT-2a-ii Block 3). Zero new SIBLINGs.

## Defect
After the T1 ResizeObserver polyfill cleared the render crashes, 4 "preserves existing" tests still failed (`FireSafety`, `CostAudit`, `Environmental`, `IndustrialSafety`): the first assertion used `screen.getByText(/<phrase>/i)` where `<phrase>` appears more than once on the rendered page (the chart legend/title duplicates the dashboard name), causing `getByText` to throw "found multiple elements". DPDP and Waste happened to use unique phrases.

## Per-file changes (test files only)
For each of the 6 dashboard tests, the "preserves existing" assertions were made robust:

1. **Header** — `getByText(/.../)` → `getByRole('heading', { name: /.../ })` (uniquely targets the `<h1>`).
2. **Tile** — `getByText(/.../)` → `queryAllByText(/.../).length).toBeGreaterThan(0)` (tolerates duplicate text from chart legends/labels).

Files touched:
- `src/pages/erp/comply360/fire-safety/__tests__/fire-safety-dashboard.test.tsx`
- `src/pages/erp/comply360/cost-audit/__tests__/cost-audit-dashboard.test.tsx`
- `src/pages/erp/comply360/environmental/__tests__/environmental-dashboard.test.tsx`
- `src/pages/erp/comply360/industrial-safety/__tests__/industrial-safety-dashboard.test.tsx`
- `src/pages/erp/comply360/dpdp/__tests__/dpdp-dashboard.test.tsx` (aligned)
- `src/pages/erp/comply360/waste-management/__tests__/waste-management-dashboard.test.tsx` (aligned)

Tile text asserted (verified to render on the page):
- FireSafety → `Active Fire NOCs`
- CostAudit → `Adverse findings`
- Environmental → `Active CTE`
- IndustrialSafety → `PESO active`
- DPDP → `Active DPOs`
- Waste → `Active Authorisations`

## Gate (same pass)

### TSC
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit
(0 errors)
```

### ESLint
```
$ npx eslint . --max-warnings 0
(0/0)
```

### Vitest (full suite)
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run
 Test Files  576 passed | 3 skipped (579)
      Tests  8147 passed | 3 skipped (8150)
   Duration  518.46s
```

All 12 RPT-2a-i cohort dashboard tests (6 dashboards × 2) green. Zero failures across the full suite.

### Cohort-only confirmation
```
$ npx vitest run src/pages/erp/comply360/{fire-safety,cost-audit,environmental,industrial-safety,dpdp,waste-management}/__tests__
 Test Files  6 passed (6)
      Tests  12 passed (12)
```

## Zero-touch sweep
- `git diff 64d3efa..HEAD --name-only` → only `src/pages/erp/comply360/**/__tests__/*.test.tsx` files + this close summary.
- No edits to: dashboard pages, `rag.ts`, `ScorecardTile`, `kpi-registry.ts`, framework barrels, `sprint-history.ts`.

## Bank status
RPT-2a-i row stays `headSha: 'TBD_AT_BANK'`. Banks at THIS fix's HEAD at the next sprint (RPT-2a-ii) Block 3.

— T2 fix RPT-2a-i · brittle dashboard-test assertions → `getByRole` / `queryAllByText` · test files only · predecessor `64d3efa` · author: Claude on behalf of Operix Founder.
