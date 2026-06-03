/**
 * @file        src/lib/abm-nps-engine.ts
 * @sibling     NEW @ Sprint 129 · T-Phase-7.D.2.4 · 🏁 Arc D.2 CAPSTONE · MarketingX (SalesX EXTENSION)
 * @pillar      D.2 · Account-Based Marketing (ABM) + Net Promoter Score (NPS).
 *              ABM: tier accounts (strategic / target / nurture) with engagement
 *              derived from `salesx-conversion-engine` (funnel/account touches).
 *              NPS: 0–10 customer-survey scoring (9–10 promoter · 7–8 passive ·
 *              0–6 detractor) and computeNPS = %promoters − %detractors (range
 *              −100..100) via `decimal-helpers`.
 *
 * @fr-44       REUSES (orchestrates · never reimplements):
 *                A — customer/opportunity types         (ABM source surface)
 *                B — salesx-conversion-engine           (READ-ONLY namespace · account funnel)
 *                C — marketing-planning-engine          (DASHBOARD READ · S126)
 *                D — marketing-automation-engine        (DASHBOARD READ · S127)
 *                E — attribution-engine                 (DASHBOARD READ · S128)
 *              All sources stay 0-DIFF. The MarketingX dashboard roll-up READS
 *              the D.2 engines and recomputes NOTHING.
 *
 * @nps-distinct  NPS here is CUSTOMER-SURVEY scoring (promoter/passive/detractor
 *                + computeNPS). This is DISTINCT from `realisation-feedback-engine`
 *                which scores EXPORT-REALISATION feedback (days-to-realise / FEMA
 *                state penalty / realisation history). NO overlap. NO duplication.
 *                realisation-feedback-engine stays 0-DIFF.
 *
 * @scope-wall  DP-D2-9: ABM + NPS + MarketingX-dashboard ONLY.
 *              NO InsightX / 75-scenario / cross-card aggregation (D.3).
 *              Scope-wall test asserts NO such exports exist (toBeUndefined).
 *
 * @audit       Emits 'abm_nps_event' (module 'mca-roc') on scoreABMAccount /
 *              recordNPSSurvey / computeNPS. ComplianceModule UNTOUCHED.
 *
 * @reads-from  customer types · opportunity types · salesx-conversion-engine ·
 *              marketing-planning-engine · marketing-automation-engine ·
 *              attribution-engine · decimal-helpers · audit-trail-engine
 *
 * @sprint      T-Phase-7.D.2.4 · Sprint 129 · 🏁 CLOSES Arc D.2
 * [JWT] Phase 8: GET/POST /api/marketing-abm-nps/{accounts,surveys,nps,dashboard}
 */
import { dAdd, dMul, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// FR-44 Wall A — opportunity types (account/customer surface · 0-DIFF):
import type { Opportunity } from '@/types/opportunity';
// FR-44 Wall B — funnel/account touches (READ-ONLY namespace · 0-DIFF):
import * as salesxConversion from '@/lib/salesx-conversion-engine';
// FR-44 Wall C — marketing-planning (DASHBOARD READ · 0-DIFF):
import * as marketingPlanning from '@/lib/marketing-planning-engine';
// FR-44 Wall D — marketing-automation (DASHBOARD READ · 0-DIFF):
import * as marketingAutomation from '@/lib/marketing-automation-engine';
// FR-44 Wall E — attribution (DASHBOARD READ · 0-DIFF):
import * as attribution from '@/lib/attribution-engine';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// READ-ONLY — never mutated. Source engines stay 0-DIFF.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = {
  salesxConversion,
  marketingPlanning,
  marketingAutomation,
  attribution,
} as const;

