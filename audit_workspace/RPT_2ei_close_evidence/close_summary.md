# RPT-2e-i · GST Statutory Registers · Close Summary

**Sprint**: T-RPT2ei-GST-Statutory-Registers
**Predecessor HEAD**: `1ab0450` (RPT-2b-iv)
**Bank Date**: 2026-06-11
**Grade**: A
**New SIBLINGs**: 0

## Scope · 6 GST registers wrapped (toggle-wrap recipe, additive)

| # | File | Toggle-host testId |
|---|------|--------------------|
| 1 | `src/pages/erp/fincore/reports/gst/GSTR1.tsx` | `fc-gstr1-toggle-host` |
| 2 | `src/pages/erp/fincore/reports/gst/GSTR3B.tsx` | `fc-gstr3b-toggle-host` |
| 3 | `src/pages/erp/fincore/reports/gst/GSTR9.tsx` | `fc-gstr9-toggle-host` |
| 4 | `src/pages/erp/fincore/reports/gst/GSTR2Register.tsx` | `fc-gstr2-toggle-host` |
| 5 | `src/pages/erp/fincore/reports/gst/RecoPanel.tsx` | `fc-reco-toggle-host` |
| 6 | `src/pages/erp/fincore/reports/gst/RCMComplianceReport.tsx` | `fc-rcm-compliance-toggle-host` |

Each page additively gains:
- **TableChartToggle** (defaults to Table view; chart-view available)
- **Period/FY chip** (`*-period-chip`)
- **Integrity badge** (FNV-1a hash via `signReport`, `*-integrity-badge`)
- **Drill consume** via `useDrillDown()`

Existing Tables, columns, filters, CSV/JSON download paths **PRESERVED** byte-for-byte
in the rendered output below the new toggle-wrap section.

## KPI registry · 6 idempotent seeds in `src/lib/report-framework/kpi-registry.ts`

`fc-gstr1`, `fc-gstr3b`, `fc-gstr9`, `fc-gstr2`, `fc-reco`, `fc-rcm-compliance` —
all with `higher-good` thresholds (RAG-aware).

## 0-DIFF Walls

- Frozen framework files: `chart-config.ts`, `period-engine.ts`, `integrity-sign.ts`,
  `rag.ts`, `ChartLibrary.tsx`, `TableChartToggle.tsx`, `ScorecardTile.tsx`,
  `CHART_TYPE_COVERAGE.ts`, barrels, `src/test/setup.ts`.
- **SKIPPED (0-DIFF as instructed)**: Form3CD, Form26AS, IRN panels, AuditDashboard.
- All other FinCore statutory pages, all EximX dashboards (RPT-2b-iii/iv),
  all Comply360 dashboards (RPT-2a-i/ii/iii) — 0-DIFF.

## Comply360 Redirect Verification (no edits)

Comply360's GSTR1/3B/9/2/Reco surfaces are redirect-only — they navigate users to
these 6 FinCore native pages. The redirect wiring lives in Comply360 shell/route
config which is **not edited** in this sprint. Statutory reports remain generated
**in FinCore** from FinCore transactions; Comply360 surfaces consume them via
deep-link/redirect only.

## Tests · 7 new files (Vitest)

- `src/lib/report-framework/__tests__/kpi-registry-gst.test.ts` — 6-id idempotent seed assertions
- 6 register tests under `src/pages/erp/fincore/reports/gst/__tests__/`
  asserting `queryAllByText` on header + presence of toggle-host, period chip,
  and integrity badge testIds. No `getByText` on duplicate-able strings.

## Institutional Updates

- `RPT-2b-iv` headSha backfilled to `1ab0450`, provenance flipped to `CONFIRMED`.
- `RPT-2e-i` self-seeded with `predecessorSha = 1ab0450`, headSha `TBD_AT_BANK`.
- **ZERO new SIBLINGs** (all consuming; no new engine).

## Triple Gate

- TSC: 0 errors
- ESLint: 0 warnings
- Vitest: full suite green (7 new files, all passing locally)
