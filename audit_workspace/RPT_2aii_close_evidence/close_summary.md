# RPT-2a-ii Close Summary

Sprint: **T-RPT2aii-Comply360-Dashboard-Cohort2** · Reporting Arc
Predecessor: **RPT-2a-i** (headSha backfilled `16aea6d` at this sprint's Block 2)
Self headSha: **TBD_AT_BANK** (will be backfilled at the next sprint's Block 2/3 per the established protocol)

## §0 Pre-flight
- HEAD: `16aea6d` ("Sprint RPT-2a-i T2 hotfix landed") — per founder declaration.
- `ResizeObserver` mock present in `src/test/setup.ts` (T1 hotfix carried).
- Primitive present:
  - `src/lib/report-framework/rag.ts` (43 LOC, contract symbols intact).
  - `src/components/operix-core/report-framework/ScorecardTile.tsx` (41 LOC).
  - Barrels re-export both.
- 5 dashboard paths resolved:
  - `src/pages/erp/comply360/quality-standards/QualityStandardsDashboardPage.tsx`
  - `src/pages/erp/comply360/cyber-security/CyberSecurityDashboardPage.tsx`
  - `src/pages/erp/comply360/csr/CSRDashboardPage.tsx`
  - `src/pages/erp/comply360/labour-tier2/LabourTier2DashboardPage.tsx`
  - `src/pages/erp/comply360/mca-tier2/MCATier2DashboardPage.tsx`
- Baselines clean (TSC 0 / ESLint 0/0 / Vitest passing).

## §1 Per-dashboard wrap (Block 1 — additive)
Mirrors the banked RPT-2a-i recipe exactly: each dashboard additively gains a
`ReportChart` over its already-computed summary, a RAG `ScorecardTile`, and an
FNV-1a integrity badge via `signReport(chartRows)`. Existing Card layout,
summary tiles, tables and Tabs are PRESERVED — no rewrite.

| Dashboard       | chartType        | RAG ScorecardTile KPI | testid section            | Recharts import | ReportChart / ScorecardTile usage |
|-----------------|------------------|-----------------------|---------------------------|-----------------|------------------------------------|
| QualityStandards| column           | `cmp-quality`         | `rpt2aii-quality-section` | 0               | 2 / 3                              |
| CyberSecurity   | doughnut         | `cmp-cyber`           | `rpt2aii-cyber-section`   | 0               | 2 / 3                              |
| CSR             | stacked-column   | `cmp-csr`             | `rpt2aii-csr-section`     | 0               | 2 / 3                              |
| LabourTier2     | column           | `cmp-labour`          | `rpt2aii-labour-section`  | 0               | 2 / 3                              |
| MCATier2        | doughnut         | `cmp-mca`             | `rpt2aii-mca-section`     | 0               | 2 / 3                              |

No direct `recharts` import in any wrapped page (all charts flow through
`ReportChart`).

## §2 KPI seeds (Block 1)
5 ids registered in `src/lib/report-framework/kpi-registry.ts`, each with
`thresholds`:
- `cmp-quality`   (higher-good 90/75)
- `cmp-cyber`     (higher-good 90/70)
- `cmp-csr`       (higher-good 85/70)
- `cmp-labour`    (higher-good 90/75)
- `cmp-mca`       (higher-good 90/75)

Idempotent via existing `registerKpi` no-op-on-collision contract; the
`kpi-registry-comply-dash2.test.ts` asserts all 5 ids resolve and threshold
shapes are correct.

## §3 Tests (Block 1)
Following the T2 lesson:
- Header: `getByRole('heading', { name: /.../ })` — uniquely targets `<h1>`.
- Tile labels: `expect(queryAllByText(/.../).length).toBeGreaterThan(0)` —
  tolerates duplicate chart-legend matches.
- Each dashboard test asserts: header renders, existing summary tile label
  still present, `ReportChart` section mounts (`data-testid` lookup).

6 new test files:
- `src/pages/erp/comply360/quality-standards/__tests__/quality-standards-dashboard.test.tsx`
- `src/pages/erp/comply360/cyber-security/__tests__/cyber-security-dashboard.test.tsx`
- `src/pages/erp/comply360/csr/__tests__/csr-dashboard.test.tsx`
- `src/pages/erp/comply360/labour-tier2/__tests__/labour-tier2-dashboard.test.tsx`
- `src/pages/erp/comply360/mca-tier2/__tests__/mca-tier2-dashboard.test.tsx`
- `src/lib/report-framework/__tests__/kpi-registry-comply-dash2.test.ts`

## §4 Block 2 — Institutional
- `sprint-history.ts`:
  - RPT-2a-i row: `headSha` backfilled `TBD_AT_BANK → 16aea6d`.
  - RPT-2a-ii row self-seeded with `predecessorSha: '16aea6d'`, `headSha: 'TBD_AT_BANK'`, `loc: 540`.
- ZERO new SIBLINGs. Cohort joins the existing `report-framework` lib; no new
  module/path/registry.

## §5 Triple Gate (post-Block-2)
```
TSC:   NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit
       → exit 0 · no output

ESLint: npx eslint . --max-warnings 0
       → exit 0 · no output

Vitest (full suite): npx vitest run
       → exit 0 · 585 test files passed · 0 failed
       Targeted cohort: 5 dashboard tests (10 cases) + 1 registry test (3 cases) all green.

Build: NODE_OPTIONS="--max-old-space-size=7168" npx vite build
       → built · no errors
```

## §6 AC self-check
1.  PASS — pre-flight clean, 5 paths resolved, primitive + setup polyfill present.
2.  PASS — exactly the 5 named dashboards modified; existing layout preserved.
3.  PASS — every wrapped dashboard renders `ReportChart` + `ScorecardTile` + integrity badge.
4.  PASS — 0 direct `recharts` imports across the 5 dashboards.
5.  PASS — 5 KPI seeds with `thresholds` registered idempotently.
6.  PASS — tests use `getByRole('heading')` + `queryAllByText().length > 0`; no brittle `getByText` on duplicated phrases.
7.  PASS — Triple Gate clean (TSC 0 / ESLint 0/0 / Vitest 585/0 / Build OK).
8.  PASS — RPT-2a-i headSha backfilled `16aea6d`; RPT-2a-ii row self-seeded `predecessorSha:'16aea6d'`.
9.  PASS — ZERO new SIBLINGs.
10. PASS — §H zero-touch sweep clean (see §7).

## §7 §H Zero-touch sweep
Verified at this commit:

**Framework primitives (frozen — 0-DIFF since RPT-2a-i):**
- `src/lib/report-framework/rag.ts` — 43 LOC
- `src/lib/report-framework/chart-config.ts` — 88 LOC
- `src/lib/report-framework/period-engine.ts` — 110 LOC
- `src/lib/report-framework/integrity-sign.ts` — 46 LOC
- `src/components/operix-core/report-framework/ScorecardTile.tsx` — 41 LOC
- `src/components/operix-core/report-framework/TableChartToggle.tsx` — 93 LOC
- `src/components/operix-core/report-framework/CHART_TYPE_COVERAGE.ts` — 32 LOC
- `src/test/setup.ts` — 29 LOC (T1 ResizeObserver mock intact)
- Both barrels unchanged.

**RPT-2a-i dashboards (frozen — 0-DIFF):**
All 6 still carry `ReportChart=2`, `recharts=0`. No re-edits this sprint.
- FireSafety · CostAudit · Environmental · IndustrialSafety · WasteManagement · DPDP

**Other Comply360 dashboards (must stay 0-DIFF):**
`rg -l "ReportChart" src/pages/erp/comply360/` returns exactly the
11 expected dashboards (6 from RPT-2a-i + 5 from RPT-2a-ii) and their test
files — no other Comply360 dashboard touched.

**EximX dashboards (must stay 0-DIFF):**
`rg -l "ReportChart" src/pages/erp/eximx/` for dashboard pages → **none**.
All EximX dashboards, masters and the 7 RPT-2b-i + 6 RPT-2b-ii registers
(`ExportPOList`, `ImportPOList`, `BoEList`, `CIList`, `LCList`,
`ShippingBillList`, `ExportDispatchList`, `ExportRealisationList`,
`FEMA270DayTracker`, `PackingCreditList`, `HedgeContractList`,
`MultiLegGITList`, `CAROTARRoOMatrix`) preserve their banked wrap from
RPT-2b-i / RPT-2b-ii.

**CustomDayBook + all RPT-1a / RPT-1b / RPT-2c pages:** unchanged.

**Only files touched this sprint:**
- edited:  `src/lib/report-framework/kpi-registry.ts` (5 idempotent seeds)
- edited:  `src/lib/_institutional/sprint-history.ts` (RPT-2a-i backfill + RPT-2a-ii self-seed)
- edited:  5 dashboard pages listed in §1
- created: 6 test files listed in §3
- created: this close summary

## §8 Files (final)

Modified:
- `src/lib/report-framework/kpi-registry.ts`
- `src/lib/_institutional/sprint-history.ts`
- `src/pages/erp/comply360/quality-standards/QualityStandardsDashboardPage.tsx`
- `src/pages/erp/comply360/cyber-security/CyberSecurityDashboardPage.tsx`
- `src/pages/erp/comply360/csr/CSRDashboardPage.tsx`
- `src/pages/erp/comply360/labour-tier2/LabourTier2DashboardPage.tsx`
- `src/pages/erp/comply360/mca-tier2/MCATier2DashboardPage.tsx`

Created:
- `src/lib/report-framework/__tests__/kpi-registry-comply-dash2.test.ts`
- `src/pages/erp/comply360/quality-standards/__tests__/quality-standards-dashboard.test.tsx`
- `src/pages/erp/comply360/cyber-security/__tests__/cyber-security-dashboard.test.tsx`
- `src/pages/erp/comply360/csr/__tests__/csr-dashboard.test.tsx`
- `src/pages/erp/comply360/labour-tier2/__tests__/labour-tier2-dashboard.test.tsx`
- `src/pages/erp/comply360/mca-tier2/__tests__/mca-tier2-dashboard.test.tsx`
- `audit_workspace/RPT_2aii_close_evidence/close_summary.md`

— end RPT-2a-ii —
