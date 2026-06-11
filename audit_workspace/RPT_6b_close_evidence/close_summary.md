# RPT-6b · RequestX + Store-Hub Reports · Close Summary

**Predecessor HEAD:** `f5e1d93` (RPT-6a)
**New HEAD:** TBD_AT_BANK

## Pre-flight (verified)
- `git log --oneline -1` → `f5e1d939c Built RPT-6a production pages` ✓
- 6 named RequestX pages found ✓
- 7th candidate identified analytically: **ServiceRequestRegister.tsx** (CategoryWiseSpendEstimate is the legacy-recharts EXCLUSION)
- 5 Store-Hub pages all present ✓
- `grep "from 'recharts'"` → 1 hit: **CategoryWiseSpendEstimate.tsx** (excluded 0-DIFF)

## Block 1 + 2 — 12 pages chart-enabled (recipe per the mechanical rule)

| # | Page | Recipe | Chart | KPI id |
|---|---|---|---|---|
| 1 | requestx/reports/IndentRegister.tsx | dashboard (UniversalRegisterGrid) | column x=status, count | `rq-indent` |
| 2 | requestx/reports/AgeingPendingIndents.tsx | toggle (Card+Table) | stacked-column x=bucket, count | `rq-ageing` |
| 3 | requestx/reports/DepartmentWiseSummary.tsx | toggle (Card+Table) | column x=department, indent-value | `rq-dept-summary` |
| 4 | requestx/reports/POAgainstIndent.tsx | toggle (Card+Table) | doughnut x=status, count | `rq-po-against` |
| 5 | requestx/reports/IndentClosed.tsx | toggle (Card+Table) | line x=date, closed-count | `rq-closed` |
| 6 | requestx/reports/IndentPending.tsx | toggle (Card+Table) | column x=department, pending-count | `rq-pending` |
| 7 | requestx/reports/ServiceRequestRegister.tsx | dashboard (UniversalRegisterGrid) | column x=track, count | `rq-extra` |
| 8 | store-hub/transactions/StockIssueRegister.tsx | dashboard (UniversalRegisterGrid) | column x=department, issue-value | `st-issue` |
| 9 | store-hub/reports/DepartmentConsumptionSummary.tsx | dashboard (thin re-export + wrapper Card) | column x=department, consumption | `st-dept-consumption` |
| 10 | store-hub/reports/StockReceiptAckRegister.tsx | dashboard (UniversalRegisterGrid) | column x=status, count | `st-receipt-ack` |
| 11 | store-hub/reports/CycleCountStatus.tsx | toggle (Card+Table multi) | doughnut x=status, count | `st-cycle-count` |
| 12 | store-hub/reports/StockMovementRegister.tsx | dashboard (thin re-export + wrapper Card) | line x=date, movement-qty | `st-movement` |

### Exclusions (0-DIFF, named)
- `requestx/reports/CategoryWiseSpendEstimate.tsx` — already imports recharts (legacy-charted), excluded per the rule.

### ScorecardTile decision
**OMITTED across all 12 pages.** No page exposes a real bounded summary-% (only status mixes and counts). Adding a ScorecardTile would require fabricating data, which is forbidden.

## Block 3 — DSC + KPI seeds

### `src/lib/report-framework/kpi-registry.ts` (+12 seeds, append-only, idempotent)
- `rq-indent`, `rq-ageing`, `rq-dept-summary`, `rq-po-against`, `rq-closed`, `rq-pending`, `rq-extra`
- `st-issue`, `st-dept-consumption`, `st-receipt-ack`, `st-cycle-count`, `st-movement`

All seeds carry explicit `layers`, `defaultChart`, `dataSource`.

### `src/lib/report-framework/data-sources.ts` (+4 sources, read-only wrappers)
- `requestx.indents` → wraps materialIndentsKey + serviceRequestsKey + capitalIndentsKey
- `requestx.po-conversion` → same indent corpus (po-status projection lives in the page)
- `storehub.issues` → wraps stockIssuesKey
- `storehub.movement` → wraps stockIssuesKey + stockReceiptAcksKey

No new engines; all `read()` calls go through the same storage keys the pages already load.

## Block 4 — Institutional + Tests

### sprint-history.ts
- RPT-6a backfilled: `headSha: 'f5e1d93'`, `provenance: 'CONFIRMED'`
- RPT-6b appended: `headSha: 'TBD_AT_BANK'`, `predecessorSha: 'f5e1d93'`, `provenance: 'PENDING_BACKFILL'`
- **ZERO new SIBLINGs**

### Tests created (13 files · 16 cases)
- `src/lib/report-framework/__tests__/requestx-storehub-kpis-and-sources.test.ts` (4 cases: 12 KPIs registered with layers, idempotent ≥12, 4 sources read() returns arrays, card+dimension fields exposed)
- 7 RequestX page tests under `src/pages/erp/requestx/reports/__tests__/`
- 4 Store-Hub report tests under `src/pages/erp/store-hub/reports/__tests__/`
- 1 Store-Hub transaction test under `src/pages/erp/store-hub/transactions/__tests__/`

Each page test asserts: the recipe host testid + the integrity-badge testid are in the document.

## Gates (pasted outputs)

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · exit 0)

$ npx eslint . --max-warnings 0
(no output · exit 0)

$ npx vitest run <RPT-6b suite>
Test Files  13 passed (13)
     Tests  16 passed (16)
  Duration  5.44s
```

## TOUCH inventory (only these files modified/created)
- 12 page files edited (RequestX 7 + Store-Hub 5)
- `src/lib/report-framework/kpi-registry.ts` (append-only)
- `src/lib/report-framework/data-sources.ts` (additive imports + 4 new registerSource calls)
- `src/lib/_institutional/sprint-history.ts` (RPT-6a backfill + RPT-6b append)
- 13 new test files
- `audit_workspace/RPT_6b_close_evidence/close_summary.md` (this file)

**0-DIFF everywhere else** including: CategoryWiseSpendEstimate (legacy-recharts), all store-hub prints/detail panels, entry/console pages, all banked pages, framework files except the two seed registries, `src/test/setup.ts`, all other hubs.
