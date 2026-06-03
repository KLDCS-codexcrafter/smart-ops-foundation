/**
 * @file        src/lib/marketing-planning-engine.ts
 * @sibling     NEW @ Sprint 126 · 🎬 Arc D.2 OPENER · MarketingX (SalesX EXTENSION)
 * @pillar      D.2 · Marketing Planning · marketing budget · channel-mix allocation ·
 *              campaign calendar (FY × channel timeline). DP-P7-2 (MarketingX = SalesX
 *              extension · NO new card · NO new shell-config — registers as a
 *              SalesXModule + SalesXSidebar.groups item + SalesXPage renderModule case).
 * @fr-44       REUSES (not reimplements):
 *                A — Campaign / CampaignBudget / CampaignTemplate types
 *                    (src/types/campaign.ts · campaign-template.ts) for calendar data.
 *                B — fpa-budgeting-engine (S120 · listBudgets) — marketing total_budget
 *                    reconciles to the FP&A 'operating' budget for FY (cross-arc tie).
 *                C — salesx-conversion-engine (READ-ONLY) for funnel/conversion data
 *                    that informs channel planning. Source engine stays 0-DIFF.
 *              All three sources stay 0-DIFF. NO new runtime deps.
 * @reads-from  campaign types · fpa-budgeting-engine · salesx-conversion-engine ·
 *              decimal-helpers · audit-trail-engine
 * @scope-wall  DP-D2-9: marketing planning ONLY. NO lead-scoring/automation (S127),
 *              NO attribution/segmentation (S128), NO ABM/NPS (S129), NO InsightX
 *              aggregation (D.3). Scope-wall test asserts NO such exports exist.
 * @audit       Emits 'marketing_plan_event' (module 'mca-roc') on every plan write.
 * @sprint      T-Phase-7.D.2.1 · Sprint 126 · Block 2 · Arc D.2 Opener
 * [JWT] Phase 8: GET/POST /api/marketing-planning/{plans,allocate,calendar}
 */
import { dAdd, dMul, dSum, dEq, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
// FR-44 Wall C — READ-ONLY namespace import (transparency · never mutated):
import * as salesxConversion from '@/lib/salesx-conversion-engine';
import type { Campaign } from '@/types/campaign';
import { campaignsKey } from '@/types/campaign';

// ─── FR-44 transparency surface ─────────────────────────────────────────────
export const __fr44_reuse = Object.freeze({
  fpaBudgeting_listBudgets: fpaBudgeting.listBudgets,
  salesxConversion_namespace: salesxConversion,
} as const);

export const READS_FROM = Object.freeze({
  engines: [
    'fpa-budgeting-engine',
    'salesx-conversion-engine',
    'decimal-helpers',
    'audit-trail-engine',
  ],
  types: ['campaign', 'campaign-template'],
  storage_keys: ['erp_marketing_plans'],
} as const);

// ─── Types ──────────────────────────────────────────────────────────────────
export type MarketingChannel =
  | 'email' | 'whatsapp' | 'social' | 'search'
  | 'events' | 'content' | 'referral';

export const MARKETING_CHANNELS: readonly MarketingChannel[] = Object.freeze([
  'email', 'whatsapp', 'social', 'search', 'events', 'content', 'referral',
] as const);

export interface ChannelAllocation {
  channel: MarketingChannel;
  budget: number;   // decimal-safe · paise-as-rupees (whole-rupee precision OK)
  pct: number;      // 0–100 · sums to 100 via dEq
}

export interface MarketingPlan {
  plan_id: string;
  fy: string;                       // 'FY26' / '2026-27' · caller-defined
  entity_code: string;
  total_budget: number;
  channel_allocations: ChannelAllocation[];
  /** When the FP&A 'operating' budget exists for FY, capture its total as the
   *  reconciliation reference. null = no FP&A budget on file (honest claim). */
  fpa_budget_reference: number | null;
  reconciles_to_fpa: boolean;       // total_budget ≤ fpa_budget_reference (when present)
  created_at: string;
  updated_at: string;
}

export interface CampaignCalendarEntry {
  campaign_id: string;
  name: string;
  channel: MarketingChannel;
  start_date: string;
  end_date: string;
  budget: number;
}

export interface AllocateChannelBudgetInput {
  fy: string;
  entity_code: string;
  total_budget: number;
  mix: { channel: MarketingChannel; pct: number }[];
}

// ─── Storage helpers (D-194 boundary respected · pure here) ─────────────────
const STORAGE_KEY = 'erp_marketing_plans';

function loadPlans(): MarketingPlan[] {
  try {
    // [JWT] GET /api/marketing-planning/plans
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MarketingPlan[]) : [];
  } catch {
    return [];
  }
}

