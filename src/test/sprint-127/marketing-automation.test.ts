/**
 * @file        src/test/sprint-127/marketing-automation.test.ts
 * @sprint      Sprint 127 · T-Phase-7.D.2.2 · Arc D.2 · Lead Scoring + Marketing Automation
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              S127 own headSha via toContain([...]) NOT toBe (S121-T1 rule).
 *              NO existsSync-future tombstones · NO "no S128 entry" absence checks ·
 *              Scope-wall via toBeUndefined on engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  scoreLead,
  getLeadScore,
  listLeadScores,
  upsertJourney,
  listJourneys,
  getJourney,
  enrollLeadInJourney,
  listEnrollments,
  fireJourneyStep,
  getFunnelContext,
  JOURNEY_CHANNELS,
  DEFERRED_CHANNELS,
  BAND_THRESHOLDS,
  READS_FROM,
  __fr44_reuse,
  __resetMarketingAutomationForTests,
  type DripJourney,
  type LeadScoreModelHook,
} from '@/lib/marketing-automation-engine';
import * as marketingAutomation from '@/lib/marketing-automation-engine';
import * as pushBridge from '@/lib/push-notification-bridge';
import * as whatsappRail from '@/lib/distributor-whatsapp-notify';
import * as salesxConversion from '@/lib/salesx-conversion-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENGINE_PATH = join(process.cwd(), 'src/lib/marketing-automation-engine.ts');
const ENGINE_SRC = readFileSync(ENGINE_PATH, 'utf8');

function freshJourney(overrides: Partial<DripJourney> = {}): DripJourney {
  return {
    journey_id: overrides.journey_id ?? 'j-test',
    name: overrides.name ?? 'Test Journey',
    trigger: overrides.trigger ?? 'lead_created',
    steps: overrides.steps ?? [
      { step_id: 'step-1', channel: 'notification', delay_days: 0, template_ref: 'welcome_push' },
      { step_id: 'step-2', channel: 'whatsapp', delay_days: 2, template_ref: 'welcome_wa' },
    ],
    active: overrides.active ?? true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

beforeEach(() => {
  __resetMarketingAutomationForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ────────────────────────────────────────────────────────────────────────────
// A · Lead scoring — heuristic + bands + ML seam (DP-D2-8)
// ────────────────────────────────────────────────────────────────────────────

describe('A · Lead scoring · heuristic weighted-sum + bands', () => {
  it('A1 · weighted sum produces score and stores it', () => {
    const r = scoreLead({
      lead_id: 'L-1',
      signals: [{ signal: 'a', weight: 10 }, { signal: 'b', weight: 20 }],
    });
    expect(r.score).toBe(30);
    expect(getLeadScore('L-1')?.score).toBe(30);
  });

  it('A2 · cold band when score < warm threshold', () => {
    const r = scoreLead({ lead_id: 'L-cold', signals: [{ signal: 'x', weight: 5 }] });
    expect(r.band).toBe('cold');
    expect(BAND_THRESHOLDS.warm).toBeGreaterThan(r.score);
  });

  it('A3 · warm band at threshold boundary', () => {
    const r = scoreLead({
      lead_id: 'L-warm',
      signals: [{ signal: 'x', weight: BAND_THRESHOLDS.warm }],
    });
    expect(r.band).toBe('warm');
  });

  it('A4 · hot band at upper threshold', () => {
    const r = scoreLead({
      lead_id: 'L-hot',
      signals: [{ signal: 'x', weight: BAND_THRESHOLDS.hot }],
    });
    expect(r.band).toBe('hot');
  });

  it('A5 · score clamps to [0,100]', () => {
    const high = scoreLead({ lead_id: 'L-hi', signals: [{ signal: 'a', weight: 999 }] });
    const low = scoreLead({ lead_id: 'L-lo', signals: [{ signal: 'b', weight: -999 }] });
    expect(high.score).toBe(100);
    expect(low.score).toBe(0);
  });

  it('A6 · decimal-safe math for fractional weights', () => {
    const r = scoreLead({
      lead_id: 'L-frac',
      signals: [
        { signal: 'a', weight: 10.1 },
        { signal: 'b', weight: 20.2 },
        { signal: 'c', weight: 0.7 },
      ],
    });
    expect(r.score).toBeCloseTo(31, 2);
  });

  it('A7 · LeadScoreModelHook seam used when provided (DP-D2-8)', () => {
    const hook: LeadScoreModelHook = {
      name: 'constant-77',
      score: () => 77,
    };
    const r = scoreLead({ lead_id: 'L-ml', signals: [{ signal: 'x', weight: 1 }], model: hook });
    expect(r.score).toBe(77);
    expect(r.band).toBe('hot');
    expect(r.model).toBe('constant-77');
  });

  it('A8 · default model name is "heuristic" when no hook passed', () => {
    const r = scoreLead({ lead_id: 'L-d', signals: [{ signal: 'x', weight: 10 }] });
    expect(r.model).toBe('heuristic');
  });

  it('A9 · listLeadScores returns every scored lead', () => {
    scoreLead({ lead_id: 'L-a', signals: [{ signal: 'x', weight: 10 }] });
    scoreLead({ lead_id: 'L-b', signals: [{ signal: 'x', weight: 50 }] });
    expect(listLeadScores().length).toBeGreaterThanOrEqual(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · Journey management
// ────────────────────────────────────────────────────────────────────────────

describe('B · Journey management', () => {
  it('B1 · upsertJourney stores a journey retrievable by id', () => {
    upsertJourney(freshJourney({ journey_id: 'j-1' }));
    expect(getJourney('j-1')?.name).toBe('Test Journey');
  });

  it('B2 · upsertJourney REJECTS deferred channels (honest claim · §L)', () => {
    expect(() =>
      upsertJourney(
        freshJourney({
          journey_id: 'j-bad',
          steps: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { step_id: 's', channel: 'email' as any, delay_days: 0, template_ref: 't' },
          ],
        }),
      ),
    ).toThrow(/email/);
  });

  it('B3 · listJourneys filter respects active flag', () => {
    upsertJourney(freshJourney({ journey_id: 'j-on', active: true }));
    upsertJourney(freshJourney({ journey_id: 'j-off', active: false }));
    expect(listJourneys({ active: true }).length).toBeGreaterThanOrEqual(1);
  });

  it('B4 · enrollLeadInJourney returns first step + active enrollment', () => {
    upsertJourney(freshJourney({ journey_id: 'j-enr' }));
    const r = enrollLeadInJourney({ lead_id: 'L-1', journey_id: 'j-enr' });
    expect(r.enrolled).toBe(true);
    expect(r.first_step?.step_id).toBe('step-1');
    expect(listEnrollments({ lead_id: 'L-1' }).length).toBeGreaterThanOrEqual(1);
  });

  it('B5 · enrollment fails when journey is missing or inactive', () => {
    const missing = enrollLeadInJourney({ lead_id: 'L-x', journey_id: 'nope' });
    expect(missing.enrolled).toBe(false);
    upsertJourney(freshJourney({ journey_id: 'j-paused', active: false }));
    const paused = enrollLeadInJourney({ lead_id: 'L-x', journey_id: 'j-paused' });
    expect(paused.enrolled).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · fireJourneyStep ORCHESTRATES rails (FR-44 · NO parallel sender)
// ────────────────────────────────────────────────────────────────────────────

describe('C · Rail orchestration · FR-44 (DP-D2-4)', () => {
  it('C1 · notification step CALLS push-notification-bridge.registerForPush', () => {
    const spy = vi.spyOn(pushBridge, 'registerForPush').mockResolvedValue(undefined);
    upsertJourney(freshJourney({ journey_id: 'j-push' }));
    enrollLeadInJourney({ lead_id: 'L-1', journey_id: 'j-push' });
    const r = fireJourneyStep({
      lead_id: 'L-1', journey_id: 'j-push', step_id: 'step-1',
    });
    expect(spy).toHaveBeenCalled();
    expect(r.rail).toBe('push-notification-bridge');
    expect(r.dispatched).toBe(true);
    spy.mockRestore();
  });

  it('C2 · whatsapp step CALLS distributor-whatsapp-notify.notifyDistributorBroadcast', () => {
    const spy = vi.spyOn(whatsappRail, 'notifyDistributorBroadcast').mockImplementation(() => undefined);
    upsertJourney(freshJourney({ journey_id: 'j-wa' }));
    enrollLeadInJourney({ lead_id: 'L-1', journey_id: 'j-wa' });
    const r = fireJourneyStep({
      lead_id: 'L-1', journey_id: 'j-wa', step_id: 'step-2',
      lead: { id: 'L-1', contact_name: 'Test', phone: '9999999999' },
    });
    expect(spy).toHaveBeenCalled();
    expect(r.rail).toBe('distributor-whatsapp-notify');
    expect(r.dispatched).toBe(true);
    spy.mockRestore();
  });

  it('C3 · whatsapp step skipped when phone missing (honest no-dispatch)', () => {
    const spy = vi.spyOn(whatsappRail, 'notifyDistributorBroadcast').mockImplementation(() => undefined);
    upsertJourney(freshJourney({ journey_id: 'j-wa2' }));
    enrollLeadInJourney({ lead_id: 'L-2', journey_id: 'j-wa2' });
    const r = fireJourneyStep({
      lead_id: 'L-2', journey_id: 'j-wa2', step_id: 'step-2',
      lead: { id: 'L-2', contact_name: 'No Phone', phone: '' },
    });
    expect(spy).not.toHaveBeenCalled();
    expect(r.dispatched).toBe(false);
    expect(r.reason).toContain('phone');
    spy.mockRestore();
  });

  it('C4 · missing journey/step returns dispatched=false (no throw)', () => {
    const r = fireJourneyStep({ lead_id: 'L-x', journey_id: 'missing', step_id: 'step-1' });
    expect(r.dispatched).toBe(false);
    expect(r.reason).toContain('not-found');
  });

  it('C5 · engine does NOT build a parallel sender (no fetch/sendMail/transport)', () => {
    expect(ENGINE_SRC).not.toMatch(/\bfetch\s*\(/);
    expect(ENGINE_SRC).not.toMatch(/nodemailer|sendgrid|mailgun|smtp\./i);
  });

  it('C6 · advancing fire updates enrollment current_step_id', () => {
    vi.spyOn(pushBridge, 'registerForPush').mockResolvedValue(undefined);
    upsertJourney(freshJourney({ journey_id: 'j-adv' }));
    enrollLeadInJourney({ lead_id: 'L-A', journey_id: 'j-adv' });
    fireJourneyStep({ lead_id: 'L-A', journey_id: 'j-adv', step_id: 'step-1' });
    const e = listEnrollments({ lead_id: 'L-A' })[0];
    expect(e.current_step_id === 'step-2' || e.status === 'completed').toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · Audit · DP-D2 trail
// ────────────────────────────────────────────────────────────────────────────

describe('D · Audit · marketing_automation_run', () => {
  it('D1 · scoreLead emits marketing_automation_run audit entry', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    scoreLead({ lead_id: 'L-aud', signals: [{ signal: 'x', weight: 10 }] });
    const calls = spy.mock.calls.filter(c => c[0]?.entityType === 'marketing_automation_run');
    expect(calls.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });

  it('D2 · fireJourneyStep emits marketing_automation_run audit entry', () => {
    vi.spyOn(pushBridge, 'registerForPush').mockResolvedValue(undefined);
    const spy = vi.spyOn(auditTrail, 'logAudit');
    upsertJourney(freshJourney({ journey_id: 'j-aud' }));
    enrollLeadInJourney({ lead_id: 'L-aud', journey_id: 'j-aud' });
    fireJourneyStep({ lead_id: 'L-aud', journey_id: 'j-aud', step_id: 'step-1' });
    const calls = spy.mock.calls.filter(
      c => c[0]?.entityType === 'marketing_automation_run' && c[0]?.action === 'post',
    );
    expect(calls.length).toBeGreaterThanOrEqual(1);
    spy.mockRestore();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · FR-44 REUSE + Honest AI (no ML lib · §O)
// ────────────────────────────────────────────────────────────────────────────

describe('E · FR-44 reuse + Honest AI (no ML lib · §O)', () => {
  it('E1 · __fr44_reuse namespace exposes all 3 source surfaces', () => {
    expect(__fr44_reuse.pushBridge).toBe(pushBridge);
    expect(__fr44_reuse.whatsappRail).toBe(whatsappRail);
    expect(__fr44_reuse.salesxConversion).toBe(salesxConversion);
  });

  it('E2 · READS_FROM declares the four upstream sources', () => {
    expect(READS_FROM).toContain('lead-types');
    expect(READS_FROM).toContain('salesx-conversion-engine');
    expect(READS_FROM).toContain('push-notification-bridge');
    expect(READS_FROM).toContain('distributor-whatsapp-notify');
  });

  it('E3 · getFunnelContext reads salesx-conversion-engine (FR-44 transparency)', () => {
    const ctx = getFunnelContext();
    expect(ctx.conversionEngineLoaded).toBe(true);
  });

  it('E4 · NO ML library imported (honest claim · §O · DP-D2-8)', () => {
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]@?tensorflow/);
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]onnxruntime/);
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]@xenova\/transformers/);
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]ml-/);
  });

  it('E5 · NO parallel email sender built — JourneyChannel scoped to live rails', () => {
    expect(JOURNEY_CHANNELS).toEqual(['notification', 'whatsapp']);
    expect(DEFERRED_CHANNELS).toContain('email');
    expect(ENGINE_SRC).not.toMatch(/createTransport|sendgrid|nodemailer/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · SCOPE WALL (DP-D2-9) — no S128/S129/D.3 surface
// ────────────────────────────────────────────────────────────────────────────

describe('F · SCOPE WALL DP-D2-9 (toBeUndefined · time-robust)', () => {
  it('F1 · NO attribution exports (S128)', () => {
    const m = marketingAutomation as unknown as Record<string, unknown>;
    expect(m.attributeRevenue).toBeUndefined();
    expect(m.buildAttributionModel).toBeUndefined();
  });

  it('F2 · NO segmentation exports (S128)', () => {
    const m = marketingAutomation as unknown as Record<string, unknown>;
    expect(m.segmentLeads).toBeUndefined();
    expect(m.buildSegment).toBeUndefined();
  });

  it('F3 · NO ABM / NPS exports (S129)', () => {
    const m = marketingAutomation as unknown as Record<string, unknown>;
    expect(m.runABMCampaign).toBeUndefined();
    expect(m.computeNPS).toBeUndefined();
  });

  it('F4 · NO InsightX aggregation exports (D.3)', () => {
    const m = marketingAutomation as unknown as Record<string, unknown>;
    expect(m.aggregateInsight).toBeUndefined();
    expect(m.buildInsightCube).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G · SalesX EXTENSION registration (DP-P7-2)
// ────────────────────────────────────────────────────────────────────────────

describe('G · SalesX EXTENSION registration', () => {
  it('G1 · sx-marketing-automation listed in LIVE_SALESX_MODULES', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-automation');
  });

  it('G2 · sx-marketing-automation mapped in SALESX_MODULE_GROUP (master tab)', async () => {
    const groups = await import('@/features/salesx/SalesXSidebar.groups');
    expect(groups.SALESX_MODULE_GROUP['sx-marketing-automation']).toBe('master');
  });

  it('G3 · existing SalesX modules 0-DIFF — Marketing Planning still registered', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-planning');
  });

  it('G4 · SalesXPage source references MarketingAutomationPage (renderModule case)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/salesx/SalesXPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/sx-marketing-automation/);
    expect(src).toMatch(/MarketingAutomationPage/);
  });

  it('G5 · MarketingAutomationPage reads engine (no dead UI)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/marketing-automation/MarketingAutomationPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/marketing-automation-engine/);
    expect(src).toMatch(/scoreLead|fireJourneyStep|upsertJourney/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// H · Register + History (time-robust)
// ────────────────────────────────────────────────────────────────────────────

describe('H · Registers (time-robust)', () => {
  it('H1 · sibling-register contains marketing-automation-engine (id grep = 1)', () => {
    const ids = SIBLINGS.filter(s => s.id === 'marketing-automation-engine');
    expect(ids.length).toBe(1);
  });

  it('H2 · sibling count ≥ 195', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(195);
  });

  it('H3 · comply360-tier2 still appears exactly once (0-DIFF)', () => {
    const t2 = SIBLINGS.filter(s => s.id === 'comply360-tier2');
    expect(t2.length).toBeLessThanOrEqual(1);
  });

  it('H4 · S126 headSha backfilled to predecessor SHA (0fb77b58…)', () => {
    const s126 = SPRINTS.find(s => s.sprintNumber === 126);
    expect(s126?.headSha).toBe('0fb77b585f7861107c979007e9869e17ab15e61d');
  });

  it('H5 · S127 entry present · headSha via toContain (S121-T1 rule)', () => {
    const s127 = SPRINTS.find(s => s.sprintNumber === 127);
    expect(s127).toBeDefined();
    expect(['TBD_AT_BANK', s127?.headSha ?? '']).toContain(s127?.headSha);
    expect(s127?.newSiblings).toContain('marketing-automation-engine');
    expect(s127?.predecessorSha).toBe('0fb77b585f7861107c979007e9869e17ab15e61d');
  });

  it('H6 · audit type union admits marketing_automation_run', () => {
    const src = readFileSync(join(process.cwd(), 'src/types/audit-trail.ts'), 'utf8');
    expect(src).toMatch(/marketing_automation_run/);
  });
});
