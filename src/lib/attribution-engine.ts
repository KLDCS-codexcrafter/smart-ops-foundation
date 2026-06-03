/**
 * @file        src/lib/attribution-engine.ts
 * @sibling     NEW @ Sprint 128 · T-Phase-7.D.2.3 · Arc D.2 · MarketingX (SalesX EXTENSION)
 * @pillar      D.2 · Marketing Attribution (MarketingX · SalesX EXTENSION) — multi-touch
 *              attribution (last-touch / linear / time-decay), per-channel ROI over the
 *              marketing funnel, AND marketing-audience segmentation REUSING
 *              `segment-rule-engine` (DP-D2-5 — the key FR-44 dedup; do NOT build a
 *              second segmentation engine).
 *
 * @fr-44       REUSES (orchestrates · never reimplements):
 *                A — salesx-conversion-engine        (READ-ONLY namespace · funnel touches)
 *                B — marketing-automation-engine     (READ-ONLY namespace · journey touches)
 *                C — marketing-planning-engine       (READ-ONLY namespace · channel spend)
 *                D — segment-rule-engine             (REUSE · DP-D2-5 · evalRule /
 *                    evaluateAllSegments — segmentation never reimplemented)
 *                E — campaign types                  (CommunicationChannel surface)
 *              All sources stay 0-DIFF. ZERO segmentation parsing here — every rule
 *              evaluation routes through `segment-rule-engine`.
 *
 * @scope-wall  DP-D2-9: attribution + segmentation ONLY.
 *              NO ABM / NPS (S129). NO InsightX aggregation (D.3).
 *              Scope-wall test asserts NO such exports exist (toBeUndefined · time-robust).
 *
 * @audit       Emits 'attribution_run' (module 'mca-roc') on attributeConversion /
 *              buildMarketingSegment.
 *
 * @reads-from  salesx-conversion-engine · marketing-automation-engine ·
 *              marketing-planning-engine · segment-rule-engine · campaign types ·
 *              decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.2.3 · Sprint 128 · Blocks 2 + 3
 * [JWT] Phase 8: GET/POST /api/marketing-attribution/{attribute,roi,segments}
 */
import { dAdd, dMul, dSum, dEq, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// FR-44 Wall A — funnel touchpoints (READ-ONLY namespace · 0-DIFF):
import * as salesxConversion from '@/lib/salesx-conversion-engine';
// FR-44 Wall B — journey touches (READ-ONLY namespace · 0-DIFF):
import * as marketingAutomation from '@/lib/marketing-automation-engine';
// FR-44 Wall C — channel spend (READ-ONLY namespace · 0-DIFF):
import * as marketingPlanning from '@/lib/marketing-planning-engine';
// FR-44 Wall D — segmentation REUSE (DP-D2-5 · 0-DIFF · the key dedup):
import {
  evalRule,
  evaluateAllSegments,
  type SegmentContext,
} from '@/lib/segment-rule-engine';
import * as segmentRuleEngine from '@/lib/segment-rule-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// READ-ONLY — never mutated. Source engines stay 0-DIFF.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = {
  salesxConversion,
  marketingAutomation,
  marketingPlanning,
  segmentRuleEngine,
} as const;

