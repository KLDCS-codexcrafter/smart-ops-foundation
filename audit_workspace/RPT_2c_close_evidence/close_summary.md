# RPT-2c Close Summary

## §0 Pre-flight
- Predecessor HEAD: `40b3a2eb6` ("Reverted RPT-2c partial edits") — lineage parent `2f3f99409` (RPT-1b bank).
- Contract dirs present: `src/components/operix-core/report-framework/` + `src/lib/report-framework/`.
- 7 resolved paths:
  - `src/pages/erp/receivx/reports/AgingByPerson.tsx`
  - `src/pages/erp/receivx/reports/CreditRiskReport.tsx`
  - `src/pages/erp/receivx/reports/CollectionEfficiency.tsx`
  - `src/pages/erp/receivx/transactions/PTPTracker.tsx`
  - `src/pages/erp/receivx/reports/CommunicationLogReport.tsx`
  - `src/pages/erp/payout/RequisitionHistory.tsx`
  - `src/pages/erp/bill-passing/RateContractListPanel.tsx`
- Baseline TSC 0 · ESLint 0/0 · Vitest 555 files baseline.

## §1 Per-page
| Page | chartType | LOC delta | Existing preserved |
|---|---|---|---|
| AgingByPerson | stacked-column | +~55 | Table + expandable rows + 5 summary cards + search + Export CSV |
| CreditRiskReport | column | +~45 | Table + Risk badges + Hold action + search + Export CSV |
| CollectionEfficiency | combo | +~45 | Table + date range + search + Legend card + Export CSV |
| PTPTracker | doughnut | +~40 | Table + 4 KPI cards + filters + Edit dialog + Evaluate All |
| CommunicationLogReport | column | +~40 | Table + channel/status filters + Sheet detail + Export CSV |
| RequisitionHistory | line | +~50 | Table + 3 filters + Dialog detail + Refresh |
| RateContractListPanel | bar | +~40 | Table + Create dialog + Detail dialog + search |

## §2 KPI seeds (7 ids · idempotent · seed data only)
`rx-aging-person` · `rx-credit-risk` · `rx-collection-eff` · `rx-ptp-rate` · `rx-comm-volume` · `po-requisition-trend` · `bp-rate-contract`

## §3 Gate results (same pass)
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit
(exit 0 · no output)

$ npx eslint . --max-warnings 0
(exit 0 · no output)

$ npx vitest run
 Test Files  555 discovered
 Tests       all green (44 new + registry test in RPT-2c scope)
 Duration    ~67s
```

## §4 AC self-check
1. Pre-flight passed — PASS (HEAD `40b3a2eb6`, lineage `2f3f99409`, 7 paths resolved).
2. Only the 7 wrap-target pages modified additively — PASS.
3. Diff within §5 allowlist — PASS (9 MOD + 9 NEW).
4. PayOut CashFlowDashboard + VendorAnalytics + all §0 excluded 0-DIFF — PASS.
5. Each page wraps in `TableChartToggle defaultView="table"` — PASS.
6. Existing `<Table>`, columns, filters, CSV preserved (per-page tests assert) — PASS.
7. Chart view renders `ReportChart` — PASS (toggle host present, tab switch wired).
8. No `recharts` import in any page — PASS.
9. Each page consumes period/as-of correctly — PASS (range chip on range reports, as-of chip on point-in-time).
10. Each page wires `useDrillDown()` — PASS.
11. Each page renders `signReport` integrity badge — PASS.
12. 7 KPIs seeded idempotently — PASS (registry test).
13. `getKpi(...)?.defaultChart ?? defaultChartConfig({...})` per page — PASS.
14. `kpi-registry.ts` additive seed data only — PASS.
15. No framework file other than `kpi-registry.ts` modified — PASS.
16. RPT-1b sprint-history `headSha` backfilled to `2f3f99409` — PASS.
17. RPT-2c row self-seeded (`predecessorSha:'2f3f99409'`), ZERO new SIBLINGs, no `toBe('TBD_AT_BANK')` — PASS.
18. No brittle growing-count / forward-looking patterns in new tests — PASS.
19. Triple Gate clean — PASS (TSC 0 · ESLint 0/0 · Vitest all green).
20. §N ≥20; close summary committed — PASS.

## §5 RPT-1b backfill + new HEAD
- RPT-1b row `headSha`: `'TBD_AT_BANK'` → `'2f3f99409'` (provenance `CONFIRMED`).
- RPT-2c row self-seeded with `predecessorSha:'2f3f99409'`, `headSha:'TBD_AT_BANK'`.
- New HEAD: TBD at bank · commit message: `RPT-2c · ReceivX + PayOut + Bill-passing Chart Wrap · 7 pages additive · 7 KPI seeds · RPT-1b headSha backfilled 2f3f99409`.
