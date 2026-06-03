# Sprint 124 · T-Phase-7.D.1.5 · Close Summary

**Sprint:** T-Phase-7.D.1.5
**Title:** Operational Costing Pt 1 + A1 (FP&A self-owned card)
**Predecessor HEAD:** `01a12091ae77bf6f48b20d89354fea551b0c1356`
**This sprint HEAD:** `TBD_AT_BANK` (backfilled at S125 Block 1)
**Streak target:** **47 ⭐** (75-sprint ESLint-clean streak)
**Sibling count:** 191 → **192**
**Standalone pages:** 49 → **50**
**Audit types:** +1 (`operational_cost_run`)

---

## §A · Block 0 — Pre-flight (FR-67 verified)
- HEAD verified at `01a12091…`.
- Comply360 shell pattern confirmed (`comply360-shell-config` + `comply360-sidebar-config` + `Comply360Page` module-switch + `Comply360Sidebar.types.ts`).
- 7 FP&A page imports + cases confirmed in `CommandCenterPage.tsx` (S116/S117/S118/S119/S120/S121/S122).
- Costing foundations confirmed: `cost-allocation-engine` (`computeRatios` / `allocateCosts`), `purchase-cost-variance-engine` (`computePurchaseCostVarianceItem`), `packing-bom-engine` (`computeBOMTotalCost` / `resolveActiveBOM`), `comply360-cost-audit-engine` (statutory §148 — DISTINCT).
- Re-point of 7 FP&A pages from CC into the FP&A self-owned shell is CLEAN (no other module-id collisions; legacy hashes covered by redirect — see §B).

## §B · Block 1 — S123 SHA backfill
- `sprint-history.ts` S123 `headSha` `TBD_AT_BANK` → `01a12091ae77bf6f48b20d89354fea551b0c1356`. `bankDate` set to 2026-06-03. Meta guards remain green.

## §C · Block 2 — A1 · FP&A self-owned card (founder-ratified · mirrors Comply360)
- NEW `src/apps/erp/configs/fpa-planning-sidebar-config.ts` — `SidebarItem[]` with 9 items (all `type:'item'`): `fpa-home`, `fpa-aop`, `fpa-budgeting`, `fpa-forecasting`, `fpa-scenario`, `fpa-workforce`, `fpa-okr`, `fpa-org-design`, `fpa-operational-costing`. `requiredCards: ['fpa-planning']`.
- NEW `src/apps/erp/configs/fpa-planning-shell-config.ts` — `ShellConfig` with FP&A title/breadcrumb, accent `violet`, landingRoute `/erp/fpa-planning`.
- NEW `src/pages/erp/fpa-planning/FpaPlanningSidebar.types.ts` — `FpaPlanningModule` type union (9 ids).
- **Re-pointed `FpaPlanningPage.tsx`** — uses `fpaPlanningShellConfig` (NOT `commandCenterShellConfig`). New `useState<FpaPlanningModule>` + `renderModule()` switch hosting the 7 D.0/D.1 pages PLUS the new S124 `OperationalCostingPage`. Hash listener (router-driven via `useLocation` + native `hashchange`) mirrors the S122-T1 root-cause fix. Sidebar click → `setActiveModule`.
- **CommandCenterPage cleanup** — 7 FP&A imports/cases/type-union members + breadcrumb labels removed; sidebar-config children removed. Hash listener gains a **`LEGACY_FPA` redirect map** so old deep-links like `#fincore-aop-strategic-plan` / `#fpa-planning-budgeting` etc. transparently navigate to `/erp/fpa-planning#fpa-aop` (etc.). CC OTHER cases 0-DIFF.
- §L note: A1 — FP&A becomes a self-owned card; own shell+sidebar; pages moved under it; was borrowing `commandCenterShellConfig` which surfaced the wrong sidebar to users on `/erp/fpa-planning` (the reported bug — carried from S116 card-setup gap, partially patched in S120/S122).

