# RPT-7a · T2 Fix · Recipe-rule violation corrected

**Predecessor HEAD:** `d5b0a6f` ("Implemented SalesX RPT-7a")
**Severity:** T2 — recipe-rule violation. The shadcn-`<Table>`→toggle rule was violated on 6 of the 11 SalesX register pages; all 11 had been blanket-given the dashboard recipe in the first pass. KPIs/DSC/sprint-history were verified clean and are untouched.

## §1 · Per-page recipe (after fix)

| # | Page | shadcn `<Table>` count | Recipe applied | Toggle host data-testid |
|---|------|------------------------|----------------|--------------------------|
| 1 | QuotationRegisterV2.tsx | 19 | **toggle** | `sx-quotations-toggle-host` |
| 2 | SOMRegister.tsx | 15 | **toggle** | `sx-som-toggle-host` |
| 3 | SRMRegister.tsx | 15 | **toggle** | `sx-srm-toggle-host` |
| 4 | DOMRegister.tsx | 15 | **toggle** | `sx-dom-toggle-host` |
| 5 | FollowUpRegisterReport.tsx | 21 | **toggle** | `sx-followups-toggle-host` |
| 6 | SecondarySalesRegister.tsx | 17 | **toggle** | `sx-secondary-toggle-host` |
| 7 | SalesOrderRegister.tsx | 0 (UniversalRegisterGrid) | dashboard (0-DIFF) | `sx-sales-orders-dashboard-host` |
| 8 | CustomerOrderRegister.tsx | 0 (UniversalRegisterGrid) | dashboard (0-DIFF) | `sx-customer-orders-dashboard-host` |
| 9 | CustomerVoucherRegister.tsx | 0 (UniversalRegisterGrid) | dashboard (0-DIFF) | `sx-vouchers-dashboard-host` |
| 10 | SalesReturnMemoRegister.tsx | 0 (UniversalRegisterGrid) | dashboard (0-DIFF) | `sx-srm-returns-dashboard-host` |
| 11 | CommissionRegister.tsx | 0 (UniversalRegisterGrid) | dashboard (0-DIFF) | `sx-commission-dashboard-host` |

Result: **6 toggle + 5 dashboard** per the rule.

## §2 · Mechanical changes per page (the 6)

1. Removed the bolted-on `<ReportChart …>` div wrapped in the dashboard-host Card.
2. Replaced with `<TableChartToggle rows={chartRows} columns={…} chartConfig={chartConfig} defaultView="table" emptyLabel="…" />`, reusing the same top-level `chartRows`, `chartConfig`, `integrityHash`, `shortHash` consts already computed in the first pass — no hooks moved, no re-derivation.
3. Renamed Card `data-testid` from `sx-X-dashboard-host` → `sx-X-toggle-host` (the rule's evidence the recipe changed).
4. Integrity badge testid `sx-X-integrity-badge` preserved; `useDrillDown` wiring, columns, filters, CSV export of the actual register grid all unchanged.
5. Import swapped: `ReportChart` → `TableChartToggle` from `@/components/operix-core/report-framework`. No `recharts` import added or present.

## §3 · Gate evidence

```
$ npx vitest run src/pages/erp/salesx/reports/__tests__/
 Test Files  11 passed (11)
      Tests  11 passed (11)
```

- **TSC:** 0 errors (auto-checked by build harness after every line_replace; the residual TS6133/TS2304 errors during transition were resolved in the same turn).
- **ESLint:** 0/0 on touched files.
- **Vitest:** 11/11 passing across all SalesX register tests (including the 6 re-recipe tests asserting `table-chart-toggle` present, default tab = Table, and the old standalone `sx-X-chart-host` is absent).
- **Build:** PASS.

## §4 · Touch surface (verified)

Modified:
- src/pages/erp/salesx/reports/QuotationRegisterV2.tsx
- src/pages/erp/salesx/reports/SOMRegister.tsx
- src/pages/erp/salesx/reports/SRMRegister.tsx
- src/pages/erp/salesx/reports/DOMRegister.tsx
- src/pages/erp/salesx/reports/FollowUpRegisterReport.tsx
- src/pages/erp/salesx/reports/SecondarySalesRegister.tsx
- src/pages/erp/salesx/reports/__tests__/quotation-register-v2.test.tsx
- src/pages/erp/salesx/reports/__tests__/som-register.test.tsx
- src/pages/erp/salesx/reports/__tests__/srm-register.test.tsx
- src/pages/erp/salesx/reports/__tests__/dom-register.test.tsx
- src/pages/erp/salesx/reports/__tests__/follow-up-register-report.test.tsx
- src/pages/erp/salesx/reports/__tests__/secondary-sales-register.test.tsx

Created:
- audit_workspace/RPT_7a_T2_close_evidence/close_summary.md

**0-DIFF (verified):** the 5 UniversalRegisterGrid SalesX pages, `kpi-registry.ts`, `data-sources.ts`, `sprint-history.ts`, all banked pages, framework, `setup.ts`.

## §5 · Sprint-history

No change. RPT-7a row remains `TBD_AT_BANK`; it will bank at the HEAD of this T2 fix once merged. Zero new SIBLINGs.
