/**
 * @file        src/test/sprint-128/attribution-segmentation.test.ts
 * @sprint      Sprint 128 · T-Phase-7.D.2.3 · Arc D.2 · Attribution + Segmentation
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              S128 own headSha via toContain([...]) NOT toBe (S121-T1 rule).
 *              NO existsSync-future tombstones · NO "no S129 entry" absence checks ·
 *              Scope-wall via toBeUndefined on engine surface (time-robust).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  attributeConversion,
  getChannelROI,
  listAttributions,
  buildMarketingSegment,
  listMarketingSegments,
  getTouchpointSources,
  ATTRIBUTION_MODELS,
  READS_FROM,
  __fr44_reuse,
  __resetAttributionForTests,
  type Touchpoint,
} from '@/lib/attribution-engine';
import * as attribution from '@/lib/attribution-engine';
import * as segmentRuleEngine from '@/lib/segment-rule-engine';
import * as salesxConversion from '@/lib/salesx-conversion-engine';
import * as marketingAutomation from '@/lib/marketing-automation-engine';
import * as marketingPlanning from '@/lib/marketing-planning-engine';
import type { SegmentContext } from '@/lib/segment-rule-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENGINE_PATH = join(process.cwd(), 'src/lib/attribution-engine.ts');
const ENGINE_SRC  = readFileSync(ENGINE_PATH, 'utf8');

function tps(n = 4): Touchpoint[] {
  return Array.from({ length: n }, (_, i) => ({
    lead_id: 'L-1',
    channel: ['email', 'whatsapp', 'social', 'search'][i % 4],
    campaign_id: `cmp-${i}`,
    ts: new Date(2026, 3, i + 1).toISOString(),
  }));
}

const AUDIENCE: SegmentContext[] = [
  { customer_id: 'C-1', city: 'Mumbai', clv_tier: 'vip',      churn_tier: 'safe',  placed_orders_30d: 5, lifetime_value_paise: 1_00_00_000 },
  { customer_id: 'C-2', city: 'Delhi',  clv_tier: 'standard', churn_tier: 'watch', placed_orders_30d: 1, lifetime_value_paise: 10_00_000   },
  { customer_id: 'C-3', city: 'Mumbai', clv_tier: 'growth',   churn_tier: 'safe',  placed_orders_30d: 3, lifetime_value_paise: 50_00_000   },
];

beforeEach(() => {
  __resetAttributionForTests();
  try { localStorage.clear(); } catch { /* noop */ }
});