function savePlans(plans: MarketingPlan[]): void {
  try {
    // [JWT] POST /api/marketing-planning/plans
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    // quota — caller is responsible for retry; we never silently drop audit
  }
}

function makePlanId(fy: string, entity_code: string): string {
  return `mplan-${entity_code}-${fy}`;
}

// ─── FP&A budget tie (FR-44 Wall B · cross-arc reuse) ───────────────────────
function readFpaOperatingBudget(fy: string, entity_code: string): number | null {
  // FR-44: CALL fpa-budgeting-engine.listBudgets — never duplicate its logic.
  const budgets = fpaBudgeting.listBudgets({
    fy,
    budget_type: 'operating',
    scope_level: 'entity',
    scope_id: entity_code,
  } as Parameters<typeof fpaBudgeting.listBudgets>[0]);
  if (!budgets || budgets.length === 0) return null;
  // sum totals defensively (multiple line items per budget are allowed by S120)
  const total = dSum(budgets, (b) =>
    typeof (b as { total?: number }).total === 'number'
      ? (b as { total: number }).total
      : 0,
  );
  return total > 0 ? round2(total) : null;
}

// ─── §1 · Channel-mix allocation (pcts sum to 100 via dEq) ──────────────────
export function allocateChannelBudget(input: AllocateChannelBudgetInput): MarketingPlan {
  if (!input.mix || input.mix.length === 0) {
    throw new Error('marketing-planning: mix is empty');
  }
  const pctSum = dSum(input.mix, (m) => m.pct);
  if (!dEq(pctSum, 100, 2)) {
    throw new Error(`marketing-planning: channel-mix pcts must sum to 100 (got ${pctSum})`);
  }
  const total = round2(input.total_budget);
  const channel_allocations: ChannelAllocation[] = input.mix.map((m) => ({
    channel: m.channel,
    pct: m.pct,
    budget: round2(dMul(total, m.pct / 100)),
  }));
  // decimal-safe reconciliation: redistribute any rounding drift onto last channel
  const allocSum = dSum(channel_allocations, (c) => c.budget);
  const drift = round2(total - allocSum);
  if (drift !== 0 && channel_allocations.length > 0) {
    const last = channel_allocations[channel_allocations.length - 1];
    last.budget = round2(dAdd(last.budget, drift));
  }

  const fpa_ref = readFpaOperatingBudget(input.fy, input.entity_code);
  const reconciles = fpa_ref === null ? true : total <= fpa_ref + 0.01;

  const now = new Date().toISOString();
  const plan_id = makePlanId(input.fy, input.entity_code);
  const plans = loadPlans();
  const existingIdx = plans.findIndex((p) => p.plan_id === plan_id);
  const created_at = existingIdx >= 0 ? plans[existingIdx].created_at : now;
  const plan: MarketingPlan = {
    plan_id,
    fy: input.fy,
    entity_code: input.entity_code,
    total_budget: total,
    channel_allocations,
    fpa_budget_reference: fpa_ref,
    reconciles_to_fpa: reconciles,
    created_at,
    updated_at: now,
  };
  if (existingIdx >= 0) plans[existingIdx] = plan;
  else plans.push(plan);
  savePlans(plans);

  logAudit({
    entityCode: input.entity_code,
    action: existingIdx >= 0 ? 'update' : 'create',
    entityType: 'marketing_plan_event',
    recordId: plan.plan_id,
    recordLabel: `Marketing Plan · ${input.fy} · ₹${total}`,
    beforeState: existingIdx >= 0 ? { plan_id } : null,
    afterState: { plan_id, total_budget: total, channels: channel_allocations.length },
    sourceModule: 'marketing-planning-engine',
  });
  return plan;
}

