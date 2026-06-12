# RPT-12a · BUILDER/UX CLOSE · Close Summary

**Predecessor HEAD:** `415c52a`
**New HEAD:** `TBD_AT_BANK`
**Sprint type:** Lean · 6 small blocks · arc-close 1 of 3
**SIBLINGs added:** 0

---

## Block 1 · PivotMatrix UI

- `src/components/operix-core/report-framework/PivotMatrix.tsx` (NEW) — rows×columns matrix with row/column/grand totals.
- `src/components/operix-core/report-framework/pivot-model.ts` (NEW) — `buildPivotModel()` pure helper split out for fast-refresh hygiene.
- ReportBuilder preview now renders 3 tabs (Table / Chart / Pivot) when `spec.groupBy.length === 2`.
- Engine 0-DIFF — `report-builder-engine.ts` already groups multi-dim.

## Block 2 · Shared CSV Export

- `src/lib/report-framework/export-csv.ts` (NEW · React-free) — `toCsv(rows, columns?)` + `downloadCsv(filename, rows)`. RFC 4180 quoting. Blob link is the only DOM API touched.
- Export buttons added to:
  - `ReportBuilder` preview header (`data-testid="rb-csv-export"`)
  - `CreditXRayPage` (`credit-xray-csv`)
  - `SpendFunnelPage` (`spend-funnel-csv`)
  - `OEEBoardPage` (`oee-board-csv`)
  - `COQPage` (`coq-csv`)
  - `EVMPage` (`evm-csv`)
  - `PromoterCockpitPage` (`promoter-csv`)
- All buttons act on the **real rows already in component state** — no per-page CSV logic rebuilt.

## Block 3 · Global Fuzzy Report-Finder

- `src/lib/report-framework/report-search-entries.ts` (NEW) — `registerReportSearchEntries()` pushes one `CommandEntry` per (a) registered DSC source, (b) seeded KPI, (c) saved report definition into `BASE_COMMANDS`.
- `main.tsx` calls the registration on app boot.
- `command-palette-registry.ts` itself is **0-DIFF** — integration is via its exported `CommandEntry` type + its `BASE_COMMANDS` array. Existing `matchCommands` fuzzy matcher is consumed unchanged.
- Idempotent (owned entries prefix `rpt12a-`, removed before re-register).

## Block 4 · NL Intent → Builder Prefill

- `src/lib/report-framework/intent-match.ts` (NEW · React-free) — `matchIntent(text)` tokenizes text and fuzzy-scores against source labels + field labels + a tiny verb map (`sum/count/avg/min/max/top`). **No LLM. No network.**
- ReportBuilder gains a "Describe the report…" input. On match the pickers are pre-filled (user confirms — never auto-runs). On no match: honest `"couldn't match that — pick a source below"` message.

## Block 5 · AI-Narrative Slot

- `src/lib/report-framework/narrative.ts` (NEW · React-free) — `NarrativeProvider` interface + `registerNarrativeProvider()` + a default rule-based provider.
- `computeNarrativeAggregates(rows, spec)` extracts: groupCount, total, topLabel, topValue, topPctOfTotal, belowThresholdCount, thresholdValue.
- **Every number in the sentence comes from the rows.** No free text. LLM provider plugs in at Wave-2.
- Narrative line rendered in ReportBuilder preview (`rb-narrative`) and PromoterCockpit cash-AR section (`promoter-narrative`).

## Block 6 · Forward-Seed Wiring + Institutional + Close

### 10 KPI dataSource pointers — all resolve via `getSource`

| KPI id | dataSource | resolves? |
|---|---|---|
| `xc-cash-position` | `reg:fc-ledger` (FinCore ledger register — cash-bearing) | ✅ |
| `xc-promoter` | `comply360.aggregate.compliance-pct` | ✅ |
| `px-cashflow` | `projx.financials` | ✅ |
| `px-cpi` | `projx.projects` | ✅ |
| `db-scheme-eff` | `distributor.orders` | ✅ |
| `db-disputes` | `distributor.orders` | ✅ |
| `cu-loyalty` | `customer.insights` | ✅ |
| `sd-customer-pnl` | `servicedesk.amc` | ✅ |
| `sd-promise-variance` | `servicedesk.tickets` | ✅ |
| `dp-transporter` | `dispatch.shipments` | ✅ |

**`xc-cash-position` resolution:** points to the existing `reg:fc-ledger` register source (FinCore ledger entries — the canonical cash-bearing register in the codebase). No declared absence; the pointer is real.

`kpi-registry.ts` had no pointer drift — no edits required there beyond verification (assertion live in `kpi-seeds-resolve.test.ts`).

### Institutional

- `sprint-history.ts`: RPT-10b `headSha` backfilled to `415c52a`; RPT-12a self-seeded with `predecessorSha: '415c52a'`. ZERO new SIBLINGs.

### Tests (37 new assertions across 6 files)

| File | Assertions |
|---|---|
| `pivot-matrix.test.tsx` | 6 |
| `export-csv.test.ts` | 6 |
| `report-search-entries.test.ts` | 4 |
| `intent-match.test.ts` | 5 |
| `narrative.test.ts` | 5 |
| `kpi-seeds-resolve.test.ts` | 11 |
| **Total** | **37** |

### Triple Gate

```
$ npx tsc -p tsconfig.app.json --noEmit
(0 errors)

$ npx eslint <touched-paths> --max-warnings 0
(0 errors, 0 warnings)

$ npx vitest run src/__tests__/rpt-12a/ src/lib/report-framework/__tests__/ src/components/operix-core/report-framework/__tests__/
Test Files  47 passed (47)
Tests       290 passed (290)
```

---

## Walls held (0-DIFF)

- `src/lib/report-framework/report-builder-engine.ts`
- `src/lib/report-framework/report-definitions.ts`
- `src/lib/report-framework/data-sources.ts`
- `src/lib/command-palette-registry.ts` (integration via its exported API/types only)
- `src/test/setup.ts`
- All 34 banked ledger pages (12b/12c migration)
- All RPT-9 mounted cards
- Legacy OEEDashboard, Comply360 audit dashboards

## Files touched

**NEW (8):**
- `src/components/operix-core/report-framework/PivotMatrix.tsx`
- `src/components/operix-core/report-framework/pivot-model.ts`
- `src/lib/report-framework/export-csv.ts`
- `src/lib/report-framework/report-search-entries.ts`
- `src/lib/report-framework/intent-match.ts`
- `src/lib/report-framework/narrative.ts`
- `src/__tests__/rpt-12a/*.ts(x)` (6 test files)
- `audit_workspace/RPT_12a_close_evidence/close_summary.md` (this file)

**EDITED:**
- `src/components/operix-core/report-framework/ReportBuilder.tsx` (pivot tab + intent input + narrative line + CSV button)
- `src/components/operix-core/report-framework/index.ts` (barrel)
- `src/lib/report-framework/index.ts` (barrel)
- `src/main.tsx` (palette registration init)
- `src/lib/_institutional/sprint-history.ts` (backfill + self-seed)
- 6 cockpit pages (Export CSV button)
