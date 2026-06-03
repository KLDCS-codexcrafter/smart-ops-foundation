/**
 * @file        src/lib/scenario-outcome-tracker-engine.ts
 * @sibling     NEW @ Sprint 134 · T-Phase-7.D.3.5 · 🌟 Arc D.3 · #204
 * @pillar      D.3 · #5 Scenario Decision-Loop (TOP-1% · decision accountability).
 *              Tracks a modeled scenario decision (S122-123) vs the ACTUAL
 *              outcome — which assumptions proved reliable. Institutional memory.
 *
 * @fr-44       READS scenario-modeling-engine ScenarioResult (the modeled
 *              decision) + group-consolidation-engine buildConsolidatedPnL
 *              (the actual outcome). Recomputes NEITHER. Both 0-DIFF.
 *
 * @scope-wall  DP-D3-6 / DP-D3-9 · S134 ships inbox + decision-loop ONLY.
 *              NO predictive-ML / NL-query (S135). Test asserts those
 *              exports DO NOT exist on the engine surface (toBeUndefined).
 *
 * @audit       Emits 'scenario_outcome_event' (module 'mca-roc') on
 *              evaluateOutcome. ComplianceModule UNTOUCHED.
 *
 * @reads-from  scenario-modeling-engine · group-consolidation-engine ·
 *              decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.5 · Sprint 134 · 🌟 Arc D.3
 * [JWT] Phase 8: GET /api/insightx/scenario-outcomes · POST /api/insightx/scenario-outcomes/:id/decide
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { dEq, dSub, round2 } from '@/lib/decimal-helpers';

// FR-44 walls — READ-ONLY namespace imports. Both sources stay 0-DIFF.
import * as scenarioModeling from '@/lib/scenario-modeling-engine';
import * as groupConsolidation from '@/lib/group-consolidation-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  scenarioModeling,
  groupConsolidation,
});

export const READS_FROM = Object.freeze([
  'scenario-modeling-engine',
  'group-consolidation-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface ScenarioAssumptionOutcome {
  assumption: string;
  modeled: number;
  actual: number;
  reliable: boolean;
}

export interface ScenarioOutcome {
  scenario_id: string;
  decision: string;
  fy: string;
  modeled_pbt: number;
  actual_pbt: number;
  delta: number;
  /** 0–100 closeness — 100 when actual==modeled, 0 when |delta| ≥ |modeled|. */
  accuracy_pct: number;
  assumptions: ScenarioAssumptionOutcome[];
  computed_at: string;
}

export interface RecordDecisionInput {
  scenario_id: string;
  decision: string;
}

