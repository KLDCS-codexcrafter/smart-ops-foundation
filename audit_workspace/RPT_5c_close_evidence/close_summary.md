# RPT-5c · Procure360 Reports + DSC/KPI Seeding · Close Summary

**Predecessor HEAD:** `0363af9` (RPT-5b · Inventory Reports)
**This sprint HEAD:** TBD_AT_BANK
**ZERO new SIBLINGs.**

## Pre-Flight (verified)
- `git log --oneline -1` → `0363af91c Wrapped 9 pages, KPIs, & DSCs` ✓
- All 9 page files resolved under `src/pages/erp/procure-hub/`.
- Already-charted page (recharts import) → **EXCLUDED at 0-DIFF**:
  - `src/pages/erp/procure-hub/reports/RateVarianceGraphPanel.tsx`

## Block 1 — 9 pages chart-enabled (recipe per the rule)

Recipe is chosen mechanically: shadcn `<Table>` import → toggle; raw-HTML tile/list panel → dashboard.

| # | Page | Path | Recipe | KPI id |
|---|---|---|---|---|
| 1 | Procure360VendorAgreementsRegister | transactions/Procure360VendorAgreementsRegister.tsx | **toggle** | pr-vendor-agreements |
| 2 | BudgetUtilizationDashboard | reports/BudgetUtilizationDashboard.tsx | **toggle** | pr-budget-utilization |
| 3 | VendorReliabilityPanel | reports/VendorReliabilityPanel.tsx | dashboard | pr-vendor-reliability |
| 4 | ThreeWayMatchStatusPanel | reports/ThreeWayMatchStatusPanel.tsx | dashboard | pr-three-way-match |
| 5 | PurchaseCostVarianceItemPanel | reports/PurchaseCostVarianceItemPanel.tsx | dashboard | pr-cost-variance-item |
| 6 | PurchaseCostVarianceCategoryPanel | reports/PurchaseCostVarianceCategoryPanel.tsx | dashboard | pr-cost-variance-cat |
| 7 | TdsDeductionReportPanel | reports/TdsDeductionReportPanel.tsx | dashboard | pr-tds-deduction |
| 8 | EnquiryDetailsReportPanel | reports/EnquiryDetailsReportPanel.tsx | dashboard | pr-enquiry |
| 9 | PeqFollowupRegisterPanel | reports/PeqFollowupRegisterPanel.tsx | dashboard | pr-peq-followup |

Notes:
- All additions hooks-at-top-level, additive only (existing layouts preserved).
- No `recharts` import added to any page (charts go through the framework `ReportChart` / `TableChartToggle`).
- Each host carries an integrity `ShieldCheck` badge from `signReport(chartRows)`.
- Dashboard recipe renders honest empty-state when `chartRows.length === 0`; no synthetic data.
- ScorecardTile with `resolveRag` was not added: none of the 7 dashboard-recipe pages exposes an explicit % metric on its KPI strip (counts / scores / aging days only). Integrity badge + ReportChart only — honest, no fabricated %.

## Block 2 — KPI seeds + DSC sources

**`src/lib/report-framework/kpi-registry.ts`** — appended 9 KPI seeds, layer-tagged:
`pr-vendor-agreements` (op/mgr/mgmt) · `pr-budget-utilization` (mgr/mgmt) · `pr-vendor-reliability` (mgr/mgmt) · `pr-three-way-match` (op/mgr/mgmt) · `pr-cost-variance-item` (mgr/mgmt) · `pr-cost-variance-cat` (mgr/mgmt) · `pr-tds-deduction` (mgr/mgmt) · `pr-enquiry` (op/mgr/mgmt) · `pr-peq-followup` (op/mgr/mgmt).

**`src/lib/report-framework/data-sources.ts`** — registered 2 DSC sources (read-only wrappers of the SAME storage the pages already load):
- `procure.purchase-orders` → `safeRead(purchaseOrdersKey(entityCode))`
- `procure.budget-utilization` → `safeRead(budgetAllocationsKey(entityCode))` filtered to active

No new engines.

## Block 3 — Institutional + tests + gates

**`src/lib/_institutional/sprint-history.ts`**:
- RPT-5b `headSha` backfilled `TBD_AT_BANK` → `0363af9`; provenance `PENDING_BACKFILL` → `CONFIRMED`.
- RPT-5c row appended: `predecessorSha: '0363af9'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: []`.

**Tests created (10 files):**
- `src/pages/erp/procure-hub/transactions/__tests__/vendor-agreements-register.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/budget-utilization-dashboard.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/vendor-reliability-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/three-way-match-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/purchase-cost-variance-item-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/purchase-cost-variance-category-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/tds-deduction-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/enquiry-details-panel.test.tsx`
- `src/pages/erp/procure-hub/reports/__tests__/peq-followup-panel.test.tsx`
- `src/lib/report-framework/__tests__/procure-kpis-and-sources.test.ts`

## Triple Gate (real runs)

```
$ npx tsc -p tsconfig.app.json --noEmit
(exit 0 · 0 errors)

$ npx eslint . --max-warnings 0
(exit 0 · 0 errors / 0 warnings)

$ npx vitest run src/lib/report-framework/__tests__/procure-kpis-and-sources.test.ts src/pages/erp/procure-hub
 Test Files  10 passed (10)
      Tests  21 passed (21)
```

## Tree verification

```
$ grep -rl "from 'recharts'" src/pages/erp/procure-hub --include=*.tsx
src/pages/erp/procure-hub/reports/RateVarianceGraphPanel.tsx   ← EXCLUDED (0-DIFF)

$ grep -c "pr-vendor-agreements\|pr-peq-followup" src/lib/report-framework/kpi-registry.ts
2

$ grep -c "procure.purchase-orders\|procure.budget-utilization" src/lib/report-framework/data-sources.ts
2
```

## Touch scope (0-DIFF everywhere else)

Modified: 9 procure pages · `kpi-registry.ts` · `data-sources.ts` · `sprint-history.ts`.
Created: 10 new test files · this close summary.
