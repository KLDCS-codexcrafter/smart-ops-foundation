# Sprint 122 · T-Phase-7.D.1.3 · Close Summary

## ⭐ Arc D.1 · Scenario Management Pt 1 (THE MOAT)

**Sprint tag:** `T-Phase-7.D.1.3`
**Predecessor HEAD:** `8e5e578c0fd775924cd5acc2cd7ea5a7432585da` (S121 banked A · post-T1)
**New HEAD:** `TBD_AT_BANK` (backfilled at S123 Block 1)
**LOC actual:** ~1,400 (ASK-zone)
**Streak target:** 45 ⭐ · ESLint STRICT 0/0 (73-sprint streak)
**Ratified DPs applied:** DP-D1-1 · DP-D1-2 (FR-44) · **DP-D1-3 (⭐ scenario moat · consolidated axis)** · DP-D1-6 · DP-D1-7 · DP-D1-8

## Deliverables

| Block | Deliverable | Status |
|:--:|---|:--:|
| 0 | Pre-flight (HEAD + engine surfaces + Block-2 targets) | ✅ |
| 1 | S121 SHA backfill (TBD_AT_BANK → `8e5e578c…`) + S121-T1 stale-assertion fix | ✅ |
| 2 | FP&A-landing fixes — (a) FpaPlanningPage wrapped in ERP Shell; (b) CC hashchange listener | ✅ |
| 3 | NEW SIBLID `scenario-modeling-engine` (best/base/worst · single + multi-entity consolidated) 🏆 | ✅ |
| 4 | +1 audit type `scenario_run` (mca-roc) | ✅ |
| 5 | NEW Page #49 `ScenarioModelingPage` (sidebar + CC case + `requiredCards:['fpa-planning']`) | ✅ |
| 6 | sibling-register 190→191 · sprint-history S122 · test pack (≥20 it · lean-behavioral) | ✅ |

## §L · Design-decision flags

### ⭐ The scenario moat (DP-D1-3)

`scenario-modeling-engine.runScenario({scope:'consolidated', ...})` ORCHESTRATES four
Phase-6 engines in sequence to produce a consolidated scenario P&L across entities +
currencies:

1. `fx-translation-engine.consolidateWithTranslation({fy})` — multi-currency pass.
2. `group-consolidation-engine.consolidate({fy})` — TB rollup using the 3 Ind AS methods.
3. `group-eliminations-engine.generateEliminations({fy})` — E1–E7 eliminations.
4. `group-consolidation-engine.buildConsolidatedPnL({fy})` — consolidated P&L.

The driver-perturbation layer then applies `revenue_pct` / `cost_pct` / `volume_pct` per
case (best/base/worst) using decimal-helpers (`dAdd` / `dSub` / `dMul` / `round2`).

No domestic competitor structurally matches this multi-entity + multi-currency +
elimination-aware scenario surface (Competitive Strategy v1 §3). Tests in §C spy on
each of the four engine calls to assert the orchestration (not just the math).

### FR-44 WALL · vs `fx-what-if-engine`

`fx-what-if-engine` is the **single-realisation** FX scenario simulator
(`computeFXScenarioForRealisation`) — distinct surface, distinct purpose. The S122
engine MUST NOT import or duplicate it. Asserted via test §G (no string match in source).
`fx-what-if-engine` stays 0-DIFF.

### Block 2 FP&A-landing fixes (carried from S116/S120)

- **Fix A — FpaPlanningPage shell-wrap:** the `/erp/fpa-planning` landing rendered
  bare since S116 (no header, no sidebar). Wrapped in `Shell` with
  `commandCenterShellConfig` so the landing tiles render inside the ERP shell,
  consistent with Comply360 / ProcureHub / etc.
- **Fix B — CC hashchange listener:** the mount-time `useState` initializer at
  `CommandCenterPage` line ~329 fires ONCE. When the user clicked the "Open AOP
  Workbench" tile from the landing page while CC was already mounted, the URL
  changed to `/erp/command-center#fincore-aop-strategic-plan` but `activeModule`
  stayed on `'overview'`. A new `useEffect` adds a `hashchange` listener that
  re-reads `window.location.hash` and calls `setActiveModule` when the hash is in
  the existing allow-list (now extended with `fpa-planning-scenario`). The
  mount-initializer (~line 329) and the sidebar click-handler (~line 564) are
  UNCHANGED (additive fix only).

### Lean-behavioral test posture (Phase 7 standard)

- ≥20 discrete `it()` (§N floor).
- The S122 entry's own `headSha` assertion uses
  `expect(['TBD_AT_BANK', '8e5e578c…']).toContain(s122!.headSha)` — **never**
  `toBe('TBD_AT_BANK')`. This is the explicit corrective for the S121 T1 root
  cause (that assertion goes stale next sprint).
- S121 test stale-assertion fixed in lock-step with the Block-1 backfill (same
  `toContain` pattern).
- Scope-wall via `toBeUndefined` on the engine surface (time-robust — future
  S123/S124-125 functions can be added without rewriting tests).
- No `existsSync`-future tombstones. No "no S123 entry" absence checks. No exact
  `toBe(N)` counts (uses `toBeGreaterThanOrEqual`).

### Standing guardrails

1. S122 `headSha` = `'TBD_AT_BANK'` (never a Pass-A SHA). ✅
2. No S123 entry pre-created. ✅
3. ComplianceModule UNTOUCHED. ✅
4. `fx-what-if-engine` UNTOUCHED. ✅
5. `comply360-tier2-extensions-engine` greps to exactly 1. ✅

## §H · Zero-touch boundaries

**0-DIFF:** group-consolidation-engine · fx-translation-engine · group-eliminations-engine ·
fpa-forecasting-engine (S121) · fpa-budgeting-engine · fx-what-if-engine · ComplianceModule ·
all Phase 0–6 + D.0 engines · all prior sprint-history except the S121 SHA backfill (Block 1)
and the appended S122 entry · comply360-tier2 stays 1.

**Allowed additive:** `src/types/audit-trail.ts` (+1 `scenario_run`) · 1 new engine ·
1 new page + wiring · FpaPlanningPage shell-wrap + CC hash-listener (Block 2) ·
sibling-register (+1) · sprint-history (S122 append) · test file · this close-summary.

## Files

**Created**
- `src/lib/scenario-modeling-engine.ts`
- `src/features/scenario-modeling/ScenarioModelingPage.tsx`
- `src/test/sprint-122/scenario-modeling.test.ts`
- `audit_workspace/T-Phase-7.D.1.3/Z_close_evidence/close_summary.md`

**Edited (allowed scope)**
- `src/lib/_institutional/sprint-history.ts` (S121 SHA backfill + S122 append)
- `src/lib/_institutional/sibling-register.ts` (190 → 191)
- `src/types/audit-trail.ts` (+`scenario_run`)
- `src/apps/erp/configs/command-center-sidebar-config.ts` (Page #49 item)
- `src/features/command-center/pages/CommandCenterPage.tsx` (import + module type + hash allow-list + case + label + hashchange listener)
- `src/pages/erp/fpa-planning/FpaPlanningPage.tsx` (Shell wrap)
- `src/test/sprint-121/fpa-forecasting.test.ts` (S121 T1 pattern · stale headSha → toContain)

## Triple Gate
- TSC `tsconfig.app.json --noEmit`: ✅ 0
- ESLint `npx eslint . --max-warnings 0`: ✅ 0/0
- Vitest: ✅ all pass (sprint-122 + sprint-121 + _meta)
- Build: ✅ PASS
