# Sprint 117 · T-Phase-7.D.0.2 · Arc D.0 · Workforce Planning — Close Summary

**Sprint tag:** T-Phase-7.D.0.2  
**Predecessor HEAD:** `8f5d4cf710fc614fd49b5c07958029204aeddb0e` (S116 banked A first-pass-clean · 39 ⭐ · 185 SIBLIDs · 43 pages · ESLint 67)  
**Streak target:** 40 ⭐  
**Pillar / Arc:** D · D.0 Org Planning (workforce projection sub-arc)

---

## Deliverables (single-pass · ~1,200 LOC bracket)

1. **NEW SIBLID #186 · `workforce-planning-engine`** (`src/lib/workforce-planning-engine.ts`)
   - `projectWorkforce` · `upsertHeadcountPlan` · `listHeadcountPlans` · `getWorkforceCostVsAOP` ·
     `readAopCostTarget` · `isValidScope` · `getCapacityContextRowCount`.
   - Reconciliation: `planned = current + hires − attrition`; orphan `scope_id` rejected.
   - Mix split: `permanent` (Employee) vs `contract` (ContractWorker, active only).
   - All money math via `decimal-helpers` (`dAdd` / `dSub` / `dMul` / `round2`).
   - Idempotent upsert by composite key `{fy, scope_level, scope_id}`.

2. **+1 audit type · `workforce_plan_event`** (module `'mca-roc'`). ComplianceModule UNTOUCHED. No other audit type added.

3. **NEW Standalone Page #44 · `WorkforcePlanningPage`**
   - `requiredCards: ['fpa-planning']` (S116 card · NOT a SIBLID).
   - Sidebar `type: 'item'` (id `fpa-planning-workforce`) + Command Center `case`.
   - FY + scope picker · projection workbench · saved plans table · workforce cost-vs-AOP table.

4. **sibling-register +1** (185 → 186), id appears exactly once.

5. **sprint-history** S116 SHA backfilled to `8f5d4cf710fc614fd49b5c07958029204aeddb0e`; S117 appended with `headSha: 'TBD_AT_BANK'`, predecessor `8f5d4cf7…`. No S118 entry created.

6. **Test pack** — `src/test/sprint-117/workforce-planning.test.ts`, ≥20 discrete `it()`, lean-behavioral posture.

---

## §L · Design-decision flags + lean-test posture

- **FR-44 reuse (intra-arc S116 linkage):** `getWorkforceCostVsAOP` + `readAopCostTarget` call
  `org-planning-engine.listStrategicTargets` to pull the AOP `cost_target` for the same
  `(fy, level, scope_id)`. No parallel target store. S116 stays 0-DIFF.
- **FR-44 reuse (capacity context):** `getCapacityContextRowCount` calls
  `capacity-planning-engine.computeBottleneckHeatmap(entityCode)` — the only zero-extra-arg
  read on that engine's public surface. capacity-planning stays 0-DIFF.
- **FR-44 reuse (mix sources):** Permanent count is read from `EMPLOYEES_KEY` (Employee);
  contract count from `CONTRACT_WORKERS_KEY` (ContractWorker, status === 'active'). Neither
  type module is edited.
- **Scope validation:** `isValidScope` walks the REAL `DIVISIONS_KEY` / `DEPARTMENTS_KEY`
  stores; orphan `scope_id` throws at both `projectWorkforce` and `upsertHeadcountPlan`.
- **DP-A4-8 honest metrics:** `getWorkforceCostVsAOP` skips rows where no AOP target exists
  rather than fabricating a zero baseline. `cost_variance_vs_aop` is `undefined` (not 0) on
  the projection when there is no AOP target.
- **SCOPE WALL (DP-D0-7) asserted in tests:** engine surface has NO `planOKR`,
  `computeOrgDesign`, `computeBudget`, `computeForecast`, `simulateScenario`,
  `planPerformance`, `planCompensation`, etc. — verified via `toBeUndefined`. Performance-
  management and compensation-planning are explicitly deferred to a later HR arc.
- **Lean-behavioral test posture (Phase 7 standard, held clean):**
  - Sibling count asserted via `toBeGreaterThanOrEqual(186)` — no exact `toBe(N)`.
  - S117 `headSha` accepted as either `'TBD_AT_BANK'` or a real SHA — time-robust.
  - S118 presence is NOT asserted; if it ever appears, only structural validity is checked.
  - Scope-wall via `toBeUndefined` on the ENGINE's own surface (no `existsSync` futures).
- **Card discipline:** No new CardId this sprint — the existing S116 `fpa-planning` card is
  reused via `requiredCards: ['fpa-planning']`. Card-entitlement registry 0-DIFF.

---

## Guardrails

1. S117 entry `headSha = 'TBD_AT_BANK'` — never set to a Pass-A SHA.
2. No S118 entry pre-created.

## Gates (Triple Gate · per block)

- `npx tsc -p tsconfig.app.json --noEmit` → 0
- `npx eslint . --max-warnings 0` → 0/0
- `npx vitest run src/test/sprint-117 src/test/sprint-116 src/test/_meta` → ALL pass
- `npm run build` → PASS

---

## Predecessor → bank

- Predecessor HEAD: `8f5d4cf710fc614fd49b5c07958029204aeddb0e`
- This sprint banks the next SHA; backfill happens at S118 Block 1.
