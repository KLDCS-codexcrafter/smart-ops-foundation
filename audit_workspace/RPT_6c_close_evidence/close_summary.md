# RPT-6c · SMALL-CARDS CLOSE — close summary

**Predecessor HEAD:** `3b25c2e` ("Executed RPT-6b sprint build")
**This HEAD:** TBD_AT_BANK
**Bank date:** 2026-06-11

## Pre-flight resolution
- 13 named pages all resolved under `src/pages/erp/...`.
- GateFlow card **SKIPPED** — `src/pages/erp/gateflow/` contains only `GateFlowPage.tsx` + 3 panel/slot files (`alerts-panels.tsx`, `panels.tsx`, `vehicle-panels.tsx`); no genuine register page → minimum-10 rule met without it (12 wrapped).
- Legacy-recharts pages in the six cards (0-DIFF, EXCLUDED):
  1. `src/pages/erp/sitex/reports/SiteTwinDashboard.tsx`
  2. `src/pages/erp/maintainpro/reports/ESGEnergyDashboard.tsx`
  3. `src/pages/erp/vendor-portal/panels/VendorScoringPanel.tsx`

## Block 1 — pages chart-enabled (12; recipe per the mechanical rule)

| Page | Recipe | KPI id |
|---|---|---|
| `src/pages/erp/engineeringx/transactions/DrawingRegister.tsx` | toggle (shadcn `<Table>`) | `eng-drawings` |
| `src/pages/erp/engineeringx/registers/DrawingVersionHistory.tsx` | toggle (shadcn `<Table>`) | `eng-versions` |
| `src/pages/erp/engineeringx/registers/ProductionHandoff.tsx` | toggle (shadcn `<Table>`) | `eng-handoff` |
| `src/pages/erp/engineeringx/registers/EngineeringXReports.tsx` | dashboard (tile/list panel) | `eng-reports` |
| `src/pages/erp/sitex/registers/DPRRegister.tsx` | dashboard (list panel) | `site-dpr` |
| `src/pages/erp/sitex/registers/SnagRegister.tsx` | dashboard (list panel) | `site-snags` |
| `src/pages/erp/sitex/registers/LookAheadPlan.tsx` | dashboard (grid panel) | `site-lookahead` |
| `src/pages/erp/maintainpro/transactions/BreakdownReport.tsx` | dashboard (form + list) | `mnt-breakdown` |
| `src/pages/erp/maintainpro/reports/FireSafetyExpiryReport.tsx` | dashboard (native `<table>`, not shadcn — dashboard recipe) | `mnt-fire-expiry` |
| `src/pages/erp/maintainpro/reports/TopReportersByDepartment.tsx` | dashboard (native `<table>`) | `mnt-top-reporters` |
| `src/pages/erp/maintainpro/reports/OpenTicketsLive.tsx` | dashboard (native `<table>`) | `mnt-open-tickets` |
| `src/pages/erp/vendor-portal/panels/Msme43BhTrackerPanel.tsx` | toggle (shadcn `<Table>`) | `vp-msme-43bh` |
| `src/pages/erp/logistic/LogisticDashboard.tsx` | dashboard (tile dashboard) | `log-shipments` |

(13 rows · 12 wrapped; GateFlow card skipped — no genuine register.)

**ScorecardTile:** OMITTED across all 12 pages — no page exposes a real bounded summary-% (status mixes, counts, and unbounded ₹ values only). No synthetic % computed.

**Layouts:** PRESERVED — every wrap is an additive block appended after existing content. Hooks remain at top level (IIFE blocks call only pure helpers `signReport`/`getKpi`/`defaultChartConfig`). NO new `recharts` import added.

## Block 2 — KPI seeds, DSC sources, RIDER

