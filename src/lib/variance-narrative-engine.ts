/**
 * @file        src/lib/variance-narrative-engine.ts
 * @sibling     NEW @ Sprint 133 · T-Phase-7.D.3.4 · 🌟 Arc D.3 · #201
 * @pillar      D.3 · #2 Auto-Narrative Variance (TOP-1%). Turns the S132 causal
 *              chain + variance data into a WRITTEN "what changed and why"
 *              paragraph — deterministic templated NLG.
 *
 * @no-llm      Template-based natural-language generation only.
 *              NO LLM · NO model · NO API · NO new runtime dep (§O).
 *
 * @fr-44       NARRATES existing numbers — reads CausalChain (S132
 *              cross-card-drilldown-engine), variance figures (fpa-budgeting
 *              getBudgetVsActual), aggregator insights. Recomputes / rebuilds
 *              no source data. All sources stay 0-DIFF.
 *
 * @scope-wall  DP-D3-6 / DP-D3-9 · This sprint adds narrative + Operix Score
 *              ONLY. NO inbox / decision-loop (S134) · NO predictive-ML /
 *              NL-query (S135). Scope-wall test asserts those exports DO NOT
 *              exist on the engine surface (toBeUndefined · time-robust).
 *
 * @audit       Emits 'variance_narrative_run' (module 'mca-roc') on
 *              narrateVariance. ComplianceModule UNTOUCHED.
 *
 * @reads-from  cross-card-drilldown-engine · fpa-budgeting-engine ·
 *              insightx-aggregator-engine · decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.4 · Sprint 133 · 🌟 Arc D.3
 * [JWT] Phase 8: GET /api/insightx/narratives · GET /api/insightx/narrative/:subject
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { round2 } from '@/lib/decimal-helpers';

// FR-44 walls — READ-ONLY namespace imports. All sources stay 0-DIFF.
import * as crossCardDrilldown from '@/lib/cross-card-drilldown-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as insightxAggregator from '@/lib/insightx-aggregator-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  crossCardDrilldown,
  fpaBudgeting,
  insightxAggregator,
});

export const READS_FROM = Object.freeze([
  'cross-card-drilldown-engine',
  'fpa-budgeting-engine',
  'insightx-aggregator-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface NarrativeDriver {
  driver: string;
  contribution_pct: number;
  source_ref: string;
  /** Optional honest note carried from the underlying chain step. */
  note?: string;
}

export interface VarianceNarrative {
  trace_id: string;
  subject: string;
  fy: string;
  headline: string;
  paragraph: string;
  drivers: NarrativeDriver[];
  /** When the underlying chain was incomplete · honest §L disclosure. */
  chain_complete: boolean;
  gap_notes: string[];
  generated_at: string;
}

