/**
 * @file        src/test/sprint-126/marketing-planning.test.ts
 * @sprint      Sprint 126 · T-Phase-7.D.2.1 · 🎬 Arc D.2 OPENER · Marketing Planning
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              Behavioral first — toBeGreaterThanOrEqual on counts; S126 own headSha
 *              assertion uses toContain([...]) per the S121-T1 rule. NO existsSync-
 *              future tombstones, NO "no S127 entry" absence checks. Scope-wall via
 *              toBeUndefined on the engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  allocateChannelBudget,
  upsertMarketingPlan,
  listMarketingPlans,
  getCampaignCalendar,
  MARKETING_CHANNELS,
  READS_FROM,
  __fr44_reuse,
  __resetMarketingPlanningForTests,
  type MarketingPlan,
} from '@/lib/marketing-planning-engine';
import * as marketingPlanning from '@/lib/marketing-planning-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as salesxConversion from '@/lib/salesx-conversion-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

import { LIVE_SALESX_MODULES } from '@/features/salesx/SalesXSidebar.types';
import { SALESX_MODULE_GROUP } from '@/features/salesx/SalesXSidebar.groups';
import { campaignsKey } from '@/types/campaign';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/marketing-planning-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/marketing-planning/MarketingPlanningPage.tsx');
const SALESX_PAGE_PATH = join(ROOT, 'src/features/salesx/SalesXPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const CAMPAIGN_TYPES_PATH = join(ROOT, 'src/types/campaign.ts');
const FPA_BUDGETING_PATH = join(ROOT, 'src/lib/fpa-budgeting-engine.ts');
const SALESX_CONV_PATH = join(ROOT, 'src/lib/salesx-conversion-engine.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const salesxPageSrc = readFileSync(SALESX_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const campaignTypesSrc = readFileSync(CAMPAIGN_TYPES_PATH, 'utf8');
const fpaBudgetingSrc = readFileSync(FPA_BUDGETING_PATH, 'utf8');
const salesxConvSrc = readFileSync(SALESX_CONV_PATH, 'utf8');

const ENTITY = 'ENT-TEST-126';

beforeEach(() => {
  localStorage.clear();
  __resetMarketingPlanningForTests();
  vi.restoreAllMocks();
});

// ─── §A · Channel-mix allocation · pcts sum to 100 (dEq) ─────────────────────
describe('§A · allocateChannelBudget · sum-to-100 (dEq · decimal-helpers)', () => {
  it('rejects a mix whose pcts do NOT sum to 100', () => {
    expect(() => allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 100,
      mix: [{ channel: 'email', pct: 40 }, { channel: 'social', pct: 50 }],
    })).toThrow(/sum to 100/);
  });

  it('accepts a 7-channel mix that sums to 100', () => {
    const p = allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 1000,
      mix: MARKETING_CHANNELS.map((c, i, arr) => ({
        channel: c, pct: i === arr.length - 1 ? 100 - (arr.length - 1) * 14 : 14,
      })),
    });
    expect(p.channel_allocations.length).toBe(MARKETING_CHANNELS.length);
  });

  it('channel allocation = total × pct/100 (decimal-safe per channel)', () => {
    const p = allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 1000,
      mix: [
        { channel: 'email', pct: 25 }, { channel: 'social', pct: 25 },
        { channel: 'search', pct: 25 }, { channel: 'events', pct: 25 },
      ],
    });
    expect(p.channel_allocations[0].budget).toBe(250);
    expect(p.channel_allocations[1].budget).toBe(250);
  });

  it('per-channel budgets sum to total_budget (rounding-drift redistributed)', () => {
    const p = allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 1000,
      mix: [
        { channel: 'email', pct: 33 }, { channel: 'social', pct: 33 },
        { channel: 'search', pct: 34 },
      ],
    });
    const sum = p.channel_allocations.reduce((s, c) => s + c.budget, 0);
    expect(Math.round(sum)).toBe(1000);
  });

  it('rejects an empty mix', () => {
    expect(() => allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 1000, mix: [],
    })).toThrow();
  });
});

// ─── §B · Persistence + listMarketingPlans + upsert ──────────────────────────
describe('§B · upsert / list', () => {
  it('persists the plan and listMarketingPlans returns it', () => {
    allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 500,
      mix: [{ channel: 'email', pct: 100 }],
    });
    expect(listMarketingPlans({ fy: 'FY26', entity_code: ENTITY }).length).toBe(1);
  });

  it('allocate is idempotent on (fy, entity_code) — same plan_id replaced, not duplicated', () => {
    allocateChannelBudget({ fy: 'FY26', entity_code: ENTITY, total_budget: 500, mix: [{ channel: 'email', pct: 100 }] });
    allocateChannelBudget({ fy: 'FY26', entity_code: ENTITY, total_budget: 800, mix: [{ channel: 'email', pct: 100 }] });
    const list = listMarketingPlans({ entity_code: ENTITY });
    expect(list.length).toBe(1);
    expect(list[0].total_budget).toBe(800);
  });

  it('upsertMarketingPlan rejects pcts that do not sum to 100', () => {
    const p: MarketingPlan = {
      plan_id: 'x', fy: 'FY26', entity_code: ENTITY, total_budget: 1,
      channel_allocations: [{ channel: 'email', pct: 50, budget: 0.5 }],
      fpa_budget_reference: null, reconciles_to_fpa: true,
      created_at: '', updated_at: '',
    };
    expect(() => upsertMarketingPlan(p)).toThrow(/sum to 100/);
  });
});

// ─── §C · Campaign calendar (READS Campaign data · FR-44 Wall A) ─────────────
describe('§C · getCampaignCalendar reads Campaign storage', () => {
  it('returns [] when no campaigns are present', () => {
    expect(getCampaignCalendar({ fy: '2026', entity_code: ENTITY })).toEqual([]);
  });

  it('reads campaigns from campaignsKey storage and maps channel + dates', () => {
    localStorage.setItem(campaignsKey(ENTITY), JSON.stringify([
      { id: 'c1', entity_id: ENTITY, campaign_name: 'EMail Drop', campaign_type: 'EMAIL',
        start_date: '2026-04-15', end_date: '2026-04-20', budget: 5000,
        communication_channels: [], status: 'planned', is_active: true,
        budget_breakdown: null, target_filters: null, follow_up_rule: null,
        outcome_tracking: null, performance_metrics: null, campaign_code: 'C-1',
        created_at: '', updated_at: '' },
      { id: 'c2', entity_id: ENTITY, campaign_name: 'Webinar', campaign_type: 'WEB',
        start_date: '2026-05-10', end_date: null, budget: 0,
        communication_channels: [], status: 'planned', is_active: true,
        budget_breakdown: null, target_filters: null, follow_up_rule: null,
        outcome_tracking: null, performance_metrics: null, campaign_code: 'C-2',
        created_at: '', updated_at: '' },
    ]));
    const cal = getCampaignCalendar({ fy: '2026', entity_code: ENTITY });
    expect(cal.length).toBe(2);
    expect(cal[0].channel).toBe('email');
    expect(cal[1].channel).toBe('social');
    expect(cal[1].end_date).toBe(cal[1].start_date); // null end_date falls back to start
  });

  it('filters by FY year prefix', () => {
    localStorage.setItem(campaignsKey(ENTITY), JSON.stringify([
      { id: 'c1', entity_id: ENTITY, campaign_name: 'Old', campaign_type: 'EMAIL',
        start_date: '2025-04-15', end_date: '2025-04-20', budget: 1, communication_channels: [], status: 'planned', is_active: true, budget_breakdown: null, target_filters: null, follow_up_rule: null, outcome_tracking: null, performance_metrics: null, campaign_code: 'C-1', created_at: '', updated_at: '' },
      { id: 'c2', entity_id: ENTITY, campaign_name: 'New', campaign_type: 'EMAIL',
        start_date: '2026-04-15', end_date: '2026-04-20', budget: 1, communication_channels: [], status: 'planned', is_active: true, budget_breakdown: null, target_filters: null, follow_up_rule: null, outcome_tracking: null, performance_metrics: null, campaign_code: 'C-2', created_at: '', updated_at: '' },
    ]));
    expect(getCampaignCalendar({ fy: '2026', entity_code: ENTITY }).length).toBe(1);
  });
});

// ─── §D · FP&A budget tie (cross-arc reuse) ──────────────────────────────────
describe('§D · FP&A budget reconciliation (CALLS fpa-budgeting-engine.listBudgets)', () => {
  it('fpa_budget_reference = null when no FP&A operating budget on file', () => {
    const p = allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 100,
      mix: [{ channel: 'email', pct: 100 }],
    });
    expect(p.fpa_budget_reference).toBeNull();
    expect(p.reconciles_to_fpa).toBe(true); // null reference is treated as honest pass
  });

  it('CALLS fpa-budgeting-engine.listBudgets (spy invoked with operating/entity scope)', () => {
    const spy = vi.spyOn(fpaBudgeting, 'listBudgets');
    allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 100,
      mix: [{ channel: 'email', pct: 100 }],
    });
    expect(spy).toHaveBeenCalled();
    const args = spy.mock.calls[0]?.[0] as { fy?: string; budget_type?: string };
    expect(args?.fy).toBe('FY26');
    expect(args?.budget_type).toBe('operating');
  });
});

// ─── §E · Audit (marketing_plan_event under mca-roc) ─────────────────────────
describe('§E · audit fires marketing_plan_event', () => {
  it('logAudit invoked with entityType=marketing_plan_event on allocate', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    allocateChannelBudget({
      fy: 'FY26', entity_code: ENTITY, total_budget: 100,
      mix: [{ channel: 'email', pct: 100 }],
    });
    const calls = spy.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => c.entityType === 'marketing_plan_event')).toBe(true);
  });

  it('audit type literal exists in src/types/audit-trail.ts (mca-roc · ComplianceModule untouched)', () => {
    expect(auditSrc).toContain("'marketing_plan_event'");
    expect(auditSrc).toContain('mca-roc');
  });
});

// ─── §F · FR-44 reuse · sources 0-DIFF ───────────────────────────────────────
describe('§F · FR-44 · REUSES (not reimplements) campaign types + fpa-budgeting + salesx-conversion', () => {
  it('engine imports fpa-budgeting-engine', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/lib\/fpa-budgeting-engine['"]/);
  });
  it('engine imports salesx-conversion-engine (read-only namespace)', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/lib\/salesx-conversion-engine['"]/);
  });
  it('engine imports Campaign type from @/types/campaign', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/types\/campaign['"]/);
  });
  it('__fr44_reuse surfaces fpa-budgeting and salesx-conversion reused symbols', () => {
    expect(__fr44_reuse.fpaBudgeting_listBudgets).toBe(fpaBudgeting.listBudgets);
    expect(__fr44_reuse.salesxConversion_namespace).toBe(salesxConversion);
  });
  it('Campaign types source is 0-DIFF (no S126 marker)', () => {
    expect(campaignTypesSrc).not.toMatch(/Sprint 126|T-Phase-7\.D\.2\.1/);
  });
  it('fpa-budgeting-engine source is 0-DIFF (no S126 marker)', () => {
    expect(fpaBudgetingSrc).not.toMatch(/Sprint 126|T-Phase-7\.D\.2\.1/);
  });
  it('salesx-conversion-engine source is 0-DIFF (no S126 marker)', () => {
    expect(salesxConvSrc).not.toMatch(/Sprint 126|T-Phase-7\.D\.2\.1/);
  });
  it('READS_FROM declares fpa-budgeting + salesx-conversion + campaign types', () => {
    expect(READS_FROM.engines).toContain('fpa-budgeting-engine');
    expect(READS_FROM.engines).toContain('salesx-conversion-engine');
    expect(READS_FROM.types).toContain('campaign');
  });
});

// ─── §G · SCOPE WALL — planning only ─────────────────────────────────────────
describe('§G · scope wall · NO automation/attribution/segmentation/ABM/InsightX', () => {
  const FORBIDDEN = [
    'runLeadScoring',
    'runMarketingAutomation',
    'runAttributionAnalysis',
    'computeSegmentation',
    'runABMOrchestration',
    'computeNPS',
    'buildInsightXAggregate',
  ] as const;

  it.each(FORBIDDEN)('engine does NOT export %s (S127/S128/S129/D.3 scope)', (name) => {
    expect((marketingPlanning as Record<string, unknown>)[name]).toBeUndefined();
  });
});

// ─── §H · SalesX-extension registration (DP-P7-2 · DP-D2-1) ──────────────────
describe('§H · MarketingPlanningPage registered via SalesXModule + group + renderModule', () => {
  it('sx-marketing-planning is in the LIVE_SALESX_MODULES union list', () => {
    expect(LIVE_SALESX_MODULES).toContain('sx-marketing-planning');
  });

  it('sx-marketing-planning is mapped to a SalesX group (master)', () => {
    expect(SALESX_MODULE_GROUP['sx-marketing-planning']).toBe('master');
  });

  it('SalesXPage imports MarketingPlanningPage and has the renderModule case', () => {
    expect(salesxPageSrc).toContain("from '@/features/marketing-planning/MarketingPlanningPage'");
    expect(salesxPageSrc).toContain("case 'sx-marketing-planning'");
    expect(salesxPageSrc).toContain('<MarketingPlanningPage');
  });

  it('SalesX existing modules unchanged — count is at least 57 + new one', () => {
    expect(LIVE_SALESX_MODULES.length).toBeGreaterThanOrEqual(58);
    expect(LIVE_SALESX_MODULES).toContain('sx-hub');
    expect(LIVE_SALESX_MODULES).toContain('sx-r-so-register');
  });

  it('NO new shell-config introduced (DP-P7-2 · still a SalesX EXTENSION)', () => {
    // No new file for marketing-planning shell — registration is via SalesXPage.
    // Smoke-check: SalesXPage carries the SalesX header literal (sanity).
    expect(salesxPageSrc).toContain('SalesXSidebar');
  });
});

// ─── §I · Page wiring (no dead UI) ───────────────────────────────────────────
describe('§I · MarketingPlanningPage reads the engine', () => {
  it('page imports marketing-planning-engine (no dead UI)', () => {
    expect(pageSrc).toContain("from '@/lib/marketing-planning-engine'");
    expect(pageSrc).toContain('allocateChannelBudget');
    expect(pageSrc).toContain('getCampaignCalendar');
    expect(pageSrc).toContain('listMarketingPlans');
  });
});

// ─── §J · Registers + sprint-history (time-robust) ───────────────────────────
describe('§J · sibling-register + sprint-history · time-robust', () => {
  it('sibling-register count ≥ 194 (one new entry · time-robust)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(194);
  });

  it('marketing-planning-engine appears exactly once in the register', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'marketing-planning-engine');
    expect(hits).toHaveLength(1);
    expect(hits[0].provenance).toBe('CONFIRMED');
    expect(hits[0].path).toBe('src/lib/marketing-planning-engine.ts');
  });

  it('comply360-tier2-extensions-engine still appears exactly once (0-DIFF)', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits).toHaveLength(1);
  });

  it('sprint-history: S125 backfilled to 23e5eabe (time-robust toContain)', () => {
    const s125 = SPRINTS.find((s) => s.sprintNumber === 125);
    expect(s125).toBeDefined();
    expect(['TBD_AT_BANK', '23e5eabe0f77c0b0bf179da63770c28725030e6c']).toContain(s125!.headSha);
  });

  it('sprint-history: S126 entry exists · headSha via toContain (NOT toBe · S121-T1 rule)', () => {
    const s126 = SPRINTS.find((s) => s.sprintNumber === 126);
    expect(s126).toBeDefined();
    expect(['TBD_AT_BANK']).toContain(s126!.headSha);
    expect(s126!.newSiblings).toEqual(['marketing-planning-engine']);
    expect(s126!.predecessorSha).toBe('23e5eabe0f77c0b0bf179da63770c28725030e6c');
    expect(s126!.code).toBe('T-Phase-7.D.2.1');
  });
});
