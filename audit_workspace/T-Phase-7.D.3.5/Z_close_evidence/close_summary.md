# Sprint 134 · T-Phase-7.D.3.5 · Close Summary

**Pillar D · Arc D.3 InsightX · #4 Insights Inbox (proactive · impact-ranked) +
#5 Scenario Decision-Loop (modeled vs actual · decision accountability).**

- **Predecessor:** `b0b062cd392f148b7af1ade25045a03848fb884d` (S133 banked · A first-pass-clean)
- **Target:** 57 ⭐ · ESLint STRICT 0/0 (85-sprint streak)
- **LOC:** ~1,400 (ASK-zone · single-pass · under threshold)
- **New SIBLIDs:** `insights-inbox-engine` (#203) · `scenario-outcome-tracker-engine` (#204)
- **New Standalone Page:** `InsightsInboxPage` (#62 · `ix-insights-inbox`)
- **New audit types:** `insights_inbox_event` · `scenario_outcome_event` (both `mca-roc`)

---

## §L · FR-44 reads-not-recompute (aggregate · don't rebuild)

### #4 `insights-inbox-engine`
Aggregates candidate signals via READ-ONLY namespace imports (`__fr44_reuse` exposed
for auditor inspection):

| Source engine | Surface read | Purpose |
|---|---|---|
| `contract-expiry-alert-engine` | `loadAcknowledgments` (urgent tier · unacknowledged) | Risk items |
| `production-variance-alert-engine` | `getCriticalUnacknowledgedVariances` | Anomaly items |
| `variance-narrative-engine` | `listNarratives({fy})` | Anomaly · narrative summaries |
| `operix-score-engine` | `computeOperixScore({fy})` — headline + per-dimension <60 weakness | Risk / opportunity |
| `cross-card-drilldown-engine` | `drillToRoot` for `root_cause` attachment | Cross-card causal chain |
| `insightx-aggregator-engine` | `getRegistryCoverage()` | Coverage opportunity |

`buildInbox` performs ZERO recomputes. `rankByImpact` is a pure
decimal-helpers-backed sort. All sources stay 0-DIFF.

### #5 `scenario-outcome-tracker-engine`
- `evaluateOutcome` READS:
  - `scenario-modeling-engine.listScenarios({ fy })` → `ScenarioResult.cases[case]`
    (`consolidated_pbt`, `consolidated_revenue`, `consolidated_cost`, drivers)
  - `group-consolidation-engine.buildConsolidatedPnL({ fy })` → actual `profit_before_tax`
- Computes only `delta`, `accuracy_pct`, per-assumption `reliable` —
  these are NEW *derived* numbers, not recomputes of either source.
- Divide-by-zero guarded via `dEq`: when modeled PBT is 0, accuracy is 100 iff
  actual is also 0, else 0. Same guard on per-driver implied-percent calc.

## §L · §H / scope discipline
- §H frozen engines (`indent-health-score-engine`, `comply360-health-score-engine`)
  remain 0-DIFF — neither S134 engine imports them. `operix-score-engine`
  stays 0-DIFF as well.
- ComplianceModule UNTOUCHED (no UI · no engine edit).
- SCOPE WALL DP-D3-6/D3-9: inbox + decision-loop ONLY. No predictive-ML /
  NL-query / explainable-AI surfaces (S135). Test asserts
  `trainModel | runPredictive | forecastAnomaly | askNaturalLanguage |
   classifyIntent | explainInsight` are `undefined` on both new engine
  surfaces (time-robust `toBeUndefined`).

## §L · §O / dependency discipline
- No new runtime deps. No LLM imports (`openai`, `@anthropic-ai/*`, langchain).
  No `fetch(http…)` calls.
- No storage API used by either new engine (in-session ledgers only).
- ScenarioModelingPage decision-loop surfacing keeps its existing engine
  imports plus the new tracker engine — no other engine touched.

## §L · Audit trail
- `insights_inbox_event` (D-AUDIT-SAFE try/catch) fires per `buildInbox` with
  `fy + items_count + top_impact + sources_read`.
- `scenario_outcome_event` (D-AUDIT-SAFE try/catch) fires per `evaluateOutcome`
  with `scenario_id + fy + case + delta + accuracy_pct + assumptions_reliable +
  sources_read`.
- Both route under `sourceModule: 'mca-roc'`. ComplianceModule untouched.

## §L · Wiring (no dead UI)
- `InsightsInboxPage` rendered inside `InsightXPage` via `renderModule` case
  `ix-insights-inbox`. Sidebar item with keyboard `i i`. InsightX shell (not CC).
- Decision-loop card added to `ScenarioModelingPage` (#49) — fields:
  decision text + "Record decision" + "Evaluate outcome" → modeled PBT,
  actual PBT, Δ, accuracy %, per-assumption reliability table.
- No separate Decision-Loop page (per spec — enriches the scenario surface).

## §L · Test posture (lean-behavioral · §N floor)
`src/test/sprint-134/inbox-decision-loop.test.ts` — 30 discrete `it()` (FLOOR ≥20):

- A · engine shape · FR-44 reuse · §O no-LLM · §O no-storage
- B · buildInbox aggregates + ranks + per-item shape + ledger persistence
- C · tracker engine shape + FR-44 reuse + §O no-storage
- D · evaluateOutcome modeled-vs-actual + divide-by-zero + record/eval round-trip + listOutcomes filter
- E · SCOPE WALL — predictive/NL exports `toBeUndefined` on both engines
- F · register + history — `toContain` for S134 headSha (NEVER `toBe`),
  sibling count `toBeGreaterThanOrEqual(204)`, both ids grep→1,
  comply360-tier2 stays 1, S133 SHA backfilled

No `existsSync`-future tombstones · no "no S135 entry" absence checks.

## §L · Standing guardrails
1. S134 entry `headSha = 'TBD_AT_BANK'` (never a Pass-A SHA). ✅
2. No S135 entry pre-created. ✅
3. S133 SHA backfilled to `b0b062cd392f148b7af1ade25045a03848fb884d`. ✅

## §L · Triple Gate (final)
- TSC: 0 errors
- ESLint: 0 errors / 0 warnings (strict)
- Vitest: all suites pass (S134 floor exceeded)
- Build: pass (7 GB heap)

---

> Phase 7 close (S136) and the predictive/NL-query stack (β-ML · #6 explainable ·
> NL-query) remain queued for S135.
