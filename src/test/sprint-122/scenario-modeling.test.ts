/**
 * @file        src/test/sprint-122/scenario-modeling.test.ts
 * @sprint      Sprint 122 · T-Phase-7.D.1.3 · ⭐ Arc D.1 · Scenario Management Pt 1 (THE MOAT)
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts; the S122
 *              headSha assertion uses toContain(['TBD_AT_BANK', ...]) per the
 *              S121 T1 root-cause rule. NO existsSync-future tombstones, NO
 *              "no S123 entry" absence checks. Scope-wall via toBeUndefined on
 *              the engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  runScenario,
  listScenarios,
  compareScenarios,
  listScenarioEntities,
  SCENARIO_CASES,
  SCENARIO_SCOPES,
  READS_FROM,
  __resetScenarioModelingForTests,
  type ScenarioDriver,
} from '@/lib/scenario-modeling-engine';
import * as scenarioModeling from '@/lib/scenario-modeling-engine';
import * as groupConsolidation from '@/lib/group-consolidation-engine';
import * as fxTranslation from '@/lib/fx-translation-engine';
import * as groupEliminations from '@/lib/group-eliminations-engine';
import * as fpaForecasting from '@/lib/fpa-forecasting-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/scenario-modeling-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/scenario-modeling/ScenarioModelingPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const FPA_LANDING_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const fpaLandingSrc = readFileSync(FPA_LANDING_PATH, 'utf8');
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

// ─── §A · Surface + honesty markers ────────────────────────────────────────
describe('§A · scenario-modeling-engine · surface + honesty', () => {
  it('declares @pillar D.1 (THE MOAT)', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.1/);
    expect(engineSrc).toMatch(/THE MOAT/);
  });

  it('declares @fr-44 orchestration contract', () => {
    expect(engineSrc).toMatch(/@fr-44/);
    expect(engineSrc).toMatch(/ORCHESTRATES/);
  });

  it('exports READS_FROM with the four orchestrated engines', () => {
    expect(READS_FROM.engines).toEqual(
      expect.arrayContaining([
        'group-consolidation-engine',
        'fx-translation-engine',
        'group-eliminations-engine',
        'fpa-forecasting-engine',
      ]),
    );
  });

  it('exposes SCENARIO_CASES = best/base/worst', () => {
    expect(SCENARIO_CASES).toEqual(['best', 'base', 'worst']);
  });

  it('exposes SCENARIO_SCOPES = single_entity + consolidated', () => {
    expect(SCENARIO_SCOPES).toEqual(['single_entity', 'consolidated']);
  });
});

// ─── §B · runScenario · driver perturbation math (decimal-helpers) ─────────
describe('§B · runScenario · best/base/worst driver perturbation math', () => {
  it('base case with zero drivers + override yields baseline pbt', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: [
        { driver: 'revenue_pct', best: 0, base: 0, worst: 0 },
        { driver: 'cost_pct', best: 0, base: 0, worst: 0 },
        { driver: 'volume_pct', best: 0, base: 0, worst: 0 },
      ],
      baseline_override: { revenue: 1000, cost: 600 },
    });
    const base = r.cases.find((c) => c.case === 'base');
    expect(base?.consolidated_pbt).toBe(400);
  });

  it('best case applies +10% revenue · -5% cost · +5% volume', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: DRIVERS,
      baseline_override: { revenue: 1000, cost: 600 },
    });
    const best = r.cases.find((c) => c.case === 'best');
    // volume +5% then revenue +10% → 1000 * 1.05 * 1.10 = 1155
    expect(best?.consolidated_revenue).toBe(1155);
    // volume +5% then cost -5% → 600 * 1.05 * 0.95 = 598.5
    expect(best?.consolidated_cost).toBe(598.5);
    expect(best?.consolidated_pbt).toBe(556.5);
  });

  it('worst case applies negative perturbations · pbt drops', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: DRIVERS,
      baseline_override: { revenue: 1000, cost: 600 },
    });
    const worst = r.cases.find((c) => c.case === 'worst');
    const base = r.cases.find((c) => c.case === 'base');
    expect(worst?.consolidated_pbt).toBeLessThan(base!.consolidated_pbt);
  });

  it('produces exactly three cases per scenario (best/base/worst)', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 500, cost: 300 },
    });
    expect(r.cases.map((c) => c.case).sort()).toEqual(['base', 'best', 'worst']);
  });

  it('decimal-safe: no float drift on chained multiplications', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: [
        { driver: 'revenue_pct', best: 0.1, base: 0, worst: 0 },
        { driver: 'cost_pct', best: 0, base: 0, worst: 0 },
        { driver: 'volume_pct', best: 0, base: 0, worst: 0 },
      ],
      baseline_override: { revenue: 100, cost: 0 },
    });
    const best = r.cases.find((c) => c.case === 'best')!;
    expect(best.consolidated_revenue).toBe(100.1);
  });
});

// ─── §C · THE MOAT · scope='consolidated' orchestrates the stack ───────────
describe('§C · scope=consolidated ORCHESTRATES the Phase-6 stack (THE MOAT)', () => {
  it('scope=consolidated CALLS fx-translation-engine.consolidateWithTranslation', () => {
    const spy = vi.spyOn(fxTranslation, 'consolidateWithTranslation');
    runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1', 'e2'],
      drivers: DRIVERS,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('scope=consolidated CALLS group-consolidation-engine.consolidate', () => {
    const spy = vi.spyOn(groupConsolidation, 'consolidate');
    runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1', 'e2'],
      drivers: DRIVERS,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('scope=consolidated CALLS group-eliminations-engine.generateEliminations', () => {
    const spy = vi.spyOn(groupEliminations, 'generateEliminations');
    runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1', 'e2'],
      drivers: DRIVERS,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('scope=consolidated CALLS group-consolidation-engine.buildConsolidatedPnL', () => {
    const spy = vi.spyOn(groupConsolidation, 'buildConsolidatedPnL');
    runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1', 'e2'],
      drivers: DRIVERS,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('scope=consolidated sets the `consolidated` flag true', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'consolidated', entity_scope: ['e1', 'e2'],
      drivers: DRIVERS,
    });
    expect(r.consolidated).toBe(true);
  });
});

// ─── §D · scope='single_entity' skips consolidation/eliminations ────────────
describe('§D · scope=single_entity skips consolidation + eliminations', () => {
  it('does NOT call group-consolidation.consolidate', () => {
    const spy = vi.spyOn(groupConsolidation, 'consolidate');
    runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: DRIVERS, baseline_override: { revenue: 100, cost: 50 },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('does NOT call group-eliminations.generateEliminations', () => {
    const spy = vi.spyOn(groupEliminations, 'generateEliminations');
    runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: DRIVERS, baseline_override: { revenue: 100, cost: 50 },
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('single_entity scope produces consolidated=false', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 100, cost: 50 },
    });
    expect(r.consolidated).toBe(false);
  });

  it('single_entity scope uses fpa-forecasting-engine for the baseline projection (orchestration boundary)', () => {
    const spy = vi.spyOn(fpaForecasting, 'generateFPAForecast');
    runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['sinha-trading'],
      drivers: DRIVERS,
    });
    expect(spy).toHaveBeenCalled();
  });
});

// ─── §E · compareScenarios · delta-vs-base ──────────────────────────────────
describe('§E · compareScenarios · delta_vs_base (decimal-safe)', () => {
  it('returns rows for all three cases with base having delta 0', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 1000, cost: 600 },
    });
    const cmp = compareScenarios(r.scenario_id);
    expect(cmp.length).toBe(3);
    const base = cmp.find((c) => c.case === 'base');
    expect(base?.delta_vs_base).toBe(0);
  });

  it('best > 0 delta · worst < 0 delta', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 1000, cost: 600 },
    });
    const cmp = compareScenarios(r.scenario_id);
    expect(cmp.find((c) => c.case === 'best')!.delta_vs_base).toBeGreaterThan(0);
    expect(cmp.find((c) => c.case === 'worst')!.delta_vs_base).toBeLessThan(0);
  });

  it('compareScenarios returns [] for an unknown scenario_id', () => {
    expect(compareScenarios('does-not-exist')).toEqual([]);
  });
});

// ─── §F · Audit · scenario_run fires under mca-roc ──────────────────────────
describe('§F · scenario_run audit fires (mca-roc)', () => {
  it('audit type "scenario_run" is declared in audit-trail.ts', () => {
    expect(auditSrc).toMatch(/'scenario_run'/);
    expect(auditSrc).toMatch(/scenario-modeling-engine/);
  });

  it('runScenario calls logAudit with entityType "scenario_run"', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 100, cost: 50 },
    });
    const calls = spy.mock.calls.filter((c) => c[0].entityType === 'scenario_run');
    expect(calls.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── §G · FR-44 WALL · does NOT import or duplicate fx-what-if ─────────────
describe('§G · FR-44 WALL · no fx-what-if import + foundations 0-DIFF', () => {
  it('engine does NOT import fx-what-if-engine', () => {
    expect(engineSrc).not.toMatch(/from\s+['"]@\/lib\/fx-what-if-engine['"]/);
    expect(engineSrc).not.toMatch(/computeFXScenarioForRealisation/);
  });

  it('engine DOES import the 4 orchestrated engines (the moat)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/group-consolidation-engine'/);
    expect(engineSrc).toMatch(/from '@\/lib\/fx-translation-engine'/);
    expect(engineSrc).toMatch(/from '@\/lib\/group-eliminations-engine'/);
    expect(engineSrc).toMatch(/from '@\/lib\/fpa-forecasting-engine'/);
  });

  it('engine does NOT redefine consolidate / buildConsolidatedPnL / generateEliminations / consolidateWithTranslation', () => {
    expect(engineSrc).not.toMatch(/export\s+function\s+consolidate\b/);
    expect(engineSrc).not.toMatch(/export\s+function\s+buildConsolidatedPnL/);
    expect(engineSrc).not.toMatch(/export\s+function\s+generateEliminations/);
    expect(engineSrc).not.toMatch(/export\s+function\s+consolidateWithTranslation/);
  });
});

// ─── §H · SCOPE WALL · Pt 1 only (no S123/S124-125 surface) ─────────────────
describe('§H · SCOPE WALL · Pt 1 only (no FX-matrix / demand / capex / costing)', () => {
  it('engine surface does NOT expose an FX × revenue × cost matrix function', () => {
    expect((scenarioModeling as unknown as Record<string, unknown>).runFXMatrix).toBeUndefined();
    expect((scenarioModeling as unknown as Record<string, unknown>).runFXxRevxCostMatrix).toBeUndefined();
  });

  it('engine surface does NOT expose demand or capex scenario functions', () => {
    expect((scenarioModeling as unknown as Record<string, unknown>).runDemandScenario).toBeUndefined();
    expect((scenarioModeling as unknown as Record<string, unknown>).runCapexScenario).toBeUndefined();
  });

  it('engine surface does NOT expose costing / driver / ABC functions', () => {
    expect((scenarioModeling as unknown as Record<string, unknown>).runCostingScenario).toBeUndefined();
    expect((scenarioModeling as unknown as Record<string, unknown>).runABCAllocation).toBeUndefined();
    expect((scenarioModeling as unknown as Record<string, unknown>).runDriverAllocation).toBeUndefined();
  });
});

// ─── §I · Block 2 fixes · FpaPlanningPage shell-wrap + CC hash-listener ────
describe('§I · Block 2 FP&A-landing fixes (carried from S116/S120)', () => {
  it('FpaPlanningPage imports the Shell', () => {
    expect(fpaLandingSrc).toMatch(/from '@\/shell'/);
    expect(fpaLandingSrc).toMatch(/<Shell\b/);
  });

  it('FpaPlanningPage uses the commandCenterShellConfig (consistent ERP shell)', () => {
    expect(fpaLandingSrc).toMatch(/commandCenterShellConfig/);
  });

  it('CommandCenterPage installs a hashchange listener that calls setActiveModule', () => {
    expect(ccPageSrc).toMatch(/addEventListener\(['"]hashchange['"]/);
    expect(ccPageSrc).toMatch(/setActiveModule\(/);
  });

  // S122-T1 hotfix: react-router <Link> hash navigations don't fire native 'hashchange'
  // when CC is already mounted. The hash effect MUST also re-run on router location
  // changes, otherwise tile clicks leave activeModule on 'overview' (real bug we hit).
  it('CommandCenterPage reacts to react-router navigation (useLocation in hash effect deps)', () => {
    expect(ccPageSrc).toMatch(/from ['"]react-router-dom['"]/);
    expect(ccPageSrc).toMatch(/useLocation\s*\(\s*\)/);
    // Effect deps must reference `location` so applyHash() re-runs on every
    // router-driven navigation (the real failure mode behind FP&A landing tiles).
    const effectBlock = ccPageSrc.match(/applyHash[\s\S]*?\}\s*,\s*\[([^\]]*)\]\s*\)/);
    expect(effectBlock?.[1] ?? '').toMatch(/location/);
  });

  it('CommandCenterPage hash-listener allow-list includes fincore-aop-strategic-plan (AOP deep-link fix)', () => {
    // The listener body references the AOP module id directly so the
    // /erp/command-center#fincore-aop-strategic-plan deep-link from the
    // landing tile actually switches activeModule away from 'overview'.
    expect(ccPageSrc).toMatch(/fincore-aop-strategic-plan/);
  });
});

// ─── §J · Page + sidebar + CC wiring (Standalone Page #49) ──────────────────
describe('§J · ScenarioModelingPage wiring (Standalone Page #49)', () => {
  it('sidebar exposes the new fpa-planning-scenario item under fpa-planning', () => {
    expect(sidebarSrc).toMatch(/fpa-planning-scenario/);
    const block = sidebarSrc.match(/fpa-planning-scenario[\s\S]{0,200}/)?.[0] ?? '';
    expect(block).toMatch(/requiredCards:\s*\['fpa-planning'\]/);
  });

  it('CommandCenterPage wires the fpa-planning-scenario case to ScenarioModelingPage', () => {
    expect(ccPageSrc).toMatch(/case 'fpa-planning-scenario':\s*return <ScenarioModelingPage \/>;/);
  });

  it('ScenarioModelingPage reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/from '@\/lib\/scenario-modeling-engine'/);
    expect(pageSrc).toMatch(/runScenario/);
    expect(pageSrc).toMatch(/compareScenarios/);
  });
});

// ─── §K · Register + history (time-robust · S122 headSha via toContain) ─────
describe('§K · sibling-register + sprint-history (time-robust)', () => {
  it('sibling-register count is ≥ 191 and contains scenario-modeling-engine exactly once', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(191);
    const hits = SIBLINGS.filter((s) => s.id === 'scenario-modeling-engine');
    expect(hits.length).toBe(1);
  });

  it('comply360-tier2-extensions-engine still appears exactly once (untouched)', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits.length).toBe(1);
  });

  it('sprint-history: S121 backfilled to the real HEAD', () => {
    const s121 = SPRINTS.find((s) => s.sprintNumber === 121);
    expect(s121?.headSha).toBe('8e5e578c0fd775924cd5acc2cd7ea5a7432585da');
  });

  it('sprint-history: S122 entry — headSha uses toContain (time-robust per S121 T1 root-cause rule)', () => {
    const s122 = SPRINTS.find((s) => s.sprintNumber === 122);
    expect(s122).toBeDefined();
    expect(['TBD_AT_BANK', '8e5e578c0fd775924cd5acc2cd7ea5a7432585da']).toContain(s122!.headSha);
    expect(s122!.newSiblings).toEqual(['scenario-modeling-engine']);
    expect(s122!.predecessorSha).toBe('8e5e578c0fd775924cd5acc2cd7ea5a7432585da');
  });

  it('listScenarioEntities is callable (FR-44 read of group structure)', () => {
    expect(typeof listScenarioEntities).toBe('function');
    const out = listScenarioEntities();
    expect(Array.isArray(out)).toBe(true);
  });

  it('listScenarios returns persisted runs (entity-scoped localStorage upsert)', () => {
    const r = runScenario({
      fy: 'FY26-27', scope: 'single_entity', entity_scope: ['e1'],
      drivers: DRIVERS, baseline_override: { revenue: 100, cost: 50 },
    });
    const all = listScenarios({ fy: 'FY26-27' });
    expect(all.some((x) => x.scenario_id === r.scenario_id)).toBe(true);
  });
});
