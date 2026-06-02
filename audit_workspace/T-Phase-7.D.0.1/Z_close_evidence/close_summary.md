# Sprint 116 · T-Phase-7.D.0.1 · Close Summary — 🎬 PHASE 7 OPENER

**Predecessor HEAD:** `1c67f6c50f6c58a1da69819b7fe94f6ac4019fc3` (S115 / Phase 6 final · 184 SIBLIDs · 42 pages · ESLint 66)
**Sprint:** T-Phase-7.D.0.1 · Arc D.0 Organisation Planning · Pillar D analytical capstone opener
**LOC actual:** ~1,300 (engine + page + landing + wiring + tests)
**Streak target:** 39 ⭐ · ESLint STRICT 0/0 · 67-sprint clean streak

## What shipped

| Block | Deliverable |
|:--:|---|
| 0 | Pre-flight HALT-on-divergence — verified HEAD, card-meta registry (`src/components/operix-core/applications.ts` · additive · existing-card 0-DIFF), `CardId`/`ROLE_DEFAULT_CARDS` location, org-structure shape, `listGroupStructure`. |
| 1 | S115 SHA backfilled `TBD_AT_BANK → 1c67f6c5…`. |
| 2 | NEW card `'fpa-planning'` (additive) — `CardId` union + `ROLE_DEFAULT_CARDS.finance` + `ROLE_DEFAULT_CARDS.hr` + `applications.ts` entry (category `Fin Hub`, route `/erp/fpa-planning`, icon `Target`, status `active`) + `seedDemoEntitlements` parity (D-NEW-CT) + `breadcrumb-memory` route map. **Every existing card 0-DIFF.** |
| 3 | 🏆 NEW SIBLID `org-planning-engine` — `upsertStrategicTarget`, `buildAOP`, `cascadeTargets`, `listStrategicTargets`, `isValidScope`, `readDivisions/readDepartments/readEntityNodes`, `netTarget`, `__resetStrategicTargetsForTests`. **FR-44**: reads `DIVISIONS_KEY`/`DEPARTMENTS_KEY` and `listGroupStructure()` — reimplements neither. All money math via `decimal-helpers` (`dAdd`/`dSub`/`dEq`/`round2`). Idempotent upsert by composite `{fy,horizon,level,scope_id}`. |
| 4 | +1 audit type `org_plan_event` (module `mca-roc`). **ComplianceModule UNTOUCHED.** |
| 5 | NEW Page #43 `AOPStrategicPlanPage` — sidebar `type:'item'` + CC `case` + **`requiredCards:['fpa-planning']`**. Reads engine only (no dead UI). Card landing `FpaPlanningPage` at `/erp/fpa-planning`. |
| 6 | sibling-register 184→185 (single insertion · `comply360-tier2` stays 1); sprint-history S116 entry `headSha:'TBD_AT_BANK'`; refined-posture behavioral test pack (>20 `it()`); this §L. |

## §L — Design decision flags

* **Card additivity (DP-P7-2 · DP-D0-1):** Block 0 located the registry at `src/components/operix-core/applications.ts`. The new `'fpa-planning'` entry is **appended** at the end of `applications`. No existing card line was edited; only the type union got `| 'fpa-planning'` and `ROLE_DEFAULT_CARDS` got additive entries for `finance` + `hr`. `breadcrumb-memory.ts` required a parallel entry because its `Record<CardId, string>` is exhaustive — that's a side-effect of the type, not an edit of an existing card.
* **FR-44 / FR-91 — engine REUSES, does not reimplement:** `org-planning-engine` imports `DIVISIONS_KEY`/`DEPARTMENTS_KEY`/`Division`/`Department` types from `@/types/org-structure` and `listGroupStructure` + `GroupStructureNode` from `@/lib/intercompany-group-structure-engine`. `Division`/`Department` interfaces are NOT redefined. Scope validation rejects orphan `scope_id` against the real tree.
* **Targets-not-actuals (Arc D.0 vs Arc D.1):** the engine stores only `revenue_target` / `cost_target`; the test pack asserts no `actuals` / `variance` / `forecast` keys appear on `AOPlan`. D.1 will own actuals + variance.
* **Cascade balance via `dEq`:** parent ↔ Σ-children comparison uses `decimal-helpers.dEq(places=2)` — never raw `===` on floats. Breaks are surfaced separately for revenue vs cost.
* **SCOPE WALL (DP-D0-6):** AOP only. The scope-wall describe-block asserts that none of `planWorkforce` / `workforcePlan` / `planOKR` / `okrCascade` / `computeOrgCost` / `computeBudget` / `computeForecast` / `computeScenario` / `simulateScenario` / `computeVariance` exist as engine exports. Workforce → S117 · OKR/org-cost → S118 · budget/forecast/scenario → Arc D.1.
* **Page #43 lives under the NEW card (AC#13):** sidebar item declares `requiredCards: ['fpa-planning']` (NOT `'command-center'` like the prior CC-housed pages). The page is rendered by the CC `case` switch but the matrix-filter governs visibility — the AOP item only appears for users with the `fpa-planning` entitlement.
* **Refined lean-behavioral test posture (Phase 7 · founder-ratified):** floor ≥20 `it()`, all behavioral. **No** exact `toBe(N)` sibling counts (used `toBeGreaterThanOrEqual(185)`). **No** future-file `existsSync` tombstones. **No** "no S117 entry" absence checks — the S117 case uses an `if (s117) expect(…)` if-present-then-valid pattern. S116 `headSha` test accepts either `'TBD_AT_BANK'` or a backfilled SHA-shaped string (time-robust to bank).
* **Guardrails preserved:** S116 entry `headSha: 'TBD_AT_BANK'` (never a Pass-A SHA); no S117 entry pre-created.
* **Audit-trail-engine 0-DIFF:** the engine wraps `logAudit` in `try/catch` (best-effort) so storage errors during a write never break the engine's primary return path. `logAudit` itself is unchanged.

