/**
 * @file        src/lib/insights-inbox-engine.ts
 * @sibling     NEW @ Sprint 134 · T-Phase-7.D.3.5 · 🌟 Arc D.3 · #203
 * @pillar      D.3 · #4 Insights Inbox (TOP-1% · proactive). Surfaces the top-N
 *              things that changed & matter today — impact-ranked, each with
 *              cross-card ROOT CAUSE (from drill) + recommended action.
 *              The insight finds you (vs you opening a dashboard).
 *
 * @fr-44       AGGREGATES + RANKS existing signals — the alert engines
 *              (contract-expiry · production-variance) + variance-narrative-engine
 *              + operix-score-engine (impact band) + cross-card-drilldown-engine
 *              (root cause) + insightx-aggregator-engine. Recomputes NOTHING.
 *              All sources stay 0-DIFF.
 *
 * @scope-wall  DP-D3-6 / DP-D3-9 · S134 ships inbox + decision-loop ONLY.
 *              NO predictive-ML / NL-query (S135). Scope-wall test asserts
 *              those exports DO NOT exist on the engine surface
 *              (toBeUndefined · time-robust).
 *
 * @audit       Emits 'insights_inbox_event' (module 'mca-roc') on buildInbox.
 *              ComplianceModule UNTOUCHED.
 *
 * @reads-from  contract-expiry-alert-engine · production-variance-alert-engine ·
 *              variance-narrative-engine · operix-score-engine ·
 *              cross-card-drilldown-engine · insightx-aggregator-engine ·
 *              decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.3.5 · Sprint 134 · 🌟 Arc D.3
 * [JWT] Phase 8: GET /api/insightx/inbox · GET /api/insightx/inbox/:id
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { dMul, round2 } from '@/lib/decimal-helpers';

// FR-44 walls — READ-ONLY namespace imports. All sources stay 0-DIFF.
import * as contractExpiryAlerts from '@/lib/contract-expiry-alert-engine';
import * as productionVarianceAlerts from '@/lib/production-variance-alert-engine';
import * as varianceNarrative from '@/lib/variance-narrative-engine';
import * as operixScore from '@/lib/operix-score-engine';
import * as crossCardDrilldown from '@/lib/cross-card-drilldown-engine';
import * as insightxAggregator from '@/lib/insightx-aggregator-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  contractExpiryAlerts,
  productionVarianceAlerts,
  varianceNarrative,
  operixScore,
  crossCardDrilldown,
  insightxAggregator,
});

export const READS_FROM = Object.freeze([
  'contract-expiry-alert-engine',
  'production-variance-alert-engine',
  'variance-narrative-engine',
  'operix-score-engine',
  'cross-card-drilldown-engine',
  'insightx-aggregator-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export type InboxCategory = 'risk' | 'opportunity' | 'anomaly';

export interface InboxItem {
  item_id: string;
  title: string;
  /** 0–100 impact for ranking (decimal-helpers). */
  impact_score: number;
  category: InboxCategory;
  /** Root cause string assembled by cross-card-drilldown-engine when available. */
  root_cause: string;
  /** Suggested next action (deterministic template). */
  recommended_action: string;
  /** Provenance string identifying the source engine + call. */
  source_ref: string;
  /** Optional honest note (e.g. "no drill chain available · §L"). */
  note?: string;
  /** Source engine that emitted the underlying signal. */
  source_engine: string;
}

