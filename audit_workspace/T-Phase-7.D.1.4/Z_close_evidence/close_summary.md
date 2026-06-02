# Sprint 123 · T-Phase-7.D.1.4 · ⭐ Arc D.1 · Scenario Management Pt 2 (MOAT CAPSTONE) · Close Summary

**Predecessor HEAD:** `fd40a57c146605056dd70090097f39d82ecf8844` (S122 banked · A post-T1)
**Streak target:** 46 ⭐ · ESLint STRICT 0/0 (74-sprint streak)
**LOC:** ~1,300 (engine ext ~310 · page ext ~280 · tests ~340 · history backfill+S123 ~10)
**Posture:** LEAN-BEHAVIORAL · 34 new discrete `it()` (≥20 floor)

## Blocks executed
- **Block 0** · Pre-flight green at HEAD `fd40a57c…`; engine surfaces confirmed (scenario-modeling-engine `runScenario`/`ScenarioDriver`/`ScenarioResult`/`READS_FROM`; fx-translation `FXRateSet`+`getFXRateSet`; demand-forecast `generateForecast`; fpa-budgeting `listBudgets` capital).
- **Block 1** · `sprint-history.ts` S122 backfilled `TBD_AT_BANK → fd40a57c…`; S123 appended with `headSha:'TBD_AT_BANK'`, `predecessorSha:'fd40a57c…'`, `newSiblings:[]`. No S124 entry. S122 own-headSha test extended toContain to be time-robust.
- **Block 2** · `scenario-modeling-engine.ts` EXTENDED additively (S122 exports 0-DIFF): `FXShock`/`FX_SHOCKS`/`fxShockFactor`/`ScenarioMatrixCell`/`ScenarioMatrix`/`runScenarioMatrix`. Each cell orchestrates the same Phase-6 stack via `buildConsolidatedBaseline` (consolidateWithTranslation → consolidate → generateEliminations → buildConsolidatedPnL); samples actual `getFXRateSet` per cell run. Audit reuses `scenario_run`.
- **Block 3** · `runDemandScenario` CALLS `demand-forecast-engine.generateForecast`; demand_change_pct flows through to consolidated revenue/PBT. `runCapexScenario` READS S120 `listBudgets({budget_type:'capital'})`; defer/accelerate cash & PBT impacts via decimal-helpers. All audit via `scenario_run` (NO new type).
- **Block 4** · `ScenarioModelingPage` (#49) EXTENDED — added 4-tab layout (Best/Base/Worst + FX×Rev×Cost Matrix + Demand + Capex). NO new page; NO new SIBLID. Reads the extended engine end-to-end (no dead UI).
- **Block 5** · sibling-register UNCHANGED (191). Test file `src/test/sprint-123/scenario-matrix-demand-capex.test.ts` (34 `it()`, lean-behavioral, time-robust toContain on S123 own headSha). Stale-status migration applied to S122 scope-wall (demand/capex now exist additively; costing wall preserved).

## Triple Gate (final)
- TSC `tsconfig.app.json --noEmit` → 0 errors
- ESLint `.` `--max-warnings 0` → 0 / 0
- Vitest `sprint-123` + `sprint-122` + `sprint-121` + `_meta` → **121 / 121 pass**

## §L · Discipline & moat notes
- **MOAT CAPSTONE (DP-D1-3):** FX×revenue×cost sensitivity matrix + demand + capex scenarios run on top of the S122 consolidated engine — no domestic competitor structurally matches the orchestrated FX-translation + consolidation + eliminations stack at scenario time.
- **FR-44 walls:** reuses `fx-translation` (`getFXRateSet`, `consolidateWithTranslation`, `translateEntityTB`), `group-consolidation`, `group-eliminations`, `demand-forecast-engine`, `fpa-budgeting-engine`, `fpa-forecasting-engine`. Reimplements none. Does NOT import `fx-what-if-engine` (asserted by regex on `from '@/lib/fx-what-if…'` and `import … fx-what-if`).
- **Audit:** matrix/demand/capex all log `scenario_run` (DP-D1-6 · single engine, single audit type). NO new audit type added; `src/types/audit-trail.ts` 0-DIFF.
- **0-DIFF inventory:** S122 `runScenario`/`ScenarioDriver`/`ScenarioCase`/`ScenarioScope`/`ScenarioResult`/`SCENARIO_CASES`/`SCENARIO_SCOPES`/`READS_FROM`/`listScenarios`/`compareScenarios`/`listScenarioEntities` intact (behavioral test asserts `runScenario` still emits best/base/worst). All Phase-6 foundations + S120/121 untouched. `ComplianceModule` UNTOUCHED. `comply360-tier2` grep stays at 1.
- **Scope wall:** engine surface does NOT export costing functions (`runActivityBasedCosting`/`computeDriverCost`/`runCostingScenario`/`allocateOverheadByDriver` → `toBeUndefined`) — preserved for S124-125.
- **Guardrails:** S123 entry `headSha:'TBD_AT_BANK'` (toContain-asserted, time-robust per S121-T1 rule). No S124 pre-entry. `newSiblings:[]`. Sibling count UNCHANGED (191) — engine extension, not new engine. Page count UNCHANGED (49) — page extended, not new.
- **Carried lessons applied:** S121-T1 toContain pattern on own headSha; S122 stale-scope-wall self-healed (D-NEW-BB migration) — the Pt-1 demand/capex "does not exist" assertion was superseded by the S123 additive extension; the costing wall remains in place as the live boundary.

## Files changed
- created: `src/test/sprint-123/scenario-matrix-demand-capex.test.ts`
- created: `audit_workspace/T-Phase-7.D.1.4/Z_close_evidence/close_summary.md`
- edited:  `src/lib/scenario-modeling-engine.ts` (additive · S122 0-DIFF)
- edited:  `src/features/scenario-modeling/ScenarioModelingPage.tsx` (tabs + matrix/demand/capex)
- edited:  `src/lib/_institutional/sprint-history.ts` (S122 backfill + S123 append)
- edited:  `src/test/sprint-122/scenario-modeling.test.ts` (toContain S122 banked SHA · stale-status migration on demand/capex wall)

Sprint ready for bank → S124 Block 1 will backfill `S123.headSha` to the new HEAD.
