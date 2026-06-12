# RPT-8a · CLOSE SUMMARY · ServiceDesk + Dispatch + DSC/KPI Seeding

**Predecessor HEAD:** `772c191` (Added RPT-7c chart updates)
**New HEAD:** TBD_AT_BANK (self-seeded in `sprint-history.ts`; backfilled at RPT-8b Block 3)

## Triple Gate (verified)
- **TSC**: `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**
- **ESLint**: `npx eslint . --max-warnings 0` → **0 errors / 0 warnings**
- **Vitest** (RPT-8a scope: registry + 12 page tests): `17/17 passed` across 13 test files

## Pre-flight recharts inventory (ALL EXCLUDED 0-DIFF)
```
src/pages/erp/servicedesk/engineers/EngineerBurnoutDashboard.tsx
src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx
src/pages/erp/servicedesk/refurbished/RefurbishedUnitLifecycle.tsx
src/pages/erp/servicedesk/reports/AMCRenewalForecast.tsx
src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx        ← TARGET excluded
src/pages/erp/servicedesk/reports/PromisedVsActualVariance.tsx ← TARGET excluded
src/pages/erp/servicedesk/reports/SLAPerformance.tsx
src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx
src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx
src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx
src/pages/erp/dispatch/reports/TransporterScorecard.tsx       ← TARGET excluded
```
**DispatchAnalytics is NOT recharts** → INCLUDED (dashboard recipe).
**ServiceDayBook** (RPT-3a registry-served) → 0-DIFF.

## Per-page recipe (12 wrapped)

### TOGGLE recipe (2 — shadcn `<Table>` present)
| Page | `<Table>` count | KPI |
|---|---|---|
| `dispatch/inward/StockHoldReport.tsx` | 2 | dp-stock-hold |
| `dispatch/reports/DemoSerialRegister.tsx` | 1 | dp-demo-serial |

### DASHBOARD recipe (10 — 0 shadcn `<Table>`)
| Page | `<Table>` count | KPI |
|---|---|---|
| `servicedesk/reports/AMCRenewalForecastDrillDown.tsx` | 0 | sd-amc-forecast |
| `servicedesk/customer-hub/ServiceAvailedTracker.tsx` | 0 | sd-service-availed |
| `servicedesk/customer-hub/CustomerSLAEnquiry.tsx` | 0 | sd-sla (thresholds OMITTED — no real met-%) |
| `servicedesk/customer-hub/CustomerCommLog.tsx` | 0 | sd-comm-log |
| `servicedesk/future-task-register/FutureTaskRegisterViewer.tsx` | 0 | sd-future-tasks |
| `dispatch/inward/InwardReceiptRegister.tsx` | 0 (UniversalRegisterGrid) | dp-inward |
| `dispatch/transactions/LRTracker.tsx` | 0 (plain `<table>`) | dp-lr |
| `dispatch/reports/PackingSlipRegister.tsx` | 0 (UniversalRegisterGrid) | dp-packing |
| `dispatch/reports/DispatchReceiptRegister.tsx` | 0 (UniversalRegisterGrid) | dp-receipts |
| `dispatch/reports/DispatchAnalytics.tsx` | 0 (tile-based) | dp-analytics |

### EXCLUDED 0-DIFF (KPIs seeded for RPT-12)
- `CustomerPnLReport` (legacy-recharts) → `sd-customer-pnl` seeded
- `PromisedVsActualVariance` (legacy-recharts) → `sd-promise-variance` seeded
- `TransporterScorecard` (legacy-recharts) → `dp-transporter` seeded
- `ServiceDayBook` (RPT-3a registry-served) → no new KPI

## Test files (one per wrapped page · 12 + 1 registry = 13)
```
src/pages/erp/servicedesk/reports/__tests__/amc-renewal-forecast-drilldown.test.tsx
src/pages/erp/servicedesk/customer-hub/__tests__/service-availed-tracker.test.tsx
src/pages/erp/servicedesk/customer-hub/__tests__/customer-sla-enquiry.test.tsx
src/pages/erp/servicedesk/customer-hub/__tests__/customer-comm-log.test.tsx
src/pages/erp/servicedesk/future-task-register/__tests__/future-task-register-viewer.test.tsx
src/pages/erp/dispatch/inward/__tests__/stock-hold-report.test.tsx
src/pages/erp/dispatch/inward/__tests__/inward-receipt-register.test.tsx
src/pages/erp/dispatch/transactions/__tests__/lr-tracker.test.tsx
src/pages/erp/dispatch/reports/__tests__/packing-slip-register.test.tsx
src/pages/erp/dispatch/reports/__tests__/demo-serial-register.test.tsx
src/pages/erp/dispatch/reports/__tests__/dispatch-receipt-register.test.tsx
src/pages/erp/dispatch/reports/__tests__/dispatch-analytics.test.tsx
src/lib/report-framework/__tests__/rpt-8a-kpis-and-sources.test.ts
```

## Block 3 — DSC + KPI seeds
- **KPIs (15)** appended to `src/lib/report-framework/kpi-registry.ts`:
  `sd-customer-pnl`, `sd-promise-variance`, `sd-amc-forecast`, `sd-service-availed`,
  `sd-sla` (thresholds OMITTED — honest), `sd-comm-log`, `sd-future-tasks`,
  `dp-stock-hold`, `dp-inward`, `dp-lr`, `dp-packing`, `dp-demo-serial`,
  `dp-transporter`, `dp-receipts`, `dp-analytics`. All layer-tagged.
- **DSC sources (4)** appended to `src/lib/report-framework/data-sources.ts`:
  `servicedesk.tickets` (→ `serviceTicketKey`),
  `servicedesk.amc` (→ `amcRecordKey`),
  `dispatch.shipments` (→ `dispatchReceiptsKey`),
  `dispatch.inward` (→ `inwardReceiptsKey`). Read-only wrappers.

## Block 4 — Institutional
- `sprint-history.ts`: RPT-7c `headSha` backfilled `TBD_AT_BANK → 772c191`, provenance `CONFIRMED`.
  RPT-8a row self-seeded (`headSha: 'TBD_AT_BANK'`, `predecessorSha: '772c191'`).
- ZERO new SIBLINGs.
- ScorecardTile OMITTED across all 12 pages (only `sd-sla` had a candidate %; no real met-% → honest omission).
- Hooks at top level · NO `recharts` import added · layouts PRESERVED (additive Card).
