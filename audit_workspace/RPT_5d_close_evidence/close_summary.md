# RPT-5d · QualiCheck Reports + DSC/KPI Seeding · CLOSE SUMMARY

**Closes:** Ops Hub-1 (final cohort, Phase C sprint 4)
**Predecessor HEAD:** `8d683e5` (RPT-5c) · **New HEAD:** TBD_AT_BANK

## Pre-flight
- `git log --oneline -1` → `8d683e592 Built RPT-5c Procure360 pages` ✓
- 9 prompt-named pages resolved under `src/pages/erp/qualicheck/`
- Legacy-charted pages (QCTrendChart / QCParetoChart consumers): **`src/pages/erp/qualicheck/QualiCheckDashboard.tsx`** — **EXCLUDED 0-DIFF**

## Block 1 — Chart-enable (8 pages · toggle recipe)
QualiCheckDashboard is the only legacy-charted page; per the exclude rule it is 0-DIFF. All 8 remaining pages got the **toggle recipe** (additive `<Card>` mounted after the existing table; `TableChartToggle` defaults to Table view; integrity badge via `signReport`; existing layout/filters/CSV preserved).

| # | Path | Recipe | Chart | KPI · testid prefix |
|---|---|---|---|---|
| 1 | `src/pages/erp/qualicheck/reports/MtcRegister.tsx` | toggle | column x=status | `qc-mtc` |
| 2 | `src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceRegister.tsx` | toggle | column x=status | `qc-ncr` |
| 3 | `src/pages/erp/qualicheck/reports/QcRejectionAnalysis.tsx` | toggle | column x=vendor·item | `qc-rejection` |
| 4 | `src/pages/erp/qualicheck/reports/CFRPart11AuditTrailViewer.tsx` | toggle | column x=event-type | `qc-cfr-audit` |
| 5 | `src/pages/erp/qualicheck/reports/QCGodownSummary.tsx` | toggle | column x=godown | `qc-godown` |
| 6 | `src/pages/erp/qualicheck/reports/QCStkTrnsfer.tsx` | toggle | column x=status | `qc-stk-transfer` |
| 7 | `src/pages/erp/qualicheck/reports/FGRInspReport.tsx` | toggle | doughnut x=result | `qc-fgr-insp` |
| 8 | `src/pages/erp/qualicheck/reports/StkIqcStRemarks.tsx` | toggle | column x=remark-category | `qc-iqc-remarks` |
| — | `QualiCheckDashboard.tsx` | EXCLUDED 0-DIFF | imports QCTrendChart + QCParetoChart | `qc-dashboard` KPI seeded but page untouched |

### ScorecardTile decision (per page)
**OMITTED on all 8 pages** — none of the wrapped pages expose a real summary-percentage (every aggregation is a status/count mix or a vendor-bucket count, not a single bounded ratio). The prompt rule is explicit: include `ScorecardTile` only where a *real* summary-% exists; otherwise omit and say so. We omit.

## Block 2 — KPI + DSC seeds
**9 KPIs** appended to `src/lib/report-framework/kpi-registry.ts` (all layer-tagged):
`qc-mtc` · `qc-ncr` · `qc-rejection` · `qc-cfr-audit` · `qc-godown` · `qc-stk-transfer` · `qc-fgr-insp` · `qc-iqc-remarks` · `qc-dashboard`

**2 DSC sources** registered in `src/lib/report-framework/data-sources.ts`:
- `qualicheck.inspections` — wraps `qaInspectionKey(entityCode)` (the same store every QA-inspection page already reads via `listQaInspections`)
- `qualicheck.ncr` — wraps `ncrKey(entityCode)` (the same store `listNcrs` reads)

No new engines. No fabricated data. `read()` returns arrays only.

## Block 3 — Institutional + tests + close
- `sprint-history.ts`: RPT-5c `headSha` backfilled `TBD_AT_BANK → 8d683e5` (provenance flipped to `CONFIRMED`); RPT-5d row appended with `predecessorSha:'8d683e5'`, `headSha:'TBD_AT_BANK'`. **ZERO new SIBLINGs.**
- New tests (9 files, 20 tests):
  - 8 per-page tests asserting toggle-host, integrity badge, `table-chart-toggle`, and preserved heading
  - 1 registry/DSC test (4 cases): 9 `qc-*` KPIs with explicit layers, registry idempotency, DSC arrays, DSC card+fields metadata

## Verification (ran BEFORE writing this summary)
```
$ ls audit_workspace/RPT_5d_close_evidence/close_summary.md
$ ls src/pages/erp/qualicheck/reports/__tests__/*.test.tsx
  cfr-part11-audit-trail · fgr-insp-report · mtc-register · qc-godown-summary ·
  qc-rejection-analysis · qc-stk-transfer · stk-iqc-st-remarks  (7)
$ ls src/pages/erp/qualicheck/transactions/__tests__/ncr-evidence-register.test.tsx
$ ls src/lib/report-framework/__tests__/qualicheck-kpis-and-sources.test.ts

$ npx tsc -p tsconfig.app.json --noEmit       → 0 errors
$ npx eslint . --max-warnings 0               → 0 errors / 0 warnings
$ npx vitest run (qualicheck scope)           → 9 files / 20 passed / 0 failed
$ NODE_OPTIONS="--max-old-space-size=7168" \
    npx vite build                            → ✓ built in 1m 5s
```

## Touch-list (final)
- 8 QualiCheck pages (additive only)
- `src/lib/report-framework/kpi-registry.ts` (append 9)
- `src/lib/report-framework/data-sources.ts` (append 2 sources)
- `src/lib/_institutional/sprint-history.ts` (backfill RPT-5c · seed RPT-5d)
- 9 new test files
- this close summary

0-DIFF: `QualiCheckDashboard.tsx`, `RInspReportPage.tsx` (56L stub), all other hubs, framework core (catalog/registry/aggregator), all banked pages.

**Triple Gate: CLEAN.** Ops Hub-1 closed.