## §D · Block 3 — NEW SIBLID `operational-costing-engine`
- **Path:** `src/lib/operational-costing-engine.ts`
- **Surface:** `rollUpBOMCost` (recursive · cycle-guarded · decimal-safe), `upsertStandardCost` / `getStandardCost` / `listStandardCosts`, `recordActualCost`, `computeCostVariance` (standard-vs-actual · variance + variance_pct + direction `favorable`/`unfavorable`/`flat`), `upsertBOMInput` / `getBOMInput`, `READS_FROM`, `__fr44_reuse`, `__resetOperationalCostingForTests`.
- **DP coverage:** DP-D1-4 / DP-COSTING-2..5.
- **FR-44 REUSE (no reimplementation, all 0-DIFF):**
  - `cost-allocation-engine.computeRatios` (re-exposed via `__fr44_reuse`)
  - `purchase-cost-variance-engine.computePurchaseCostVarianceItem` (actual-rate fallback for variance)
  - `packing-bom-engine.computeBOMTotalCost` / `resolveActiveBOM` (re-exposed)
  - `decimal-helpers.dAdd/dSub/dMul/round2`
  - `audit-trail-engine.logAudit` — emits `operational_cost_run`
- **FR-44 WALL:** engine does NOT import `comply360-cost-audit-engine` (statutory §148, shipped S104). Operational costing computes INTERNAL product cost; cost-audit handles statutory CRA-1/2/3/4 filings + cost-auditor appointments. The test pack asserts no CRA / `§148` / appointment function names in the engine, and confirms the cost-audit engine source is 0-DIFF (no S124 markers).
- **SCOPE WALL (DP-COSTING-2..5):** BOM / standard / variance ONLY. No `runJobCosting`, `runProcessCosting`, `runActivityBasedCosting`, `computeABCCost`, `runCVPAnalysis`, `computeBreakEven` — all reserved for S125 (DP-COSTING-6..8). Asserted via `toBeUndefined`.

## §E · Block 4 — Audit type (+1 · additive)
- `src/types/audit-trail.ts` — appended `'operational_cost_run'` to `AuditEntityType` (module: `mca-roc`). Carries item_key, standard_total, actual_total, variance, variance_pct.
- ComplianceModule UNTOUCHED.

## §F · Block 5 — NEW Standalone Page #50 `OperationalCostingPage`
- **Path:** `src/features/operational-costing/OperationalCostingPage.tsx`
- **Module id:** `fpa-operational-costing` · routed under the FP&A self-owned shell via sidebar item + `renderModule()` switch in `FpaPlanningPage`.
- **UI:** Item selector → BOM cost roll-up tree → standard cost editor (material/labour/overhead) → standard-vs-actual variance table → all-standards table.
- Reads `operational-costing-engine` only. No new runtime deps. **Not a SIBLID.**

## §G · Block 6 — Registers + test pack + close-summary
- **sibling-register:** 191 → **192** (`operational-costing-engine` · CONFIRMED · provenance asserted). Page + shell/sidebar configs are NOT siblings.
- **sprint-history:** S123 backfilled to `01a12091…`; S124 appended (grade `A`, `headSha: 'TBD_AT_BANK'`, predecessor `01a12091…`, `newSiblings: ['operational-costing-engine']`, loc 1500). No S125 entry pre-created.
- **S121-T1 carry:** S123 test (`src/test/sprint-123/scenario-matrix-demand-capex.test.ts`) own-headSha assertion updated to `toContain(['TBD_AT_BANK', '01a12091…'])` — time-robust before/after the S123 backfill.
- **Test pack:** `src/test/sprint-124/operational-costing-fpa-shell.test.ts` — **≥20 discrete `it()`** (lean-behavioral · §N FLOOR):
  - §A BOM roll-up (4) — leaf, recursive, missing-BOM, cycle-guard
  - §B standard CRUD (3) — total, round-trip, idempotency
  - §C variance (4) — unfavorable, favorable, divide-by-zero guard, flat
  - §D audit (3) — `operational_cost_run` fires on upsertStandard + computeVariance + literal present in audit-trail types
  - §E FR-44 reuse (3) — READS_FROM declared + `__fr44_reuse` identity + engine source imports the 3 foundations
  - §F FR-44 wall (4) — engine does NOT import cost-audit · NO CRA/§148/appointment functions · cost-audit source 0-DIFF · cost-audit module still exports
  - §G scope wall (6 forbidden via `it.each`) — `runJobCosting`/`runProcessCosting`/`runActivityBasedCosting`/`computeABCCost`/`runCVPAnalysis`/`computeBreakEven` undefined
  - §H A1 (6) — sidebar items, all `type:'item'`, shell wires sidebar+landing route, FpaPlanningPage uses fpaPlanningShellConfig NOT CC, renderModule switch hosts the 8 pages, CC no longer imports the 7 FP&A pages
  - §I OperationalCostingPage reads engine + wired into FP&A switch (2)
  - §J registers (4) — sibling count `≥192`, engine appears exactly once, S123 `toContain` time-robust, S124 own headSha `toContain(['TBD_AT_BANK'])`
