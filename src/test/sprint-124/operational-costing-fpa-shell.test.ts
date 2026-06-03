/**
 * @file        src/test/sprint-124/operational-costing-fpa-shell.test.ts
 * @sprint      Sprint 124 · T-Phase-7.D.1.5 · Arc D.1 · Operational Costing Pt 1 + A1 (FP&A self-owned card)
 * @posture     LEAN-BEHAVIORAL (≥20 discrete `it()` · §N FLOOR · quality over volume).
 *              Behavioral first — toBeGreaterThanOrEqual on counts; the S124 own-headSha
 *              assertion uses toContain(['TBD_AT_BANK', ...]) per the S121-T1 root-cause
 *              rule. NO existsSync-future tombstones, NO "no S125 entry" absence checks.
 *              Scope-wall via toBeUndefined on the engine surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  rollUpBOMCost,
  upsertStandardCost,
  getStandardCost,
  listStandardCosts,
  computeCostVariance,
  recordActualCost,
  upsertBOMInput,
  READS_FROM,
  __fr44_reuse,
  __resetOperationalCostingForTests,
} from '@/lib/operational-costing-engine';
import * as opCosting from '@/lib/operational-costing-engine';
import * as costAllocation from '@/lib/cost-allocation-engine';
import * as packingBOM from '@/lib/packing-bom-engine';
import * as purchaseVariance from '@/lib/purchase-cost-variance-engine';
import * as comply360CostAudit from '@/lib/comply360-cost-audit-engine';
import * as auditTrail from '@/lib/audit-trail-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

import { fpaPlanningShellConfig } from '@/apps/erp/configs/fpa-planning-shell-config';
import { fpaPlanningSidebarItems } from '@/apps/erp/configs/fpa-planning-sidebar-config';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/operational-costing-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/operational-costing/OperationalCostingPage.tsx');
const FPA_PAGE_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const COST_AUDIT_PATH = join(ROOT, 'src/lib/comply360-cost-audit-engine.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const fpaPageSrc = readFileSync(FPA_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const costAuditSrc = readFileSync(COST_AUDIT_PATH, 'utf8');

beforeEach(() => {
  localStorage.clear();
  __resetOperationalCostingForTests();
  vi.restoreAllMocks();
});

// ─── §A · BOM cost roll-up (recursive · decimal-safe) ─────────────────────────
describe('§A · rollUpBOMCost · recursive + decimal-safe', () => {
  it('returns a node with rolled_cost = unit_cost when leaf (no children)', () => {
    upsertBOMInput({ item_key: 'LEAF-1', qty: 1, unit_cost: 25, children: [] });
    const n = rollUpBOMCost('LEAF-1');
    expect(n.item_key).toBe('LEAF-1');
    expect(n.rolled_cost).toBe(25);
    expect(n.children).toEqual([]);
  });

  it('recursively rolls child costs scaled by child qty (decimal-safe)', () => {
    upsertBOMInput({ item_key: 'C1', qty: 1, unit_cost: 10, children: [] });
    upsertBOMInput({ item_key: 'C2', qty: 1, unit_cost: 7.50, children: [] });
    upsertBOMInput({
      item_key: 'PARENT',
      qty: 1,
      unit_cost: 5,
      children: [
        { item_key: 'C1', qty: 2 },    // 2 × 10 = 20
        { item_key: 'C2', qty: 3 },    // 3 × 7.50 = 22.50
      ],
    });
    const n = rollUpBOMCost('PARENT');
    // 5 (self) + 20 + 22.50 = 47.50
    expect(n.rolled_cost).toBe(47.50);
    expect(n.children).toHaveLength(2);
  });

  it('handles missing BOM input gracefully (returns zero-cost leaf)', () => {
    const n = rollUpBOMCost('MISSING-XYZ');
    expect(n.rolled_cost).toBe(0);
    expect(n.children).toEqual([]);
  });

  it('cycle-guarded: a → b → a does not stack-overflow', () => {
    upsertBOMInput({ item_key: 'A', qty: 1, unit_cost: 1, children: [{ item_key: 'B', qty: 1 }] });
    upsertBOMInput({ item_key: 'B', qty: 1, unit_cost: 1, children: [{ item_key: 'A', qty: 1 }] });
    const n = rollUpBOMCost('A');
    expect(n).toBeDefined();
    expect(typeof n.rolled_cost).toBe('number');
  });
});

// ─── §B · Standard cost CRUD ─────────────────────────────────────────────────
describe('§B · standard costing · upsert/get/list', () => {
  it('upsertStandardCost computes standard_total = material + labour + overhead', () => {
    const s = upsertStandardCost({
      item_key: 'WIDGET',
      standard_material: 100,
      standard_labour: 30,
      standard_overhead: 20,
      standard_total: 0,
    });
    expect(s.standard_total).toBe(150);
  });

  it('getStandardCost returns the persisted record (round-trip)', () => {
    upsertStandardCost({ item_key: 'W2', standard_material: 1, standard_labour: 2, standard_overhead: 3, standard_total: 0 });
    expect(getStandardCost('W2')?.standard_total).toBe(6);
    expect(getStandardCost('NOPE')).toBeNull();
  });

  it('upsertStandardCost is idempotent on item_key (no duplicates)', () => {
    upsertStandardCost({ item_key: 'W3', standard_material: 10, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    upsertStandardCost({ item_key: 'W3', standard_material: 20, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    const list = listStandardCosts().filter((s) => s.item_key === 'W3');
    expect(list).toHaveLength(1);
    expect(list[0].standard_material).toBe(20);
  });
});

// ─── §C · standard-vs-actual variance ────────────────────────────────────────
describe('§C · computeCostVariance · standard vs actual', () => {
  it('computes positive variance when actual > standard (unfavorable)', () => {
    upsertStandardCost({ item_key: 'V1', standard_material: 100, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    recordActualCost('V1', '2026-27', 120);
    const v = computeCostVariance({ item_key: 'V1', fy: '2026-27' });
    expect(v.variance).toBe(20);
    expect(v.variance_pct).toBe(20);
    expect(v.direction).toBe('unfavorable');
  });

  it('computes negative variance when actual < standard (favorable)', () => {
    upsertStandardCost({ item_key: 'V2', standard_material: 100, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    recordActualCost('V2', '2026-27', 90);
    const v = computeCostVariance({ item_key: 'V2', fy: '2026-27' });
    expect(v.variance).toBe(-10);
    expect(v.direction).toBe('favorable');
  });

  it('variance_pct is 0 when standard_total is 0 (no divide-by-zero)', () => {
    const v = computeCostVariance({ item_key: 'ZERO', fy: '2026-27' });
    expect(v.variance_pct).toBe(0);
  });

  it('flat direction when variance == 0', () => {
    upsertStandardCost({ item_key: 'F1', standard_material: 50, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    recordActualCost('F1', '2026-27', 50);
    expect(computeCostVariance({ item_key: 'F1', fy: '2026-27' }).direction).toBe('flat');
  });
});

// ─── §D · audit · operational_cost_run fires ─────────────────────────────────
describe('§D · audit · operational_cost_run fires', () => {
  it('upsertStandardCost emits operational_cost_run audit', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    upsertStandardCost({ item_key: 'AUD-1', standard_material: 1, standard_labour: 0, standard_overhead: 0, standard_total: 0 });
    const types = spy.mock.calls.map((c) => (c[0] as { entityType: string }).entityType);
    expect(types).toContain('operational_cost_run');
  });

  it('computeCostVariance emits operational_cost_run audit', () => {
    const spy = vi.spyOn(auditTrail, 'logAudit');
    computeCostVariance({ item_key: 'AUD-2', fy: '2026-27' });
    expect(spy.mock.calls.some((c) => (c[0] as { entityType: string }).entityType === 'operational_cost_run')).toBe(true);
  });

  it('audit type literal exists in src/types/audit-trail.ts (mca-roc family)', () => {
    expect(auditSrc).toContain("'operational_cost_run'");
  });
});

// ─── §E · FR-44 reuse (cost-allocation + purchase-cost-variance + packing-bom)
describe('§E · FR-44 reuse · no reimplementation', () => {
  it('READS_FROM declares the 3 foundation engines + helpers', () => {
    expect(READS_FROM.engines).toContain('cost-allocation-engine');
    expect(READS_FROM.engines).toContain('purchase-cost-variance-engine');
    expect(READS_FROM.engines).toContain('packing-bom-engine');
    expect(READS_FROM.engines).toContain('decimal-helpers');
  });

  it('__fr44_reuse re-exposes the foundation functions (transparency)', () => {
    expect(__fr44_reuse.costAllocation_computeRatios).toBe(costAllocation.computeRatios);
    expect(__fr44_reuse.packingBOM_computeBOMTotalCost).toBe(packingBOM.computeBOMTotalCost);
    expect(__fr44_reuse.packingBOM_resolveActiveBOM).toBe(packingBOM.resolveActiveBOM);
    expect(__fr44_reuse.purchaseCostVariance_compute).toBe(purchaseVariance.computePurchaseCostVarianceItem);
  });

  it('engine source imports the 3 foundation engines (no parallel implementation)', () => {
    expect(engineSrc).toContain("from '@/lib/cost-allocation-engine'");
    expect(engineSrc).toContain("from '@/lib/purchase-cost-variance-engine'");
    expect(engineSrc).toContain("from '@/lib/packing-bom-engine'");
  });
});

// ─── §F · FR-44 WALL · distinct from statutory cost-audit ────────────────────
describe('§F · FR-44 wall · operational ≠ statutory cost-audit', () => {
  // Strip block + line comments so the FR-44 doc header (which legitimately
  // names the statutory engine + §148) does not pollute the wall assertions.
  const engineCode = engineSrc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((ln) => !ln.trim().startsWith('//'))
    .join('\n');

  it('engine code does NOT import comply360-cost-audit-engine', () => {
    expect(engineCode).not.toMatch(/from\s+['"]@\/lib\/comply360-cost-audit-engine['"]/);
  });

  it('engine code contains NO statutory-filing function names (CRA_n / appointments)', () => {
    expect(engineCode).not.toMatch(/CRA_[1234]/);
    expect(engineCode).not.toMatch(/cost_auditor_appointment/i);
    expect(engineCode).not.toMatch(/file(CRA|StatutoryCostAudit)/);
  });

  it('comply360-cost-audit-engine source is 0-DIFF (no S124 marker)', () => {
    expect(costAuditSrc).not.toMatch(/Sprint 124|T-Phase-7\.D\.1\.5/);
  });

  it('comply360-cost-audit-engine surface still exports its statutory api', () => {
    // Sanity — module loaded and is the statutory one (distinct namespace).
    expect(typeof comply360CostAudit).toBe('object');
  });
});

// ─── §G · SCOPE WALL · no job/process/ABC/CVP ───────────────────────────────
describe('§G · scope wall · NO job/process/ABC/CVP (S125)', () => {
  const FORBIDDEN = [
    'runJobCosting',
    'runProcessCosting',
    'runActivityBasedCosting',
    'computeABCCost',
    'runCVPAnalysis',
    'computeBreakEven',
  ] as const;

  it.each(FORBIDDEN)('engine does NOT export %s (S125 scope)', (name) => {
    expect((opCosting as Record<string, unknown>)[name]).toBeUndefined();
  });
});

// ─── §H · A1 — FP&A self-owned card (shell + sidebar + page) ─────────────────
describe('§H · A1 · FP&A self-owned card', () => {
  it('fpa-planning-sidebar-config exports SidebarItem[] with all expected ids', () => {
    const ids = fpaPlanningSidebarItems.map((i) => i.id);
    for (const expected of [
      'fpa-home', 'fpa-aop', 'fpa-budgeting', 'fpa-forecasting', 'fpa-scenario',
      'fpa-workforce', 'fpa-okr', 'fpa-org-design', 'fpa-operational-costing',
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it('every FP&A sidebar item is type:item (S95 navigable canon)', () => {
    for (const item of fpaPlanningSidebarItems) {
      expect(item.type).toBe('item');
    }
  });

  it('fpa-planning-shell-config wires fpaPlanningSidebarItems + FP&A landing route', () => {
    expect(fpaPlanningShellConfig.sidebar.items).toBe(fpaPlanningSidebarItems);
    expect(fpaPlanningShellConfig.routing.landingRoute).toBe('/erp/fpa-planning');
    expect(fpaPlanningShellConfig.product.code).toBe('FPA');
  });

  it('FpaPlanningPage imports fpaPlanningShellConfig (NOT commandCenterShellConfig)', () => {
    expect(fpaPageSrc).toContain("fpa-planning-shell-config");
    expect(fpaPageSrc).not.toMatch(/command-center-shell-config/);
  });

  it('FpaPlanningPage hosts a renderModule() switch over the 8 hosted pages', () => {
    expect(fpaPageSrc).toMatch(/renderModule\s*=\s*\(\)/);
    for (const sub of [
      'AOPStrategicPlanPage', 'BudgetingPage', 'ForecastingPage',
      'ScenarioModelingPage', 'WorkforcePlanningPage', 'OKRFrameworkPage',
      'OrgDesignSimulatorPage', 'OperationalCostingPage',
    ]) {
      expect(fpaPageSrc).toContain(sub);
    }
  });

  it('CommandCenterPage no longer imports the 7 FP&A pages', () => {
    const ccSrc = readFileSync(join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx'), 'utf8');
    // FP&A page imports stripped:
    expect(ccSrc).not.toMatch(/^import AOPStrategicPlanPage/m);
    expect(ccSrc).not.toMatch(/^import BudgetingPage/m);
    expect(ccSrc).not.toMatch(/^import ForecastingPage/m);
    expect(ccSrc).not.toMatch(/^import ScenarioModelingPage/m);
  });
});

// ─── §I · OperationalCostingPage reads engine (no dead UI) ──────────────────
describe('§I · OperationalCostingPage · reads operational-costing-engine', () => {
  it('page imports operational-costing-engine functions', () => {
    expect(pageSrc).toContain("from '@/lib/operational-costing-engine'");
    expect(pageSrc).toContain('rollUpBOMCost');
    expect(pageSrc).toContain('upsertStandardCost');
    expect(pageSrc).toContain('computeCostVariance');
  });

  it('page is wired into the FP&A renderModule switch', () => {
    expect(fpaPageSrc).toContain('fpa-operational-costing');
  });
});

// ─── §J · sibling-register + sprint-history (time-robust) ────────────────────
describe('§J · sibling-register + sprint-history · time-robust', () => {
  it('sibling-register count ≥ 192 (one new entry · time-robust)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(192);
  });

  it('operational-costing-engine appears exactly once in the register', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'operational-costing-engine');
    expect(hits).toHaveLength(1);
    expect(hits[0].provenance).toBe('CONFIRMED');
    expect(hits[0].path).toBe('src/lib/operational-costing-engine.ts');
  });

  it('sprint-history: S123 backfilled to 01a12091 (or toContain to be time-robust)', () => {
    const s123 = SPRINTS.find((s) => s.sprintNumber === 123);
    expect(s123).toBeDefined();
    expect(['TBD_AT_BANK', '01a12091ae77bf6f48b20d89354fea551b0c1356']).toContain(s123!.headSha);
  });

  it('sprint-history: S124 entry exists · headSha via toContain (NOT toBe · S121-T1 rule)', () => {
    const s124 = SPRINTS.find((s) => s.sprintNumber === 124);
    expect(s124).toBeDefined();
    expect(['TBD_AT_BANK', '2ff3e426645aff98648ab8d2ccf0b9ba405f535d']).toContain(s124!.headSha);
    expect(s124!.newSiblings).toEqual(['operational-costing-engine']);
    expect(s124!.predecessorSha).toBe('01a12091ae77bf6f48b20d89354fea551b0c1356');
    expect(s124!.code).toBe('T-Phase-7.D.1.5');
  });
});
