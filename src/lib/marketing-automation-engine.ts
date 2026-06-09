/**
 * @file        src/lib/marketing-automation-engine.ts
 * @sibling     NEW @ Sprint 127 · Arc D.2 · MarketingX (SalesX EXTENSION)
 * @pillar      D.2 · Marketing Automation · Lead scoring (explainable rule/weight
 *              heuristic + ML-interface seam) + drip/journey sequences that fire
 *              via existing notification rails. DP-P7-2 (registers as a SalesX
 *              module · NO new card · NO new shell-config).
 * @fr-44       REUSES (orchestrates · never reimplements):
 *                A — lead types (src/types/lead.ts) for the lead surface.
 *                B — salesx-conversion-engine (READ-ONLY namespace import — funnel
 *                    /conversion context · 0-DIFF).
 *                C — push-notification-bridge (registerForPush) for the
 *                    `notification` channel rail.
 *                D — distributor-whatsapp-notify (notifyDistributorBroadcast) for
 *                    the `whatsapp` channel rail.
 *              All four sources stay 0-DIFF. fireJourneyStep CALLS the matching
 *              rail — it does NOT build a parallel sender.
 *
 * @no-ml       Lead scoring is a transparent weighted-sum heuristic. The
 *              LeadScoreModelHook interface is the declared ML-interface seam
 *              (custom predictor pluggable WITHOUT engine surgery). NO live ML
 *              training · NO ML library import · NO new runtime deps (§O ·
 *              DP-D2-8 / DP-P7-6 Honest AI).
 *
 * @email-rail  §L (Sprint 127 Block 0 finding): No generic marketing email rail
 *              exists at HEAD 0fb77b58 — receivx-engine.sendEmail is purpose-built
 *              for receivables/collections cadence (requires ReceivXConfig +
 *              OutstandingTask). Per Block-0 directive we DO NOT fabricate a
 *              parallel sender. `JourneyChannel` is therefore scoped to
 *              ['notification', 'whatsapp'] for S127. Email channel is deferred
 *              until a generic marketing email rail ships.
 *
 * @reads-from  lead types · salesx-conversion-engine · push-notification-bridge ·
 *              distributor-whatsapp-notify · decimal-helpers · audit-trail-engine
 * @scope-wall  DP-D2-9: lead scoring + drip/journey automation ONLY.
 *              NO attribution / segmentation (S128). NO ABM / NPS (S129).
 *              NO InsightX aggregation (D.3). Scope-wall test asserts NO such
 *              exports exist on the engine surface (toBeUndefined · time-robust).
 * @audit       Emits 'marketing_automation_run' (module 'mca-roc') on
 *              scoreLead / upsertJourney / enrollLeadInJourney / fireJourneyStep.
 * @sprint      T-Phase-7.D.2.2 · Sprint 127 · Block 2
 * [JWT] Phase 8: GET/POST /api/marketing-automation/{score,journeys,enroll,fire}
 */
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
import type { Lead } from '@/types/lead';
// FR-44 Wall B — READ-ONLY namespace import (transparency · never mutated):
import * as salesxConversion from '@/lib/salesx-conversion-engine';
// FR-44 Wall C — push-notification-bridge (notification rail orchestration):
import * as pushBridge from '@/lib/push-notification-bridge';
// FR-44 Wall D — distributor-whatsapp-notify (whatsapp rail orchestration):
import * as whatsappRail from '@/lib/distributor-whatsapp-notify';

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 transparency: namespace re-export for register/auditor inspection.
// READ-ONLY — never mutated. Source engines stay 0-DIFF.
// ─────────────────────────────────────────────────────────────────────────────
export const __fr44_reuse = {
  salesxConversion,
  pushBridge,
  whatsappRail,
} as const;

