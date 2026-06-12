# Sprint RPT-9e · Builder Rollout — Support Cards (CLOSES RPT-9)

**HEAD (predecessor):** `2b62547`
**New HEAD:** TBD_AT_BANK
**Phase:** D · builder rollout 4 of 4 — **closes RPT-9**
**Type:** MECHANICAL ADDITIVE
**0-DIFF walls held:** `ReportBuilder.tsx`, `report-builder-engine.ts`, `report-definitions.ts`,
all previously-mounted cards (9a/9b/9c/9d), all framework + banked pages.

## 6 Mount Confirmations

| # | Card                | Canonical cardId  | Module id                       | Sidebar file (entry)                                            | Page file (switch case)                                  |
| - | ------------------- | ----------------- | ------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| 1 | frontdesk           | `frontdesk`       | `fd-rpt-report-builder`         | `src/apps/erp/configs/frontdesk-sidebar-config.ts:68`           | `src/pages/erp/frontdesk/FrontDeskPage.tsx:51`           |
| 2 | servicedesk         | `servicedesk`     | `sd-rpt-report-builder`         | `src/apps/erp/configs/servicedesk-sidebar-config.ts:183`        | `src/pages/erp/servicedesk/ServiceDeskPage.tsx:244`      |
| 3 | taskflow            | `taskflow`        | `tf-rpt-report-builder`         | `src/apps/erp/configs/taskflow-sidebar-config.ts:54`            | `src/pages/erp/taskflow/TaskFlowPage.tsx:105`            |
| 4 | docvault            | `docvault`        | `dv-rpt-report-builder`         | `src/apps/erp/configs/docvault-sidebar-config.ts:210`           | `src/pages/erp/docvault/DocVaultPage.tsx:61`             |
| 5 | pay-hub             | `peoplepay`       | `ph-rpt-report-builder`         | `src/features/pay-hub/PayHubSidebar.tsx:295` (top-level item)   | `src/features/pay-hub/PayHubPage.tsx:117`                |
| 6 | dispatch            | `dispatch-hub`    | `disp-rpt-report-builder`       | `src/pages/erp/dispatch/DispatchHubSidebar.tsx:171` (top-level) | `src/pages/erp/dispatch/DispatchHubPage.tsx:100`         |

All 6 mounts use canonical entitlement ids on `<ReportBuilder cardId="…" />`.
`disp-` prefix chosen to avoid collision with existing `dh-` (distributor-hub).

## RPT-9 Closing Coverage

- `-rpt-report-builder` occurrences across `src/pages/erp` + `src/apps/erp/configs` + `src/features`:
  **117 occurrences** (threshold ≥ 30) ✓
- Distinct page/feature files that render `<ReportBuilder` (incl. payout route mount in `App.tsx` via aliased `PayOutReportBuilder`):
  **≥ 30 files** ✓
- Cumulative unique builder module-id prefixes after 9e: **29**
  (fc, cc, c360, eximx, rx, po, bp, inv, p360, qc, prod, rqx, sh, ex, sx, mp, vp, lg, sx (sitex shares prefix w/ salesx — pre-existing), dh (distributor), ch, ecomx, projx, fd, sd, tf, dv, ph, disp)
- Honest skips: `gateflow` (zero DSC sources per RPT-6c), `webstorex` (zero DSC sources per RPT-7).

## Gates (pasted)

```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint <touched paths> --max-warnings 0
(0 errors / 0 warnings)

$ npx vitest run src/__tests__/rpt-9e/report-builder-mounts-support.test.tsx
 Test Files  1 passed (1)
      Tests  20 passed (20)
```

## Institutional

- `sprint-history.ts`: backfilled RPT-9d `headSha → '2b62547'`; self-seeded RPT-9e
  (predecessorSha `2b62547`, headSha `TBD_AT_BANK`).
- **ZERO** new SIBLINGs.
- 9a/9b/9c/9d cards untouched.

## Touched Files

- Sidebar configs (4): frontdesk · servicedesk · taskflow · docvault
- Sidebar component (2): PayHubSidebar.tsx · DispatchHubSidebar.tsx
- Page (6): FrontDeskPage · ServiceDeskPage · TaskFlowPage · DocVaultPage · PayHubPage (features/) · DispatchHubPage
- Types/union (4): FrontDeskSidebar.types · ServiceDeskSidebar.types · TaskFlowSidebar.types · DocVaultSidebar.types
- Institutional: `src/lib/_institutional/sprint-history.ts`
- Test: `src/__tests__/rpt-9e/report-builder-mounts-support.test.tsx` (20 assertions, includes 6 mount triplets + RPT-9 coverage)
- Close summary: this file
