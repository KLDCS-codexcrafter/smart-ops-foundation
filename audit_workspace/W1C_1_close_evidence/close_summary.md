# W1C-1 · DocSendBar-Reports Rollout · Close Summary

**Sprint:** `T-W1C1-DocSendBar-Reports`
**Predecessor HEAD:** `bbc6ada`
**New HEAD:** `TBD_AT_BANK`
**Tier-L · Wave-1 Close Arc · Sprint 1 of arc**

## What shipped

1. **ReportSendHeader.tsx** (NEW · 68 LOC) — thin wrapper composing the FROZEN `DocSendBar`. Pre-computes the rule-based narrative line via `describeReport` from REAL rows (when a `QuerySpec` is supplied, or one is inferred from the first row's fields); exposes it on `sourceRecord.narrative` so it flows through the standard `composeFromDocument` merge path. NO `printPayload` is forwarded — DocSendBar's own honest "no PDF payload" toast handles the PDF button.

2. **TableChartToggle.tsx** (additive) — derives title via `chartConfig.title || document.title || 'Report'`, mounts `<ReportSendHeader title rows={chartData} />` in the tabs row, default ON. `hideSend?: boolean` escape hatch (default `false`) added; no current page sets it. **ZERO call-site edits across the 106 wrapped pages — the floor arrives via the shared component.**

3. **10 manual mounts** (additive header lines, real rows already in state):

| # | File | Approx line | Rows passed |
|---|------|------------:|-------------|
| 1 | `src/features/command-center/pages/PromoterCockpitPage.tsx` | 139 | active section rows (component-local) |
| 2 | `src/features/command-center/pages/CrossCardDayBookPage.tsx` | 96  | `entries` (aggregator output) |
| 3 | `src/pages/erp/receivx/cockpits/CreditXRayPage.tsx` | 96  | `arRows` |
| 4 | `src/pages/erp/procure-hub/cockpits/SpendFunnelPage.tsx` | 106 | `poRows` |
| 5 | `src/pages/erp/production/cockpits/OEEBoardPage.tsx` | 112 | `lineOEE` |
| 6 | `src/pages/erp/qualicheck/cockpits/COQPage.tsx` | 101 | `ncrRows` |
| 7 | `src/pages/erp/projx/cockpits/EVMPage.tsx` | 94  | `projectLegs` |
| 8 | `src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx` | 656 | `recentRuns` |
| 9 | `src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx` | 145 | `appointmentsFy` |
| 10 | `src/components/operix-core/report-framework/ReportBuilder.tsx` (preview header) | 397 | `result.rows` + `spec` |

4. **`sprint-history.ts`** — flipped RPT-12c row `headSha` `TBD_AT_BANK → bbc6ada`; appended `W1C1` row (`code:'T-W1C1-DocSendBar-Reports'`, `predecessorSha:'bbc6ada'`, `headSha:'TBD_AT_BANK'`, `loc:80`, `newSiblings:[]`, `provenance:'PENDING_BACKFILL'`).

## Derived-title rule

```
chartConfig.title  →  document.title  →  'Report'
```

## Honest channels (preserved · zero-edit)

- Email user-class → real `mailto:` + `.eml` download (DocSendBar)
- Email department/system → queued for Wave-2 (PULSE) + `.eml` fallback
- WhatsApp user-class → real `wa.me` deep link (DocSendBar)
- WhatsApp department/system → queued for Wave-2 (BSP)
- PDF absent → DocSendBar's existing `toast.info('No PDF payload available')`
- **Never** a fake send. **Never** synthesised numbers.

## ZERO new SIBLINGs · ZERO engine edits

`DocSendBar.tsx`, `communication-engine.ts`, `whatsapp-channel-engine.ts`, `export-csv.ts`, `narrative.ts`, `report-builder-engine.ts`, `report-definitions.ts`, `src/test/setup.ts` — all 0-DIFF.

## Tests (4 files · 18 assertions)

```
src/__tests__/w1c-1/report-send-header.test.tsx       3 ✓
src/__tests__/w1c-1/table-chart-toggle-send.test.tsx  3 ✓
src/__tests__/w1c-1/w1c-docsend-floor.test.ts         2 ✓ (structural floor)
src/__tests__/w1c-1/mounts.test.ts                   10 ✓ (10 manual mounts)
                                                     ─────
                                                     18 ✓
```

## Sample-page regression (3 wrapped pages)

```
src/__tests__/rpt-9d/report-builder-mounts-sales.test.tsx   18 ✓
src/__tests__/rpt-12b/oee-dashboard-migration.test.ts        5 ✓
src/__tests__/rpt-12c/sla-performance-migration.test.ts      5 ✓
                                                            ──────
                                                            28 ✓
```

Zero regression. The TableChartToggle layout change is additive only (extra header row item beside the Table/Chart tabs).

## Triple Gate

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · 0 errors)

$ npx eslint <touched-files> --max-warnings 0
(no output · 0 errors / 0 warnings)

$ npx vitest run src/__tests__/w1c-1
Test Files  4 passed (4)
     Tests  18 passed (18)
```

## Closing

The DocSendBar floor canon now covers the entire reporting layer — ~106 wrapped pages via the single `TableChartToggle` change, plus 10 hand-mounted cockpit/builder/daybook surfaces. Wave-1 Close Arc · sprint 1 complete.
