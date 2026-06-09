/**
 * @file        src/lib/role-home-engine.ts
 * @sibling     NEW @ Sprint AM.1 · T-AM1-AI-Everywhere
 * @purpose     "What needs you now" rule-ranked action feed per role.
 *              CONSUMES insights-inbox-engine (read-only · no recompute).
 *              Output is ranked by a deterministic role × source × category
 *              weight matrix — NO ML, NO LLM, NO fetch.
 * @canon       Tier-L · honest empty (no fabricated insights) · the only
 *              dynamic data is what insights-inbox-engine surfaces.
 * @[JWT]       Wave-2: POST /api/role-home/predict { role, items } — the
 *              ML re-ranker will replace ROLE_WEIGHTS at the seam below.
 */
import * as insightsInbox from '@/lib/insights-inbox-engine';
import type { UserRole } from '@/types/card-entitlement';

export const ROLE_HOME_HONESTY =
  'Role-home is rule-ranked today; the ML prioritization arrives with Wave-2.';

export type RoleHomeReason =
  | 'overdue'
  | 'approval_pending'
  | 'risk'
  | 'opportunity'
  | 'anomaly';

export interface RoleHomeAction {
  /** Stable id (mirrors InboxItem.item_id when sourced from inbox). */
  action_id: string;
  /** Short user-facing title. */
  title: string;
  /** One-line explanation derived from the source signal. */
  why: string;
  /** Suggested next step (verbatim from source where available). */
  recommended_action: string;
  /** Rule-rank score 0..100. */
  rank_score: number;
  reason: RoleHomeReason;
  /** Source engine + call (provenance from insights-inbox). */
  source_ref: string;
  source_engine: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE_WEIGHTS — per (role × source_engine) priority multiplier.
// 1.0 = neutral · >1 = role cares more · <1 = role cares less.
// ─────────────────────────────────────────────────────────────────────────────
const FINANCE_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 1.0,
  'variance-narrative-engine': 1.2,
  'contract-expiry-alert-engine': 1.3,
  'production-variance-alert-engine': 0.7,
  'insightx-aggregator-engine': 1.1,
};
const SALES_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 0.9,
  'variance-narrative-engine': 0.9,
  'contract-expiry-alert-engine': 1.4,
  'production-variance-alert-engine': 0.6,
  'insightx-aggregator-engine': 1.0,
};
const OPS_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 0.9,
  'variance-narrative-engine': 1.0,
  'contract-expiry-alert-engine': 1.0,
  'production-variance-alert-engine': 1.5,
  'insightx-aggregator-engine': 0.9,
};
const HR_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 1.0,
  'variance-narrative-engine': 0.8,
  'contract-expiry-alert-engine': 0.7,
  'production-variance-alert-engine': 0.6,
  'insightx-aggregator-engine': 1.0,
};
const SUPPORT_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 0.7,
  'variance-narrative-engine': 0.6,
  'contract-expiry-alert-engine': 0.9,
  'production-variance-alert-engine': 0.5,
  'insightx-aggregator-engine': 0.7,
};
const ADMIN_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 1.1,
  'variance-narrative-engine': 1.1,
  'contract-expiry-alert-engine': 1.1,
  'production-variance-alert-engine': 1.1,
  'insightx-aggregator-engine': 1.1,
};
const VIEW_ONLY_WEIGHTS: Record<string, number> = {
  'operix-score-engine': 0.8,
  'variance-narrative-engine': 0.8,
  'contract-expiry-alert-engine': 0.5,
  'production-variance-alert-engine': 0.5,
  'insightx-aggregator-engine': 0.8,
};

const ROLE_WEIGHTS: Record<UserRole, Record<string, number>> = {
  super_admin: ADMIN_WEIGHTS,
  tenant_admin: ADMIN_WEIGHTS,
  finance: FINANCE_WEIGHTS,
  sales: SALES_WEIGHTS,
  operations: OPS_WEIGHTS,
  hr: HR_WEIGHTS,
  support: SUPPORT_WEIGHTS,
  view_only: VIEW_ONLY_WEIGHTS,
};

const CATEGORY_TO_REASON: Record<'risk' | 'opportunity' | 'anomaly', RoleHomeReason> = {
  risk: 'risk',
  opportunity: 'opportunity',
  anomaly: 'anomaly',
};

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency mirror — auditor can verify the consume edge.
// ─────────────────────────────────────────────────────────────────────────────
export const READS_FROM = Object.freeze([
  'insights-inbox-engine',
] as const);

export const __reuse = Object.freeze({ insightsInbox });

export interface BuildRoleHomeInput {
  role: UserRole;
  fy: string;
  entity_code?: string;
  top_n?: number;
}

/**
 * buildRoleHomeFeed — CONSUMES insights-inbox.buildInbox, then rule-ranks
 * the items per role. Returns the top N actions, sorted desc by rank_score.
 * Honest empty when the inbox produces no items.
 */
export function buildRoleHomeFeed(input: BuildRoleHomeInput): RoleHomeAction[] {
  const top_n = Math.max(1, Math.min(50, Math.floor(input.top_n ?? 10)));
  let items: insightsInbox.InboxItem[];
  try {
    items = insightsInbox.buildInbox({
      fy: input.fy,
      entity_code: input.entity_code,
      top_n: 50,
    });
  } catch {
    return [];
  }
  if (!items.length) return [];

  const weights = ROLE_WEIGHTS[input.role] ?? VIEW_ONLY_WEIGHTS;
  const ranked = items.map((it): RoleHomeAction => {
    const w = weights[it.source_engine] ?? 1.0;
    const score = Math.min(100, Math.max(0, it.impact_score * w));
    return {
      action_id: it.item_id,
      title: it.title,
      why: it.root_cause,
      recommended_action: it.recommended_action,
      rank_score: Math.round(score * 100) / 100,
      reason: CATEGORY_TO_REASON[it.category],
      source_ref: it.source_ref,
      source_engine: it.source_engine,
    };
  });

  ranked.sort((a, b) => b.rank_score - a.rank_score);
  return ranked.slice(0, top_n);
}

// ─────────────────────────────────────────────────────────────────────────────
// SCOPE WALL — these MUST NOT exist on this engine's surface.
// Tests assert (engine as Record<string, unknown>)[name] === undefined.
// NO: trainModel · runPredictive · askNaturalLanguage · classifyIntent
// ─────────────────────────────────────────────────────────────────────────────
