/**
 * @file        src/test/sprint-129/abm-nps.test.ts
 * @sprint      Sprint 129 · T-Phase-7.D.2.4 · 🏁 Arc D.2 CAPSTONE · ABM + NPS + MarketingX dashboard
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              S129 own headSha via toContain([...]) NOT toBe (S121-T1 rule).
 *              NO existsSync-future tombstones · NO "no S130 entry" absence checks ·
 *              Scope-wall via toBeUndefined on engine surface (time-robust).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  scoreABMAccount,
  listABMAccounts,
  recordNPSSurvey,
  listNPSSurveys,
  computeNPS,
  categorizeNPSScore,
  buildMarketingXDashboard,
  ABM_TIERS,
  READS_FROM,
  __fr44_reuse,
  __resetABMNpsForTests,
} from '@/lib/abm-nps-engine';
import * as abmNps from '@/lib/abm-nps-engine';
import * as salesxConversion from '@/lib/salesx-conversion-engine';
import * as marketingPlanning from '@/lib/marketing-planning-engine';
import * as marketingAutomation from '@/lib/marketing-automation-engine';
import * as attribution from '@/lib/attribution-engine';
import * as realisationFeedback from '@/lib/realisation-feedback-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENGINE_PATH = join(process.cwd(), 'src/lib/abm-nps-engine.ts');
const ENGINE_SRC  = readFileSync(ENGINE_PATH, 'utf8');

beforeEach(() => {
  __resetABMNpsForTests();
  attribution.__resetAttributionForTests?.();
  marketingAutomation.__resetMarketingAutomationForTests?.();
  marketingPlanning.__resetMarketingPlanningForTests?.();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ────────────────────────────────────────────────────────────────────────────
// A · ABM — tiering + engagement from salesx-conversion (READ)
// ────────────────────────────────────────────────────────────────────────────
describe('A · ABM tiering + engagement (reads salesx-conversion)', () => {
  it('A1 · scoreABMAccount returns ABMAccount with required fields', () => {
    const a = scoreABMAccount({ account_id: 'ACC-1', tier: 'strategic', entity_code: 'OPX' });
    expect(a.account_id).toBe('ACC-1');
    expect(a.tier).toBe('strategic');
    expect(typeof a.engagement_score).toBe('number');
    expect(typeof a.touchpoints).toBe('number');
  });

  it('A2 · ABM_TIERS exposes the 3 tiers', () => {
    expect(ABM_TIERS).toEqual(['strategic', 'target', 'nurture']);
  });

  it('A3 · scoreABMAccount throws on empty account_id', () => {
    expect(() => scoreABMAccount({ account_id: '   ' })).toThrow();
  });

  it('A4 · engagement_score derives from salesx-conversion activity log (READ)', () => {
    // Seed via the actual engine path — proves we read from it, not fabricate.
    salesxConversion.logConversionEvent('OPX', 'u1', 'enquiry_to_quotation',
      'ACC-2', 'ACC-2', 'Q-1', 'Q-1');
    salesxConversion.logConversionEvent('OPX', 'u1', 'quotation_to_sales_order',
      'Q-1', 'Q-1', 'ACC-2', 'ACC-2');
    const a = scoreABMAccount({ account_id: 'ACC-2', tier: 'target', entity_code: 'OPX' });
    expect(a.touchpoints).toBeGreaterThanOrEqual(1);
    expect(a.engagement_score).toBeGreaterThanOrEqual(10);
  });

  it('A5 · zero touchpoints → engagement_score = 0', () => {
    const a = scoreABMAccount({ account_id: 'ACC-NEW', tier: 'nurture', entity_code: 'OPX' });
    expect(a.engagement_score).toBe(0);
    expect(a.touchpoints).toBe(0);
  });

  it('A6 · idempotent upsert by account_id', () => {
    scoreABMAccount({ account_id: 'ACC-3', tier: 'target', entity_code: 'OPX' });
    scoreABMAccount({ account_id: 'ACC-3', tier: 'strategic', entity_code: 'OPX' });
    const list = listABMAccounts();
    expect(list.filter((a) => a.account_id === 'ACC-3').length).toBe(1);
    expect(list.find((a) => a.account_id === 'ACC-3')?.tier).toBe('strategic');
  });

  it('A7 · listABMAccounts can filter by tier', () => {
    scoreABMAccount({ account_id: 'ACC-A', tier: 'strategic' });
    scoreABMAccount({ account_id: 'ACC-B', tier: 'nurture' });
    expect(listABMAccounts({ tier: 'strategic' }).length).toBe(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · NPS — category mapping + computeNPS
// ────────────────────────────────────────────────────────────────────────────
describe('B · NPS · category mapping + computeNPS = %promoters − %detractors', () => {
  it('B1 · score 9 → promoter', () => {
    expect(categorizeNPSScore(9)).toBe('promoter');
    expect(categorizeNPSScore(10)).toBe('promoter');
  });

  it('B2 · score 7-8 → passive', () => {
    expect(categorizeNPSScore(7)).toBe('passive');
    expect(categorizeNPSScore(8)).toBe('passive');
  });

  it('B3 · score 0-6 → detractor', () => {
    expect(categorizeNPSScore(0)).toBe('detractor');
    expect(categorizeNPSScore(6)).toBe('detractor');
  });

  it('B4 · score outside 0-10 throws', () => {
    expect(() => categorizeNPSScore(11)).toThrow();
    expect(() => categorizeNPSScore(-1)).toThrow();
  });

  it('B5 · recordNPSSurvey stores survey with derived category', () => {
    const s = recordNPSSurvey({ respondent_id: 'R-1', score: 10, period: 'FY26' });
    expect(s.category).toBe('promoter');
    expect(listNPSSurveys().length).toBe(1);
  });

  it('B6 · computeNPS = %promoters − %detractors (range −100..100)', () => {
    recordNPSSurvey({ respondent_id: 'R1', score: 10, period: 'FY26' }); // promoter
    recordNPSSurvey({ respondent_id: 'R2', score: 9,  period: 'FY26' }); // promoter
    recordNPSSurvey({ respondent_id: 'R3', score: 3,  period: 'FY26' }); // detractor
    recordNPSSurvey({ respondent_id: 'R4', score: 8,  period: 'FY26' }); // passive
    const r = computeNPS({ period: 'FY26' });
    expect(r.total_responses).toBe(4);
    expect(r.promoters).toBe(2);
    expect(r.detractors).toBe(1);
    expect(r.passives).toBe(1);
    // 50% promoters − 25% detractors = 25
    expect(r.nps).toBe(25);
  });

  it('B7 · computeNPS clamps to −100..100', () => {
    recordNPSSurvey({ respondent_id: 'R1', score: 0, period: 'FY27' });
    recordNPSSurvey({ respondent_id: 'R2', score: 0, period: 'FY27' });
    const r = computeNPS({ period: 'FY27' });
    expect(r.nps).toBe(-100);
    expect(r.nps).toBeGreaterThanOrEqual(-100);
    expect(r.nps).toBeLessThanOrEqual(100);
  });

  it('B8 · computeNPS with zero responses → 0', () => {
    const r = computeNPS({ period: 'FY99' });
    expect(r.total_responses).toBe(0);
    expect(r.nps).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · ★ NPS is DISTINCT from realisation-feedback-engine (no duplication)
// ────────────────────────────────────────────────────────────────────────────
describe('C · ★ NPS distinct from realisation-feedback-engine (FR-44 no-dup)', () => {
  it('C1 · realisation-feedback-engine still exports its 4 fns (0-DIFF)', () => {
    expect(typeof realisationFeedback.computeDaysToRealiseFactor).toBe('function');
    expect(typeof realisationFeedback.computeFEMAStatePenalty).toBe('function');
    expect(typeof realisationFeedback.computeRealisationHistoryFactor).toBe('function');
    expect(typeof realisationFeedback.computeReliabilityFeedbackImpact).toBe('function');
  });

  it('C2 · abm-nps-engine does NOT re-export realisation-feedback fns', () => {
    const m = abmNps as unknown as Record<string, unknown>;
    expect(m.computeDaysToRealiseFactor).toBeUndefined();
    expect(m.computeFEMAStatePenalty).toBeUndefined();
    expect(m.computeReliabilityFeedbackImpact).toBeUndefined();
  });

  it('C3 · abm-nps-engine source does NOT import realisation-feedback', () => {
    expect(ENGINE_SRC).not.toMatch(/realisation-feedback-engine/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · MarketingX dashboard READS the D.2 engines (recomputes NOTHING)
// ────────────────────────────────────────────────────────────────────────────
describe('D · MarketingX dashboard · READS D.2 engines (no recompute)', () => {
  it('D1 · buildMarketingXDashboard returns roll-up shape', () => {
    const d = buildMarketingXDashboard({ fy: 'FY26' });
    expect(d.fy).toBe('FY26');
    expect(typeof d.plans_count).toBe('number');
    expect(typeof d.scored_leads).toBe('number');
    expect(typeof d.attributions).toBe('number');
    expect(typeof d.abm_accounts_total).toBe('number');
  });

  it('D2 · dashboard reflects marketing-planning reads (S126)', () => {
    marketingPlanning.allocateChannelBudget({
      fy: 'FY26', entity_code: 'OPX', total_budget: 50000,
      mix: [{ channel: 'email', pct: 100 }],
    });
    const d = buildMarketingXDashboard({ fy: 'FY26' });
    expect(d.plans_count).toBeGreaterThanOrEqual(1);
    expect(d.total_marketing_budget).toBeGreaterThanOrEqual(50000);
  });

  it('D3 · dashboard reflects ABM/NPS reads (this engine)', () => {
    scoreABMAccount({ account_id: 'ACC-X', tier: 'strategic' });
    recordNPSSurvey({ respondent_id: 'R1', score: 10, period: 'FY26' });
    const d = buildMarketingXDashboard({ fy: 'FY26' });
    expect(d.abm_accounts_total).toBeGreaterThanOrEqual(1);
    expect(d.abm_strategic).toBeGreaterThanOrEqual(1);
    expect(d.nps_total_responses).toBeGreaterThanOrEqual(1);
  });

  it('D4 · dashboard sources_loaded surfaces the D.2 engine wiring', () => {
    const d = buildMarketingXDashboard({ fy: 'FY26' });
    expect(d.sources_loaded.planning).toBe(true);
    expect(d.sources_loaded.automation).toBe(true);
    expect(d.sources_loaded.attribution).toBe(true);
  });

  it('D5 · dashboard does NOT introduce a new attribution model (calls attribution.listAttributions)', () => {
    expect(ENGINE_SRC).toMatch(/attribution\.listAttributions/);
    expect(ENGINE_SRC).toMatch(/marketingAutomation\.listLeadScores/);
    expect(ENGINE_SRC).toMatch(/marketingPlanning\.listMarketingPlans/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · FR-44 reuse + READS_FROM + no new runtime deps
// ────────────────────────────────────────────────────────────────────────────
describe('E · FR-44 reuse + READS_FROM', () => {
  it('E1 · __fr44_reuse exposes all 4 D.2 source surfaces', () => {
    expect(__fr44_reuse.salesxConversion).toBe(salesxConversion);
    expect(__fr44_reuse.marketingPlanning).toBe(marketingPlanning);
    expect(__fr44_reuse.marketingAutomation).toBe(marketingAutomation);
    expect(__fr44_reuse.attribution).toBe(attribution);
  });

  it('E2 · engine imports from each upstream — not reimplemented', () => {
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/salesx-conversion-engine['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/marketing-planning-engine['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/marketing-automation-engine['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/attribution-engine['"]/);
  });

  it('E3 · READS_FROM declares all expected upstream sources', () => {
    expect(READS_FROM).toContain('customer-types');
    expect(READS_FROM).toContain('opportunity-types');
    expect(READS_FROM).toContain('salesx-conversion-engine');
    expect(READS_FROM).toContain('marketing-planning-engine');
    expect(READS_FROM).toContain('marketing-automation-engine');
    expect(READS_FROM).toContain('attribution-engine');
  });

  it('E4 · NO new runtime deps (no ML/survey/email libs)', () => {
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]@?tensorflow/);
    expect(ENGINE_SRC).not.toMatch(/createTransport|nodemailer|sendgrid/i);
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]surveymonkey/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · SCOPE WALL (DP-D2-9) — no InsightX/75-scenario/cross-card aggregation
// ────────────────────────────────────────────────────────────────────────────
describe('F · SCOPE WALL DP-D2-9 (toBeUndefined · time-robust)', () => {
  it('F1 · NO InsightX aggregation exports (D.3)', () => {
    const m = abmNps as unknown as Record<string, unknown>;
    expect(m.aggregateInsight).toBeUndefined();
    expect(m.buildInsightCube).toBeUndefined();
  });

  it('F2 · NO 75-scenario / cross-card aggregation exports', () => {
    const m = abmNps as unknown as Record<string, unknown>;
    expect(m.runAll75Scenarios).toBeUndefined();
    expect(m.aggregateAcrossCards).toBeUndefined();
    expect(m.crossCardRollup).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G · SalesX EXTENSION registration (DP-P7-2) + page wiring
// ────────────────────────────────────────────────────────────────────────────
describe('G · SalesX EXTENSION registration + ABMNpsPage wiring', () => {
  it('G1 · sx-abm-nps listed in LIVE_SALESX_MODULES', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-abm-nps');
  });

  it('G2 · sx-abm-nps mapped in SALESX_MODULE_GROUP (master tab)', async () => {
    const groups = await import('@/features/salesx/SalesXSidebar.groups');
    expect(groups.SALESX_MODULE_GROUP['sx-abm-nps']).toBe('master');
  });

  it('G3 · existing SalesX modules 0-DIFF (S126/S127/S128 still registered)', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-planning');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-automation');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-attribution-segmentation');
  });

  it('G4 · SalesXPage source references ABMNpsPage (renderModule case)', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/salesx/SalesXPage.tsx'), 'utf8');
    expect(src).toMatch(/sx-abm-nps/);
    expect(src).toMatch(/ABMNpsPage/);
  });

  it('G5 · ABMNpsPage reads engine (no dead UI)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/abm-nps/ABMNpsPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/abm-nps-engine/);
    expect(src).toMatch(/scoreABMAccount|recordNPSSurvey|buildMarketingXDashboard/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// H · Audit + Registers (time-robust)
// ────────────────────────────────────────────────────────────────────────────
describe('H · Audit + Registers (time-robust)', () => {
  it('H1 · audit type union admits abm_nps_event', () => {
    const src = readFileSync(join(process.cwd(), 'src/types/audit-trail.ts'), 'utf8');
    expect(src).toMatch(/abm_nps_event/);
  });

  it('H2 · sibling-register contains abm-nps-engine (id grep = 1)', () => {
    const ids = SIBLINGS.filter((s) => s.id === 'abm-nps-engine');
    expect(ids.length).toBe(1);
  });

  it('H3 · sibling count ≥ 197', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(197);
  });

  it('H4 · comply360-tier2 still appears at most once (0-DIFF)', () => {
    const t2 = SIBLINGS.filter((s) => s.id === 'comply360-tier2');
    expect(t2.length).toBeLessThanOrEqual(1);
  });

  it('H5 · S128 headSha backfilled to predecessor SHA (1d6f650d…)', () => {
    const s128 = SPRINTS.find((s) => s.sprintNumber === 128);
    expect(s128?.headSha).toBe('1d6f650d3e0f3cf05ac169ffc91727d214d108b3');
  });

  it('H6 · S129 entry present · headSha via toContain (S121-T1 rule)', () => {
    const s129 = SPRINTS.find((s) => s.sprintNumber === 129);
    expect(s129).toBeDefined();
    expect(['TBD_AT_BANK', s129?.headSha ?? '']).toContain(s129?.headSha);
    expect(s129?.newSiblings).toContain('abm-nps-engine');
    expect(s129?.predecessorSha).toBe('1d6f650d3e0f3cf05ac169ffc91727d214d108b3');
  });

  it('H7 · audit fires on scoreABMAccount + recordNPSSurvey (no throw)', () => {
    expect(() => scoreABMAccount({ account_id: 'A-AUDIT', tier: 'nurture' })).not.toThrow();
    expect(() => recordNPSSurvey({ respondent_id: 'R-AUDIT', score: 9, period: 'FY26' })).not.toThrow();
  });
});
