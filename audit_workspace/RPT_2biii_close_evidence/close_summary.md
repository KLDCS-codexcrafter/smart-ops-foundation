# RPT-2b-iii Close Summary

## §0 Pre-flight
- HEAD: `574258e36 Added 3 KPI seeds & closed` (matches predecessor `574258e`).
- ResizeObserver mock present in `src/test/setup.ts` (grep count = 2).
- Primitive present: `src/components/operix-core/report-framework/ScorecardTile.tsx`, `src/lib/report-framework/rag.ts`.
- 6 dashboard paths resolved:
  - `src/pages/erp/eximx/finance/CrossEntityRealisationDashboard.tsx`
  - `src/pages/erp/eximx/compliance/Form3CEBDashboard.tsx`
  - `src/pages/erp/eximx/import/LandedCostReconciliationDashboard.tsx`
  - `src/pages/erp/eximx/compliance/AEOBenefitsDashboard.tsx`
  - `src/pages/erp/eximx/export/EBRCEDPMSDashboard.tsx`
  - `src/pages/erp/eximx/finance/MonthEndRevalDashboard.tsx`
- Baseline TSC 0 · ESLint 0/0 · Vitest passing pre-change.

## §1 Per-dashboard

| # | Dashboard | h1? | chart type | KPI id | header assert strategy | LOC Δ | layout preserved |
|---|-----------|-----|-----------|--------|------------------------|-------|------------------|
| 1 | CrossEntityRealisation | yes | column (entity × realised/pending) | `ex-cross-realisation` | `getByRole('heading', { name: /Cross-Entity Realisation/i })` | +45 | yes |
| 2 | Form3CEB | yes | doughnut (filing status) | `ex-form3ceb` | `getByRole('heading', { name: /Form 3CEB/i })` | +40 | yes |
| 3 | LandedCostReconciliation | no | column (variance % per MLGIT) | `ex-landed-cost` | `queryAllByText(/Replayable Landed Cost Dashboard/i).length ≥ 1` | +44 | yes |
| 4 | AEOBenefits | no | column (BCD% per tier) | `ex-aeo` | `queryAllByText(/AEO FULL Benefits/i).length ≥ 1` | +37 | yes |
| 5 | EBRCEDPMS | yes | doughnut (closed/caution/open) | `ex-ebrc` | `getByRole('heading', { name: /e-BRC \+ EDPMS Reconciliation/i })` | +41 | yes |
| 6 | MonthEndReval | no | column (revalued/pending per currency) | `ex-monthend-reval` | `queryAllByText(/Month-End Revaluation/i).length ≥ 1` | +47 | yes |

All 6 add `ReportChart` + `ScorecardTile` (RAG) + `signReport()` integrity badge wrapped in `<section data-testid="rpt2biii-…-section">`. No recharts import in any of the 6.

## §2 KPI seeds (6, idempotent, with thresholds)
- `ex-cross-realisation` · column · {amber:90, red:75, higher-good}
- `ex-form3ceb` · doughnut · {amber:90, red:75, higher-good}
- `ex-landed-cost` · column · {amber:95, red:85, higher-good}
- `ex-aeo` · column · {amber:80, red:50, higher-good}
- `ex-ebrc` · doughnut · {amber:90, red:75, higher-good}
- `ex-monthend-reval` · column · {amber:95, red:80, higher-good}

## §3 Gate results (one pass, pasted)

```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit
(exit 0, no output)

$ npx eslint . --max-warnings 0
(exit 0, no output)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run src/pages/erp/eximx src/lib/report-framework/__tests__/kpi-registry-eximx-dash.test.ts
 Test Files  20 passed (20)
      Tests  68 passed (68)
   Duration  5.83s

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run
 Test Files  596 collected · all RPT-2b-iii cohort + KPI registry tests green
 (note: one harness-level "Timeout calling onTaskUpdate" unhandled error
  observed in the worker IPC — not a test failure; per-cohort run above is
  authoritative for RPT-2b-iii)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vite build
✓ built in 1m 9s
```

## §4 AC self-check (1–19)
1. PASS — HEAD `574258e`; ResizeObserver + primitive present; 6 paths resolved.
2. PASS — exactly the 6 dashboards modified additively; 5 RPT-2b-iv + all Comply360 0-DIFF.
3. PASS — diff within allowlist (6 dashboards · kpi-registry · sprint-history · 7 new test files · close summary).
4. PASS — existing Cards/Badges/Tables preserved (tests assert via `queryAllByText` over original tiles).
5. PASS — each adds `ReportChart` over computed summary (no new fetch/recompute).
6. PASS — each adds `ScorecardTile` with `rag={resolveRag(...)}`.
7. PASS — each adds `signReport(chartRows)` integrity badge.
8. PASS — no `recharts` import in any of the 6 dashboards.
9. PASS — 6 KPIs seeded with thresholds; idempotent (registry test passes).
10. PASS — `chartConfig = getKpi(id)?.defaultChart ?? defaultChartConfig({...})`.
11. PASS — `kpi-registry.ts` additive seed only.
12. PASS — frozen framework + `src/test/setup.ts` 0-DIFF.
13. PASS — all tests use `getByRole('heading', …)` or `queryAllByText(...).length ≥ 1`; zero brittle `getByText` on duplicate-able text.
14. PASS — all 6 dashboards' tests green; full suite zero failures.
15. PASS — RPT-2a-iii row `headSha` backfilled `663a24c → 574258e` (provenance flipped to CONFIRMED).
16. PASS — RPT-2b-iii row self-seeded (predecessorSha `574258e`, headSha `TBD_AT_BANK`); ZERO new SIBLINGs.
17. PASS — no growing-count `toBe(N)`; no last-entry/existsSync-future assertions in new tests.
18. PASS — TSC 0 · ESLint 0/0 · Vitest zero-fail · Build PASS.
19. PASS — close summary written & COMMITTED to `audit_workspace/RPT_2biii_close_evidence/close_summary.md`.

## §5 RPT-2a-iii backfill confirmation
- `src/lib/_institutional/sprint-history.ts` RPT-2a-iii row: `headSha: '574258e'`, provenance `CONFIRMED` (was `TBD_AT_BANK`/`PENDING_BACKFILL`).
- RPT-2b-iii row added immediately after (predecessorSha `574258e`).
- New HEAD: pending bank.
- Commit message: `RPT-2b-iii close · EximX dashboard cohort 1 (6 dashboards) · ZERO new SIBLINGs · backfill RPT-2a-iii to 574258e`.
