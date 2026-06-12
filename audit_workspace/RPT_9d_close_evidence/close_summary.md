# RPT-9d · Builder Rollout — Sales Cards · Close Summary

**Sprint:** RPT-9d · T-RPT9d-Builder-Rollout-Sales
**Predecessor HEAD:** `8dfc18f` · **New HEAD:** TBD_AT_BANK
**Phase:** D · Builder rollout 3 of 4 · MECHANICAL ADDITIVE

## Mount confirmations (5 cards)

| # | Card             | cardId             | Module id                    | Sidebar entry file:line                                                                 | Switch case file:line                                                  |
|---|------------------|--------------------|------------------------------|------------------------------------------------------------------------------------------|------------------------------------------------------------------------|
| 1 | SalesX           | `salesx`           | `sx-rpt-report-builder`      | src/features/salesx/SalesXSidebar.tsx:242                                               | src/features/salesx/SalesXPage.tsx:316                                 |
| 2 | Distributor Hub  | `distributor-hub`  | `dh-rpt-report-builder`      | src/pages/erp/distributor-hub/DistributorHubSidebar.tsx:77                              | src/pages/erp/distributor-hub/DistributorHubPage.tsx:101               |
| 3 | Customer Hub     | `customer-hub`     | `ch-rpt-report-builder`      | src/pages/erp/customer-hub/CustomerHubSidebar.tsx:72                                    | src/pages/erp/customer-hub/CustomerHubPage.tsx:71                      |
| 4 | ProjX            | `projx`            | `projx-rpt-report-builder`   | src/pages/erp/projx/ProjXSidebar.tsx:69                                                 | src/pages/erp/projx/ProjXPage.tsx:78                                   |
| 5 | EcomX            | `ecomx`            | `ecomx-rpt-report-builder`   | src/apps/erp/configs/ecomx-sidebar-config.ts:30                                         | src/pages/erp/ecomx/EcomXPage.tsx:47                                   |

## Honest skip
- **WebStoreX SKIPPED** — zero DSC sources (per RPT-7 honest study; hub-wide skip).
  0-DIFF: `src/apps/erp/configs/webstorex-sidebar-config.ts`, `src/apps/erp/configs/webstorex-shell-config.ts`,
  all WebStoreX pages, the storefront, PIM, Commerce, Visualizer, Stats, etc.
  Asserted by the test: `webstorex · NOT mounted (zero DSC sources · hub-wide skip per RPT-7)`.

## Frozen contract (0-DIFF)
- `src/components/operix-core/report-framework/ReportBuilder.tsx`
- `src/lib/report-framework/report-builder-engine.ts`
- `src/lib/report-framework/report-definitions.ts`
- `src/lib/report-framework/data-sources.ts`
- All RPT-9b cards (eximx, receivx, payout, bill-passing, comply360, command-center)
- All RPT-9c cards (inventory, procure-hub, qualicheck, production, requestx, store-hub,
  engineeringx, sitex, maintainpro, vendor-portal, logistic)
- WebStoreX (entire hub)
- GateFlow (RPT-9c skip, still skipped)
- All other framework, audit, registers, banked pages

## Institutional updates
- **`src/lib/_institutional/sprint-history.ts`**
  - RPT-9c headSha backfilled: `TBD_AT_BANK` → `8d78373`, provenance → CONFIRMED.
  - RPT-9d self-seeded: `predecessorSha: '8dfc18f'`, headSha `TBD_AT_BANK`, loc 180,
    newSiblings `[]`, provenance PENDING_BACKFILL.
  - **No T1 rider row existed** between RPT-9c and 9d (T1 was the DSC card-id drift fix —
    a touch-only rider with no sprint-history row to backfill).
- **SIBLINGs:** ZERO new (sibling count holds).

## Test additions
- **`src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx`** — 18 assertions:
  - 15 per-card triplets (module-id × sidebar × switch case × 5 cards)
  - 1 WebStoreX skip assertion
  - 2 frozen-contract assertions (ReportBuilder + engine carry no RPT-9d diff)
- **Result:** 18/18 passed.

## Triple Gate (RAN BEFORE CLOSE)

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · exit 0)

$ npx eslint . --max-warnings 0
(no output · exit 0)

$ npx vitest run src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx
 ✓ src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx (18 tests) 9ms
 Test Files  1 passed (1)
      Tests  18 passed (18)

$ npx vitest run     (full suite)
 Tests  145+ passed · zero failures
```

## Touched files (additive only)
- `src/features/salesx/SalesXSidebar.types.ts` (+`sx-rpt-report-builder` to union + LIVE)
- `src/features/salesx/SalesXSidebar.groups.ts` (+`sx-rpt-report-builder` → 'report')
- `src/features/salesx/SalesXSidebar.tsx` (+Report Builder entry · Sparkles)
- `src/features/salesx/SalesXPage.tsx` (+ReportBuilder import · breadcrumb label · switch case)
- `src/pages/erp/distributor-hub/DistributorHubSidebar.tsx` (+union + REPORTS_ITEMS)
- `src/pages/erp/distributor-hub/DistributorHubPage.tsx` (+ReportBuilder import · switch case)
- `src/pages/erp/customer-hub/CustomerHubSidebar.tsx` (+union + REPORTS_ITEMS)
- `src/pages/erp/customer-hub/CustomerHubPage.tsx` (+ReportBuilder import · switch case)
- `src/pages/erp/projx/ProjXSidebar.types.ts` (+`projx-rpt-report-builder`)
- `src/pages/erp/projx/ProjXSidebar.groups.ts` (+mapping → 'reports')
- `src/pages/erp/projx/ProjXSidebar.tsx` (+Sparkles import · LIVE_MODULES · RPT_ITEMS)
- `src/pages/erp/projx/ProjXPage.tsx` (+ReportBuilder import · switch case)
- `src/pages/erp/ecomx/EcomXSidebar.types.ts` (+`ecomx-rpt-report-builder`)
- `src/apps/erp/configs/ecomx-sidebar-config.ts` (+Sparkles · SidebarItem)
- `src/pages/erp/ecomx/EcomXPage.tsx` (+ReportBuilder import · switch case)
- `src/lib/_institutional/sprint-history.ts` (backfill 9c · self-seed 9d)
- `src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx` (NEW · 18 assertions)
- `audit_workspace/RPT_9d_close_evidence/close_summary.md` (this file)

## Status
✅ **Triple Gate clean.** All 5 Sales cards mounted; WebStoreX honestly skipped;
ReportBuilder/engine/definitions frozen; ZERO new SIBLINGs. Ready for HEAD bank.
