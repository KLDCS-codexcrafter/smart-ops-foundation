# RPT-2e-iii · STATUTORY CLOSE · CLOSE SUMMARY

**Predecessor HEAD:** `bde4307` (RPT-2e-ii)
**Sprint:** RPT-2e-iii · T-RPT2eiii-Statutory-Close · Tier-L · CLOSES PHASE A
**Bank date:** 2026-06-11

## Block 1 · 5 Toggle-wraps (additive)
- `EWayBillRegister` · KPI `fc-eway` · x=status, series=count
- `ChallanRegister` · KPI `fc-challan` · x=type, series=amount
- `Form24Q` · KPI `fc-form24q` · x=quarter, series=tds
- `Form26Q` · KPI `fc-form26q` · x=section, series=tds
- `Form27Q` · KPI `fc-form27q` · x=section, series=tds

All wraps: `useDrillDown` + `chartRows` + `chartConfig` + `signReport` integrity at
component TOP LEVEL (RPT-2e-i T1 lesson). Existing Table/Card/CSV preserved.

## Block 2 · AuditDashboard dashboard-recipe (additive)
- `ReportChart` (doughnut over checkpoint status mix)
- `ScorecardTile` with RAG resolved via `resolveRag(greenPct, kpi.thresholds)`
- `signReport` integrity badge
- KPI `fc-audit-dash` seeded with thresholds 90/70 higher-good

## Block 3 · Institutional
- `sprint-history.ts` · RPT-2e-ii headSha BACKFILLED `bde4307`
- `sprint-history.ts` · RPT-2e-iii self-seeded · predecessor `bde4307`
- ZERO new SIBLINGs
- 6 KPI seeds appended idempotently to `kpi-registry.ts`

## Triple Gate
- TSC `tsconfig.app.json --noEmit` → 0 errors
- ESLint `--max-warnings 0` (incl. rules-of-hooks) → clean
- Vitest → all new tests pass

## 0-DIFF guarantees
- Frozen framework files unchanged
- Form3CD · Form26AS · IRN panels unchanged
- Comply360 redirects unchanged
- No `recharts` import in any page
