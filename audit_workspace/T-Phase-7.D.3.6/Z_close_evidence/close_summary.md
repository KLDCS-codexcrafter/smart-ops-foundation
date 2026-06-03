# Sprint 135 · T-Phase-7.D.3.6 · 🌟 Arc D.3 · β Predictive ML + #6 Explainable + NL-Query — Close Summary

**Predecessor HEAD:** `c16134bb05e86e95c5c21b824a2cfc311ac782f9` (S134 banked · A first-pass-clean · 57 ⭐ · 204 SIBLIDs · 62 Standalone Pages · ESLint 85)
**Streak target:** 58 ⭐ · ESLint STRICT 0/0 + 0 warnings · 86-sprint streak.
**LOC:** ~1,500 (ASK-zone · two-pass pre-authorized — executed single-pass after Block-2 audit; cumulative under 1,000 LOC on engine + page surface).

## Delivered

- **+1 SIBLID** `predictive-insight-engine` (sibling-register 204 → 205) — β implementation:
  - 4 in-house statistical ML scenarios: **64 breakdown_30d** (linear regression on PM signal · CALLS predictive-maintenance-fa-engine.listHighRiskAssets) · **65 useful_life** (Holt-Winters α=0.5 β=0.3 period=4) · **66 replacement_cost** (linear regression on price history) · **68 premium_optimization** (ARIMA-lite AR(1) + drift).
  - `predict()` ALWAYS returns `Explanation { drivers[name+coefficient+contribution_pct], model, r_squared, confidence_band(low,high), notes }` — #6 explainable-by-design ("auditable AI").
  - 95% confidence band via residual std-dev × 1.96.
  - Implements the **S121 `ForecastModelHook` seam** via `makeForecastModelHook(model)` — pluggable into `fpa-forecasting-engine.generateFPAForecast({ model })`.
  - NL-query layer (`queryInsights(nl)`): deterministic keyword + synonym intent-match over `insightx-aggregator.getScenarioRegistry()` (75 entries). Score ≥3 required. Honest no-match path (`matched_scenario_id:null` + interpretation). Reuses `insightx_aggregation_run` audit — no new type.
  - In-session `LEDGER` (§O · NO storage API · NO new runtime dep).
  - All money/statistical math via `decimal-helpers` (`dAdd/dSub/dMul/round2`).
- **+1 Standalone Page #63** `PredictiveInsightsPage` (`src/features/insightx-predictive/PredictiveInsightsPage.tsx`) under the InsightX shell (NOT CC). Registered as `InsightXModule 'ix-predictive'` + sidebar item (Sparkles icon · `i p`) + `renderModule` case. 4 scenario cards + explanation panel (drivers/coefficients/r²/confidence band) + NL-query bar. NOT a sibling.
- **+1 audit type** `predictive_insight_run` (`mca-roc`). ComplianceModule UNTOUCHED.

## §L · DESIGN-DECISION-FLAGS (the honest record)

- **§L-1 · β AI POSTURE (DP-D3-5 · FR-91 · CRITICAL):** Lens-10 scenarios shipped as **in-house statistical ML** (regression / Holt-Winters / ARIMA-lite). NO ML library. NO LLM. NO new runtime dep (§O preserved). Honest claim = **"explainable predictive analytics · auditable AI"** — NOT "Copilot / generative AI."
- **§L-2 · #6 explainable-by-design:** every prediction exposes drivers + coefficients + contribution % + model + r² + 95 % confidence band + notes. No black-box outputs. The selling point.
- **§L-3 · Scenario 67 (invoice NLP) → Phase 8:** NOT built. Needs NLP infrastructure (tokenizer + classifier) that would require a runtime dep — §O does not permit. `PREDICTIVE_SCENARIOS` excludes it; scope-wall test asserts `scenarioInvoiceNLP / parseInvoiceNLP` are `undefined`.
- **§L-4 · Generative / conversational LLM assistant (TEKAI-style) → Phase 8:** NOT built. Out of §O envelope. Scope-wall test asserts `askNaturalLanguageLLM / generateInsightLLM / trainModel / buildSelfServiceQuery` are `undefined`.
- **§L-5 · NL-query is deterministic, NOT LLM:** keyword + synonym intent-match over the 75-registry. Honest no-match path on `xyzzy…` and empty input — never fabricates.
- **§L-6 · ForecastModelHook seam (DP-D1-5):** S121 declared the interface; S135 ships the β implementation. `fpa-forecasting-engine` is **0-DIFF** — predictive-insight-engine implements its seam from the outside.
- **§L-7 · FR-44 wall:** `predictive-maintenance-fa-engine`, `demand-forecast-engine`, `fpa-forecasting-engine`, `insightx-aggregator-engine` all **0-DIFF**. Exposed via `__fr44_reuse` namespace. Recomputes none.
- **§L-8 · Audit posture:** `predict()` logs `predictive_insight_run` (D-AUDIT-SAFE try/catch). NL-query does not log its own type — when it dispatches `aggregateInsight`, the aggregator's own `insightx_aggregation_run` covers it.
- **§L-9 · Lean-behavioral tests:** ≥20 discrete `it()`. ML output asserted as **properties** (trend direction, r² ∈ [0,1], confidence band brackets prediction) not exact floats. S135 own `headSha` asserted to be `'TBD_AT_BANK'` OR a 40-hex SHA — never `toBe` a specific value. No `existsSync`-future, no S136 tombstone.
- **§L-10 · Guardrails:** S135 entry `headSha = 'TBD_AT_BANK'` (will be backfilled at S136 Block 1). S134 backfilled to `c16134bb05e86e95c5c21b824a2cfc311ac782f9`. NO S136 pre-entry.
- **§L-11 · Phase 7 Close Ceremony:** scheduled for S136 (not this sprint).

## Files Created / Edited

**Created:**
- `src/lib/predictive-insight-engine.ts`
- `src/features/insightx-predictive/PredictiveInsightsPage.tsx`
- `src/test/sprint-135/predictive-nlquery.test.ts`
- `audit_workspace/T-Phase-7.D.3.6/Z_close_evidence/close_summary.md`

**Edited:**
- `src/types/audit-trail.ts` (+ `predictive_insight_run`)
- `src/lib/_institutional/sibling-register.ts` (+1 entry → 205)
- `src/lib/_institutional/sprint-history.ts` (S134 SHA backfill + S135 entry TBD_AT_BANK)
- `src/pages/erp/insightx/InsightXSidebar.types.ts` (+ `ix-predictive`)
- `src/apps/erp/configs/insightx-sidebar-config.ts` (+ Predictive Insights item)
- `src/pages/erp/insightx/InsightXPage.tsx` (+ import + case)

## Gate Verification

- TSC `--noEmit` with `NODE_OPTIONS=--max-old-space-size=7168` → 0 errors.
- `npx eslint . --max-warnings 0` → 0/0.
- Vitest S130–S135 suites → all-pass.
- Build → PASS.

**58 ⭐ target · ARC D.3 advancing toward S136 close.**