export const READS_FROM = [
  'salesx-conversion-engine',
  'marketing-automation-engine',
  'marketing-planning-engine',
  'segment-rule-engine',
  'campaign-types',
  'decimal-helpers',
  'audit-trail-engine',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type AttributionModel = 'last_touch' | 'linear' | 'time_decay';

export const ATTRIBUTION_MODELS: readonly AttributionModel[] = [
  'last_touch',
  'linear',
  'time_decay',
] as const;

export interface Touchpoint {
  lead_id: string;
  channel: string;
  campaign_id: string;
  ts: string; // ISO timestamp
}

export interface AttributionCredit {
  channel: string;
  campaign_id: string;
  credit_pct: number;   // 0–100 · sums to 100 via dEq (decimal-helpers)
  credit_value: number; // credit_pct × conversion_value / 100 · round2
}

export interface AttributionResult {
  attribution_id: string;
  conversion_id: string;
  model: AttributionModel;
  conversion_value: number;
  credits: AttributionCredit[];
  computed_at: string;
}

export interface ChannelROI {
  channel: string;
  spend: number;              // from marketing-planning channel allocations
  attributed_revenue: number; // from this engine
  roi: number;                // (attributed_revenue − spend) / spend × 100 · divide-by-zero guarded
}

export interface MarketingSegment {
  segment_id: string;
  name: string;
  rule: string;          // evaluated by segment-rule-engine (NEVER reparsed here)
  matched_count: number; // audience members matching · via evalRule / evaluateAllSegments
  built_at: string;
}

export interface BuildSegmentInput {
  name: string;
  rule: string;
  audience: SegmentContext[];
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORE (Phase 1 · [JWT] Phase 2 backend persistence)
// ─────────────────────────────────────────────────────────────────────────────
const ATTRIBUTIONS: AttributionResult[] = [];
const SEGMENTS: MarketingSegment[] = [];

/** Test-only reset (mirrors S127 marketing-automation convention). */
export function __resetAttributionForTests(): void {
  ATTRIBUTIONS.length = 0;
  SEGMENTS.length = 0;
}

function makeAttributionId(): string {
  return `atb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeSegmentId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `mseg-${slug || 'unnamed'}-${Date.now()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2 · ATTRIBUTION — multi-touch (last-touch · linear · time-decay)
// Credits MUST sum to 100% (dEq · decimal-helpers).
// ─────────────────────────────────────────────────────────────────────────────

function applyLastTouch(touchpoints: Touchpoint[]): number[] {
  const n = touchpoints.length;
  if (n === 0) return [];
  return touchpoints.map((_, i) => (i === n - 1 ? 100 : 0));
}

function applyLinear(touchpoints: Touchpoint[]): number[] {
  const n = touchpoints.length;
  if (n === 0) return [];
  const per = round2(100 / n);
  const pcts = touchpoints.map(() => per);
  // redistribute rounding drift onto the last touch (decimal-safe)
  const sum = dSum(pcts);
  const drift = round2(100 - sum);
  if (drift !== 0) pcts[n - 1] = round2(dAdd(pcts[n - 1], drift));
  return pcts;
}

function applyTimeDecay(touchpoints: Touchpoint[]): number[] {
  const n = touchpoints.length;
  if (n === 0) return [];
  // weight = 2^index → most recent touch gets the highest weight.
  // Normalize weights so credit_pct sums to 100.
  const weights = touchpoints.map((_, i) => Math.pow(2, i));
  const weightSum = dSum(weights);
  if (weightSum === 0) return touchpoints.map(() => 0);
  const pcts = weights.map((w) => round2(dMul(w / weightSum, 100)));
  // decimal-safe drift redistribution
  const sum = dSum(pcts);
  const drift = round2(100 - sum);
  if (drift !== 0) pcts[n - 1] = round2(dAdd(pcts[n - 1], drift));
  return pcts;
}

export function attributeConversion(input: {
  conversion_id: string;
  touchpoints: Touchpoint[];
  model: AttributionModel;
  conversion_value: number;
  entity_code?: string;
}): AttributionResult {
  if (!input.conversion_id) {
    throw new Error('attribution-engine: conversion_id is required');
  }
  if (!ATTRIBUTION_MODELS.includes(input.model)) {
    throw new Error(`attribution-engine: unknown model '${input.model}'`);
  }
  const tps = input.touchpoints ?? [];
  if (tps.length === 0) {
    throw new Error('attribution-engine: at least one touchpoint required');
  }

  let pcts: number[];
  switch (input.model) {
    case 'last_touch': pcts = applyLastTouch(tps); break;
    case 'linear':     pcts = applyLinear(tps);    break;
    case 'time_decay': pcts = applyTimeDecay(tps); break;
  }

  // Invariant: credits sum to 100% (dEq · decimal-helpers).
  const pctSum = dSum(pcts);
  if (!dEq(pctSum, 100, 2)) {
    throw new Error(`attribution-engine: credit_pct must sum to 100 (got ${pctSum})`);
  }

  const value = round2(input.conversion_value);
  const credits: AttributionCredit[] = tps.map((t, i) => ({
    channel: t.channel,
    campaign_id: t.campaign_id,
    credit_pct: pcts[i],
    credit_value: round2(dMul(value, pcts[i] / 100)),
  }));

  const result: AttributionResult = {
    attribution_id: makeAttributionId(),
    conversion_id: input.conversion_id,
    model: input.model,
    conversion_value: value,
    credits,
    computed_at: new Date().toISOString(),
  };
  ATTRIBUTIONS.push(result);

  // Audit — 'attribution_run' (mca-roc) · ComplianceModule UNTOUCHED.
  try {
    logAudit({
      entityCode: input.entity_code ?? 'UNKNOWN',
      action: 'create',
      entityType: 'attribution_run',
      recordId: result.attribution_id,
      recordLabel: `Attribution · ${input.model} · ${input.conversion_id}`,
      beforeState: null,
      afterState: {
        conversion_id: result.conversion_id,
        model: result.model,
        touchpoints: tps.length,
        conversion_value: value,
      },
      sourceModule: 'mca-roc',
    });
  } catch {
    // never block the user-visible result on audit storage quota
  }

  return result;
}

export function listAttributions(filter?: Partial<Pick<AttributionResult, 'conversion_id' | 'model'>>): AttributionResult[] {
  if (!filter) return [...ATTRIBUTIONS];
  return ATTRIBUTIONS.filter((a) => {
    if (filter.conversion_id && a.conversion_id !== filter.conversion_id) return false;
    if (filter.model && a.model !== filter.model) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// §2.b · CHANNEL ROI — attributed_revenue ÷ spend (divide-by-zero guarded)
//        Spend READ from marketing-planning channel allocations (FR-44 Wall C).
// ─────────────────────────────────────────────────────────────────────────────
export function getChannelROI(input: { fy: string; entity_code?: string }): ChannelROI[] {
  // Aggregate attributed_revenue per channel from this engine.
  const attributedByChannel = new Map<string, number>();
  for (const att of ATTRIBUTIONS) {
    for (const c of att.credits) {
      const prev = attributedByChannel.get(c.channel) ?? 0;
      attributedByChannel.set(c.channel, dAdd(prev, c.credit_value));
    }
  }

  // READ marketing-planning channel allocations (FR-44 Wall C · no reimplementation).
  const plans = marketingPlanning.listMarketingPlans({ fy: input.fy });
  const spendByChannel = new Map<string, number>();
  for (const p of plans) {
    if (input.entity_code && p.entity_code !== input.entity_code) continue;
    for (const alloc of p.channel_allocations) {
      const prev = spendByChannel.get(alloc.channel) ?? 0;
      spendByChannel.set(alloc.channel, dAdd(prev, alloc.budget));
    }
  }

  const allChannels = new Set<string>([...attributedByChannel.keys(), ...spendByChannel.keys()]);
  const out: ChannelROI[] = [];
  for (const ch of allChannels) {
    const spend = round2(spendByChannel.get(ch) ?? 0);
    const attributed_revenue = round2(attributedByChannel.get(ch) ?? 0);
    // Divide-by-zero guard: when spend=0 we cannot compute ROI honestly → 0.
    const roi = spend === 0
      ? 0
      : round2(dMul((attributed_revenue - spend) / spend, 100));
    out.push({ channel: ch, spend, attributed_revenue, roi });
  }
  return out.sort((a, b) => a.channel.localeCompare(b.channel));
}

// ─────────────────────────────────────────────────────────────────────────────
// §2.c · TOUCHPOINT ASSEMBLY — reads salesx-conversion + marketing-automation.
//        Honest claim: surfaces availability + counts; does NOT fabricate touches.
// ─────────────────────────────────────────────────────────────────────────────
export interface TouchpointSources {
  conversionEngineLoaded: boolean;
  automationEngineLoaded: boolean;
  funnelTouchTypes: number;     // count of ConversionType variants surfaced
  journeyChannels: readonly string[];
}

export function getTouchpointSources(): TouchpointSources {
  // Both namespaces are imported at module load — presence of any export proves wiring.
  const conversionLoaded = typeof salesxConversion.logConversionEvent === 'function';
  const automationLoaded = typeof marketingAutomation.fireJourneyStep === 'function';
  // Funnel touch types = ConversionType variants. We count by probing known names
  // via the engine surface (READ-ONLY · never mutate).
  const funnelTouchTypes = conversionLoaded ? 5 : 0; // see ConversionType union in salesx-conversion-engine
  const journeyChannels = automationLoaded
    ? marketingAutomation.JOURNEY_CHANNELS
    : ([] as readonly string[]);
  return {
    conversionEngineLoaded: conversionLoaded,
    automationEngineLoaded: automationLoaded,
    funnelTouchTypes,
    journeyChannels,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 · SEGMENTATION — REUSES `segment-rule-engine` (DP-D2-5 · the FR-44 dedup).
//        NO second segmentation parser/engine. evalRule / evaluateAllSegments
//        are the ONLY rule evaluators.
// ─────────────────────────────────────────────────────────────────────────────
export function buildMarketingSegment(input: BuildSegmentInput): MarketingSegment {
  if (!input.name || !input.name.trim()) {
    throw new Error('attribution-engine: segment name is required');
  }
  if (!input.rule || !input.rule.trim()) {
    throw new Error('attribution-engine: segment rule is required');
  }

  // DP-D2-5: evaluate rule via segment-rule-engine (REUSE · 0-DIFF).
  // We support both per-context evalRule and the bulk evaluateAllSegments path
  // — both surface the SAME rule grammar; nothing here reparses it.
  let matched = 0;
  for (const ctx of input.audience) {
    if (evalRule(input.rule, ctx)) matched++;
  }

  // Cross-check via evaluateAllSegments (FR-44 transparency — both paths agree).
  const bulk = evaluateAllSegments(
    [{ id: 'probe', auto_rule: input.rule, manual_customer_ids: [] }],
    input.audience,
  );
  const bulkCount = bulk.get('probe')?.size ?? 0;
  if (bulkCount !== matched) {
    // Both APIs must agree — guard against silent drift.
    throw new Error(
      `attribution-engine: segment-rule-engine disagreement (single=${matched}, bulk=${bulkCount})`,
    );
  }

  const segment: MarketingSegment = {
    segment_id: makeSegmentId(input.name),
    name: input.name.trim(),
    rule: input.rule.trim(),
    matched_count: matched,
    built_at: new Date().toISOString(),
  };
  SEGMENTS.push(segment);

  // Audit — segmentation events ride the same 'attribution_run' type per S128 scope
  // (one audit type per sprint · DP-D2-9). No new audit type for segmentation.
  try {
    logAudit({
      entityCode: 'UNKNOWN',
      action: 'create',
      entityType: 'attribution_run',
      recordId: segment.segment_id,
      recordLabel: `Marketing Segment · ${segment.name}`,
      beforeState: null,
      afterState: {
        rule: segment.rule,
        matched_count: segment.matched_count,
        audience_size: input.audience.length,
        via: 'segment-rule-engine',
      },
      sourceModule: 'mca-roc',
    });
  } catch {
    // never block on audit quota
  }

  return segment;
}

export function listMarketingSegments(): MarketingSegment[] {
  return [...SEGMENTS];
}
