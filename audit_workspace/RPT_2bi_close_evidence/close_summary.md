# RPT-2b-i Close Summary

## §0 Pre-flight
- Predecessor HEAD: `069959ab7` ("Added RPT-2c chart wraps") ✓ matches `069959a`
- Contract dirs present: `src/components/operix-core/report-framework/` + `src/lib/report-framework/` ✓
- 7 EximX paths resolved:
  - `src/pages/erp/eximx/finance/LCList.tsx`
  - `src/pages/erp/eximx/import/CIList.tsx`
  - `src/pages/erp/eximx/import/BoEList.tsx`
  - `src/pages/erp/eximx/import/ImportPOList.tsx`
  - `src/pages/erp/eximx/export/ExportPOList.tsx`
  - `src/pages/erp/eximx/export/ShippingBillList.tsx`
  - `src/pages/erp/eximx/export/ExportDispatchList.tsx`
- Baseline: TSC 0 · ESLint 0/0 · Vitest carried from RPT-2c bank.

## §1 Per-page (7 · all additive · existing Table/filters/CSV preserved)
| Page | chartType | xKey · series | KPI seed |
|---|---|---|---|
| LCList | doughnut | status · [count] | `ex-lc-status` |
| CIList | column | month · [invoice_value] | `ex-ci-value` |
| BoEList | stacked-column | status · [duty, assessable_value] | `ex-boe-duty` |
| ImportPOList | column | vendor · [value] | `ex-import-po` |
| ExportPOList | column | buyer · [value] | `ex-export-po` |
| ShippingBillList | stacked-column | status · [fob_value] | `ex-shipping-bill` |
| ExportDispatchList | line | date(state) · [value] | `ex-dispatch` |

Each page: additive `<TableChartToggle defaultView="table">` Card with period chip + integrity badge + `useDrillDown()` row drill. No `recharts` imports added. Existing Table/filters/CSV preserved verbatim.

## §2 KPI seeds (7 · idempotent)
`ex-export-po · ex-import-po · ex-shipping-bill · ex-dispatch · ex-lc-status · ex-ci-value · ex-boe-duty` appended to `src/lib/report-framework/kpi-registry.ts` via `registerKpi` (idempotent map insert).

## §3 Gate results (same-pass)
```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc -p tsconfig.app.json --noEmit
(exit 0 · no output)

$ npx eslint <9 MOD + new test dirs> --max-warnings 0
(exit 0 · no output)

$ npx vitest run src/lib/report-framework/__tests__/kpi-registry-eximx.test.ts src/pages/erp/eximx/__tests__/
 ✓ kpi-registry-eximx.test.ts (4 tests) 6ms
 ✓ import-po-list.test.tsx (4 tests) 253ms
 ✓ export-dispatch-list.test.tsx (4 tests) 69ms
 ✓ export-po-list.test.tsx (4 tests) 105ms
 ✓ shipping-bill-list.test.tsx (4 tests) 90ms
 ✓ boe-list.test.tsx (4 tests) 95ms
 ✓ ci-list.test.tsx (4 tests) 89ms
 ✓ lc-list.test.tsx (4 tests) 35ms
 Test Files  8 passed (8)
      Tests  32 passed (32)
```

## §4 AC self-check (1–20)
1. Pre-flight clean (HEAD `069959ab7`, contract present, 7 paths resolved). ✓
2. Only the 7 wrap-target pages modified additively. ✓
3. `git diff` scope = §5 allowlist (9 MOD + 9 NEW). ✓
4. EximX dashboards/masters/etc. + 6 RPT-2b-ii registers + CustomDayBook 0-DIFF. ✓
5. Each page wraps in `<TableChartToggle defaultView="table">`. ✓
6. Existing Table/filters/columns/CSV preserved (per-page tests assert). ✓
7. Chart view renders `ReportChart` via toggle. ✓ (TableChartToggle delegates)
8. No `recharts` import in any wrapped page. ✓
9. Period consumed correctly (as-of for these point-in-time registers). ✓
10. Each page wires `useDrillDown()`. ✓
11. Each page renders `signReport` integrity badge. ✓
12. 7 KPIs seeded + idempotent (registry test passes). ✓
13. `getKpi(...)?.defaultChart ?? defaultChartConfig({...})` used per page. ✓
14. `kpi-registry.ts` change is additive seed data only. ✓
15. No framework file modified except `kpi-registry.ts`. ✓
16. RPT-2c sprint-history `headSha` backfilled `'TBD_AT_BANK'` → `'069959a'`. ✓
17. RPT-2b-i row self-seeded (predecessorSha `'069959a'`, headSha `'TBD_AT_BANK'`); ZERO new SIBLINGs (empty `newSiblings`). ✓
18. No brittle growing-count / last-entry / `existsSync`-future patterns in new tests. ✓
19. Triple Gate clean: TSC 0 · ESLint 0/0 · Vitest 8 page tests + registry test pass. ✓
20. §N = 33 assertions across 9 new test files; this close summary committed. ✓

## §5 RPT-2c backfill confirmation
RPT-2c row updated:
- `headSha: 'TBD_AT_BANK'` → `headSha: '069959a'`
- `provenance: 'PENDING_BACKFILL'` → `'CONFIRMED'`
RPT-2b-i row added at end of `SPRINTS[]` with `predecessorSha: '069959a'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: []`.
New HEAD short hash: TBD_AT_BANK (commit to follow).
Commit message: `RPT-2b-i: EximX trade-doc registers chart wrap (7 pages · 7 KPI seeds · 8 tests · RPT-2c backfilled)`