## Verified gates (per Triple Gate)

* TSC: 0 errors after each block (after fixing the early `'edit' → 'update'` `AuditAction` slip and the `breadcrumb-memory` `Record<CardId,…>` exhaustiveness slip — both caught by the build).
* ESLint: `npx eslint . --max-warnings 0` clean.
* Vitest: `src/test/sprint-116/` ≥20 discrete `it()` · all green when run with the new engine present.
* Build: PASS.

## File manifest

**Created**
- `src/lib/org-planning-engine.ts` — SIBLID #185
- `src/features/fpa-planning/AOPStrategicPlanPage.tsx` — Standalone Page #43
- `src/pages/erp/fpa-planning/FpaPlanningPage.tsx` — Card landing surface
- `src/test/sprint-116/org-planning.test.ts` — Refined lean-behavioral test pack
- `audit_workspace/T-Phase-7.D.0.1/Z_close_evidence/close_summary.md` (this file)

**Edited (additive only)**
- `src/types/card-entitlement.ts` — `+'fpa-planning'` (union) + `ROLE_DEFAULT_CARDS.finance` + `ROLE_DEFAULT_CARDS.hr`
- `src/components/operix-core/applications.ts` — appended FP&A card entry (no existing card edited)
- `src/lib/card-entitlement-engine.ts` — `+one('fpa-planning')` in `seedDemoEntitlements` (D-NEW-CT parity)
- `src/lib/breadcrumb-memory.ts` — `+'fpa-planning': '/erp/fpa-planning'` (exhaustive `Record<CardId,…>` requirement)
- `src/types/audit-trail.ts` — `+ 'org_plan_event'` on `AuditEntityType`
- `src/apps/erp/configs/command-center-sidebar-config.ts` — sidebar item for AOP page (`requiredCards: ['fpa-planning']`)
- `src/features/command-center/pages/CommandCenterPage.tsx` — import + module union + hash list + render case + breadcrumb label
- `src/App.tsx` — `+ lazy` import + `<Route path="/erp/fpa-planning">`
- `src/lib/_institutional/sprint-history.ts` — S115 SHA backfilled + S116 entry appended (`headSha:'TBD_AT_BANK'`)
- `src/lib/_institutional/sibling-register.ts` — `+org-planning-engine` (185th)

## What did NOT change (0-DIFF)

- Every existing `CardId` member · every existing card's metadata entry in `applications.ts`
- `org-structure` (`Division` / `Department` types · `divisionsKey` / `departmentsKey`) · `useOrgStructure`
- `intercompany-group-structure-engine` (`listGroupStructure` / `getGroupStructure` / `getGroupTree`)
- ComplianceModule (no audit type other than `org_plan_event` added · no Comply360 file touched)
- All Phase 0–6 engines + pages · `comply360-tier2-extensions-engine` count stays 1
- All prior sprint-history rows except the S115 SHA backfill (Block 1) and appended S116 (Block 6)

🎬 **Phase 7 begins.** Arc D.0 delivered — AOP target cascade is live and FR-44-clean. Next up: S117 workforce planning.
