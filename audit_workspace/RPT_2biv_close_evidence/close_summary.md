# RPT-2b-iv · EximX Dashboards Close · Sprint Close Summary

**Predecessor HEAD:** `616b95e` ("Finalized RPT-2b-iii dashboards")
**Bank Date:** 2026-06-10
**Grade:** A · **LOC:** ~530 · **NEW SIBLINGs:** 0

---

## §0.5 · Pre-flight

- HEAD pinned at `616b95e` (predecessor `574258e` of RPT-2b-iii backfilled).
- `ResizeObserver` mock present in `src/test/setup.ts` (0-DIFF).
- Primitive present: `ScorecardTile` (ui barrel), `rag.ts` (`resolveRag` · `RAG_PALETTE`), `signReport`, `getKpi`, `defaultChartConfig`.
- 5 EximX dashboard paths resolved:
  - `src/pages/erp/eximx/compliance/EWSDashboard.tsx`
  - `src/pages/erp/eximx/dgft/VendorScorecardDashboard.tsx`
  - `src/pages/erp/eximx/export/BuyerReliabilityDashboard.tsx`
  - `src/pages/erp/eximx/export/CoOLegalizationDashboard.tsx`
  - `src/pages/erp/eximx/import/RMSDeclarationDashboard.tsx`

---

## §1 · Dashboard recipe applied (additively)

Each of the 5 EximX dashboards gains, **below the existing Card layout (preserved, 0-DIFF)**:

| Dashboard | header | chart | KPI seed | data-testid |
|---|---|---|---|---|
| EWSDashboard | **no h1** · queryAllByText | severity `column` over signals | `ex-ews` · 90/70 higher-good | `rpt2biv-ews-section` |
| BuyerReliabilityDashboard | h1 "Buyer Reliability Index" | by-class `column` | `ex-buyer-reliability` · 80/60 | `rpt2biv-buyer-reliability-section` |
| VendorScorecardDashboard | **no h1** · queryAllByText | by-class `column` | `ex-vendor-score` · 80/60 | `rpt2biv-vendor-score-section` |
| CoOLegalizationDashboard | h1 "CoO Legalization Dashboard" | state `doughnut` | `ex-coo-legal` · 80/60 | `rpt2biv-coo-legal-section` |
| RMSDeclarationDashboard | h1 "RMS Declaration Dashboard" | status `doughnut` | `ex-rms` · 90/70 | `rpt2biv-rms-section` |

Each section: `ScorecardTile` (RAG-aware %) + supporting tile + integrity badge (FNV-1a 12-char short hash via `signReport`) + `ReportChart`. **No `recharts` import added** — `ReportChart` is the framework primitive.

---

## §2 · KPI Registry

5 new idempotent seeds appended at end of `src/lib/report-framework/kpi-registry.ts`:
`ex-ews`, `ex-buyer-reliability`, `ex-vendor-score`, `ex-coo-legal`, `ex-rms` — each with `defaultChart`, `thresholds.direction = 'higher-good'`.

---

## §3 · Tests (robust assertions · T2 lesson honored)

6 new test files. **EWS + VendorScorecard use `queryAllByText` (no h1)**; the other 3 use `getByRole('heading', { name })`. Tile assertions use `getAllByTestId('scorecard-tile').length` and integrity badges via dedicated `data-testid`. **No `getByText(/phrase/)` on duplicate-able text.**

- `src/lib/report-framework/__tests__/kpi-registry-eximx-dash2.test.ts` (5 tests)
- `src/pages/erp/eximx/compliance/__tests__/ews-dashboard.test.tsx` (2 tests)
- `src/pages/erp/eximx/dgft/__tests__/vendor-scorecard-dashboard.test.tsx` (2 tests)
- `src/pages/erp/eximx/export/__tests__/buyer-reliability-dashboard.test.tsx` (2 tests)
- `src/pages/erp/eximx/export/__tests__/coo-legalization-dashboard.test.tsx` (2 tests)
- `src/pages/erp/eximx/import/__tests__/rms-declaration-dashboard.test.tsx` (2 tests)

### Vitest result (targeted RPT-2b-iv files)

```
 Test Files  6 passed (6)
      Tests  15 passed (15)
   Duration  3.21s
```

### Full Vitest harness note

Full-suite run shows the same known transient `[vitest-worker]: Timeout calling "onTaskUpdate"` previously observed in RPT-2a-iii and RPT-2b-iii — the long-running `comply360-sprint-81b.test.ts` (~75s) holds the worker beyond the RPC timeout. **No test failures** in any file; the harness reports `34 passed / 1 worker-timeout (transient)`. The 15 RPT-2b-iv tests are independently green.

---

## §4 · Triple Gate

| Gate | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | 0 errors |
| ESLint (strict, max-warnings 0) | 0 errors / 0 warnings |
| Vitest (RPT-2b-iv targeted) | 15/15 PASS |
| Build (`vite build`) | OK |

---

## §5 · Block 2 — sprint-history updates

- RPT-2b-iii row: `headSha` backfilled `TBD_AT_BANK` → `616b95e`; provenance `PENDING_BACKFILL` → `CONFIRMED`.
- RPT-2b-iv row self-seeded: `code: 'T-RPT2biv-EximX-Dashboards-Close'`, `predecessorSha: '616b95e'`, `loc: 530`, `newSiblings: []`, `provenance: 'PENDING_BACKFILL'`, `headSha: 'TBD_AT_BANK'`.
- **ZERO new SIBLINGs**. Registry / `newSiblings` array empty for this sprint.

---

## §H · Zero-touch sweep (verified)

**0-DIFF confirmed for:**
- Frozen framework primitives: `rag.ts`, `ScorecardTile.tsx`, `chart-config.ts`, `period-engine.ts`, `integrity-sign.ts`, `ChartLibrary.tsx`, `TableChartToggle.tsx`, `CHART_TYPE_COVERAGE.ts`, both barrels, `src/test/setup.ts`.
- 6 RPT-2b-iii EximX dashboards (CrossEntityRealisation · Form3CEB · LandedCostReconciliation · AEOBenefits · EBRCEDPMS · MonthEndReval).
- ALL Comply360 dashboards (RPT-2a-i / 2a-ii / 2a-iii cohorts) and Comply360 cockpits.
- EximX masters, registers, banked RPT-1a/1b/2c surfaces.
- pay-hub / FinCore / receivx / payout / bill-passing / FP&A.

**Touched (additive only):**
- 5 EximX dashboards (additive section appended below existing Card layout).
- `src/lib/report-framework/kpi-registry.ts` (5 idempotent seeds appended).
- `src/lib/_institutional/sprint-history.ts` (RPT-2b-iii backfill + RPT-2b-iv self-seed).
- 6 new test files.
- This close summary.

---

## Arc status

**EximX dashboard layer CLOSED.** 11 EximX dashboards now consume the frozen reporting primitive (6 cohort-1 from RPT-2b-iii + 5 cohort-2 from RPT-2b-iv). All Comply360 dashboards (RPT-2a-i/ii/iii) + all EximX dashboards (RPT-2b-iii/iv) now carry ReportChart + RAG ScorecardTile + integrity badge.
