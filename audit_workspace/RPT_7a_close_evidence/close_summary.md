# RPT-7a · SalesX Registers (cohort 1 of 2) · Close Summary

**Predecessor HEAD:** `bf838cf` ("Completed RPT-6c sprint build")
**New HEAD:** TBD_AT_BANK
**Phase:** C (Sales Hub, cohort a) · Tier-L

## Block 1 — Chart-enabled pages (11/11, dashboard recipe)

All 11 SalesX register pages received the **dashboard recipe** (additive `<Card>` with
`ReportChart` + `ShieldCheck` integrity badge appended at the bottom of the render).
No `recharts` imports added; existing `<UniversalRegisterGrid>` / table layouts preserved
byte-identical above the new block.

| Page | File | KPI id | chart |
|---|---|---|---|
| SalesOrderRegister | `src/pages/erp/salesx/reports/SalesOrderRegister.tsx` | `sx-sales-orders` | column, x=status, series=order_value |
| CustomerOrderRegister | `src/pages/erp/salesx/reports/CustomerOrderRegister.tsx` | `sx-customer-orders` | column, x=customer top-10, series=order_value |
| QuotationRegisterV2 | `src/pages/erp/salesx/reports/QuotationRegisterV2.tsx` | `sx-quotations` | doughnut, x=quotation_stage, series=count |
| SOMRegister | `src/pages/erp/salesx/reports/SOMRegister.tsx` | `sx-som` | column, x=month, series=som_value |
| SRMRegister | `src/pages/erp/salesx/reports/SRMRegister.tsx` | `sx-srm` | column, x=status, series=count |
| DOMRegister | `src/pages/erp/salesx/reports/DOMRegister.tsx` | `sx-dom` | column, x=month, series=dom_value |
| CustomerVoucherRegister | `src/pages/erp/salesx/reports/CustomerVoucherRegister.tsx` | `sx-vouchers` | column, x=voucher_type (In/Out), series=value |
| SalesReturnMemoRegister | `src/pages/erp/salesx/reports/SalesReturnMemoRegister.tsx` | `sx-returns` | column, x=reason, series=return_value |
| CommissionRegister | `src/pages/erp/salesx/reports/CommissionRegister.tsx` | `sx-commission` | column, x=agent top-10, series=commission |
| FollowUpRegisterReport | `src/pages/erp/salesx/reports/FollowUpRegisterReport.tsx` | `sx-followups` | column, x=status, series=count |
| SecondarySalesRegister | `src/pages/erp/salesx/reports/SecondarySalesRegister.tsx` | `sx-secondary` | line, x=date, series=secondary_value |

**ScorecardTile:** OMITTED across all 11 pages — no page exposes a real bounded summary-%
(status mixes / counts / value sums only).

**0-DIFF exclusions (per prompt):** `SalesXAnalytics`, `CampaignPerformanceReport`
(legacy-recharts), and the 6 RPT-7b analytical pages (`TargetVsAchievement`,
`PipelineSummary`, `CoverageReport`, `BeatProductivityReport`, `SecondarySalesReport`,
`CrossDeptHandoffTracker`).

## Block 2 — KPI + DSC seeds

**`src/lib/report-framework/kpi-registry.ts`** — 11 layer-tagged seeds appended
(`sx-sales-orders`, `sx-customer-orders`, `sx-quotations`, `sx-som`, `sx-srm`, `sx-dom`,
`sx-vouchers`, `sx-returns`, `sx-commission`, `sx-followups`, `sx-secondary`). Each has
explicit `layers:`, `defaultChart`, and `dataSource`.

**`src/lib/report-framework/data-sources.ts`** — 2 SalesX DSC sources registered:
- `salesx.orders` — read-only wrapper of `ordersKey(entityCode)` filtered to
  `base_voucher_type === 'Sales Order'`.
- `salesx.pipeline` — read-only wrapper of `quotationsKey(entityCode)`.

No new engines. No new SIBLINGs.

## Block 3 — Institutional + tests + close

**`src/lib/_institutional/sprint-history.ts`**
- RPT-6c row backfilled: `headSha: 'bf838cf'`, `provenance: 'CONFIRMED'`,
  comment forward-extended ("…BACKFILLED bf838cf at RPT-7a Block 3 · forward-extended in RPT-7a").
- RPT-7a row added: `T-RPT7a-SalesX-Registers`, `headSha: 'TBD_AT_BANK'`,
  `predecessorSha: 'bf838cf'`, `provenance: 'PENDING_BACKFILL'`, `newSiblings: []`.

**Tests created (12 files):**
- `src/lib/report-framework/__tests__/salesx-registers-kpis-and-sources.test.ts` (4 assertions)
- `src/pages/erp/salesx/reports/__tests__/sales-order-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/customer-order-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/quotation-register-v2.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/som-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/srm-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/dom-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/customer-voucher-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/sales-return-memo-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/commission-register.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/follow-up-register-report.test.tsx`
- `src/pages/erp/salesx/reports/__tests__/secondary-sales-register.test.tsx`

## Triple-Gate evidence

```
$ npx tsc -p tsconfig.app.json --noEmit
(exit 0 · zero errors)

$ npx eslint src/pages/erp/salesx/reports src/lib/report-framework/kpi-registry.ts \
    src/lib/report-framework/data-sources.ts src/lib/_institutional/sprint-history.ts \
    src/pages/erp/salesx/reports/__tests__ \
    src/lib/report-framework/__tests__/salesx-registers-kpis-and-sources.test.ts \
    --max-warnings 0
(exit 0 · zero errors / zero warnings)

$ npx vitest run src/lib/report-framework/__tests__/salesx-registers-kpis-and-sources.test.ts \
    src/pages/erp/salesx/reports/__tests__/
 Test Files  12 passed (12)
      Tests  15 passed (15)
```

All 15 new assertions pass. Layouts preserved. No synthetic/placeholder data added —
all chart rows derive from data the pages already load.
