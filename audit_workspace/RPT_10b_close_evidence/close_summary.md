# RPT-10b · Ops Cockpits + Comply360 Audit Upgrades — Close Summary

**Sprint:** `T-RPT10b-Ops-Cockpits-Audit-Upgrades` (closes RPT-10 · last new-build sprint of the Reporting arc)
**Predecessor HEAD:** `9b98b3c` ("Searched 10a scope for bugs") · 156 ⭐ · Tier-L · Phase D
**Self HEAD:** `TBD_AT_BANK` (`predecessorSha: 9b98b3c`)

## Blocks delivered

### Block 1 · OEE Board (Production)
- **New page:** `src/pages/erp/production/cockpits/OEEBoardPage.tsx` — consumes `computeOEE` from `src/lib/oee-engine.ts` using the **SAME wiring** as the banked `OEEDashboard` (`useFactories` + `useMachines` + `useJobCards` + `useDailyWorkRegister` → `buildOEESourceData` → `computeOEE`).
- **Legs rendered:** per-line OEE column chart · A/P/Q stacked-column · per-line RAG tiles via `resolveRag` against `prod-line-oee` thresholds (RPT-6a seed · higher-good · amber 75 / red 60) · integrity badge via `signReport` · honest empty-state.
- **0-DIFF:** `src/pages/erp/production/reports/OEEDashboard.tsx` untouched; `src/lib/oee-engine.ts` consumed only.
- **Wiring:** `ProductionSidebar.types.ts` (+1 union member `prod-oee-board`); `production-sidebar-config.ts` (+1 item line 181); `ProductionPage.tsx` (+1 import line 70, +1 switch case line 148).

### Block 2 · COQ — Cost of Quality (QualiCheck)
- **New page:** `src/pages/erp/qualicheck/cockpits/COQPage.tsx` — reads `qualicheck.inspections` + `qualicheck.ncr` only.
- **Legs rendered:** rejection-volume-by-source (NCR `qty_affected`) · NCR status × severity stacked-column · pass-rate RAG tile **only** when rows carry pass/fail/closed/rejected statuses.
- **Declared absent (not faked):** Prevention/Appraisal/Failure cost-category split — DSC rows carry no monetary cost-category fields; surfaced via `coq-paf-declared-absent`.
- **Wiring:** `QualiCheckSidebar.types.ts` (+1 union member `qc-coq`); `qualicheck-sidebar-config.ts` (+1 item line 405); `QualiCheckPage.tsx` (+1 import line 64, +1 switch case line 154).

### Block 3 · EVM — Earned Value (ProjX)
- **New page:** `src/pages/erp/projx/cockpits/EVMPage.tsx` — reads `projx.projects` + `projx.financials` only.
- **Legs rendered:** PV (`current_contract_value`) · EV (`billed_to_date`) · SPI = EV/PV (computed when PV > 0) · PV/EV column chart per project · cumulative milestone S-curve.
- **Declared absent (not faked):** AC (Actual Cost) — no AC-bearing field on either DSC source today; surfaced via `evm-absent-declaration`. CPI = EV/AC therefore not computable; tile DECLARED absent.
- **KPI seeds:** `px-spi` (rendered) + `px-cpi` (gated tile rendered with explicit "DECLARED absent" copy) — both seeded.
- **Wiring:** `ProjXSidebar.types.ts` (+1 union member `projx-evm`); `ProjXSidebar.groups.ts` (+1 mapping); `ProjXSidebar.tsx` (+1 LIVE_MODULES, +1 RPT_ITEMS entry); `ProjXPage.tsx` (+1 import, +1 switch case).

### Block 4 · Comply360 Audit upgrades (additive · 0 recharts excluded)
**Pre-flight grep:** both pages report **`0` recharts imports** → both upgraded, none excluded.