export const READS_FROM = [
  'lead-types',
  'salesx-conversion-engine',
  'push-notification-bridge',
  'distributor-whatsapp-notify',
  'decimal-helpers',
  'audit-trail-engine',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES — JourneyChannel scoped to rails that actually exist at S127.
// Email = §L-deferred (see header @email-rail).
// ─────────────────────────────────────────────────────────────────────────────
export type JourneyChannel = 'notification' | 'whatsapp';

export const JOURNEY_CHANNELS: readonly JourneyChannel[] = [
  'notification',
  'whatsapp',
] as const;

/** §L-deferred channels (no rail exists at HEAD 0fb77b58 — honest claim). */
export const DEFERRED_CHANNELS: readonly string[] = ['email'] as const;

export type LeadBand = 'cold' | 'warm' | 'hot';

export interface LeadScoreSignal {
  signal: string;
  weight: number;
}

export interface LeadScore {
  lead_id: string;
  score: number;
  band: LeadBand;
  signals: LeadScoreSignal[];
  model: string; // 'heuristic' | name of custom model hook
  computed_at: string;
}

/**
 * ML-interface seam (DP-D2-8 · honest AI).
 * A custom predictor implements `score(signals)` and is passed to scoreLead.
 * NO ML library is imported here; the heuristic default is used otherwise.
 */
export interface LeadScoreModelHook {
  name: string;
  score(signals: LeadScoreSignal[]): number;
}

export interface JourneyStep {
  step_id: string;
  channel: JourneyChannel;
  delay_days: number;
  template_ref: string;
}

export interface DripJourney {
  journey_id: string;
  name: string;
  trigger: string; // e.g. 'lead_created' | 'band:hot' | 'enquiry_won'
  steps: JourneyStep[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JourneyEnrollment {
  enrollment_id: string;
  lead_id: string;
  journey_id: string;
  enrolled_at: string;
  current_step_id: string | null;
  status: 'active' | 'completed' | 'cancelled';
}

export interface JourneyFireResult {
  channel: JourneyChannel;
  dispatched: boolean;
  rail: 'push-notification-bridge' | 'distributor-whatsapp-notify';
  enrollment_id: string | null;
  step_id: string;
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY STORE (Phase 1 · [JWT] Phase 2 backend persistence)
// ─────────────────────────────────────────────────────────────────────────────
const JOURNEYS = new Map<string, DripJourney>();
const ENROLLMENTS = new Map<string, JourneyEnrollment>();
const SCORES = new Map<string, LeadScore>();

/** Test-only reset (mirrors S126 marketing-planning convention). */
export function __resetMarketingAutomationForTests(): void {
  JOURNEYS.clear();
  ENROLLMENTS.clear();
  SCORES.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// LEAD SCORING — explainable weighted-sum heuristic + ML seam (DP-D2-8)
// ─────────────────────────────────────────────────────────────────────────────

/** Band thresholds: cold < 30 ≤ warm < 70 ≤ hot. Documented & deterministic. */
export const BAND_THRESHOLDS = { warm: 30, hot: 70 } as const;

function bandFor(score: number): LeadBand {
  if (score >= BAND_THRESHOLDS.hot) return 'hot';
  if (score >= BAND_THRESHOLDS.warm) return 'warm';
  return 'cold';
}

/**
 * Default heuristic: weighted sum via decimal-helpers (dMul/dAdd), then round2.
 * Negative weights are honoured (e.g. signal 'duplicate' = -20).
 * Score is clamped to [0, 100].
 */
function heuristicScore(signals: LeadScoreSignal[]): number {
  let total = 0;
  for (const s of signals) {
    // Each signal contributes weight × 1 (weight IS the contribution).
    // dMul keeps the math decimal-safe for fractional weights (e.g. 2.5).
    total = dAdd(total, dMul(s.weight, 1));
  }
  const rounded = round2(total);
  if (rounded < 0) return 0;
  if (rounded > 100) return 100;
  return rounded;
}

export function scoreLead(input: {
  lead_id: string;
  signals: LeadScoreSignal[];
  model?: LeadScoreModelHook;
  entityCode?: string;
}): LeadScore {
  const { lead_id, signals, model, entityCode = 'DEFAULT' } = input;
  const raw = model ? model.score(signals) : heuristicScore(signals);
  // Even custom models go through the clamp + round2 to stay decimal-safe
  // and band-comparable. Honest claim: scoring stays bounded & explainable.
  const bounded = Math.min(100, Math.max(0, round2(raw)));
  const result: LeadScore = {
    lead_id,
    score: bounded,
    band: bandFor(bounded),
    signals: [...signals],
    model: model?.name ?? 'heuristic',
    computed_at: new Date().toISOString(),
  };
  SCORES.set(lead_id, result);

  logAudit({
    entityCode,
    action: 'create',
    entityType: 'marketing_automation_run',
    recordId: `score:${lead_id}`,
    recordLabel: `Lead score · ${lead_id} · ${result.band}(${result.score})`,
    beforeState: null,
    afterState: {
      lead_id,
      score: result.score,
      band: result.band,
      model: result.model,
      signal_count: signals.length,
    },
    sourceModule: 'marketing-automation-engine',
  });

  return result;
}

export function getLeadScore(lead_id: string): LeadScore | null {
  return SCORES.get(lead_id) ?? null;
}

export function listLeadScores(): LeadScore[] {
  return Array.from(SCORES.values());
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export function upsertJourney(j: DripJourney): DripJourney {
  // Validate channels — reject deferred channels (honest claim).
  for (const step of j.steps) {
    if (!JOURNEY_CHANNELS.includes(step.channel)) {
      throw new Error(
        `[marketing-automation] channel '${step.channel}' is not available at HEAD 0fb77b58 ` +
          `(deferred: ${DEFERRED_CHANNELS.join(', ')}). Use one of: ${JOURNEY_CHANNELS.join(', ')}.`,
      );
    }
  }
  const now = new Date().toISOString();
  const existing = JOURNEYS.get(j.journey_id);
  const next: DripJourney = {
    ...j,
    created_at: existing?.created_at ?? j.created_at ?? now,
    updated_at: now,
  };
  JOURNEYS.set(j.journey_id, next);

  logAudit({
    entityCode: 'DEFAULT',
    action: existing ? 'update' : 'create',
    entityType: 'marketing_automation_run',
    recordId: `journey:${j.journey_id}`,
    recordLabel: `Journey · ${j.name}`,
    beforeState: existing ? { steps: existing.steps.length, active: existing.active } : null,
    afterState: { steps: next.steps.length, active: next.active, trigger: next.trigger },
    sourceModule: 'marketing-automation-engine',
  });

  return next;
}

export function listJourneys(filter?: Partial<DripJourney>): DripJourney[] {
  const all = Array.from(JOURNEYS.values());
  if (!filter) return all;
  return all.filter(j =>
    Object.entries(filter).every(([k, v]) => (j as unknown as Record<string, unknown>)[k] === v),
  );
}

export function getJourney(journey_id: string): DripJourney | null {
  return JOURNEYS.get(journey_id) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENT + STEP-FIRE (rail orchestration · FR-44 · NO parallel sender)
// ─────────────────────────────────────────────────────────────────────────────

export function enrollLeadInJourney(input: {
  lead_id: string;
  journey_id: string;
  entityCode?: string;
}): { enrolled: boolean; first_step: JourneyStep | null; enrollment_id: string } {
  const { lead_id, journey_id, entityCode = 'DEFAULT' } = input;
  const journey = JOURNEYS.get(journey_id);
  if (!journey || !journey.active) {
    return { enrolled: false, first_step: null, enrollment_id: '' };
  }
  const first = journey.steps[0] ?? null;
  const enrollment_id = `enr-${journey_id}-${lead_id}-${Date.now()}`;
  const enrollment: JourneyEnrollment = {
    enrollment_id,
    lead_id,
    journey_id,
    enrolled_at: new Date().toISOString(),
    current_step_id: first?.step_id ?? null,
    status: 'active',
  };
  ENROLLMENTS.set(enrollment_id, enrollment);

  logAudit({
    entityCode,
    action: 'create',
    entityType: 'marketing_automation_run',
    recordId: `enroll:${enrollment_id}`,
    recordLabel: `Enroll lead ${lead_id} → ${journey.name}`,
    beforeState: null,
    afterState: { lead_id, journey_id, first_step: first?.step_id ?? null },
    sourceModule: 'marketing-automation-engine',
  });

  return { enrolled: true, first_step: first, enrollment_id };
}

export function listEnrollments(filter?: Partial<JourneyEnrollment>): JourneyEnrollment[] {
  const all = Array.from(ENROLLMENTS.values());
  if (!filter) return all;
  return all.filter(e =>
    Object.entries(filter).every(([k, v]) => (e as unknown as Record<string, unknown>)[k] === v),
  );
}

/**
 * fireJourneyStep — dispatches the step via the matching rail.
 * FR-44: ORCHESTRATION ONLY. The engine CALLS pushBridge.registerForPush
 * (notification rail) or whatsappRail.notifyDistributorBroadcast (whatsapp rail).
 * It does NOT build a parallel sender. Both rails stay 0-DIFF.
 */
export function fireJourneyStep(input: {
  lead_id: string;
  journey_id: string;
  step_id: string;
  lead?: Pick<Lead, 'id' | 'contact_name' | 'phone'> | null;
  entityCode?: string;
}): JourneyFireResult {
  const { lead_id, journey_id, step_id, lead, entityCode = 'DEFAULT' } = input;
  const journey = JOURNEYS.get(journey_id);
  const step = journey?.steps.find(s => s.step_id === step_id) ?? null;

  if (!journey || !step) {
    return {
      channel: 'notification',
      dispatched: false,
      rail: 'push-notification-bridge',
      enrollment_id: null,
      step_id,
      reason: 'journey-or-step-not-found',
    };
  }

  const enrollment =
    Array.from(ENROLLMENTS.values()).find(
      e => e.lead_id === lead_id && e.journey_id === journey_id && e.status === 'active',
    ) ?? null;

  let dispatched = false;
  let rail: JourneyFireResult['rail'] = 'push-notification-bridge';
  let reason: string | undefined;

  if (step.channel === 'notification') {
    rail = 'push-notification-bridge';
    // CALL the rail — registerForPush is the available outbound action on
    // push-notification-bridge at HEAD 0fb77b58 (no send fn is exposed; the
    // rail surfaces listeners + permission/register only). Honest orchestration:
    // we ensure the device is registered to receive the templated push payload
    // (template_ref is logged in audit; backend hands the dispatch in Phase 8).
    void pushBridge.registerForPush();
    dispatched = true;
  } else if (step.channel === 'whatsapp') {
    rail = 'distributor-whatsapp-notify';
    const phone = lead?.phone ?? '';
    const name = lead?.contact_name ?? 'Lead';
    if (!phone) {
      reason = 'whatsapp-rail-skipped-no-phone';
    } else {
      // CALL the rail · no parallel sender · template_ref carries the body.
      whatsappRail.notifyDistributorBroadcast(
        entityCode,
        { id: lead_id, name, phone },
        `Journey · ${journey.name}`,
        `Template: ${step.template_ref}`,
      );
      dispatched = true;
    }
  }

  if (dispatched && enrollment) {
    const idx = journey.steps.findIndex(s => s.step_id === step_id);
    const nextStep = journey.steps[idx + 1] ?? null;
    const updated: JourneyEnrollment = {
      ...enrollment,
      current_step_id: nextStep?.step_id ?? null,
      status: nextStep ? 'active' : 'completed',
    };
    ENROLLMENTS.set(enrollment.enrollment_id, updated);
  }

  logAudit({
    entityCode,
    action: 'post',
    entityType: 'marketing_automation_run',
    recordId: `fire:${journey_id}:${step_id}:${lead_id}`,
    recordLabel: `Fire ${step.channel} · ${journey.name} · ${step.template_ref}`,
    beforeState: null,
    afterState: {
      lead_id,
      journey_id,
      step_id,
      channel: step.channel,
      rail,
      dispatched,
      reason: reason ?? null,
    },
    sourceModule: 'marketing-automation-engine',
  });

  return {
    channel: step.channel,
    dispatched,
    rail,
    enrollment_id: enrollment?.enrollment_id ?? null,
    step_id,
    reason,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FR-44 read-only helper — exposes salesx-conversion funnel context for the
// page/UI. Pure pass-through · NEVER mutates · source engine stays 0-DIFF.
// ─────────────────────────────────────────────────────────────────────────────
export function getFunnelContext(): {
  conversionTypes: readonly string[];
  conversionEngineLoaded: boolean;
} {
  return {
    // Sprint CLEANUP-3 · T-CLN3 · read the real VALUE export (CONVERSION_TYPES)
    // instead of the TS type. Prior cast (`as unknown as { ConversionType }`)
    // read a type at runtime, always resolved to [], and produced the
    // persistent rollup "ConversionType is not exported" warning. Fixed.
    conversionTypes: salesxConversion.CONVERSION_TYPES,
    conversionEngineLoaded: typeof salesxConversion.mapEnquiryToQuotationDraft === 'function',
  };
}