export interface BuildInboxInput {
  fy: string;
  /** Default 10 · clamped 1..50. */
  top_n?: number;
  /** Optional entity_code passed through to entity-scoped alert readers. */
  entity_code?: string;
  /** Optional anomaly metric for the drill probe; defaults to 'Consolidated Gross Margin'. */
  drill_anomaly?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-session ledger (no storage API · §O).
// ─────────────────────────────────────────────────────────────────────────────
const ITEMS: InboxItem[] = [];

export function __resetInboxForTests(): void {
  ITEMS.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
function clampImpact(n: number): number {
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n >= 100) return 100;
  return round2(n);
}

function newItemId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Drill-derived root cause string. READS cross-card-drilldown-engine; on
 * failure returns honest gap-note (FR-44 reads-not-recompute).
 */
function deriveRootCause(fy: string, anomaly: string, entity_code?: string): string {
  try {
    const chain = crossCardDrilldown.drillToRoot({
      anomaly_metric: anomaly,
      fy,
      entity_code,
    });
    if (chain.chain.length === 0) {
      return `no causal chain · ${chain.root_cause_summary || 'insufficient source data'}`;
    }
    const top = [...chain.chain]
      .sort((a, b) => b.contribution_pct - a.contribution_pct)
      .slice(0, 2)
      .map((s) => `${s.card}/${s.metric} (${round2(s.contribution_pct)}%)`)
      .join(' → ');
    return chain.chain_complete
      ? `root: ${top}`
      : `root (partial · §L): ${top}`;
  } catch {
    return 'root cause unavailable · drill probe failed (§L)';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gatherers — each READS one source and yields candidate InboxItem(s).
// ─────────────────────────────────────────────────────────────────────────────

function gatherFromOperixScore(fy: string, entity_code?: string): InboxItem[] {
  try {
    const score = operixScore.computeOperixScore({ fy, entity_code });
    const items: InboxItem[] = [];
    // Headline item only when not 'strong' — otherwise opportunity to maintain.
    const isStrong = score.band === 'strong';
    const headline: InboxItem = {
      item_id: newItemId('os'),
      title: isStrong
        ? `Operix Score ${score.score} (${score.band}) — maintain posture`
        : `Operix Score ${score.score} (${score.band}) — review dimensions`,
      impact_score: clampImpact(round2(100 - score.score)),
      category: isStrong ? 'opportunity' : 'risk',
      root_cause: deriveRootCause(fy, 'Consolidated Gross Margin', entity_code),
      recommended_action: isStrong
        ? 'Open Operix Score → reinforce top-weighted dimensions.'
        : 'Open Operix Score → drill the weakest dimension.',
      source_ref: `operix-score-engine.computeOperixScore({fy:${fy}}).score`,
      source_engine: 'operix-score-engine',
    };
    items.push(headline);
    // Per-component anomalies: any component with raw < 60 surfaces as risk.
    for (const c of score.components) {
      if (c.raw >= 60) continue;
      items.push({
        item_id: newItemId(`os-${c.dimension}`),
        title: `${c.dimension} weakness · raw ${c.raw} (${c.band})`,
        impact_score: clampImpact(round2(dMul(100 - c.raw, c.weight) * 2)),
        category: 'risk',
        root_cause: c.source_ref,
        recommended_action: `Investigate ${c.dimension} — open the contributing card.`,
        source_ref: `operix-score-engine.computeOperixScore.components[${c.dimension}]`,
        source_engine: 'operix-score-engine',
      });
    }
    return items;
  } catch {
    return [];
  }
}

function gatherFromNarratives(fy: string, entity_code?: string): InboxItem[] {
  try {
    const narratives = varianceNarrative.listNarratives({ fy });
    return narratives.slice(0, 5).map((n) => {
      const driverCount = n.drivers?.length ?? 0;
      const impact = clampImpact(
        round2(Math.min(100, driverCount * 8 + (n.chain_complete ? 20 : 10))),
      );
      return {
        item_id: newItemId('vn'),
        title: `Narrative · ${n.subject}`,
        impact_score: impact,
        category: 'anomaly' as InboxCategory,
        root_cause: deriveRootCause(fy, n.subject, entity_code),
        recommended_action: 'Open the narrative — review driver ranking before the next budget cycle.',
        source_ref: `variance-narrative-engine.listNarratives({fy:${fy}})[${n.subject}]`,
        source_engine: 'variance-narrative-engine',
        note: n.chain_complete ? undefined : 'partial chain · §L',
      };
    });
  } catch {
    return [];
  }
}

function gatherFromAlertEngines(entity_code: string | undefined): InboxItem[] {
  if (!entity_code) return [];
  const items: InboxItem[] = [];
  // Production variance alerts (critical, unacknowledged).
  try {
    const crit = productionVarianceAlerts.getCriticalUnacknowledgedVariances(entity_code, 5);
    for (const a of crit) {
      items.push({
        item_id: newItemId('pv'),
        title: `Production variance · ${a.kind}`,
        impact_score: clampImpact(Math.min(100, Math.abs(a.variance_pct ?? 0) * 2 + 40)),
        category: 'anomaly',
        root_cause: a.summary ?? 'unfavorable production variance detected',
        recommended_action: 'Open Production · acknowledge or investigate the run.',
        source_ref: `production-variance-alert-engine.getCriticalUnacknowledgedVariances(${entity_code})`,
        source_engine: 'production-variance-alert-engine',
      });
    }
  } catch { /* honest skip */ }
  // Contract expiry alerts (urgent tier).
  try {
    const ack = contractExpiryAlerts.loadAcknowledgments(entity_code);
    const urgent = ack
      .filter((a) => !a.acknowledged && a.tier === 'urgent')
      .slice(0, 5);
    for (const a of urgent) {
      items.push({
        item_id: newItemId('ce'),
        title: `Contract expiring · ${a.vendor_name} (${a.days_to_expiry}d)`,
        impact_score: clampImpact(Math.max(40, 100 - a.days_to_expiry * 2)),
        category: 'risk',
        root_cause: `Agreement ${a.agreement_number} expires ${a.agreement_end_date}`,
        recommended_action: 'Generate renewal Enquiry — Procure360.',
        source_ref: `contract-expiry-alert-engine.loadAcknowledgments(${entity_code})[urgent]`,
        source_engine: 'contract-expiry-alert-engine',
      });
    }
  } catch { /* honest skip */ }
  return items;
}

function gatherFromAggregator(fy: string): InboxItem[] {
  try {
    const reg = insightxAggregator.getRegistryCoverage();
    if (reg.backed === 0) return [];
    return [
      {
        item_id: newItemId('ag'),
        title: `InsightX coverage · ${reg.backed}/${reg.total} scenarios backed (FY ${fy})`,
        impact_score: clampImpact(Math.min(100, (reg.backed / Math.max(1, reg.total)) * 60)),
        category: 'opportunity',
        root_cause: `aggregator coverage · ${reg.unbacked} pending engine backing`,
        recommended_action: 'Open InsightX Cockpit → review newly backed scenarios.',
        source_ref: 'insightx-aggregator-engine.getRegistryCoverage()',
        source_engine: 'insightx-aggregator-engine',
      },
    ];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// rankByImpact — pure sort desc by impact_score. decimal-helpers (round2).
// ─────────────────────────────────────────────────────────────────────────────
export function rankByImpact(items: InboxItem[]): InboxItem[] {
  return [...items]
    .map((it) => ({ ...it, impact_score: round2(it.impact_score) }))
    .sort((a, b) => b.impact_score - a.impact_score);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildInbox — the proactive entry point.
// ─────────────────────────────────────────────────────────────────────────────
export function buildInbox(input: BuildInboxInput): InboxItem[] {
  const { fy } = input;
  const entity_code = input.entity_code;
  const top_n = Math.max(1, Math.min(50, Math.floor(input.top_n ?? 10)));

  // FR-44: aggregate signals — no recompute.
  const raw: InboxItem[] = [
    ...gatherFromOperixScore(fy, entity_code),
    ...gatherFromNarratives(fy, entity_code),
    ...gatherFromAlertEngines(entity_code),
    ...gatherFromAggregator(fy),
  ];

  const ranked = rankByImpact(raw).slice(0, top_n);

  // Persist in in-session ledger (no storage API).
  for (const it of ranked) {
    if (!ITEMS.find((x) => x.item_id === it.item_id)) ITEMS.push(it);
  }

  try {
    logAudit({
      entityCode: entity_code ?? 'OPX',
      action: 'create',
      entityType: 'insights_inbox_event',
      recordId: `inbox-${fy}-${Date.now()}`,
      recordLabel: `Insights Inbox · ${fy} · ${ranked.length} item(s)`,
      beforeState: null,
      afterState: {
        fy,
        items_count: ranked.length,
        top_impact: ranked[0]?.impact_score ?? 0,
        sources_read: [
          'operix-score-engine',
          'variance-narrative-engine',
          'contract-expiry-alert-engine',
          'production-variance-alert-engine',
          'cross-card-drilldown-engine',
          'insightx-aggregator-engine',
        ],
      },
      reason: null,
      sourceModule: 'mca-roc',
    });
  } catch {
    // D-AUDIT-SAFE — never break the inbox on audit failure.
  }

  return ranked;
}

// ─────────────────────────────────────────────────────────────────────────────
// getInboxItem — strict lookup against the in-session ledger.
// ─────────────────────────────────────────────────────────────────────────────
export function getInboxItem(item_id: string): InboxItem {
  const found = ITEMS.find((x) => x.item_id === item_id);
  if (!found) throw new Error(`insights-inbox-engine · unknown item_id '${item_id}'`);
  return found;
}

export function listInboxItems(): InboxItem[] {
  return [...ITEMS];
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL (DP-D3-6 / DP-D3-9) — these MUST NOT exist on the surface.
// Test asserts (engine as Record<string,unknown>)[name] === undefined.
// NO: trainModel · runPredictive · forecastAnomaly · askNaturalLanguage
//     · explainInsight · classifyIntent · evaluateOutcome (lives in tracker).
// ─────────────────────────────────────────────────────────────────────────────
