# RPT-9c · Builder Rollout — Ops Cards · CLOSE SUMMARY

**Sprint:** T-RPT9c-Builder-Rollout-Ops · Phase D builder rollout 2 of 4
**Predecessor HEAD:** `7ae3576` (RPT-9b backfilled)
**New HEAD:** TBD_AT_BANK (sprint-history self-seed in place; will be backfilled)
**Mode:** MECHANICAL ADDITIVE · ZERO new SIBLINGs · ReportBuilder / engine / definitions FROZEN

## 11 Mount Confirmations (file + line)

| # | Card           | cardId          | Module id                    | Switch / Route                                                              |
|---|----------------|-----------------|------------------------------|-----------------------------------------------------------------------------|
| 1 | inventory      | inventory-hub   | `inv-rpt-report-builder`     | `src/pages/erp/inventory/MainStoreHubPage.tsx:115`                          |
| 2 | procure-hub    | procure360      | `p360-rpt-report-builder`    | `src/pages/erp/procure-hub/Procure360Page.tsx:453`                          |
| 3 | qualicheck     | qualicheck      | `qc-rpt-report-builder`      | `src/pages/erp/qualicheck/QualiCheckPage.tsx:150`                           |
| 4 | production     | production      | `prod-rpt-report-builder`    | `src/pages/erp/production/ProductionPage.tsx:146`                           |
| 5 | requestx       | requestx        | `rqx-rpt-report-builder`     | `src/pages/erp/requestx/RequestXPage.tsx:57`                                |
| 6 | store-hub      | store-hub       | `sh-rpt-report-builder`      | `src/pages/erp/store-hub/DepartmentStorePage.tsx:76`                        |
| 7 | engineeringx   | engineeringx    | `ex-rpt-report-builder`      | `src/pages/erp/engineeringx/EngineeringXPage.tsx:47`                        |
| 8 | sitex          | sitex           | `sx-rpt-report-builder`      | `src/pages/erp/sitex/SiteXPage.tsx:50`                                      |
| 9 | maintainpro    | maintainpro     | `mp-rpt-report-builder`      | `src/pages/erp/maintainpro/MaintainProPage.tsx:141`                         |
|10 | vendor-portal  | vendor-portal   | `vp-rpt-report-builder`      | `src/pages/erp/vendor-portal/VendorPortalPage.tsx:50`                       |
|11 | logistic       | logistics       | `lg-rpt-report-builder`      | route `src/App.tsx:853` · wrapper `src/pages/erp/logistic/LogisticReportBuilder.tsx` · nav `src/features/logistic/LogisticLayout.tsx:67` |

### Route-mode declaration

**Logistic** is route-driven (transporter portal · separate auth boundary via `LogisticLayout`).
Mirrors the PayOut RPT-9b route precedent. One thin wrapper file added:

- `src/pages/erp/logistic/LogisticReportBuilder.tsx` — wraps `<ReportBuilder cardId="logistics" />` inside `<LogisticLayout>`.
- Route registered at `src/App.tsx:853` → `/erp/logistic/report-builder`.
- Sidebar nav entry added at `src/features/logistic/LogisticLayout.tsx:67`.

### GateFlow skip note

**GateFlow is 0-DIFF this sprint.** Per RPT-6c honest study, GateFlow exposes
**zero DSC sources**, so an embedded Report Builder would render a `not-entitled` /
empty state. Mounting empty noise into a card violates the honest-empty-state
discipline (better to surface no entry-point at all). Test
`gateflow · SKIPPED` asserts neither the sidebar config nor the type union
contains `rpt-report-builder`.

## Triple Gate (pasted)

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · 0 errors)

$ npx eslint . --max-warnings 0
(no output · 0 errors · 0 warnings)

$ npx vitest run src/__tests__/rpt-9c/report-builder-mounts-ops.test.tsx
 ✓ src/__tests__/rpt-9c/report-builder-mounts-ops.test.tsx (35 tests) 14ms
 Test Files  1 passed (1)
      Tests  35 passed (35)
```

35 assertions (well above the ≥22 floor).

## Walls Held (0-DIFF)

- `src/components/operix-core/report-framework/ReportBuilder.tsx` — FROZEN
- `src/lib/report-framework/report-builder-engine.ts` — FROZEN
- `src/lib/report-framework/report-definitions.ts` — FROZEN
- GateFlow card (sidebar config, types, page) — 0-DIFF
- All RPT-9b cards (eximx, receivx, payout, bill-passing, comply360, command-center) — 0-DIFF
- All other ERP cards not in scope — 0-DIFF
- Reporting framework (data-source-catalog, role-layer, kpi-registry, daybook) — 0-DIFF
- All banked pages — 0-DIFF

## Sprint-history

- RPT-9b backfilled: `headSha: '7ae3576'` · `provenance: 'CONFIRMED'`
- RPT-9c self-seeded: `predecessorSha: '7ae3576'` · `headSha: 'TBD_AT_BANK'` · `newSiblings: []`

## Touched files

Additive only:

- 11 card type/sidebar/page files (one per card)
- `src/pages/erp/inventory/MainStoreHubSidebar.tsx` + `MainStoreHubSidebar.groups.ts` (inventory uses inline sidebar)
- `src/pages/erp/store-hub/DepartmentStoreSidebar.tsx` (store-hub type union lives here)
- `src/pages/erp/requestx/RequestXSidebar.tsx` (icon map needs union coverage)
- `src/features/logistic/LogisticLayout.tsx` (nav entry)
- `src/App.tsx` (logistic route)
- `src/pages/erp/logistic/LogisticReportBuilder.tsx` (NEW · thin route wrapper · mirrors PayOut precedent)
- `src/lib/_institutional/sprint-history.ts` (RPT-9b backfill + RPT-9c self-seed)
- `src/__tests__/rpt-9c/report-builder-mounts-ops.test.tsx` (NEW · 35 assertions)
- `audit_workspace/RPT_9c_close_evidence/close_summary.md` (this file)
