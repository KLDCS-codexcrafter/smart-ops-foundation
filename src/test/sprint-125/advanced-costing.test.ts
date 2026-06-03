/**
 * @file        src/test/sprint-125/advanced-costing.test.ts
 * @sprint      Sprint 125 · T-Phase-7.D.1.6 · 🏁 Arc D.1 Capstone · Advanced Costing
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              Behavioral first — toBeGreaterThanOrEqual on counts; S125 own headSha
 *              assertion uses toContain([...]) per the S121-T1 rule. NO existsSync-
 *              future tombstones, NO "no S126 entry" absence checks. Scope-wall via
 *              toBeUndefined on the engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  computeJobCost,
  computeProcessCost,
  computeABC,
  computeCVP,
  listJobCosts,
  listProcessCosts,
  READS_FROM,
  __fr44_reuse,
  __resetAdvancedCostingForTests,
} from '@/lib/advanced-costing-engine';
import * as advancedCosting from '@/lib/advanced-costing-engine';
import * as operationalCosting from '@/lib/operational-costing-engine';
import * as costAllocation from '@/lib/cost-allocation-engine';
import * as comply360CostAudit from '@/lib/comply360-cost-audit-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

import { fpaPlanningShellConfig } from '@/apps/erp/configs/fpa-planning-shell-config';
import { fpaPlanningSidebarItems } from '@/apps/erp/configs/fpa-planning-sidebar-config';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/advanced-costing-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/advanced-costing/AdvancedCostingPage.tsx');
const FPA_PAGE_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const COST_AUDIT_PATH = join(ROOT, 'src/lib/comply360-cost-audit-engine.ts');
const OP_COSTING_PATH = join(ROOT, 'src/lib/operational-costing-engine.ts');
const COST_ALLOC_PATH = join(ROOT, 'src/lib/cost-allocation-engine.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const fpaPageSrc = readFileSync(FPA_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const costAuditSrc = readFileSync(COST_AUDIT_PATH, 'utf8');
const opCostingSrc = readFileSync(OP_COSTING_PATH, 'utf8');
const costAllocSrc = readFileSync(COST_ALLOC_PATH, 'utf8');

beforeEach(() => {
  localStorage.clear();
  __resetAdvancedCostingForTests();
  vi.restoreAllMocks();
});

// ─── §A · JOB COSTING ────────────────────────────────────────────────────────
describe('§A · computeJobCost · DM+DL+OH → total + cost/unit', () => {
  it('computes total_cost = DM + DL + OH', () => {
    const r = computeJobCost({ job_id: 'J1', direct_material: 100, direct_labour: 50, overhead_applied: 25, units: 5 });
    expect(r.total_cost).toBe(175);
  });

  it('computes cost_per_unit = total / units (decimal-safe)', () => {
    const r = computeJobCost({ job_id: 'J2', direct_material: 33.33, direct_labour: 33.33, overhead_applied: 33.34, units: 2 });
    expect(r.total_cost).toBe(100);
    expect(r.cost_per_unit).toBe(50);
  });

  it('guards units=0 by returning cost_per_unit=0 (no NaN/Infinity)', () => {
    const r = computeJobCost({ job_id: 'J3', direct_material: 100, direct_labour: 0, overhead_applied: 0, units: 0 });
    expect(r.cost_per_unit).toBe(0);
  });

  it('persists the job to listJobCosts() and is idempotent on the same id', () => {
    computeJobCost({ job_id: 'J4', direct_material: 10, direct_labour: 0, overhead_applied: 0, units: 1 });
    computeJobCost({ job_id: 'J4', direct_material: 20, direct_labour: 0, overhead_applied: 0, units: 1 });
    const all = listJobCosts().filter((j) => j.job_id === 'J4');
    expect(all).toHaveLength(1);
    expect(all[0].total_cost).toBe(20);
  });

  it('reads S124 standard-cost base when standard_item_key is supplied (FR-44 Wall B)', () => {
    operationalCosting.upsertStandardCost({ item_key: 'STD-A', standard_material: 30, standard_labour: 10, standard_overhead: 10, standard_total: 0 });
    const r = computeJobCost({ job_id: 'J5', direct_material: 100, direct_labour: 0, overhead_applied: 0, units: 1, standard_item_key: 'STD-A' });
    expect(r.standard_base_per_unit).toBe(50);
  });
});

// ─── §B · PROCESS COSTING ────────────────────────────────────────────────────
describe('§B · computeProcessCost · equivalent units', () => {
  it('cost_per_equiv_unit = (input + conversion) / equivalent_units', () => {
    const r = computeProcessCost({ process_id: 'P1', period: '2026-04', input_cost: 600, conversion_cost: 400, equivalent_units: 100 });
    expect(r.cost_per_equiv_unit).toBe(10);
  });

  it('guards equivalent_units=0 (no NaN)', () => {
    const r = computeProcessCost({ process_id: 'P2', period: '2026-04', input_cost: 1000, conversion_cost: 0, equivalent_units: 0 });
    expect(r.cost_per_equiv_unit).toBe(0);
  });

  it('persists per (process_id, period) idempotently', () => {
    computeProcessCost({ process_id: 'P3', period: '2026-04', input_cost: 100, conversion_cost: 0, equivalent_units: 10 });
    computeProcessCost({ process_id: 'P3', period: '2026-04', input_cost: 200, conversion_cost: 0, equivalent_units: 10 });
    const hit = listProcessCosts().filter((p) => p.process_id === 'P3' && p.period === '2026-04');
    expect(hit).toHaveLength(1);
    expect(hit[0].cost_per_equiv_unit).toBe(20);
  });
});

// ─── §C · ABC ─────────────────────────────────────────────────────────────────
describe('§C · computeABC · activity-driver allocation via cost-allocation-engine', () => {
  it('allocates rate × driver_qty per activity (decimal-safe)', () => {
    const r = computeABC({
      cost_object: 'OBJ-1',
      activities: [
        { activity: 'A', driver: 'd', driver_qty: 10, rate: 5 },
        { activity: 'B', driver: 'd', driver_qty: 4, rate: 2.5 },
      ],
    });
    expect(r.activities[0].allocated).toBe(50);
    expect(r.activities[1].allocated).toBe(10);
    expect(r.total_allocated).toBe(60);
  });

  it('emits driver_shares from cost-allocation-engine.computeRatios (sum=1)', () => {
    const r = computeABC({
      cost_object: 'OBJ-2',
      activities: [
        { activity: 'A', driver: 'd', driver_qty: 30, rate: 10 },
        { activity: 'B', driver: 'd', driver_qty: 70, rate: 10 },
      ],
    });
    const sum = r.driver_shares.reduce((s, x) => s + x, 0);
    expect(sum).toBeCloseTo(1, 5);
    expect(r.driver_shares[0]).toBeCloseTo(0.3, 5);
    expect(r.driver_shares[1]).toBeCloseTo(0.7, 5);
  });

  it('REUSES cost-allocation-engine.computeRatios (spy proves the call)', () => {
    const spy = vi.spyOn(costAllocation, 'computeRatios');
    computeABC({ cost_object: 'OBJ-3', activities: [{ activity: 'A', driver: 'd', driver_qty: 1, rate: 1 }] });
    expect(spy).toHaveBeenCalled();
  });
});

// ─── §D · CVP / BREAK-EVEN ───────────────────────────────────────────────────
describe('§D · computeCVP · contribution margin · break-even · margin of safety', () => {
  it('CM ratio = (sales − variable)/sales', () => {
    const r = computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 100, sales: 1000, variable_cost: 600 });
    expect(r.contribution_margin).toBe(400);
    expect(r.contribution_margin_ratio).toBe(0.4);
  });

  it('break_even_revenue = fixed / CM-ratio', () => {
    const r = computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 200, sales: 1000, variable_cost: 600 });
    expect(r.break_even_revenue).toBe(500);
  });

  it('margin_of_safety = (sales − break-even)/sales', () => {
    const r = computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 200, sales: 1000, variable_cost: 600 });
    expect(r.margin_of_safety).toBe(0.5);
  });

  it('guards divide-by-zero when sales=0', () => {
    const r = computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 100, sales: 0, variable_cost: 0 });
    expect(r.divide_by_zero_guarded).toBe(true);
    expect(r.break_even_revenue).toBe(0);
  });

  it('guards divide-by-zero when variable >= sales (CM<=0)', () => {
    const r = computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 100, sales: 500, variable_cost: 500 });
    expect(r.divide_by_zero_guarded).toBe(true);
    expect(r.break_even_revenue).toBe(0);
  });
});

// ─── §E · AUDIT · advanced_cost_run fires ───────────────────────────────────
describe('§E · audit · advanced_cost_run emitted', () => {
  it('computeJobCost emits an advanced_cost_run audit entry', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    computeJobCost({ job_id: 'J-AUD', direct_material: 1, direct_labour: 0, overhead_applied: 0, units: 1 });
    expect(spy).toHaveBeenCalled();
    const last = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(last.entityType).toBe('advanced_cost_run');
    expect(last.sourceModule).toBe('advanced-costing-engine');
  });

  it('computeCVP also emits advanced_cost_run', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    computeCVP({ fy: '2026-27', scope_id: 'G', fixed_cost: 10, sales: 100, variable_cost: 50 });
    const types = spy.mock.calls.map((c) => c[0].entityType);
    expect(types).toContain('advanced_cost_run');
  });

  it('audit-trail types include "advanced_cost_run"', () => {
    expect(auditSrc).toContain("'advanced_cost_run'");
  });
});

// ─── §F · FR-44 WALL A · distinct from statutory cost-audit ─────────────────
describe('§F · FR-44 wall A · advanced ≠ statutory cost-audit', () => {
  // Strip block + line comments so doc headers don't pollute the check.
  const code = engineSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ln) => !ln.trim().startsWith('//'))
    .join('\n');

  it('engine does NOT import comply360-cost-audit-engine', () => {
    expect(code).not.toMatch(/from\s+['"]@\/lib\/comply360-cost-audit-engine['"]/);
  });

  it('engine contains NO statutory-filing function names (CRA_n / appointments / file*)', () => {
    expect(code).not.toMatch(/CRA_[1234]/);
    expect(code).not.toMatch(/cost_auditor_appointment/i);
    expect(code).not.toMatch(/file(CRA|StatutoryCostAudit)/);
  });

  it('comply360-cost-audit-engine source is 0-DIFF (no S125 marker)', () => {
    expect(costAuditSrc).not.toMatch(/Sprint 125|T-Phase-7\.D\.1\.6/);
  });

  it('statutory engine module still loads and is distinct', () => {
    expect(typeof comply360CostAudit).toBe('object');
  });
});

// ─── §G · FR-44 WALL B · REUSES S124 standard-cost + cost-allocation ────────
describe('§G · FR-44 wall B · reuses S124 operational-costing + cost-allocation', () => {
  it('engine imports operational-costing-engine.getStandardCost', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/lib\/operational-costing-engine['"]/);
    expect(engineSrc).toContain('getStandardCost');
  });

  it('engine imports cost-allocation-engine.computeRatios', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/lib\/cost-allocation-engine['"]/);
    expect(engineSrc).toContain('computeRatios');
  });

  it('__fr44_reuse surfaces both reused symbols (transparency)', () => {
    expect(__fr44_reuse.operationalCosting_getStandardCost).toBe(operationalCosting.getStandardCost);
    expect(__fr44_reuse.costAllocation_computeRatios).toBe(costAllocation.computeRatios);
  });

  it('S124 operational-costing-engine source is 0-DIFF (no S125 marker)', () => {
    expect(opCostingSrc).not.toMatch(/Sprint 125|T-Phase-7\.D\.1\.6/);
  });

  it('cost-allocation-engine source is 0-DIFF (no S125 marker)', () => {
    expect(costAllocSrc).not.toMatch(/Sprint 125|T-Phase-7\.D\.1\.6/);
  });

  it('READS_FROM declares operational-costing + cost-allocation', () => {
    expect(READS_FROM.engines).toContain('operational-costing-engine');
    expect(READS_FROM.engines).toContain('cost-allocation-engine');
  });
});

// ─── §H · SCOPE WALL — costing only (no marketing/InsightX) ─────────────────
describe('§H · scope wall · NO marketing (D.2) · NO InsightX aggregation (D.3)', () => {
  const FORBIDDEN = [
    'runCampaignROI',
    'computeMarketingMix',
    'runAttributionAnalysis',
    'buildInsightXAggregate',
    'computeCrossPillarKPI',
    'buildCMODashboard',
  ] as const;

  it.each(FORBIDDEN)('engine does NOT export %s (D.2/D.3 scope)', (name) => {
    expect((advancedCosting as Record<string, unknown>)[name]).toBeUndefined();
  });
});

// ─── §I · Page wiring under FP&A self-owned shell ───────────────────────────
describe('§I · AdvancedCostingPage under FP&A shell', () => {
  it('page imports advanced-costing-engine (no dead UI)', () => {
    expect(pageSrc).toContain("from '@/lib/advanced-costing-engine'");
    expect(pageSrc).toContain('computeJobCost');
    expect(pageSrc).toContain('computeProcessCost');
    expect(pageSrc).toContain('computeABC');
    expect(pageSrc).toContain('computeCVP');
  });

  it('FP&A sidebar registers the Advanced Costing item (type:item)', () => {
    const hit = fpaPlanningSidebarItems.find((i) => i.id === 'fpa-advanced-costing');
    expect(hit).toBeDefined();
    expect(hit!.type).toBe('item');
    expect(hit!.moduleId).toBe('fpa-advanced-costing');
  });

  it('FpaPlanningPage hosts the advanced-costing render case', () => {
    expect(fpaPageSrc).toContain('fpa-advanced-costing');
    expect(fpaPageSrc).toContain('AdvancedCostingPage');
  });

  it('FP&A shell config still uses fpaPlanningSidebarItems (sidebar 0-DIFF except new item)', () => {
    expect(fpaPlanningShellConfig.sidebar.items).toBe(fpaPlanningSidebarItems);
  });
});

// ─── §J · Registers + sprint-history (time-robust) ──────────────────────────
describe('§J · sibling-register + sprint-history · time-robust', () => {
  it('sibling-register count ≥ 193 (one new entry · time-robust)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(193);
  });

  it('advanced-costing-engine appears exactly once in the register', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'advanced-costing-engine');
    expect(hits).toHaveLength(1);
    expect(hits[0].provenance).toBe('CONFIRMED');
    expect(hits[0].path).toBe('src/lib/advanced-costing-engine.ts');
  });

  it('comply360-tier2-extensions-engine still appears exactly once (0-DIFF)', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits).toHaveLength(1);
  });

  it('sprint-history: S124 backfilled to 2ff3e426 (time-robust toContain)', () => {
    const s124 = SPRINTS.find((s) => s.sprintNumber === 124);
    expect(s124).toBeDefined();
    expect(['TBD_AT_BANK', '2ff3e426645aff98648ab8d2ccf0b9ba405f535d']).toContain(s124!.headSha);
  });

  it('sprint-history: S125 entry exists · headSha via toContain (NOT toBe · S121-T1 rule)', () => {
    const s125 = SPRINTS.find((s) => s.sprintNumber === 125);
    expect(s125).toBeDefined();
    expect(['TBD_AT_BANK', '23e5eabe0f77c0b0bf179da63770c28725030e6c']).toContain(s125!.headSha);
    expect(s125!.newSiblings).toEqual(['advanced-costing-engine']);
    expect(s125!.predecessorSha).toBe('2ff3e426645aff98648ab8d2ccf0b9ba405f535d');
    expect(s125!.code).toBe('T-Phase-7.D.1.6');
  });
});