- **`AuditFrameworkDashboardPage.tsx`** (904 → 970 LOC) — additive `rpt10b-audit-fw-section` injected immediately after `</header>`; existing 904-line layout PRESERVED. Composes `ScorecardTile` (overall Audit-Ready score · `cmp-audit-fw` RAG) + `ScorecardTile` (sub-scores tracked) + `signReport` integrity badge (`integrity-badge-auditfw`) + `ReportChart` over the already-computed `score.sub_scores` breakdown.
- **`CostAuditDashboardPage.tsx`** (445 → 452 LOC) — already carried the full RPT-2a recipe from a prior sprint (`rpt2ai-costaudit-section`, `integrity-badge-costaudit`). Additive `cmp-cost-audit` "Cost-audit posture" `ScorecardTile` added so the new seed is **rendered, not orphan**; grid widened 3→4 cols. Existing layout PRESERVED.

**Before/after element counts:**
| Page | Before | After |
|---|---|---|
| AuditFramework | 0 ScorecardTile, 0 ReportChart, 0 signReport | 2 ScorecardTile, 1 ReportChart, 1 signReport, 1 integrity badge |
| CostAudit | 2 ScorecardTile, 1 ReportChart, 1 signReport | 3 ScorecardTile (+ cmp-cost-audit tile), 1 ReportChart, 1 signReport |

### Block 5 · Institutional + tests + close
- **KPI seeds (5, idempotent):** `qc-coq` · `px-spi` · `px-cpi` · `cmp-audit-fw` · `cmp-cost-audit` (appended to `kpi-registry.ts`).
- **`sprint-history.ts`:** RPT-10a `headSha` backfilled `TBD_AT_BANK` → `9b98b3c` (provenance CONFIRMED). RPT-10b self-seeded with `predecessorSha: '9b98b3c'`, `provenance: 'PENDING_BACKFILL'`, **`newSiblings: []`**.
- **Tests (5 files, ≥30 assertions total):**
  - `src/__tests__/rpt-10b/oee-board.test.tsx` — 7 it()s (consumes computeOEE asserted)
  - `src/__tests__/rpt-10b/coq.test.tsx` — 7 it()s
  - `src/__tests__/rpt-10b/evm.test.tsx` — 8 it()s
  - `src/__tests__/rpt-10b/audit-framework-upgrade.test.tsx` — 6 it()s
  - `src/__tests__/rpt-10b/cost-audit-upgrade.test.tsx` — 5 it()s

## Walls held (0-DIFF)
- `src/lib/oee-engine.ts` · `src/lib/production-engine.ts` — CONSUMED only.
- `src/pages/erp/production/reports/OEEDashboard.tsx` — legacy 0-DIFF.
- All other Comply360 pages — 0-DIFF.
- `ReportBuilder.tsx` · `report-builder-engine.ts` · `report-definitions.ts` — FROZEN.
- `data-sources.ts` — 0-DIFF (no new sources; RPT-10a's seeds suffice).
- `src/test/setup.ts` — 0-DIFF.
- All banked pages — 0-DIFF.

## ZERO new SIBLINGs
Cockpits compose `oee-engine` (existing) + DSC catalog (existing) + frozen primitives (existing). KPI seeds are pure data. No new orchestrators, no new engines, no new feature toggles.

## Verification (pre-write)
```bash
$ grep -rc "from 'recharts'" \
    src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx \
    src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx
0
0
$ grep -n "export function computeOEE" src/lib/oee-engine.ts
67:export function computeOEE(source: OEESourceData, mode: OEEFormulaMode, template?: ManufacturingTemplate): OEEResult {
```

## Triple Gate
- **TSC** — 0 errors (`npx tsc -p tsconfig.app.json --noEmit`).
- **ESLint** — 0 / 0 (`npx eslint . --max-warnings 0`).
- **Vitest** — zero failures across the 5 new RPT-10b tests + the broader suite.
- **Build** — PASS (7 GB heap).

## New HEAD
`TBD_AT_BANK` — to be backfilled by the next sprint preamble.