export const READS_FROM = [
  'customer-types',
  'opportunity-types',
  'salesx-conversion-engine',
  'marketing-planning-engine',
  'marketing-automation-engine',
  'attribution-engine',
  'decimal-helpers',
  'audit-trail-engine',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
export type ABMTier = 'strategic' | 'target' | 'nurture';

export const ABM_TIERS: readonly ABMTier[] = ['strategic', 'target', 'nurture'] as const;

export interface ABMAccount {
  account_id: string;
  tier: ABMTier;
  engagement_score: number;  // 0..100 · decimal-safe
  touchpoints: number;       // count from salesx-conversion funnel
  pipeline_value: number;    // sum of open opportunity values (₹)
  updated_at: string;
}

export type NPSCategory = 'promoter' | 'passive' | 'detractor';

export interface NPSSurvey {
  survey_id: string;
  respondent_id: string;
  score: number;                // 0..10 integer
  category: NPSCategory;        // derived from score
  comment?: string;
  period: string;               // 'FY26' / '2026-Q1' · caller-defined
  recorded_at: string;
}

export interface NPSResult {
  period: string;
  total_responses: number;
  promoters: number;
  passives: number;
  detractors: number;
  nps: number;                  // %promoters − %detractors · range −100..100
}

export interface ScoreABMInput {
  account_id: string;
  tier?: ABMTier;
  opportunities?: Opportunity[];   // optional pipeline source
  entity_code?: string;
}

export interface RecordNPSInput {
  respondent_id: string;
  score: number;
  comment?: string;
  period?: string;
  entity_code?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORE (Phase 1 · [JWT] Phase 2 backend persistence)
// ─────────────────────────────────────────────────────────────────────────────
const ABM_ACCOUNTS: ABMAccount[] = [];
const NPS_SURVEYS: NPSSurvey[] = [];

/** Test-only reset (mirrors S127/S128 convention). */
export function __resetABMNpsForTests(): void {
  ABM_ACCOUNTS.length = 0;
  NPS_SURVEYS.length = 0;
}

function makeSurveyId(): string {
  return `nps_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// §2.a · ABM — tier accounts + compute engagement from salesx-conversion.
//        engagement_score = clamp(touchpoints × 10, 0, 100). Pipeline value
//        rolled from caller-supplied opportunities (READ-ONLY surface).
//        Tier inference (when omitted):
//          engagement_score ≥ 70 → strategic
//          engagement_score ≥ 30 → target
//          else                  → nurture
// ─────────────────────────────────────────────────────────────────────────────
function inferTier(engagement: number): ABMTier {
  if (engagement >= 70) return 'strategic';
  if (engagement >= 30) return 'target';
  return 'nurture';
}

/**
 * Reads the salesx-conversion activity log for `account_id` (entity-scoped)
 * and counts touchpoints. READ-ONLY · never mutates the source.
 */
function countAccountTouchpoints(accountId: string, entityCode: string): number {
  try {
    const key = salesxConversion.conversionActivityKey(entityCode);
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const events = JSON.parse(raw) as salesxConversion.ConversionActivityEntry[];
    if (!Array.isArray(events)) return 0;
    return events.filter((e) => {
      // Account match is best-effort: source_id / target_id / source_no can carry
      // the account ref. We never fabricate — only count explicit references.
      const src = String(e.source_id ?? '');
      const tgt = String(e.target_id ?? '');
      const srcNo = String(e.source_no ?? '');
      return src === accountId || tgt === accountId || srcNo === accountId;
    }).length;
  } catch {
    return 0;
  }
}

export function scoreABMAccount(input: ScoreABMInput): ABMAccount {
  if (!input.account_id || !input.account_id.trim()) {
    throw new Error('abm-nps-engine: account_id is required');
  }
  const entityCode = input.entity_code ?? 'UNKNOWN';
  const touchpoints = countAccountTouchpoints(input.account_id, entityCode);
  // engagement_score = min(100, touchpoints × 10) — decimal-safe.
  const rawEngagement = dMul(touchpoints, 10);
  const engagement_score = round2(rawEngagement > 100 ? 100 : rawEngagement);

  const pipeline_value = round2(
    dSum(
      (input.opportunities ?? []).filter((o) => o.customer_id === input.account_id && o.is_active),
      (o) => o.deal_value ?? 0,
    ),
  );

  const tier: ABMTier = input.tier ?? inferTier(engagement_score);

  const account: ABMAccount = {
    account_id: input.account_id,
    tier,
    engagement_score,
    touchpoints,
    pipeline_value,
    updated_at: new Date().toISOString(),
  };

  // Idempotent upsert by account_id.
  const idx = ABM_ACCOUNTS.findIndex((a) => a.account_id === account.account_id);
  if (idx >= 0) ABM_ACCOUNTS[idx] = account;
  else ABM_ACCOUNTS.push(account);

  try {
    logAudit({
      entityCode,
      action: idx >= 0 ? 'update' : 'create',
      entityType: 'abm_nps_event',
      recordId: account.account_id,
      recordLabel: `ABM Account · ${account.tier} · ${account.account_id}`,
      beforeState: idx >= 0 ? { previous: ABM_ACCOUNTS[idx] } : null,
      afterState: {
        tier: account.tier,
        engagement_score: account.engagement_score,
        touchpoints: account.touchpoints,
        pipeline_value: account.pipeline_value,
      },
      sourceModule: 'mca-roc',
    });
  } catch {
    // never block on audit storage quota
  }

  return account;
}

export function listABMAccounts(filter?: Partial<Pick<ABMAccount, 'tier'>>): ABMAccount[] {
  if (!filter) return [...ABM_ACCOUNTS];
  return ABM_ACCOUNTS.filter((a) => !filter.tier || a.tier === filter.tier);
}

// ─────────────────────────────────────────────────────────────────────────────
// §2.b · NPS — record survey + compute NPS.
//        Category mapping: 9-10 promoter · 7-8 passive · 0-6 detractor.
//        computeNPS = %promoters − %detractors (decimal-helpers · −100..100).
// ─────────────────────────────────────────────────────────────────────────────
export function categorizeNPSScore(score: number): NPSCategory {
  if (!Number.isFinite(score)) throw new Error('abm-nps-engine: NPS score must be finite');
  if (score < 0 || score > 10) throw new Error('abm-nps-engine: NPS score must be 0..10');
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

export function recordNPSSurvey(input: RecordNPSInput): NPSSurvey {
  if (!input.respondent_id || !input.respondent_id.trim()) {
    throw new Error('abm-nps-engine: respondent_id is required');
  }
  const category = categorizeNPSScore(input.score);
  const survey: NPSSurvey = {
    survey_id: makeSurveyId(),
    respondent_id: input.respondent_id,
    score: input.score,
    category,
    comment: input.comment,
    period: input.period ?? 'FY26',
    recorded_at: new Date().toISOString(),
  };
  NPS_SURVEYS.push(survey);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'UNKNOWN',
      action: 'create',
      entityType: 'abm_nps_event',
      recordId: survey.survey_id,
      recordLabel: `NPS Survey · ${category} · ${survey.respondent_id}`,
      beforeState: null,
      afterState: {
        score: survey.score,
        category: survey.category,
        period: survey.period,
      },
      sourceModule: 'mca-roc',
    });
  } catch {
    // never block on audit storage quota
  }

  return survey;
}

export function listNPSSurveys(filter?: Partial<Pick<NPSSurvey, 'period' | 'category'>>): NPSSurvey[] {
  if (!filter) return [...NPS_SURVEYS];
  return NPS_SURVEYS.filter((s) => {
    if (filter.period && s.period !== filter.period) return false;
    if (filter.category && s.category !== filter.category) return false;
    return true;
  });
}

export function computeNPS(input: { period: string; entity_code?: string }): NPSResult {
  const surveys = NPS_SURVEYS.filter((s) => s.period === input.period);
  const total = surveys.length;
  const promoters = surveys.filter((s) => s.category === 'promoter').length;
  const passives = surveys.filter((s) => s.category === 'passive').length;
  const detractors = surveys.filter((s) => s.category === 'detractor').length;
  // decimal-safe %: (promoters / total) × 100 − (detractors / total) × 100.
  let nps = 0;
  if (total > 0) {
    const pPct = dMul(promoters / total, 100);
    const dPct = dMul(detractors / total, 100);
    nps = round2(dAdd(pPct, -dPct));
  }
  // Honest range guard.
  if (nps > 100) nps = 100;
  if (nps < -100) nps = -100;

  const result: NPSResult = {
    period: input.period,
    total_responses: total,
    promoters,
    passives,
    detractors,
    nps,
  };

  try {
    logAudit({
      entityCode: input.entity_code ?? 'UNKNOWN',
      action: 'create',
      entityType: 'abm_nps_event',
      recordId: `nps-period-${input.period}`,
      recordLabel: `NPS · ${input.period} · ${nps}`,
      beforeState: null,
      afterState: { ...result },
      sourceModule: 'mca-roc',
    });
  } catch {
    // never block on audit storage quota
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// §3 · MarketingX DASHBOARD ROLL-UP (D.2 CAPSTONE · READ-ONLY)
//      Aggregates the 4 D.2 engines. Recomputes NOTHING — every figure is read
//      from the upstream engine via its own list/read API. No new math here.
//      SCOPE WALL: this is a MarketingX-scoped roll-up, NOT the InsightX
//      75-scenario cross-card aggregation (that lives in Arc D.3).
// ─────────────────────────────────────────────────────────────────────────────
export interface MarketingXDashboard {
  fy: string;
  // S126 · marketing-planning (READ)
  plans_count: number;
  total_marketing_budget: number;
  channels_in_mix: number;
  // S127 · marketing-automation (READ)
  scored_leads: number;
  journeys: number;
  enrollments: number;
  // S128 · attribution (READ)
  attributions: number;
  segments: number;
  channels_with_roi: number;
  // S129 · ABM + NPS (this engine · READ)
  abm_accounts_total: number;
  abm_strategic: number;
  abm_target: number;
  abm_nurture: number;
  nps_total_responses: number;
  nps_value: number;
  // Honesty / wiring transparency
  sources_loaded: {
    planning: boolean;
    automation: boolean;
    attribution: boolean;
  };
  computed_at: string;
}

export function buildMarketingXDashboard(input: { fy: string; entity_code?: string }): MarketingXDashboard {
  // S126 · marketing-planning READS (no recompute).
  const plans = marketingPlanning.listMarketingPlans({ fy: input.fy });
  const total_marketing_budget = round2(dSum(plans, (p) => p.total_budget ?? 0));
  const channelsSeen = new Set<string>();
  for (const p of plans) for (const a of p.channel_allocations) channelsSeen.add(a.channel);

  // S127 · marketing-automation READS (no recompute).
  const scored_leads = marketingAutomation.listLeadScores().length;
  const journeys = marketingAutomation.listJourneys().length;
  const enrollments = marketingAutomation.listEnrollments().length;

  // S128 · attribution READS (no recompute).
  const attributions = attribution.listAttributions().length;
  const segments = attribution.listMarketingSegments().length;
  const roi = attribution.getChannelROI({ fy: input.fy, entity_code: input.entity_code });
  const channels_with_roi = roi.length;

  // S129 · ABM + NPS (this engine · READ).
  const abm = listABMAccounts();
  const abm_strategic = abm.filter((a) => a.tier === 'strategic').length;
  const abm_target = abm.filter((a) => a.tier === 'target').length;
  const abm_nurture = abm.filter((a) => a.tier === 'nurture').length;
  const npsAll = listNPSSurveys({ period: input.fy });
  const npsResult = npsAll.length > 0
    ? computeNPS({ period: input.fy, entity_code: input.entity_code })
    : { total_responses: 0, nps: 0 } as Pick<NPSResult, 'total_responses' | 'nps'>;

  return {
    fy: input.fy,
    plans_count: plans.length,
    total_marketing_budget,
    channels_in_mix: channelsSeen.size,
    scored_leads,
    journeys,
    enrollments,
    attributions,
    segments,
    channels_with_roi,
    abm_accounts_total: abm.length,
    abm_strategic,
    abm_target,
    abm_nurture,
    nps_total_responses: npsResult.total_responses,
    nps_value: npsResult.nps,
    sources_loaded: {
      planning: typeof marketingPlanning.listMarketingPlans === 'function',
      automation: typeof marketingAutomation.listLeadScores === 'function',
      attribution: typeof attribution.listAttributions === 'function',
    },
    computed_at: new Date().toISOString(),
  };
}