export interface EvaluateOutcomeInput {
  scenario_id: string;
  fy: string;
  /** Optional which case to score against (default 'base'). */
  case?: 'best' | 'base' | 'worst';
  entity_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-session stores (no storage API · §O).
// ─────────────────────────────────────────────────────────────────────────────
const DECISIONS: Map<string, string> = new Map();
const OUTCOMES: ScenarioOutcome[] = [];

export function __resetOutcomesForTests(): void {
  DECISIONS.clear();
  OUTCOMES.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// recordScenarioDecision — captures the human decision linked to a scenario_id.
// ─────────────────────────────────────────────────────────────────────────────
export function recordScenarioDecision(input: RecordDecisionInput): { tracked: boolean } {
  const decision = (input.decision ?? '').trim();
  if (!input.scenario_id || decision.length === 0) {
    return { tracked: false };
  }
  DECISIONS.set(input.scenario_id, decision);
  return { tracked: true };
}

export function getDecision(scenario_id: string): string | undefined {
  return DECISIONS.get(scenario_id);
}

// ─────────────────────────────────────────────────────────────────────────────
// computeAccuracy — 100 when delta==0; decays linearly to 0 at |delta|≥|modeled|.
// Divide-by-zero guarded via dEq.
// ─────────────────────────────────────────────────────────────────────────────
function computeAccuracyPct(modeled: number, actual: number): number {
  const delta = dSub(actual, modeled);
  const absDelta = Math.abs(delta);
  if (dEq(modeled, 0, 2)) {
    // Modeled is zero — accuracy is 100 only when actual is also zero.
    return dEq(actual, 0, 2) ? 100 : 0;
  }
  const denom = Math.abs(modeled);
  const ratio = Math.min(1, absDelta / denom);
  return round2(Math.max(0, 100 * (1 - ratio)));
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateOutcome — modeled vs actual.
// FR-44: READS scenario-modeling-engine ScenarioResult + group-consolidation
// buildConsolidatedPnL. Recomputes neither.
// ─────────────────────────────────────────────────────────────────────────────
export function evaluateOutcome(input: EvaluateOutcomeInput): ScenarioOutcome {
  const { scenario_id, fy } = input;
  const entity_code = input.entity_code ?? 'OPX';
  const caseName = input.case ?? 'base';

  // READ modeled scenario.
  const all = scenarioModeling.listScenarios({ fy });
  const scenario = all.find((s) => s.scenario_id === scenario_id);
  if (!scenario) {
    throw new Error(
      `scenario-outcome-tracker-engine · scenario_id '${scenario_id}' not found for fy '${fy}'`,
    );
  }
  const modeledCase = scenario.cases.find((c) => c.case === caseName) ?? scenario.cases[0];
  if (!modeledCase) {
    throw new Error(
      `scenario-outcome-tracker-engine · scenario '${scenario_id}' has no cases`,
    );
  }

  // READ actual.
  const pnl = groupConsolidation.buildConsolidatedPnL({ fy });
  const actualPbt = round2(pnl.profit_before_tax ?? pnl.operating_profit ?? pnl.gross_profit ?? 0);
  const modeledPbt = round2(modeledCase.consolidated_pbt);
  const delta = round2(dSub(actualPbt, modeledPbt));
  const accuracy_pct = computeAccuracyPct(modeledPbt, actualPbt);

  // Per-assumption reliability — compares modeled driver perturbation to the
  // realised "implied" perturbation derived from actual vs modeled revenue/cost.
  const actualRevenue = round2(pnl.revenue ?? 0);
  const actualCost = round2(
    dSub(pnl.revenue ?? 0, pnl.gross_profit ?? 0),
  );
  const assumptions: ScenarioAssumptionOutcome[] = scenario.drivers.map((d) => {
    const modeledPct = d[caseName];
    let actualPct = 0;
    if (d.driver === 'revenue_pct') {
      const denom = modeledCase.consolidated_revenue;
      actualPct = dEq(denom, 0, 2)
        ? 0
        : round2((dSub(actualRevenue, denom) / denom) * 100);
    } else if (d.driver === 'cost_pct') {
      const denom = modeledCase.consolidated_cost;
      actualPct = dEq(denom, 0, 2)
        ? 0
        : round2((dSub(actualCost, denom) / denom) * 100);
    } else {
      // volume_pct proxied via revenue change (no direct volume in actual).
      const denom = modeledCase.consolidated_revenue;
      actualPct = dEq(denom, 0, 2)
        ? 0
        : round2((dSub(actualRevenue, denom) / denom) * 100);
    }
    const tolerance = Math.max(2, Math.abs(modeledPct) * 0.5);
    const reliable = Math.abs(actualPct - modeledPct) <= tolerance;
    return { assumption: d.driver, modeled: modeledPct, actual: actualPct, reliable };
  });

  const result: ScenarioOutcome = {
    scenario_id,
    decision: DECISIONS.get(scenario_id) ?? '',
    fy,
    modeled_pbt: modeledPbt,
    actual_pbt: actualPbt,
    delta,
    accuracy_pct,
    assumptions,
    computed_at: new Date().toISOString(),
  };

  // De-dupe per scenario+fy+case — replace any prior outcome for the same key.
  const key = `${scenario_id}::${fy}::${caseName}`;
  for (let i = OUTCOMES.length - 1; i >= 0; i--) {
    if (`${OUTCOMES[i].scenario_id}::${OUTCOMES[i].fy}::${caseName}` === key) {
      OUTCOMES.splice(i, 1);
    }
  }
  OUTCOMES.push(result);

  try {
    logAudit({
      entityCode: entity_code,
      action: 'create',
      entityType: 'scenario_outcome_event',
      recordId: `so-${scenario_id}-${Date.now()}`,
      recordLabel: `Scenario Outcome · ${scenario_id} · ${fy} · ${accuracy_pct}%`,
      beforeState: null,
      afterState: {
        scenario_id,
        fy,
        case: caseName,
        delta,
        accuracy_pct,
        assumptions_reliable: assumptions.filter((a) => a.reliable).length,
        sources_read: ['scenario-modeling-engine', 'group-consolidation-engine'],
      },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // D-AUDIT-SAFE.
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// listOutcomes — filtered query against the in-session ledger.
// ─────────────────────────────────────────────────────────────────────────────
export function listOutcomes(
  filter?: Partial<Pick<ScenarioOutcome, 'scenario_id' | 'fy'>>,
): ScenarioOutcome[] {
  if (!filter) return [...OUTCOMES];
  return OUTCOMES.filter((o) => {
    if (filter.scenario_id !== undefined && o.scenario_id !== filter.scenario_id) return false;
    if (filter.fy !== undefined && o.fy !== filter.fy) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL (DP-D3-6 / DP-D3-9) — these MUST NOT exist on the surface.
// Test asserts (engine as Record<string,unknown>)[name] === undefined.
// NO: trainModel · runPredictive · forecastAnomaly · askNaturalLanguage
//     · explainOutcome · buildInbox (lives in inbox engine).
// ─────────────────────────────────────────────────────────────────────────────
