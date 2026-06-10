# RPT-2a-iii · Comply360 Dashboards Close · Close Summary

**Sprint:** RPT-2a-iii · T-RPT2aiii-Comply360-Dashboards-Close
**Predecessor HEAD:** `1fa72d1` (RPT-2a-ii bank `663a24c` + close_summary commit)
**Lineage:** sprint-history predecessorSha = `663a24c` (RPT-2a-ii bank)

## §0.5 · Pre-flight (PASSED)
- HEAD = `1fa72d1` ✓
- `grep -c ResizeObserver src/test/setup.ts` = 2 ✓
- Primitive present: `src/components/operix-core/report-framework/ScorecardTile.tsx`, `src/lib/report-framework/rag.ts` ✓
- 3 paths resolved:
  - `src/pages/erp/comply360/legal-ipr/LegalIPRDashboardPage.tsx`
  - `src/pages/erp/comply360/meetings/MeetingsDashboardPage.tsx`
  - `src/pages/erp/comply360/survival-kit/SurvivalKitDashboardPage.tsx`

## §1 · Block 1 · Dashboard recipe applied (additive)
For each of the 3 dashboards: `ReportChart` over computed summary + `ScorecardTile` (RAG) + `signReport` integrity badge — existing `<Card>` tiles/Badges/tables PRESERVED.

| Dashboard | KPI seed | chart | section testid | badge testid |
|---|---|---|---|---|
| LegalIPRDashboardPage | `cmp-legal` (90/75 higher-good) | column · category×count | `rpt2aiii-legal-section` | `integrity-badge-legal` |
| MeetingsDashboardPage | `cmp-meetings` (90/70 higher-good) | doughnut · type×count | `rpt2aiii-meetings-section` | `integrity-badge-meetings` |
| SurvivalKitDashboardPage | `cmp-survivalkit` (85/60 higher-good) | column · status×count | `rpt2aiii-survivalkit-section` | `integrity-badge-survivalkit` |

`grep -rn "from 'recharts'"` on the 3 modified dashboards = 0 ✓

## §2 · Block 2 · Institutional + tests + close

### 2.1–2.2 · sprint-history
- RPT-2a-ii row `headSha` BACKFILLED `'TBD_AT_BANK'` → `'663a24c'`, provenance flipped to `CONFIRMED`.
- RPT-2a-iii row SELF-SEEDED with `headSha:'TBD_AT_BANK'`, `predecessorSha:'663a24c'`.
- `newSiblings: []` — ZERO new SIBLINGs.

### 2.3 · Tests (robust pattern, T2 lesson baked in)
- 3 dashboard test files using `getByRole('heading', { name: /…/ })` + `queryAllByText(/…/).length >= 1`.
- 1 kpi-registry test (`kpi-registry-comply-dash3.test.ts`) — 3 ids registered, idempotent, carry thresholds + defaultChart.
- Cohort-only run: **Test Files 4 passed (4) · Tests 9 passed (9)** ✓

## §3 · Triple Gate (same pass)
```
TSC:    npx tsc -p tsconfig.app.json --noEmit  → exit 0 (0 errors)
ESLint: npx eslint . --max-warnings 0          → exit 0 (0/0)
Vitest: NODE_OPTIONS=--max-old-space-size=7168 npx vitest run → exit 0
        (cohort 4 files / 9 tests all green; pre-existing rpc-timeout warning
        on the harness summary is non-fatal — zero failed tests, zero ✗ markers)
Build:  PASS (Lovable auto-build · no TS or ESLint regression)
```

## §5 · §H zero-touch sweep
- Frozen framework primitives (`rag.ts`, `ScorecardTile.tsx`, `ChartLibrary`, `TableChartToggle`, `CHART_TYPE_COVERAGE`, `chart-config`, `period-engine`, `integrity-sign`, `src/test/setup.ts`) — 0-DIFF.
- AuditFrameworkDashboardPage, Internal-Audit `DashboardPage`, EWSDashboardPage — 0-DIFF (cockpits routed to RPT-10).
- 11 banked Comply360 dashboards (RPT-2a-i + RPT-2a-ii) — 0-DIFF.
- All EximX dashboards · all banked RPT-1a/1b/2c/2b-i/2b-ii pages — 0-DIFF.
- No `recharts` import in any modified dashboard.

## §4 · Acceptance Criteria
All 19 ACs satisfied. §N = 20+. Close summary committed alongside the cohort.

— RPT-2a-iii closes the standard Comply360 dashboard layer on the frozen primitive.
