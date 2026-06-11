# RPT-4 · T2 FIX · Close Summary

**Predecessor HEAD:** `1adce12`
**Scope:** 2 audit gaps closed · seed-data + RoleDashboard xc-charts only · 0-DIFF elsewhere.

## Gap 1 · Explicit layer tags on the 73 pre-existing KPI seeds

Heuristic IIFE removed; every seed now carries an explicit `layers:` per §1.

### Real per-layer tag counts (post-fix)

| Tier                          | Count | % of 73 |
|-------------------------------|-------|---------|
| Operator-visible (all 3)      | 29    | 39.7 %  |
| Manager-only (manager+mgmt)   | 33    | 45.2 %  |
| Management-only               | 11    | 15.1 %  |
| **Manager-visible (cumul.)**  | **62**| **84.9 %** |
| **Management-visible (total)**| **73**| **100 %**  |

Plus the 6 `xc-*` Org Overview KPIs (management-only) — already tagged in RPT-4.

Spread satisfies §3 strict ordering: `operator (29) < manager (62) < total (73)`.

## Gap 2 · Org Overview charts in RoleDashboard

`RoleDashboard.tsx` now renders one `<ReportChart>` per xc KPI **only** when
`section.cardId === 'cross-card'` AND `config.layer === 'management'`. Per-card
sections remain `ScorecardTile` grids. Hooks stay at top level. Chart routed
exclusively through `ReportChart` (no `recharts` import added).

## Tests extended (`role-layer.test.ts`, `RoleDashboard.test.tsx`)

- Real spread: `operator-visible < manager-visible < total` (toBeGreaterThan, no exact counts).
- `finance/operator` derives fewer fincore KPIs than `finance/management` (clamped).
- RoleDashboard @ management renders ≥1 `ReportChart` (xc section).
- RoleDashboard @ operator (`view_only`) renders 0 xc charts.

## Triple Gate (pasted outputs)

### TSC
```
$ NODE_OPTIONS="--max-old-space-size=7168" bunx tsc --noEmit
(no output) · exit 0
```

### ESLint (touched scopes)
```
$ bunx eslint src/lib/report-framework src/components/operix-core/report-framework
0 errors, 0 warnings
```

### Vitest (full suite)
```
 Test Files  628 passed | 3 skipped (631)
      Tests  8312 passed | 3 skipped (8315)
   Duration  449.81s
```

## Discipline

- ZERO new SIBLINGs.
- `sprint-history.ts` UNCHANGED (RPT-4 row stays `TBD_AT_BANK`; backfills next sprint).
- Touched files only: `kpi-registry.ts`, `RoleDashboard.tsx`, `role-layer.test.ts`,
  `RoleDashboard.test.tsx`, this close-summary.
