# RPT-5b · INVENTORY REPORTS + DSC/KPI SEEDING · CLOSE SUMMARY

**Predecessor HEAD:** `84945a8` (verified via `git log --oneline -1` → `84945a830 Added compliance source & RPT-5a`)
**Sprint:** RPT-5b · Phase C · Ops Hub-1, cohort b

---

## BLOCK 1 — 9 Inventory toggle-wraps (additive, hooks at top level)

| # | Resolved path | KPI id · chartType | testid prefix |
|---|---|---|---|
| 1 | `src/pages/erp/inventory/reports/ConsumptionRegister.tsx` | `inv-consumption` · line | `inv-consumption-*` |
| 2 | `src/pages/erp/inventory/reports/ConsumptionSummaryReport.tsx` | `inv-consumption-summary` · column | `inv-consumption-summary-*` |
| 3 | `src/pages/erp/inventory/reports/ItemMovementHistoryReport.tsx` | `inv-item-movement` · line (in/out) | `inv-item-movement-*` |
| 4 | `src/pages/erp/inventory/reports/SlowMovingDeadStockReport.tsx` | `inv-slow-moving` · column | `inv-slow-moving-*` |
| 5 | `src/pages/erp/inventory/reports/GRNRegister.tsx` | `inv-grn` · column (vendor) | `inv-grn-*` |
| 6 | `src/pages/erp/inventory/reports/RTVRegister.tsx` | `inv-rtv` · column (vendor) | `inv-rtv-*` |
| 7 | `src/pages/erp/inventory/reports/MINRegister.tsx` | `inv-min` · column (department) | `inv-min-*` |
| 8 | `src/pages/erp/inventory/reports/StockLedgerReport.tsx` | `inv-stock-ledger` · line | `inv-stock-ledger-*` |
| 9 | `src/pages/erp/inventory/AbcClassificationMaster.tsx` | `inv-abc` · doughnut | `inv-abc-*` |

All 9 wraps preserve existing Table/columns/filters/CSV (additive only). Hooks (`useMemo` for chartRows / `signReport`) are declared at component top level — for `StockLedgerReport.tsx` they sit BEFORE the conditional early-return for the L1/L2 drill branches. No `recharts` import added to any page; charts render through `TableChartToggle` → `ReportChart` only. Each page emits an honest `emptyLabel` empty-state when its derived `chartRows` is empty (real data or honest empty-state — no fabricated values).

## BLOCK 2 — DSC sources + KPI seeds

**`src/lib/report-framework/kpi-registry.ts`** — appended 9 idempotent `registerKpi(...)` blocks with explicit `layers:` per the spec table:
- `inv-consumption` · operator/manager/management
- `inv-consumption-summary` · manager/management
- `inv-item-movement` · operator/manager/management
- `inv-slow-moving` · manager/management
- `inv-grn` · operator/manager/management
- `inv-rtv` · operator/manager/management
- `inv-min` · operator/manager/management
- `inv-stock-ledger` · manager/management
- `inv-abc` · manager/management

**`src/lib/report-framework/data-sources.ts`** — registered 2 inventory DSC sources (read-only wrappers of the SAME storage the wrapped pages already load · NO new engine, NO fabrication):
- `inventory.stock-ledger` → `safeRead(stockBalanceKey(entityCode))`
- `inventory.consumption` → `safeRead(consumptionEntriesKey(entityCode))` (cancelled filtered)

## BLOCK 3 — Institutional + tests

**`src/lib/_institutional/sprint-history.ts`**
- RPT-5a row: `headSha` backfilled `'TBD_AT_BANK' → '84945a8'`; `provenance` flipped to `CONFIRMED`.
- RPT-5b row added (`predecessorSha: '84945a8'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: []`).
- **ZERO new SIBLINGs.**

**Tests created (10 files, 21 cases — all green):**
- `src/pages/erp/inventory/reports/__tests__/consumption-register.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/consumption-summary.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/item-movement-history.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/slow-moving-dead-stock.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/grn-register.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/rtv-register.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/min-register.test.tsx`
- `src/pages/erp/inventory/reports/__tests__/stock-ledger-report.test.tsx`
- `src/pages/erp/inventory/__tests__/abc-classification-master.test.tsx`
- `src/lib/report-framework/__tests__/inventory-kpis-and-sources.test.ts` (9 KPI ids registered with layers, idempotent re-import, ≥2 inventory sources resolve and return arrays from `read()`)

---

## TRIPLE GATE — pasted from the run actually performed

### TSC (project)
```
$ npx tsc -p tsconfig.app.json --noEmit
(exit 0 · no output)
```

### ESLint (project, --max-warnings 0)
```
$ npx eslint . --max-warnings 0
(exit 0 · no output)
```

### Vitest (new files)
```
$ npx vitest run src/pages/erp/inventory/reports/__tests__ \
                 src/pages/erp/inventory/__tests__ \
                 src/lib/report-framework/__tests__/inventory-kpis-and-sources.test.ts

 ✓ src/lib/report-framework/__tests__/inventory-kpis-and-sources.test.ts (3 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/consumption-register.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/consumption-summary.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/slow-moving-dead-stock.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/stock-ledger-report.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/grn-register.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/item-movement-history.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/__tests__/abc-classification-master.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/min-register.test.tsx (2 tests)
 ✓ src/pages/erp/inventory/reports/__tests__/rtv-register.test.tsx (2 tests)

 Test Files  10 passed (10)
      Tests  21 passed (21)
```

### Tree verification
```
$ ls src/pages/erp/inventory/reports/__tests__/ src/pages/erp/inventory/__tests__/ \
     src/lib/report-framework/__tests__/inventory-kpis-and-sources.test.ts
src/lib/report-framework/__tests__/inventory-kpis-and-sources.test.ts
src/pages/erp/inventory/__tests__/:
abc-classification-master.test.tsx
src/pages/erp/inventory/reports/__tests__/:
consumption-register.test.tsx       min-register.test.tsx
consumption-summary.test.tsx        rtv-register.test.tsx
grn-register.test.tsx               slow-moving-dead-stock.test.tsx
item-movement-history.test.tsx      stock-ledger-report.test.tsx
```

---

## TOUCHED FILES (per the TOUCH ONLY contract)

- 9 inventory pages (additive wrap only)
- `src/lib/report-framework/kpi-registry.ts` (9 appended seeds, idempotent)
- `src/lib/report-framework/data-sources.ts` (2 inventory sources appended)
- `src/lib/_institutional/sprint-history.ts` (RPT-5a backfill + RPT-5b row)
- 10 new test files
- this close summary

All detail panels, print pages, masters, banked pages, framework core, RoleDashboard, CrossCardDayBookPage, command-center configs, and other hubs: **0-DIFF**.

**New HEAD:** TBD at bank time. AbcClassificationMaster INCLUDED (has analytical class table) → 9 wraps (not 8).