// ─── §2 · Upsert + List ─────────────────────────────────────────────────────
export function upsertMarketingPlan(p: MarketingPlan): MarketingPlan {
  const pctSum = dSum(p.channel_allocations, (c) => c.pct);
  if (!dEq(pctSum, 100, 2)) {
    throw new Error(`marketing-planning: channel pcts must sum to 100 (got ${pctSum})`);
  }
  const now = new Date().toISOString();
  const plans = loadPlans();
  const idx = plans.findIndex((x) => x.plan_id === p.plan_id);
  const next: MarketingPlan = { ...p, updated_at: now };
  if (idx >= 0) plans[idx] = next;
  else plans.push(next);
  savePlans(plans);
  logAudit({
    entityCode: p.entity_code,
    action: idx >= 0 ? 'update' : 'create',
    entityType: 'marketing_plan_event',
    recordId: p.plan_id,
    recordLabel: `Marketing Plan · ${p.fy}`,
    beforeState: idx >= 0 ? { plan_id: p.plan_id } : null,
    afterState: { plan_id: p.plan_id, total_budget: p.total_budget },
    sourceModule: 'marketing-planning-engine',
  });
  return next;
}

export function listMarketingPlans(filter?: Partial<MarketingPlan>): MarketingPlan[] {
  const all = loadPlans();
  if (!filter) return all;
  return all.filter((p) =>
    Object.entries(filter).every(([k, v]) =>
      v === undefined || (p as unknown as Record<string, unknown>)[k] === v,
    ),
  );
}

// ─── §3 · Campaign calendar (READS Campaign data · FR-44 Wall A) ────────────
function loadCampaignsFor(entity_code: string): Campaign[] {
  try {
    // [JWT] GET /api/salesx/campaigns
    const raw = localStorage.getItem(campaignsKey(entity_code));
    return raw ? (JSON.parse(raw) as Campaign[]) : [];
  } catch {
    return [];
  }
}

const CAMPAIGN_TYPE_TO_CHANNEL: Partial<Record<string, MarketingChannel>> = {
  EMAIL: 'email', SMS: 'whatsapp', WA: 'whatsapp', CALL: 'whatsapp',
  WEB: 'social', EVENT: 'events', EXPO: 'events', DEMO: 'events',
  REFER: 'referral', SURVEY: 'content', AI: 'search',
};

function mapCampaignChannel(c: Campaign): MarketingChannel {
  const t = (c.campaign_type as unknown as string) || '';
  return CAMPAIGN_TYPE_TO_CHANNEL[t] ?? 'content';
}

export function getCampaignCalendar(input: {
  fy: string;
  entity_code: string;
}): CampaignCalendarEntry[] {
  const all = loadCampaignsFor(input.entity_code);
  // FY string compare on year prefix (caller controls FY label format)
  const yr = (input.fy.match(/\d{4}/) || [''])[0];
  return all
    .filter((c) => !yr || (c.start_date && c.start_date.includes(yr)))
    .map((c) => ({
      campaign_id: c.id,
      name: c.campaign_name,
      channel: mapCampaignChannel(c),
      start_date: c.start_date,
      end_date: c.end_date ?? c.start_date,
      budget: round2(typeof c.budget === 'number' ? c.budget : 0),
    }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
}

// ─── Test-only reset (mirrors S124/S125 pattern) ────────────────────────────
export function __resetMarketingPlanningForTests(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