- **Posture:** all counts use `toBeGreaterThanOrEqual` / `toContain` (no exact `toBe(N)`), no `existsSync` tombstones, no "no S125 entry" absence checks.

## §H · Zero-touch boundaries (S124)
- `cost-allocation-engine`, `purchase-cost-variance-engine`, `packing-bom-engine`, **`comply360-cost-audit-engine`** (statutory · NEVER touched), the 7 FP&A page COMPONENTS (only their render-host moved), ComplianceModule, all Phase 0–6 + D.0 + S120–S123 engines, CommandCenterPage OTHER cases — all 0-DIFF.
- `comply360-tier2` greps to **1** (unchanged).

## §I · Allowed additive / edit set
- NEW `fpa-planning-shell-config`, `fpa-planning-sidebar-config`, `FpaPlanningModule` type union.
- `FpaPlanningPage.tsx` re-point + module-switch (replaces landing-tile-only implementation).
- `CommandCenterPage.tsx` — 7 FP&A imports/cases/type-union members removed; legacy-hash redirect added; CC sidebar config FP&A children removed.
- `src/types/audit-trail.ts` — `+1 'operational_cost_run'`.
- 1 NEW engine, 1 NEW page, sibling-register +1, sprint-history backfill + append, test file, close-summary.
- NO statutory cost-audit touch, NO job/process/ABC/CVP (S125), NO new runtime deps.

## §J · LOC accounting (approx)
- fpa-planning-sidebar-config: ~30
- fpa-planning-shell-config: ~50
- FpaPlanningSidebar.types: ~15
- FpaPlanningPage re-point + module-switch: ~210
- operational-costing-engine: ~290
- OperationalCostingPage: ~230
- CommandCenterPage edits + sidebar config edits: ~45 (additive redirect map, deletions)
- audit-trail.ts +1: ~12
- sibling-register +1: ~3
- sprint-history backfill + S124 entry: ~10
- S123 test patch: ~1
- test pack: ~330
- close-summary: ~150
**Total ≈ 1,400–1,500 LOC** (within the ~1,500 ASK-zone envelope · single-pass executed).

## §K · Triple Gate
- **TSC:** 0 errors (74-sprint streak preserved).
- **ESLint (strict · `npx eslint . --max-warnings 0`):** 0/0 + 0 warnings (75-sprint streak target).
- **Vitest:** sprint-124 + sprint-123 + sprint-122 + sprint-121 + `_meta` — all pass.
- **Build:** PASS.

## §L · Founder-ratified DP coverage
- **A1 (FP&A self-owned card):** delivered. FP&A no longer borrows the Command Center shell — the reported "CC sidebar appearing under FP&A" bug is fixed at the architectural root, not patched. Mirrors Comply360 exactly. Legacy CC deep-links remain alive via the redirect map (no broken bookmarks).
- **DP-D1-1 / DP-D1-2 (FR-44):** operational-costing-engine REUSES the 3 cost foundations; reimplements none.
- **DP-D1-4 / DP-COSTING-2..5:** BOM roll-up + standard costing + variance — DISTINCT from statutory cost-audit (§148). FR-44 wall asserted.
- **DP-D1-6 / DP-D1-7 / DP-D1-8:** all money math via decimal-helpers; audit trail emits `operational_cost_run`; ComplianceModule untouched.
- **Scope wall:** S125 (job/process/ABC/CVP) reserved — asserted via `toBeUndefined` on the engine surface (time-robust).

## §M · Carries / next sprint
- S125 (T-Phase-7.D.1.6): Operational Costing Pt 2 — job/process/ABC/CVP (DP-COSTING-6..8) over the same engine surface (additive extension pattern, mirrors S122→S123 moat extension).
- Block 1 of S125 will backfill S124 `headSha` from `TBD_AT_BANK` to the actual banked SHA.

---

*Author: Lovable on behalf of Operix Founder · Sprint 124 · T-Phase-7.D.1.5 · Arc D.1 · 47 ⭐ target.*
