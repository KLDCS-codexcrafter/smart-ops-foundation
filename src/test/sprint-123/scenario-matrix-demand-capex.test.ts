/**
 * @file        src/test/sprint-123/scenario-matrix-demand-capex.test.ts
 * @sprint      Sprint 123 · T-Phase-7.D.1.4 · ⭐ Arc D.1 · Scenario Management Pt 2 (MOAT CAPSTONE)
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR).
 *              Behavioral only — toBeGreaterThanOrEqual on counts; the S123
 *              own-headSha assertion uses toContain(['TBD_AT_BANK', ...]) per
 *              the S121-T1 root-cause rule. NO existsSync-future tombstones,
 *              NO "no S124 entry" absence checks. Scope-wall via toBeUndefined
 *              on the engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  runScenario,
  runScenarioMatrix,
  runDemandScenario,
  runCapexScenario,
  fxShockFactor,
  FX_SHOCKS,
  SCENARIO_CASES,
  SCENARIO_SCOPES,
  READS_FROM,
  __resetScenarioModelingForTests,
  type ScenarioDriver,
} from '@/lib/scenario-modeling-engine';
import * as scenarioModeling from '@/lib/scenario-modeling-engine';
import * as demandForecast from '@/lib/demand-forecast-engine';
import * as fxTranslation from '@/lib/fx-translation-engine';
import * as groupConsolidation from '@/lib/group-consolidation-engine';
import * as groupEliminations from '@/lib/group-eliminations-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/scenario-modeling-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/scenario-modeling/ScenarioModelingPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');

const DRIVERS: ScenarioDriver[] = [
  { driver: 'revenue_pct', best: 10, base: 0, worst: -10 },
  { driver: 'cost_pct', best: -5, base: 0, worst: 8 },
  { driver: 'volume_pct', best: 5, base: 0, worst: -5 },
];

beforeEach(() => {
  localStorage.clear();
  __resetScenarioModelingForTests();
  vi.restoreAllMocks();
});

// ─── §A · Matrix surface + orchestration ──────────────────────────────────
describe('§A · runScenarioMatrix surface + orchestration', () => {
  it('exports runScenarioMatrix as a function', () => {
    expect(typeof runScenarioMatrix).toBe('function');
  });

  it('exports FX_SHOCKS covering −10/−5/base/+5/+10', () => {
    expect(FX_SHOCKS).toEqual(
      expect.arrayContaining(['fx_minus_10', 'fx_minus_5', 'fx_base', 'fx_plus_5', 'fx_plus_10']),
    );
    expect(FX_SHOCKS.length).toBeGreaterThanOrEqual(5);
  });

  it('fxShockFactor maps shock labels to multiplicative factors (decimal-safe)', () => {
    expect(fxShockFactor('fx_base')).toBe(1);
    expect(fxShockFactor('fx_minus_10')).toBe(0.9);
    expect(fxShockFactor('fx_plus_10')).toBe(1.1);
    expect(fxShockFactor('fx_minus_5')).toBe(0.95);
    expect(fxShockFactor('fx_plus_5')).toBe(1.05);
  });

  it('builds a grid of |fx_shocks| × |revenue_steps| × |cost_steps| cells', () => {
    const m = runScenarioMatrix({
      fy: 'FY26-27',
      entity_scope: ['e1'],
      fx_shocks: ['fx_minus_5', 'fx_base', 'fx_plus_5'],
      revenue_steps: [-10, 0, 10],
      cost_steps: [-5, 0, 5],
      baseline_override: { revenue: 1_000_000, cost: 700_000 },
    });
    expect(m.cells.length).toBe(3 * 3 * 3);
    expect(m.base_pbt).toBe(300_000);
  });

  it('each cell carries fx_factor + revenue/cost perturbed totals + consolidated_pbt', () => {
    const m = runScenarioMatrix({
      fy: 'FY26-27',
      entity_scope: ['e1'],
      fx_shocks: ['fx_base'],
      revenue_steps: [0],
      cost_steps: [0],
      baseline_override: { revenue: 1000, cost: 600 },
    });
    const c = m.cells[0];
    expect(c.fx_factor).toBe(1);
    expect(c.consolidated_revenue).toBe(1000);
    expect(c.consolidated_cost).toBe(600);
    expect(c.consolidated_pbt).toBe(400);
  });

  it('FX shock perturbs revenue multiplicatively (decimal-safe)', () => {
    const m = runScenarioMatrix({
      fy: 'FY26-27',
      entity_scope: ['e1'],
      fx_shocks: ['fx_plus_10'],
      revenue_steps: [0],
      cost_steps: [0],
      baseline_override: { revenue: 1000, cost: 500 },
    });
    expect(m.cells[0].consolidated_revenue).toBe(1100);
    expect(m.cells[0].consolidated_pbt).toBe(600);
  });

  it('samples FXRateSet via fx-translation.getFXRateSet (FR-44 call-through)', () => {
    const spy = vi.spyOn(fxTranslation, 'getFXRateSet');
    runScenarioMatrix({
      fy: 'FY26-27',
      entity_scope: ['e1'],
      fx_shocks: ['fx_base'],
      revenue_steps: [0],
      cost_steps: [0],
      foreign_currency: 'USD',
      baseline_override: { revenue: 1, cost: 0 },
    });
    expect(spy).toHaveBeenCalled();
  });

  it('emits scenario_run audit on matrix run (reuses S122 audit type · NO new type)', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    runScenarioMatrix({
      fy: 'FY26-27',
      entity_scope: ['e1'],
      fx_shocks: ['fx_base'],
      revenue_steps: [0],
      cost_steps: [0],
      baseline_override: { revenue: 100, cost: 50 },
    });
    const calls = spy.mock.calls.map((c) => c[0]?.entityType);
    expect(calls).toContain('scenario_run');
  });

  it('throws when fy / entity_scope / steps are missing', () => {
    expect(() => runScenarioMatrix({
      fy: '', entity_scope: ['e1'], fx_shocks: ['fx_base'], revenue_steps: [0], cost_steps: [0],
    })).toThrow();
    expect(() => runScenarioMatrix({
      fy: 'FY26-27', entity_scope: [], fx_shocks: ['fx_base'], revenue_steps: [0], cost_steps: [0],
    })).toThrow();
    expect(() => runScenarioMatrix({
      fy: 'FY26-27', entity_scope: ['e1'], fx_shocks: [], revenue_steps: [0], cost_steps: [0],
    })).toThrow();
  });
});

// ─── §B · Consolidation-stack orchestration (FR-44) ───────────────────────
describe('§B · matrix orchestrates the Phase-6 consolidation stack', () => {
  it('matrix without baseline_override calls consolidateWithTranslation + consolidate + generateEliminations + buildConsolidatedPnL', () => {
    const cwt = vi.spyOn(fxTranslation, 'consolidateWithTranslation').mockReturnValue([] as unknown as ReturnType<typeof fxTranslation.consolidateWithTranslation>);
    const c = vi.spyOn(groupConsolidation, 'consolidate').mockReturnValue({} as unknown as ReturnType<typeof groupConsolidation.consolidate>);
    const e = vi.spyOn(groupEliminations, 'generateEliminations').mockReturnValue([] as unknown as ReturnType<typeof groupEliminations.generateEliminations>);
    const p = vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      revenue: 1000, other_income: 0, cogs: 600, expenses: 0, gross_profit: 0, ebitda: 0, pbt: 0, tax: 0, pat: 0,
    } as unknown as ReturnType<typeof groupConsolidation.buildConsolidatedPnL>);

    runScenarioMatrix({
      fy: 'FY26-27', entity_scope: ['e1'],
      fx_shocks: ['fx_base'], revenue_steps: [0], cost_steps: [0],
    });
    expect(cwt).toHaveBeenCalled();
    expect(c).toHaveBeenCalled();
    expect(e).toHaveBeenCalled();
    expect(p).toHaveBeenCalled();
  });
});

// ─── §C · Demand scenario ─────────────────────────────────────────────────
describe('§C · runDemandScenario · FR-44 demand-forecast reuse', () => {
  it('exports runDemandScenario as a function', () => {
    expect(typeof runDemandScenario).toBe('function');
  });

  it('CALLS demand-forecast-engine.generateForecast (FR-44 reuse · not reimpl)', () => {
    const spy = vi.spyOn(demandForecast, 'generateForecast');
    runDemandScenario({
      fy: 'FY26-27', entity_scope: ['e1'], demand_change_pct: 10,
      baseline_override: { revenue: 1000, cost: 500 },
    });
    expect(spy).toHaveBeenCalled();
  });

  it('applies demand_change_pct to baseline revenue (decimal-safe)', () => {
    const d = runDemandScenario({
      fy: 'FY26-27', entity_scope: ['e1'], demand_change_pct: 20,
      baseline_override: { revenue: 1000, cost: 500 },
    });
    expect(d.resulting_revenue).toBe(1200);
    expect(d.resulting_pbt).toBe(700);
  });

  it('handles negative (drop) demand change', () => {
    const d = runDemandScenario({
      fy: 'FY26-27', entity_scope: ['e1'], demand_change_pct: -25,
      baseline_override: { revenue: 1000, cost: 500 },
    });
    expect(d.resulting_revenue).toBe(750);
    expect(d.resulting_pbt).toBe(250);
  });

  it('emits scenario_run audit (no new audit type)', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    runDemandScenario({
      fy: 'FY26-27', entity_scope: ['e1'], demand_change_pct: 5,
      baseline_override: { revenue: 1, cost: 0 },
    });
    expect(spy.mock.calls.some((c) => c[0]?.entityType === 'scenario_run')).toBe(true);
  });

  it('throws when fy / entity_scope missing', () => {
    expect(() => runDemandScenario({ fy: '', entity_scope: ['e1'], demand_change_pct: 1 })).toThrow();
    expect(() => runDemandScenario({ fy: 'FY26-27', entity_scope: [], demand_change_pct: 1 })).toThrow();
  });
});

// ─── §D · Capex scenario ──────────────────────────────────────────────────
describe('§D · runCapexScenario · FR-44 S120 capital-budget reuse', () => {
  it('exports runCapexScenario as a function', () => {
    expect(typeof runCapexScenario).toBe('function');
  });

  it('READS S120 fpa-budgeting capital budgets via listBudgets', () => {
    const spy = vi.spyOn(fpaBudgeting, 'listBudgets');
    runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'], capex_action: 'defer', capex_amount: 1000,
    });
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls.at(-1);
    expect(lastCall?.[0]?.budget_type).toBe('capital');
  });

  it('defer → cash_impact = +amount, pbt_impact = +amount × 10%', () => {
    const c = runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'], capex_action: 'defer', capex_amount: 5_000_000,
    });
    expect(c.cash_impact).toBe(5_000_000);
    expect(c.pbt_impact).toBe(500_000);
  });

  it('accelerate → cash_impact = −amount, pbt_impact = −amount × 10%', () => {
    const c = runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'], capex_action: 'accelerate', capex_amount: 5_000_000,
    });
    expect(c.cash_impact).toBe(-5_000_000);
    expect(c.pbt_impact).toBe(-500_000);
  });

  it('rejects invalid capex_action / negative amount', () => {
    expect(() => runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'],
      capex_action: 'foo' as unknown as 'defer', capex_amount: 100,
    })).toThrow();
    expect(() => runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'], capex_action: 'defer', capex_amount: -1,
    })).toThrow();
  });

  it('emits scenario_run audit on capex run', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    runCapexScenario({
      fy: 'FY26-27', entity_scope: ['e1'], capex_action: 'defer', capex_amount: 100,
    });
    expect(spy.mock.calls.some((c) => c[0]?.entityType === 'scenario_run')).toBe(true);
  });
});

// ─── §E · FR-44 walls + S122 0-DIFF (additive extension) ──────────────────
describe('§E · FR-44 walls · S122 exports 0-DIFF (additive extension)', () => {
  it('S122 runScenario still exported (0-DIFF)', () => {
    expect(typeof runScenario).toBe('function');
  });

  it('S122 SCENARIO_CASES + SCENARIO_SCOPES still exported (0-DIFF)', () => {
    expect(Array.from(SCENARIO_CASES)).toEqual(['best', 'base', 'worst']);
    expect(Array.from(SCENARIO_SCOPES)).toEqual(['single_entity', 'consolidated']);
  });

  it('S122 runScenario still produces best/base/worst cases (behavioral 0-DIFF)', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 1000, cost: 500 },
    });
    expect(r.cases.map((c) => c.case)).toEqual(['best', 'base', 'worst']);
  });

  it('READS_FROM continues to declare the consolidation + fx + eliminations + forecasting engines', () => {
    expect(READS_FROM.engines).toEqual(expect.arrayContaining([
      'group-consolidation-engine',
      'fx-translation-engine',
      'group-eliminations-engine',
      'fpa-forecasting-engine',
    ]));
  });

  it('engine source does NOT import fx-what-if-engine (FR-44 wall)', () => {
    expect(engineSrc).not.toMatch(/from\s+['"]@?\/?[^'"]*fx-what-if[^'"]*['"]/);
    expect(engineSrc).not.toMatch(/^\s*import\s+[^;]*fx-what-if/m);
  });

  it('SCOPE WALL — engine does NOT export costing functions (S124-125 boundary)', () => {
    const eng = scenarioModeling as unknown as Record<string, unknown>;
    expect(eng.runActivityBasedCosting).toBeUndefined();
    expect(eng.computeDriverCost).toBeUndefined();
    expect(eng.runCostingScenario).toBeUndefined();
    expect(eng.allocateOverheadByDriver).toBeUndefined();
  });
});

// ─── §F · Audit · NO new type (reuses scenario_run) ───────────────────────
describe('§F · audit-trail · NO new type added in S123', () => {
  it('audit-trail.ts has scenario_run (reused) and does not add a new S123 type alias', () => {
    expect(auditSrc).toMatch(/scenario_run/);
    // No new S123-specific audit aliases (we deliberately reuse).
    expect(auditSrc).not.toMatch(/scenario_matrix_run/);
    expect(auditSrc).not.toMatch(/demand_scenario_run/);
    expect(auditSrc).not.toMatch(/capex_scenario_run/);
  });
});

// ─── §G · ScenarioModelingPage extended (no new page · no dead UI) ────────
describe('§G · ScenarioModelingPage extended with matrix + demand + capex', () => {
  it('page imports runScenarioMatrix / runDemandScenario / runCapexScenario', () => {
    expect(pageSrc).toMatch(/runScenarioMatrix/);
    expect(pageSrc).toMatch(/runDemandScenario/);
    expect(pageSrc).toMatch(/runCapexScenario/);
  });

  it('page renders the four scenario tabs (best/base/worst + matrix + demand + capex)', () => {
    expect(pageSrc).toMatch(/Best \/ Base \/ Worst/);
    expect(pageSrc).toMatch(/FX × Rev × Cost Matrix/);
    expect(pageSrc).toMatch(/Demand Surge \/ Drop/);
    expect(pageSrc).toMatch(/Capex Defer \/ Accelerate/);
  });
});

// ─── §H · Register + history (time-robust · S123 headSha via toContain) ───
describe('§H · sibling-register + sprint-history · time-robust', () => {
  it('sibling count UNCHANGED (engine extension · no new SIBLID) — ≥191', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(191);
    expect(SIBLINGS.length).toBeGreaterThanOrEqual(191);
  });

  it('sprint-history: S122 entry backfilled to fd40a57c (or toContain to be time-robust)', () => {
    const s122 = SPRINTS.find((s) => s.sprintNumber === 122);
    expect(s122).toBeDefined();
    expect(['TBD_AT_BANK', 'fd40a57c146605056dd70090097f39d82ecf8844']).toContain(s122!.headSha);
  });

  it('sprint-history: S123 entry exists — headSha via toContain (NOT toBe · S121-T1 rule)', () => {
    const s123 = SPRINTS.find((s) => s.sprintNumber === 123);
    expect(s123).toBeDefined();
    expect(['TBD_AT_BANK']).toContain(s123!.headSha);
    expect(s123!.newSiblings).toEqual([]);
    expect(s123!.predecessorSha).toBe('fd40a57c146605056dd70090097f39d82ecf8844');
    expect(s123!.code).toBe('T-Phase-7.D.1.4');
    expect(s123!.grade).toBe('A');
  });
});
