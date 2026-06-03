/**
 * @file        src/lib/cross-card-drilldown-engine.ts
 * @pillar      D.3 · #1 Cross-Card Drill-to-Root (the TOP-1% moat made visible)
 * @sprint      Sprint 132 · T-Phase-7.D.3.3 · 🌟 ARC D.3 · DP-D3-6 · FR-44
 *
 * @purpose     Given an anomaly metric (e.g. "consolidated gross-margin fell"),
 *              WALK the causal chain ACROSS DEPARTMENTS by READING source engines:
 *                  margin           ← group-consolidation-engine
 *                  vendor cost rise ← purchase-cost-variance-engine
 *                  expired scheme   ← attribution-engine / marketing-planning-engine
 *                  AR / TT cash lag ← tt-payment-engine (Magenta APCD link)
 *
 * @fr-44       WALKS source-engine outputs to assemble the chain.
 *              Recomputes NOTHING. All source engines stay 0-DIFF.
 *              Structurally impossible for bolt-on tools — they don't have
 *              the other departments' data natively.
 *
 * @reads-from  group-consolidation-engine · purchase-cost-variance-engine ·
 *              attribution-engine · marketing-planning-engine ·
 *              tt-payment-engine · insightx-aggregator-engine ·
 *              decimal-helpers · audit-trail-engine
 *
 * @scope-wall  drill-to-root ONLY.
 *              NO narrative/Operix-Score (S133) · NO insights-inbox/decision-loop (S134)
 *              NO predictive-ML / NL-query (S135). Tests assert those exports
 *              DO NOT exist on this engine surface (toBeUndefined · time-robust).
 */

import { buildConsolidatedPnL } from '@/lib/group-consolidation-engine';
import { listAllPurchaseCostVariances } from '@/lib/purchase-cost-variance-engine';
import { getChannelROI, listAttributions } from '@/lib/attribution-engine';
import { listMarketingPlans } from '@/lib/marketing-planning-engine';
import { loadTTPayments, summarizeTTPayments } from '@/lib/tt-payment-engine';
import { aggregateInsight, getScenarioRegistry } from '@/lib/insightx-aggregator-engine';
import { dAdd, dMul, round2, dEq, dSum } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 reuse manifest (mirrors S130/S131 aggregator pattern · for tests).
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  buildConsolidatedPnL,
  listAllPurchaseCostVariances,
  getChannelROI,
  listAttributions,
  listMarketingPlans,
  loadTTPayments,
  summarizeTTPayments,
  aggregateInsight,
  getScenarioRegistry,
});