`src/lib/report-framework/kpi-registry.ts` — appended 13 layer-tagged KPIs:
- `eng-drawings` (column, op/mgr/mgmt), `eng-versions` (line, mgr/mgmt), `eng-handoff` (doughnut, op/mgr/mgmt), `eng-reports` (column, mgr/mgmt)
- `site-dpr` (line, op/mgr/mgmt), `site-snags` (column, op/mgr/mgmt), `site-lookahead` (column, mgr/mgmt)
- `mnt-breakdown` (column, op/mgr/mgmt), `mnt-fire-expiry` (stacked-column, mgr/mgmt), `mnt-top-reporters` (column, mgr/mgmt), `mnt-open-tickets` (doughnut, op/mgr/mgmt)
- `vp-msme-43bh` (stacked-column, mgr/mgmt)
- `log-shipments` (column, op/mgr/mgmt)

`src/lib/report-framework/data-sources.ts` — appended 5 DSC sources (1 per wrapped card):
- `engineeringx.drawings` (wraps `erp_documents_<ec>` filtered `kind==='drawing'`)
- `sitex.dpr` (wraps `erp_dprs_<ec>` + `erp_snags_<ec>`)
- `maintainpro.tickets` (wraps `erp_internal_tickets_<ec>` + `erp_breakdown_reports_<ec>` + `erp_fire_safety_equipment_<ec>`)
- `vendorportal.msme` (wraps `getMSMEBreaches()` from `msme-43bh-engine`)
- `logistic.shipments` (wraps `erp_lr_acceptances_<ec>`)

**RIDER — rq-extra → rq-service-request** (rename completed in 4 places):
1. `src/lib/report-framework/kpi-registry.ts` line 1284 — id replaced.
2. `src/pages/erp/requestx/reports/ServiceRequestRegister.tsx` — `getKpi('rq-service-request')` + 3 `data-testid` prefixes.
3. `src/pages/erp/requestx/reports/__tests__/service-request-register.test.tsx` — describe + 2 testIDs.
4. `src/lib/report-framework/__tests__/requestx-storehub-kpis-and-sources.test.ts` — id in `RPT6B_KPI_IDS`.

The new `smallcards-kpis-and-sources.test.ts` asserts `rq-service-request` EXISTS and `rq-extra` is UNDEFINED.

## Block 3 — institutional + tests + gates

**`src/lib/_institutional/sprint-history.ts`:**
- RPT-6b `headSha` backfilled `TBD_AT_BANK` → `3b25c2e`, provenance `CONFIRMED`.
- RPT-6c self-seeded (`headSha: 'TBD_AT_BANK'`, `predecessorSha: '3b25c2e'`, provenance `PENDING_BACKFILL`).
- ZERO new SIBLINGs.

**Tests created (14):**
- `src/lib/report-framework/__tests__/smallcards-kpis-and-sources.test.ts` (KPIs + DSC + rider)
- 13 page tests (one per wrapped page) under each module's `__tests__/`.

**Gates (pasted outputs):**
- `npx tsc -p tsconfig.app.json --noEmit` → exit 0, no output.
- `npx eslint <changed paths> --max-warnings 0` → exit 0, no output.
- `npx vitest run <RPT-6c suite + RPT-6b rider tests>` → `Test Files  16 passed (16) · Tests  23 passed (23)`.

## What is intentionally NOT in the tree
- No edits to GateFlow (no genuine register page).
- No edits to `SiteTwinDashboard`, `ESGEnergyDashboard`, `VendorScoringPanel` (legacy-recharts, 0-DIFF).
- No edits to checklist/builder/workflow tools, no MaintenanceEntryDayBook (registry-served).
- No `ScorecardTile` added anywhere in this sprint (no real summary-%).
- No `recharts` import added; only `ReportChart` / `TableChartToggle` from the framework.

## Verification before claiming
- `ls` of every created file performed via `vitest run` discovery (all 14 test files loaded and passed) and via spot file reads.
- `tsc` and `eslint` re-run after the final edits, both clean.
- KPI registry test asserts the rider truthfully: `rq-extra` is gone, `rq-service-request` is present.