export interface NarrateVarianceInput {
  subject_metric: string;
  fy: string;
  entity_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-session narrative ledger (no storage API · §O).
// ─────────────────────────────────────────────────────────────────────────────
const NARRATIVES: VarianceNarrative[] = [];

export function __resetNarrativesForTests(): void {
  NARRATIVES.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Money formatter (display only — no recompute · uses round2 from decimal-helpers).
// ─────────────────────────────────────────────────────────────────────────────
function formatINR(amount: number): string {
  const rounded = round2(amount);
  const abs = Math.abs(rounded);
  let scaled: string;
  let unit: string;
  if (abs >= 10_000_000) {
    scaled = (rounded / 10_000_000).toFixed(2);
    unit = 'Cr';
  } else if (abs >= 100_000) {
    scaled = (rounded / 100_000).toFixed(2);
    unit = 'L';
  } else if (abs >= 1_000) {
    scaled = (rounded / 1_000).toFixed(2);
    unit = 'K';
  } else {
    scaled = rounded.toFixed(2);
    unit = '';
  }
  return unit ? `₹${scaled} ${unit}` : `₹${scaled}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Read variance figure for the subject metric (FR-44 · READ ONLY).
// Best-effort: PBT / margin / operating profit map to FP&A budget-vs-actual
// if a baseline budget exists; otherwise honest "no baseline" note.
// ─────────────────────────────────────────────────────────────────────────────
interface VarianceFigure {
  budgeted: number;
  actual: number;
  variance: number;
  has_baseline: boolean;
}

function readVarianceFigure(_subject: string, fy: string): VarianceFigure {
  try {
    const budgets = fpaBudgeting.listBudgets({ fy });
    if (!budgets || budgets.length === 0) {
      return { budgeted: 0, actual: 0, variance: 0, has_baseline: false };
    }
    // Pick the first operating budget as the headline baseline (best-effort).
    const headline = budgets[0];
    const va = fpaBudgeting.getBudgetVsActual({
      fy: headline.fy,
      budget_type: headline.budget_type,
      scope_level: headline.scope_level,
      scope_id: headline.scope_id,
    });
    const budgeted = round2(va.lines.reduce((s, l) => s + (l.budgeted ?? 0), 0));
    const actual = round2(va.lines.reduce((s, l) => s + (l.actual ?? 0), 0));
    return {
      budgeted,
      actual,
      variance: round2(actual - budgeted),
      has_baseline: true,
    };
  } catch {
    return { budgeted: 0, actual: 0, variance: 0, has_baseline: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pull the causal chain for the subject (FR-44 · drillToRoot READ).
// ─────────────────────────────────────────────────────────────────────────────
function readCausalChain(subject: string, fy: string, entity_code?: string) {
  return crossCardDrilldown.drillToRoot({
    anomaly_metric: subject,
    fy,
    entity_code,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Compose templated paragraph — deterministic. NO LLM. NO model. NO API.
// ─────────────────────────────────────────────────────────────────────────────
function composeHeadline(subject: string, fig: VarianceFigure): string {
  if (!fig.has_baseline) {
    return `${subject}: no FP&A baseline on file — narrative compiled from causal chain only`;
  }
  if (fig.variance === 0) {
    return `${subject} held flat vs budget (${formatINR(fig.actual)} actual)`;
  }
  const direction = fig.variance > 0 ? 'rose' : 'fell';
  return `${subject} ${direction} ${formatINR(Math.abs(fig.variance))} vs budget`;
}

function composeForecastabilityNote(driverCount: number, chainComplete: boolean): string {
  if (driverCount === 0) return 'No causal drivers identified — investigate source data.';
  if (!chainComplete) {
    return `Forecastability LOW · ${driverCount} driver(s) identified but the chain is incomplete (§L gaps below).`;
  }
  if (driverCount === 1) return 'Forecastability MEDIUM · single dominant driver — monitor for concentration risk.';
  if (driverCount <= 3) return 'Forecastability HIGH · drivers concentrated and identifiable.';
  return `Forecastability MEDIUM · ${driverCount} drivers diffused across departments.`;
}

function composeDriverSentence(d: NarrativeDriver, rank: number): string {
  const ordinals = ['', 'primary', 'second', 'third', 'fourth', 'fifth'];
  const ord = ordinals[rank] ?? `#${rank}`;
  return `The ${ord} driver was ${d.driver} (${d.contribution_pct.toFixed(1)}%, ${d.source_ref}).`;
}

function composeParagraph(
  headline: string,
  fig: VarianceFigure,
  drivers: NarrativeDriver[],
  chainComplete: boolean,
  gapNotes: string[],
): string {
  const parts: string[] = [];
  parts.push(`${headline}.`);
  if (fig.has_baseline) {
    parts.push(
      `Actual ${formatINR(fig.actual)} against budget ${formatINR(fig.budgeted)} ` +
      `(variance ${formatINR(fig.variance)}).`,
    );
  }
  drivers.slice(0, 5).forEach((d, i) => {
    parts.push(composeDriverSentence(d, i + 1));
  });
  parts.push(composeForecastabilityNote(drivers.length, chainComplete));
  if (!chainComplete && gapNotes.length > 0) {
    parts.push(`Gap notes: ${gapNotes.length} step(s) skipped honestly (no fabrication · FR-44).`);
  }
  return parts.join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// narrateVariance — the #2 deterministic NLG entry point.
// ─────────────────────────────────────────────────────────────────────────────
export function narrateVariance(input: NarrateVarianceInput): VarianceNarrative {
  const { subject_metric, fy } = input;
  const entity_code = input.entity_code;

  const chain = readCausalChain(subject_metric, fy, entity_code);
  const figure = readVarianceFigure(subject_metric, fy);

  const drivers: NarrativeDriver[] = [...chain.chain]
    .sort((a, b) => b.contribution_pct - a.contribution_pct)
    .map((step) => ({
      driver: `${step.card} · ${step.metric}`,
      contribution_pct: round2(step.contribution_pct),
      source_ref: step.source_ref,
      note: step.note,
    }));

  const headline = composeHeadline(subject_metric, figure);
  const paragraph = composeParagraph(
    headline,
    figure,
    drivers,
    chain.chain_complete,
    chain.gap_notes,
  );

  const trace_id = `vn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const result: VarianceNarrative = {
    trace_id,
    subject: subject_metric,
    fy,
    headline,
    paragraph,
    drivers,
    chain_complete: chain.chain_complete,
    gap_notes: [...chain.gap_notes],
    generated_at: new Date().toISOString(),
  };

  NARRATIVES.push(result);

  try {
    logAudit({
      entityCode: entity_code ?? 'OPX',
      action: 'create',
      entityType: 'variance_narrative_run',
      recordId: trace_id,
      recordLabel: `Narrative · ${subject_metric} · fy=${fy}`,
      beforeState: null,
      afterState: {
        subject: subject_metric,
        fy,
        driver_count: drivers.length,
        chain_complete: chain.chain_complete,
        has_baseline: figure.has_baseline,
        sources_read: ['cross-card-drilldown-engine', 'fpa-budgeting-engine'],
      },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // Audit failures never break the narrative (D-AUDIT-SAFE).
  }

  return result;
}

export function listNarratives(filter?: Partial<Pick<VarianceNarrative, 'subject' | 'fy' | 'chain_complete'>>): VarianceNarrative[] {
  if (!filter) return [...NARRATIVES];
  return NARRATIVES.filter((n) => {
    if (filter.subject !== undefined && n.subject !== filter.subject) return false;
    if (filter.fy !== undefined && n.fy !== filter.fy) return false;
    if (filter.chain_complete !== undefined && n.chain_complete !== filter.chain_complete) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue of common narrative subjects surfaced in Cockpit / Drill.
// ─────────────────────────────────────────────────────────────────────────────
export interface NarrativeSubject {
  id: string;
  label: string;
}

export const NARRATIVE_SUBJECTS: readonly NarrativeSubject[] = Object.freeze([
  { id: 'pbt-variance',         label: 'PBT variance vs budget' },
  { id: 'gross-margin-fell',    label: 'Gross Margin Fell' },
  { id: 'operating-profit',     label: 'Operating Profit Fell' },
  { id: 'cash-tightened',       label: 'Cash Position Tightened' },
  { id: 'channel-roi-eroded',   label: 'Channel ROI Eroded' },
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL (DP-D3-6 / DP-D3-9) — these MUST NOT exist on the surface.
// Test asserts (engine as Record<string,unknown>)[name] === undefined.
// NO: openInsightsInbox · runDecisionLoop · trainModel · runPredictive
//     askNaturalLanguage · forecastAnomaly · computeOperixScore
//     (Operix Score lives in operix-score-engine — not this engine.)
// ─────────────────────────────────────────────────────────────────────────────