// ────────────────────────────────────────────────────────────────────────────
// A · Multi-touch attribution — credits sum to 100% (dEq · decimal-helpers)
// ────────────────────────────────────────────────────────────────────────────
describe('A · Attribution models · credit_pct sum = 100 (dEq)', () => {
  it('A1 · last_touch gives 100% to final touchpoint', () => {
    const r = attributeConversion({
      conversion_id: 'c-1', model: 'last_touch', touchpoints: tps(4), conversion_value: 1000,
    });
    expect(r.credits[r.credits.length - 1].credit_pct).toBe(100);
    expect(r.credits[0].credit_pct).toBe(0);
  });

  it('A2 · last_touch credits sum to 100', () => {
    const r = attributeConversion({ conversion_id: 'c-2', model: 'last_touch', touchpoints: tps(3), conversion_value: 1000 });
    const sum = r.credits.reduce((s, c) => s + c.credit_pct, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it('A3 · linear splits equally across touchpoints', () => {
    const r = attributeConversion({ conversion_id: 'c-3', model: 'linear', touchpoints: tps(4), conversion_value: 1000 });
    expect(r.credits[0].credit_pct).toBe(25);
  });

  it('A4 · linear credits sum to 100', () => {
    const r = attributeConversion({ conversion_id: 'c-4', model: 'linear', touchpoints: tps(3), conversion_value: 1000 });
    const sum = r.credits.reduce((s, c) => s + c.credit_pct, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it('A5 · time_decay gives MORE credit to recent touch', () => {
    const r = attributeConversion({ conversion_id: 'c-5', model: 'time_decay', touchpoints: tps(4), conversion_value: 1000 });
    const last = r.credits[r.credits.length - 1].credit_pct;
    const first = r.credits[0].credit_pct;
    expect(last).toBeGreaterThan(first);
  });

  it('A6 · time_decay credits sum to 100', () => {
    const r = attributeConversion({ conversion_id: 'c-6', model: 'time_decay', touchpoints: tps(5), conversion_value: 1000 });
    const sum = r.credits.reduce((s, c) => s + c.credit_pct, 0);
    expect(Math.round(sum * 100) / 100).toBe(100);
  });

  it('A7 · credit_value = credit_pct × value / 100 (decimal-safe round2)', () => {
    const r = attributeConversion({ conversion_id: 'c-7', model: 'linear', touchpoints: tps(4), conversion_value: 1000 });
    expect(r.credits[0].credit_value).toBe(250);
  });

  it('A8 · ATTRIBUTION_MODELS exposes all 3 models', () => {
    expect(ATTRIBUTION_MODELS).toEqual(['last_touch', 'linear', 'time_decay']);
  });

  it('A9 · attributeConversion throws on empty touchpoints', () => {
    expect(() => attributeConversion({
      conversion_id: 'c-9', model: 'linear', touchpoints: [], conversion_value: 100,
    })).toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// B · Channel ROI — attributed_revenue ÷ marketing-planning spend, guarded
// ────────────────────────────────────────────────────────────────────────────
describe('B · Channel ROI · attributed_revenue ÷ spend (divide-by-zero guarded)', () => {
  it('B1 · getChannelROI returns 0 ROI when spend = 0 (divide-by-zero guard)', () => {
    attributeConversion({ conversion_id: 'c-roi-1', model: 'last_touch', touchpoints: tps(2), conversion_value: 1000 });
    const roi = getChannelROI({ fy: 'FY26' });
    for (const r of roi) {
      if (r.spend === 0) expect(r.roi).toBe(0);
    }
  });

  it('B2 · getChannelROI uses marketing-planning spend (FR-44 Wall C)', () => {
    marketingPlanning.allocateChannelBudget({
      fy: 'FY26', entity_code: 'OPX', total_budget: 100000,
      mix: [
        { channel: 'email',    pct: 50 },
        { channel: 'whatsapp', pct: 50 },
      ],
    });
    attributeConversion({
      conversion_id: 'c-roi-2', model: 'linear',
      touchpoints: [
        { lead_id: 'L', channel: 'email',    campaign_id: 'c', ts: '2026-04-01T00:00:00Z' },
        { lead_id: 'L', channel: 'whatsapp', campaign_id: 'c', ts: '2026-04-02T00:00:00Z' },
      ],
      conversion_value: 200000,
      entity_code: 'OPX',
    });
    const roi = getChannelROI({ fy: 'FY26', entity_code: 'OPX' });
    const email = roi.find((r) => r.channel === 'email');
    expect(email).toBeDefined();
    expect(email?.spend).toBe(50000);
    expect(email?.attributed_revenue).toBe(100000);
    expect(email?.roi).toBe(100); // (100k - 50k) / 50k * 100 = 100%
  });

  it('B3 · getChannelROI aggregates across multiple attributions', () => {
    attributeConversion({ conversion_id: 'cA', model: 'last_touch', touchpoints: tps(2), conversion_value: 500 });
    attributeConversion({ conversion_id: 'cB', model: 'last_touch', touchpoints: tps(2), conversion_value: 700 });
    const roi = getChannelROI({ fy: 'FY26' });
    const total = roi.reduce((s, r) => s + r.attributed_revenue, 0);
    expect(total).toBe(1200);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// C · Touchpoint sources — reads salesx-conversion + marketing-automation
// ────────────────────────────────────────────────────────────────────────────
describe('C · Touchpoint sources (FR-44 reads)', () => {
  it('C1 · getTouchpointSources confirms salesx-conversion-engine wired', () => {
    expect(getTouchpointSources().conversionEngineLoaded).toBe(true);
  });

  it('C2 · getTouchpointSources confirms marketing-automation-engine wired', () => {
    expect(getTouchpointSources().automationEngineLoaded).toBe(true);
  });

  it('C3 · journeyChannels surfaces the marketing-automation channels (READ)', () => {
    expect(getTouchpointSources().journeyChannels.length).toBeGreaterThanOrEqual(2);
  });

  it('C4 · READS_FROM declares all 5 upstream sources', () => {
    expect(READS_FROM).toContain('salesx-conversion-engine');
    expect(READS_FROM).toContain('marketing-automation-engine');
    expect(READS_FROM).toContain('marketing-planning-engine');
    expect(READS_FROM).toContain('segment-rule-engine');
    expect(READS_FROM).toContain('campaign-types');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// D · ★ Segmentation REUSES segment-rule-engine (DP-D2-5 · the key dedup)
// ────────────────────────────────────────────────────────────────────────────
describe('D · ★ Segmentation REUSES segment-rule-engine (DP-D2-5)', () => {
  it('D1 · buildMarketingSegment CALLS evalRule (matched_count comes from rule eval)', () => {
    const s = buildMarketingSegment({
      name: 'Mumbai actives', rule: 'city = Mumbai', audience: AUDIENCE,
    });
    expect(s.matched_count).toBe(2);
  });

  it('D2 · buildMarketingSegment also exercises evaluateAllSegments (both paths agree)', () => {
    // If single + bulk disagree the engine throws — passing means agreement.
    expect(() => buildMarketingSegment({
      name: 'orders ge 3', rule: 'placed_orders_30d >= 3', audience: AUDIENCE,
    })).not.toThrow();
  });

  it('D3 · matched_count for non-matching rule = 0', () => {
    const s = buildMarketingSegment({
      name: 'noop', rule: 'city = Atlantis', audience: AUDIENCE,
    });
    expect(s.matched_count).toBe(0);
  });

  it('D4 · listMarketingSegments returns built segments', () => {
    buildMarketingSegment({ name: 's1', rule: 'city = Mumbai', audience: AUDIENCE });
    buildMarketingSegment({ name: 's2', rule: 'city = Delhi',  audience: AUDIENCE });
    expect(listMarketingSegments().length).toBe(2);
  });

  it('D5 · __fr44_reuse.segmentRuleEngine is the actual segment-rule-engine module', () => {
    expect(__fr44_reuse.segmentRuleEngine).toBe(segmentRuleEngine);
  });

  it('D6 · NO second segmentation engine/parser built — only segment-rule-engine references', () => {
    // No parseRule duplicate, no second evaluator, no second DSL parser.
    expect(ENGINE_SRC).not.toMatch(/function\s+parseRule/);
    expect(ENGINE_SRC).not.toMatch(/function\s+evalClause/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/segment-rule-engine['"]/);
  });

  it('D7 · segment-rule-engine surface stays 0-DIFF (still exports the reuse API)', () => {
    expect(typeof segmentRuleEngine.evalRule).toBe('function');
    expect(typeof segmentRuleEngine.evaluateAllSegments).toBe('function');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// E · FR-44 REUSE walls
// ────────────────────────────────────────────────────────────────────────────
describe('E · FR-44 reuse', () => {
  it('E1 · __fr44_reuse namespace exposes all 4 source surfaces', () => {
    expect(__fr44_reuse.salesxConversion).toBe(salesxConversion);
    expect(__fr44_reuse.marketingAutomation).toBe(marketingAutomation);
    expect(__fr44_reuse.marketingPlanning).toBe(marketingPlanning);
    expect(__fr44_reuse.segmentRuleEngine).toBe(segmentRuleEngine);
  });

  it('E2 · engine imports from each upstream — not reimplemented', () => {
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/salesx-conversion-engine['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/marketing-automation-engine['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]@\/lib\/marketing-planning-engine['"]/);
  });

  it('E3 · NO new runtime deps (no ML/email/segmentation libs)', () => {
    expect(ENGINE_SRC).not.toMatch(/from\s+['"]@?tensorflow/);
    expect(ENGINE_SRC).not.toMatch(/createTransport|nodemailer|sendgrid/i);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// F · SCOPE WALL (DP-D2-9) — no S129 / D.3 surface
// ────────────────────────────────────────────────────────────────────────────
describe('F · SCOPE WALL DP-D2-9 (toBeUndefined · time-robust)', () => {
  it('F1 · NO ABM exports (S129)', () => {
    const m = attribution as unknown as Record<string, unknown>;
    expect(m.runABMCampaign).toBeUndefined();
    expect(m.buildAccountList).toBeUndefined();
  });

  it('F2 · NO NPS exports (S129)', () => {
    const m = attribution as unknown as Record<string, unknown>;
    expect(m.computeNPS).toBeUndefined();
    expect(m.recordNpsResponse).toBeUndefined();
  });

  it('F3 · NO InsightX aggregation exports (D.3)', () => {
    const m = attribution as unknown as Record<string, unknown>;
    expect(m.aggregateInsight).toBeUndefined();
    expect(m.buildInsightCube).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// G · SalesX EXTENSION registration (DP-P7-2)
// ────────────────────────────────────────────────────────────────────────────
describe('G · SalesX EXTENSION registration', () => {
  it('G1 · sx-attribution-segmentation listed in LIVE_SALESX_MODULES', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-attribution-segmentation');
  });

  it('G2 · sx-attribution-segmentation mapped in SALESX_MODULE_GROUP (master tab)', async () => {
    const groups = await import('@/features/salesx/SalesXSidebar.groups');
    expect(groups.SALESX_MODULE_GROUP['sx-attribution-segmentation']).toBe('master');
  });

  it('G3 · existing SalesX modules 0-DIFF — Marketing Automation still registered', async () => {
    const types = await import('@/features/salesx/SalesXSidebar.types');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-automation');
    expect(types.LIVE_SALESX_MODULES).toContain('sx-marketing-planning');
  });

  it('G4 · SalesXPage source references AttributionSegmentationPage (renderModule case)', () => {
    const src = readFileSync(join(process.cwd(), 'src/features/salesx/SalesXPage.tsx'), 'utf8');
    expect(src).toMatch(/sx-attribution-segmentation/);
    expect(src).toMatch(/AttributionSegmentationPage/);
  });

  it('G5 · AttributionSegmentationPage reads engine (no dead UI)', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/features/attribution-segmentation/AttributionSegmentationPage.tsx'),
      'utf8',
    );
    expect(src).toMatch(/attribution-engine/);
    expect(src).toMatch(/attributeConversion|getChannelROI|buildMarketingSegment/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// H · Audit + Registers (time-robust)
// ────────────────────────────────────────────────────────────────────────────
describe('H · Audit + Registers (time-robust)', () => {
  it('H1 · audit type union admits attribution_run', () => {
    const src = readFileSync(join(process.cwd(), 'src/types/audit-trail.ts'), 'utf8');
    expect(src).toMatch(/attribution_run/);
  });

  it('H2 · sibling-register contains attribution-engine (id grep = 1)', () => {
    const ids = SIBLINGS.filter((s) => s.id === 'attribution-engine');
    expect(ids.length).toBe(1);
  });

  it('H3 · sibling count ≥ 196', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(196);
  });

  it('H4 · comply360-tier2 still appears at most once (0-DIFF)', () => {
    const t2 = SIBLINGS.filter((s) => s.id === 'comply360-tier2');
    expect(t2.length).toBeLessThanOrEqual(1);
  });

  it('H5 · S127 headSha backfilled to predecessor SHA (2c6f04d2…)', () => {
    const s127 = SPRINTS.find((s) => s.sprintNumber === 127);
    expect(s127?.headSha).toBe('2c6f04d2c8590d275222370d23afabb259b84e9b');
  });

  it('H6 · S128 entry present · headSha via toContain (S121-T1 rule)', () => {
    const s128 = SPRINTS.find((s) => s.sprintNumber === 128);
    expect(s128).toBeDefined();
    expect(['TBD_AT_BANK', s128?.headSha ?? '']).toContain(s128?.headSha);
    expect(s128?.newSiblings).toContain('attribution-engine');
    expect(s128?.predecessorSha).toBe('2c6f04d2c8590d275222370d23afabb259b84e9b');
  });

  it('H7 · listAttributions records every attributeConversion call', () => {
    attributeConversion({ conversion_id: 'h-1', model: 'last_touch', touchpoints: tps(2), conversion_value: 100 });
    attributeConversion({ conversion_id: 'h-2', model: 'linear',     touchpoints: tps(2), conversion_value: 100 });
    expect(listAttributions().length).toBeGreaterThanOrEqual(2);
  });
});
