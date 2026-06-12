# RPT-7c · Distributor + Customer + EcomX — Close Summary (closes Sales Hub)

**Predecessor HEAD:** `e250a8c`
**New HEAD:** `TBD_AT_BANK`
**Cohort:** Phase C · Sales Hub final cohort.
**WebStoreX:** skipped (honest-study finding — operational commerce only, no analytical surfaces).

## Pre-flight resolution
- All 13 target pages resolved on disk (Distributor 5 · Customer 4 · EcomX 4).
- Legacy-recharts (`from 'recharts'`) detected in distributor/customer:
  - `src/pages/erp/distributor-hub/reports/DisputeStatsReport.tsx` **(TARGET → EXCLUDED 0-DIFF)**
  - `src/pages/erp/distributor-hub/reports/EngagementReport.tsx` (non-target — 0-DIFF)
  - `src/pages/erp/distributor-hub/reports/SchemeEffectivenessReport.tsx` **(TARGET → EXCLUDED 0-DIFF)**
  - `src/pages/erp/customer-hub/reports/LoyaltyPerformanceReport.tsx` **(TARGET → EXCLUDED 0-DIFF)**
- Effective chart-enabled set: **10 pages** (meets minimum 10).

## Recipe per page (APPLIED PER PAGE · mechanical rule)
| Page | shadcn `<Table>` count | Recipe | testid host |
|---|---|---|---|
| `distributor-hub/reports/DistributorOrderRegister.tsx` | 0 | dashboard | `db-orders-dashboard-host` |
| `distributor-hub/reports/CreditUtilReport.tsx` | 0 | dashboard | `db-credit-util-dashboard-host` |
| `distributor-hub/reports/DistributorDemandForecastFeed.tsx` | 1 (shadcn Table block) | **toggle** | `db-demand-toggle-host` |
| `customer-hub/reports/CLVRankingsReport.tsx` | 0 | dashboard | `cu-clv-dashboard-host` |
| `customer-hub/reports/ChurnRiskReport.tsx` | 0 | dashboard | `cu-churn-dashboard-host` |
| `customer-hub/reports/SocialProofReport.tsx` | 0 | dashboard | `cu-social-dashboard-host` |
| `ecomx/orders/EcomXOrdersPage.tsx` | 0 | dashboard | `ec-orders-dashboard-host` |
| `ecomx/claims/EcomXClaimsPage.tsx` | 0 | dashboard | `ec-claims-dashboard-host` |
| `ecomx/returns/EcomXReturnsPage.tsx` | 0 | dashboard | `ec-returns-dashboard-host` |
| `ecomx/dashboard/EcomXDashboardPage.tsx` | 0 | dashboard | `ec-gmv-dashboard-host` |

**ScorecardTile:** OMITTED across all 10 pages — no real bounded summary-% available (honest study).
**Customer + EcomX confirmed dashboard recipe per honest study (no shadcn Tables).**

## ONE TEST FILE PER WRAPPED PAGE (mandatory)
- `src/pages/erp/distributor-hub/reports/__tests__/distributor-order-register.test.tsx`
- `src/pages/erp/distributor-hub/reports/__tests__/credit-util-report.test.tsx`
- `src/pages/erp/distributor-hub/reports/__tests__/distributor-demand-forecast-feed.test.tsx`
- `src/pages/erp/customer-hub/reports/__tests__/clv-rankings-report.test.tsx`
- `src/pages/erp/customer-hub/reports/__tests__/churn-risk-report.test.tsx`
- `src/pages/erp/customer-hub/reports/__tests__/social-proof-report.test.tsx`
- `src/pages/erp/ecomx/orders/__tests__/ecomx-orders-page.test.tsx`
- `src/pages/erp/ecomx/claims/__tests__/ecomx-claims-page.test.tsx`
- `src/pages/erp/ecomx/returns/__tests__/ecomx-returns-page.test.tsx`
- `src/pages/erp/ecomx/dashboard/__tests__/ecomx-dashboard-page.test.tsx`
- `src/lib/report-framework/__tests__/rpt-7c-kpis-and-sources.test.ts` (registry/DSC)

## Block 4 — KPI seeds + DSC sources
**13 layer-tagged KPI seeds (idempotent · seed data only):**
- Distributor: `db-orders` (op/mgr/mgmt) · `db-credit-util` (mgr/mgmt · **thresholds lower-good 60/80**) · `db-scheme-eff` (mgr/mgmt) · `db-disputes` (op/mgr/mgmt) · `db-demand` (mgr/mgmt)
- Customer: `cu-clv` (mgr/mgmt) · `cu-churn` (mgr/mgmt) · `cu-loyalty` (mgr/mgmt) · `cu-social` (mgr/mgmt)
- EcomX: `ec-orders` (op/mgr/mgmt) · `ec-claims` (op/mgr/mgmt) · `ec-returns` (mgr/mgmt) · `ec-gmv` (mgmt)

**3 new DSC sources (read-only wrappers · no new engines):**
- `distributor.orders` → wraps `distributorOrdersKey`
- `customer.insights` → wraps `customerOrdersKey`
- `ecomx.orders` → wraps `ecOrdersKey`

ProjX + SalesX sources NOT duplicated (verified in registry test).

## Block 5 — Institutional
- `sprint-history.ts`: RPT-7b row backfilled `headSha:'e250a8c'` (provenance: CONFIRMED). RPT-7c row self-seeded `predecessorSha:'e250a8c'`, `headSha:'TBD_AT_BANK'`. **ZERO new SIBLINGs.**

## Gates (re-run before close)
- `npx tsc -p tsconfig.app.json --noEmit` → **0 errors**.
- `npx eslint src/pages/erp/{distributor-hub,customer-hub,ecomx} src/lib/{report-framework,_institutional} --max-warnings 0` → **clean**.
- `npx vitest run` (RPT-7c scoped) → **11 files / 15 tests passed**.

## Touch summary
**Modified (13):** the 10 pages above + `src/lib/report-framework/kpi-registry.ts` + `src/lib/report-framework/data-sources.ts` + `src/lib/_institutional/sprint-history.ts`.
**Created (11):** the 10 page tests + `src/lib/report-framework/__tests__/rpt-7c-kpis-and-sources.test.ts` + this close summary.
**0-DIFF:** all WebStoreX · `DisputeStatsReport` · `SchemeEffectivenessReport` · `LoyaltyPerformanceReport` · `EngagementReport` · all banked RPT-7a/7b pages · framework except kpi-registry/data-sources · `src/test/setup.ts` · all other hubs.
