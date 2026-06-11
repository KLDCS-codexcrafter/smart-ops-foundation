# RPT-4 · T3 Fix · Close Summary — Real DSC Data for Org-Overview Charts

**Predecessor HEAD:** `6cdbc02` ("Layer tagged KPIs, added charts")
**Severity:** T3 · single concern · last defect in RPT-4.

## §0 · Defect Removed
`RoleDashboard.tsx` previously rendered the management Org-Overview charts from
`placeholderDataFor(kpi)` — a synthetic Q1–Q4 generator that fabricated values
as `(i+1)*25`. A Management dashboard must never display invented numbers.

## §1 · Fix Applied (RoleDashboard.tsx)
- Deleted `placeholderDataFor` and its `KpiDefinition` import.
- Added `useEntityCode()` to obtain the active entity (same context the rest of
  the app uses), and `getSource()` from `data-source-catalog`.
- Computed real rows per xc KPI at top level via `useMemo` (hooks rule),
  `rows = getSource(kpi.dataSource)?.read(entityCode) ?? []`, with a try/catch
  for safety.
- Charts now render **only when `rows.length > 0`**. Otherwise an honest
  empty-state line — "No data yet for this KPI" — appears in place of the chart.
- Unresolvable `dataSource` ids fall through to the same empty-state path.

## §2 · xc KPI dataSource Resolution Audit
| xc KPI                | dataSource id                                | DSC seed? | Notes                                                                  |
|-----------------------|----------------------------------------------|-----------|------------------------------------------------------------------------|
| xc-cash-position      | `reg:fc-ledger`                              | ✓ seeded  | Resolves; rows depend on FC ledger data for the active entity.         |
| xc-ar-aging           | `reg:fc-outstanding-aging`                   | ✓ seeded  | Resolves; rows depend on FC outstanding aging seed for the entity.     |
| xc-ap-aging           | `reg:fc-outstanding-aging`                   | ✓ seeded  | Same source as A/R aging; chart-config selects payables series.        |
| xc-compliance-pct     | `comply360.aggregate.compliance-pct`         | ✗ MISSING | Treated as empty-state. **Action item:** seed in `data-sources.ts`.    |
| xc-stock-value        | `reg:fc-ledger`                              | ✓ seeded  | Resolves; rows depend on FC ledger data.                               |
| xc-realisation-pct    | `reg:ex-tt-payments`                         | ✓ seeded  | Resolves; rows depend on EximX TT payments seed for the entity.        |

> 1 of 6 xc KPIs (`xc-compliance-pct`) has a `dataSource` id with no DSC seed and
> will therefore render the empty-state until a `comply360.aggregate.compliance-pct`
> source is registered.

## §3 · Triple Gate
- **TSC:** 0 errors.
- **ESLint:** 0/0 problems on touched files (incl. rules-of-hooks).
- **Vitest:** `RoleDashboard.test.tsx` — 5/5 passing:
  - heading + 3 layer chips
  - view_only at operator layer → 0 xc charts
  - T3 · empty/unresolved DSC sources → honest empty-state text
  - T3 · chart renders ONLY when DSC source returns rows
  - T3 · grep assert: `placeholderDataFor` no longer present in source

## §4 · Discipline
- Touched: `RoleDashboard.tsx`, `RoleDashboard.test.tsx`, this close summary.
- 0-DIFF: `kpi-registry.ts`, `role-layer.ts`, all DSC files, all pages.
- No sprint-history change (RPT-4 stays `TBD_AT_BANK`).
- ZERO new SIBLINGs.