export const READS_FROM = Object.freeze([
  'group-consolidation-engine',
  'purchase-cost-variance-engine',
  'attribution-engine',
  'marketing-planning-engine',
  'tt-payment-engine',
  'insightx-aggregator-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type DrillCard =
  | 'fpa-planning'
  | 'procure360'
  | 'salesx'
  | 'payhub'
  | 'comply360'
  | 'insightx';

export interface DrillStep {
  /** Originating card / department for this causal step. */
  card: DrillCard;
  /** Engine that produced the value (used in source_ref). */
  source_engine: string;
  /** Human metric label (e.g. 'Gross Margin', 'Vendor Cost Variance'). */
  metric: string;
  /** Numeric value READ from the source engine (no recompute). */
  value: number;
  /** Relative contribution % to the anomaly (sums to ~100 across chain · dEq). */
  contribution_pct: number;
  /** Stable, human-readable provenance string (FR-44 traceability). */
  source_ref: string;
  /** Optional honest note (e.g. proxy explanation · §L). */
  note?: string;
}

export interface CausalChain {
  trace_id: string;
  anomaly: string;
  fy: string;
  /** false when ≥1 expected step has no source data — gap_notes carries §L line. */
  chain_complete: boolean;
  gap_notes: string[];
  root_cause_summary: string;
  /** Ordered cross-department steps · contribution_pct sums to ~100. */
  chain: DrillStep[];
  computed_at: string;
}

export interface DrillInput {
  anomaly_metric: string;
  fy: string;
  /** Optional entity_code for entity-scoped readers (purchase-cost-variance · tt-payment). */
  entity_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-session trace ledger (no storage API · §O carried from S131).
// ─────────────────────────────────────────────────────────────────────────────
const TRACES: CausalChain[] = [];

export function __resetDrillForTests(): void {
  TRACES.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step probes — each READS one source engine.
// Returns null when no data (so the chain is honestly marked incomplete · NO fabrication).
// ─────────────────────────────────────────────────────────────────────────────

interface ProbeOutput {
  step: Omit<DrillStep, 'contribution_pct'>;
  /** Magnitude used for contribution_pct weighting (always ≥0). */
  weight: number;
}

function probeMargin(fy: string): ProbeOutput | null {
  try {
    const pnl = buildConsolidatedPnL({ fy });
    const value = round2(pnl.gross_profit);
    if (value === 0 && pnl.revenue === 0) return null;
    return {
      step: {
        card: 'fpa-planning',
        source_engine: 'group-consolidation-engine',
        metric: 'Consolidated Gross Margin',
        value,
        source_ref: `group-consolidation-engine.buildConsolidatedPnL({fy:${fy}}).gross_profit`,
      },
      weight: Math.abs(value),
    };
  } catch {
    return null;
  }
}

function probeVendorCostRise(entity_code: string | undefined): ProbeOutput | null {
  if (!entity_code) return null;
  try {
    const variances = listAllPurchaseCostVariances(entity_code, 'item');
    const unfavorable = variances.filter((v) => v.direction === 'unfavorable');
    if (unfavorable.length === 0) return null;
    const totalImpact = dSum(unfavorable, (v) => Math.abs(v.variance_amount));
    if (totalImpact === 0) return null;
    return {
      step: {
        card: 'procure360',
        source_engine: 'purchase-cost-variance-engine',
        metric: 'Vendor Cost Variance (unfavorable)',
        value: round2(totalImpact),
        source_ref: `purchase-cost-variance-engine.listAllPurchaseCostVariances(${entity_code},'item')[direction=unfavorable]`,
        note: `${unfavorable.length} item(s) breaching cost band`,
      },
      weight: round2(totalImpact),
    };
  } catch {
    return null;
  }
}

function probeSchemeAttribution(fy: string, entity_code: string | undefined): ProbeOutput | null {
  try {
    const roi = getChannelROI({ fy, entity_code });
    if (roi.length === 0) return null;
    const losing = roi.filter((r) => r.roi < 0);
    if (losing.length === 0) {
      const totalSpend = dSum(roi, (r) => r.spend);
      if (totalSpend === 0) return null;
      return {
        step: {
          card: 'salesx',
          source_engine: 'attribution-engine',
          metric: 'Marketing Spend Exposure',
          value: round2(totalSpend),
          source_ref: `attribution-engine.getChannelROI({fy:${fy}}).Σspend`,
          note: 'no negative-ROI channels at this FY · spend exposure used as proxy',
        },
        weight: round2(totalSpend) * 0.25,
      };
    }
    const lossImpact = dSum(losing, (r) => Math.abs(r.spend - r.attributed_revenue));
    return {
      step: {
        card: 'salesx',
        source_engine: 'attribution-engine',
        metric: 'Expired / Negative-ROI Scheme Loss',
        value: round2(lossImpact),
        source_ref: `attribution-engine.getChannelROI({fy:${fy}})[roi<0]`,
        note: `${losing.length} channel(s) under-water`,
      },
      weight: round2(lossImpact),
    };
  } catch {
    return null;
  }
}

function probeMarketingPlanFallback(fy: string): ProbeOutput | null {
  try {
    const plans = listMarketingPlans({ fy });
    if (plans.length === 0) return null;
    const totalBudget = dSum(plans, (p) => p.total_budget ?? 0);
    if (totalBudget === 0) return null;
    return {
      step: {
        card: 'salesx',
        source_engine: 'marketing-planning-engine',
        metric: 'Marketing Plan Budget Exposure',
        value: round2(totalBudget),
        source_ref: `marketing-planning-engine.listMarketingPlans({fy:${fy}}).Σtotal_budget`,
        note: 'plan-budget proxy (no attribution data at FY)',
      },
      weight: round2(totalBudget) * 0.25,
    };
  } catch {
    return null;
  }
}

function probeCashLagAR(entity_code: string | undefined): ProbeOutput | null {
  if (!entity_code) return null;
  try {
    const tts = loadTTPayments(entity_code);
    if (tts.length === 0) return null;
    const summary = summarizeTTPayments(tts);
    const inFlight = (summary.by_status['in_transit'] ?? 0) +
                     (summary.by_status['submitted_to_bank'] ?? 0);
    if (inFlight === 0 && summary.total_outflow_inr === 0) return null;
    const value = round2(summary.total_outflow_inr);
    return {
      step: {
        card: 'payhub',
        source_engine: 'tt-payment-engine',
        metric: 'TT / AR Cash Lag (in-flight outflow)',
        value,
        source_ref: `tt-payment-engine.summarizeTTPayments(loadTTPayments(${entity_code})).total_outflow_inr`,
        note: `${inFlight} TT(s) in-flight`,
      },
      weight: Math.abs(value),
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contribution-% normalizer · sums to ~100 with dEq guarantee.
// Distributes rounding remainder onto the largest step (no fabrication).
// ─────────────────────────────────────────────────────────────────────────────
function normalizeContributions(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const total = dSum(weights);
  if (total === 0) {
    const even = round2(100 / weights.length);
    const pcts = weights.map(() => even);
    const drift = round2(100 - dSum(pcts));
    pcts[pcts.length - 1] = round2(dAdd(pcts[pcts.length - 1], drift));
    return pcts;
  }
  const raw = weights.map((w) => round2(dMul(w / total, 100)));
  const drift = round2(100 - dSum(raw));
  if (drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < raw.length; i++) {
      if (raw[i] > raw[maxIdx]) maxIdx = i;
    }
    raw[maxIdx] = round2(dAdd(raw[maxIdx], drift));
  }
  return raw;
}

// ─────────────────────────────────────────────────────────────────────────────
// drillToRoot — the #1 cross-card walk
// ─────────────────────────────────────────────────────────────────────────────
export function drillToRoot(input: DrillInput): CausalChain {
  const { anomaly_metric, fy } = input;
  const entity_code = input.entity_code ?? 'OPX';

  const probes: { name: string; probe: () => ProbeOutput | null }[] = [
    { name: 'margin',      probe: () => probeMargin(fy) },
    { name: 'vendor_cost', probe: () => probeVendorCostRise(input.entity_code) },
    { name: 'scheme',      probe: () => probeSchemeAttribution(fy, input.entity_code) ?? probeMarketingPlanFallback(fy) },
    { name: 'cash_lag',    probe: () => probeCashLagAR(input.entity_code) },
  ];

  const present: ProbeOutput[] = [];
  const gaps: string[] = [];
  for (const p of probes) {
    const out = p.probe();
    if (out) present.push(out);
    else gaps.push(`§L · chain gap '${p.name}': no source data at fy=${fy}${input.entity_code ? '' : ' (entity_code omitted)'} — step skipped (no fabrication · FR-44)`);
  }

  const weights = present.map((p) => p.weight);
  const pcts = normalizeContributions(weights);

  const chain: DrillStep[] = present.map((p, i) => ({
    ...p.step,
    contribution_pct: pcts[i] ?? 0,
  }));

  // dEq guarantee — must round to ~100 (or 0 when no steps).
  if (chain.length > 0) {
    const sumPct = round2(dSum(chain, (s) => s.contribution_pct));
    if (!dEq(sumPct, 100, 2)) {
      let maxIdx = 0;
      for (let i = 1; i < chain.length; i++) {
        if (chain[i].contribution_pct > chain[maxIdx].contribution_pct) maxIdx = i;
      }
      chain[maxIdx] = {
        ...chain[maxIdx],
        contribution_pct: round2(dAdd(chain[maxIdx].contribution_pct, 100 - sumPct)),
      };
    }
  }

  const chain_complete = gaps.length === 0 && chain.length > 0;

  const trace_id = `dtr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const summaryParts = chain.map((s) => `${s.card}:${s.metric} (${s.contribution_pct}%)`);
  const root_cause_summary = chain.length === 0
    ? `No causal evidence READ for anomaly '${anomaly_metric}' at fy=${fy}`
    : `Anomaly '${anomaly_metric}' decomposed across ${chain.length} department(s) → ` + summaryParts.join(' → ');

  const result: CausalChain = {
    trace_id,
    anomaly: anomaly_metric,
    fy,
    chain_complete,
    gap_notes: gaps,
    root_cause_summary,
    chain,
    computed_at: new Date().toISOString(),
  };

  TRACES.push(result);

  try {
    logAudit({
      entityCode: entity_code,
      action: 'create',
      entityType: 'drilldown_trace_event',
      recordId: trace_id,
      recordLabel: `DrillToRoot · ${anomaly_metric} · fy=${fy}`,
      beforeState: null,
      afterState: {
        anomaly: anomaly_metric,
        fy,
        chain_steps: chain.length,
        chain_complete,
        cards_walked: chain.map((s) => s.card),
        sources_read: chain.map((s) => s.source_engine),
        gaps: gaps.length,
      },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // Audit failures never break the walk (D-AUDIT-SAFE).
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// listDrillTraces — in-session ledger reader (no storage API · §O).
// ─────────────────────────────────────────────────────────────────────────────
export function listDrillTraces(filter?: Partial<Pick<CausalChain, 'anomaly' | 'fy' | 'chain_complete'>>): CausalChain[] {
  if (!filter) return [...TRACES];
  return TRACES.filter((t) => {
    if (filter.anomaly !== undefined && t.anomaly !== filter.anomaly) return false;
    if (filter.fy !== undefined && t.fy !== filter.fy) return false;
    if (filter.chain_complete !== undefined && t.chain_complete !== filter.chain_complete) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue of well-known anomaly metrics surfaced in the DrillToRoot UI.
// ─────────────────────────────────────────────────────────────────────────────
export interface AnomalyDef {
  id: string;
  label: string;
  hint: string;
}

export const DRILL_ANOMALIES: readonly AnomalyDef[] = Object.freeze([
  { id: 'gross-margin-fell',        label: 'Gross Margin Fell',             hint: 'Walks margin → vendor cost → scheme → cash lag' },
  { id: 'operating-profit-fell',    label: 'Operating Profit Fell',         hint: 'Multi-card walk · same engines · different framing' },
  { id: 'cash-position-tightened',  label: 'Cash Position Tightened',       hint: 'Emphasises TT cash lag tail' },
  { id: 'channel-roi-eroded',       label: 'Channel ROI Eroded',            hint: 'Emphasises attribution / scheme step' },
  { id: 'vendor-cost-spike',        label: 'Vendor Cost Spike',             hint: 'Emphasises procurement step' },
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL (DP-D3-6 / DP-D3-9) — these MUST NOT exist on the surface.
// Test asserts (engine as Record<string,unknown>)[name] === undefined.
// NO: generateNarrative · computeOperixScore · openInsightsInbox · runPredictive
//     trainModel · askNaturalLanguage · forecastAnomaly
// ─────────────────────────────────────────────────────────────────────────────
