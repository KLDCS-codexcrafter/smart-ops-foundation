/**
 * @file        src/test/sprint-120/fpa-budgeting.test.ts
 * @sprint      Sprint 120 · T-Phase-7.D.1.1 · 🎬 Arc D.1 OPENER · FP&A Budgeting
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts, NO existsSync-future
 *              tombstones, NO "no S121 entry" absence checks. Scope-wall via
 *              toBeUndefined on the engine's own surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  upsertBudget,
  listBudgets,
  getBudget,
  getBudgetVsActual,
  getBudgetVsAOP,
  isValidBudgetScope,
  BUDGET_TYPES,
  BUDGET_SCOPE_LEVELS,
  READS_FROM,
  __resetFPABudgetingForTests,
} from '@/lib/fpa-budgeting-engine';
import * as fpaBudgeting from '@/lib/fpa-budgeting-engine';
import * as orgPlanning from '@/lib/org-planning-engine';
import * as groupConsolidation from '@/lib/group-consolidation-engine';
import * as budgetAllocation from '@/lib/budget-allocation-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/fpa-budgeting-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/budgeting/BudgetingPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/fpa-planning-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const DASHBOARD_PATH = join(ROOT, 'src/pages/erp/Dashboard.tsx');
const BUDGET_ALLOCATION_PATH = join(ROOT, 'src/lib/budget-allocation-engine.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const dashboardSrc = readFileSync(DASHBOARD_PATH, 'utf8');
const budgetAllocationSrc = readFileSync(BUDGET_ALLOCATION_PATH, 'utf8');

// ── Fixtures ─────────────────────────────────────────────────────────────────
function seedTree() {
  const divs: Division[] = [{
    id: 'DIV-0001', code: 'DIV-0001', name: 'Engineering', category: 'technical',
    parent_division_id: null, head_name: 'A', head_email: 'a@b.in', location: 'Pune',
    status: 'active', description: '', entity_id: 'ENT-1',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }];
  const depts: Department[] = [{
    id: 'DEPT-0001', code: 'DEPT-0001', name: 'Platform', division_id: 'DIV-0001',
    parent_department_id: null, head_name: 'B', head_email: 'b@b.in', location: 'Pune',
    budget: null, status: 'active', description: '', entity_id: 'ENT-1',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }];
  localStorage.setItem(DIVISIONS_KEY, JSON.stringify(divs));
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(depts));
}

beforeEach(() => {
  localStorage.clear();
  __resetFPABudgetingForTests();
  seedTree();
  vi.restoreAllMocks();
});

// ─── §A · Engine surface + headers ───────────────────────────────────────────
describe('§A · fpa-budgeting-engine · surface and headers', () => {
  it('declares @pillar D.1 in the engine header', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.1/);
  });

  it('declares @fr-44 reuse contract', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });

  it('exports READS_FROM with the three reused engines', () => {
    expect(READS_FROM.engines).toEqual(
      expect.arrayContaining([
        'org-planning-engine',
        'group-consolidation-engine',
        'org-structure',
      ]),
    );
  });

  it('exposes the 3 budget types (operating · capital · cash)', () => {
    expect(BUDGET_TYPES).toEqual(['operating', 'capital', 'cash']);
  });

  it('exposes the 3 budget scope levels (entity · division · department)', () => {
    expect(BUDGET_SCOPE_LEVELS).toEqual(['entity', 'division', 'department']);
  });
});

// ─── §B · Upsert + list + scope validation ───────────────────────────────────
describe('§B · upsertBudget · listBudgets · scope validation', () => {
  it('rejects an orphan scope_id (not present in org-structure)', () => {
    expect(() =>
      upsertBudget({
        fy: 'FY26-27',
        budget_type: 'operating',
        scope_level: 'division',
        scope_id: 'DIV-NOPE',
        lines: [{ ledger_group_code: 'I-OR', budgeted: 1000 }],
      }),
    ).toThrow(/orphan scope_id/);
  });

  it('upserts an operating budget for a valid division and totals via decimal-helpers', () => {
    const b = upsertBudget({
      fy: 'FY26-27',
      budget_type: 'operating',
      scope_level: 'division',
      scope_id: 'DIV-0001',
      lines: [
        { ledger_group_code: 'I-OR', budgeted: 1000.1 },
        { ledger_group_code: 'E-OE', budgeted: 200.2 },
      ],
    });
    expect(b.total_budgeted).toBe(1200.3);
    expect(b.budget_type).toBe('operating');
  });

  it('upserts capital + cash budgets per node (3 distinct records)', () => {
    for (const t of BUDGET_TYPES) {
      upsertBudget({
        fy: 'FY26-27',
        budget_type: t,
        scope_level: 'department',
        scope_id: 'DEPT-0001',
        lines: [{ ledger_group_code: 'E-OE', budgeted: 100 }],
      });
    }
    const list = listBudgets({ fy: 'FY26-27', scope_id: 'DEPT-0001' });
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(new Set(list.map((b) => b.budget_type))).toEqual(
      new Set(['operating', 'capital', 'cash']),
    );
  });

  it('idempotent upsert by composite key (same key → same budget_id)', () => {
    const a = upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'I-OR', budgeted: 1 }],
    });
    const b = upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'I-OR', budgeted: 2 }],
    });
    expect(b.budget_id).toBe(a.budget_id);
    expect(b.total_budgeted).toBe(2);
  });

  it('isValidBudgetScope returns false for an orphan and true for a real division', () => {
    expect(isValidBudgetScope('division', 'DIV-NOPE')).toBe(false);
    expect(isValidBudgetScope('division', 'DIV-0001')).toBe(true);
  });

  it('getBudget returns null when no record exists', () => {
    expect(getBudget('FY26-27', 'operating', 'division', 'DIV-0001')).toBeNull();
  });
});

// ─── §C · getBudgetVsActual — FR-44 wiring into consolidated P&L ─────────────
describe('§C · getBudgetVsActual · calls buildConsolidatedPnL', () => {
  it('CALLS group-consolidation-engine.buildConsolidatedPnL with the requested fy', () => {
    const spy = vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY26-27', revenue: 0, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0,
      lines: [{ ledger_group_code: 'I-OR', amount: 800 }],
    });
    upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'I-OR', budgeted: 1000 }],
    });
    const result = getBudgetVsActual({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division', scope_id: 'DIV-0001',
    });
    expect(spy).toHaveBeenCalledWith({ fy: 'FY26-27' });
    expect(result.lines[0].actual).toBe(800);
    expect(result.lines[0].variance).toBe(200); // 1000 − 800
    expect(result.total_variance).toBe(200);
  });

  it('variance is decimal-safe (no float drift)', () => {
    vi.spyOn(groupConsolidation, 'buildConsolidatedPnL').mockReturnValue({
      fy: 'FY26-27', revenue: 0, cogs: 0, gross_profit: 0, expenses: 0,
      operating_profit: 0, other_income: 0, profit_before_tax: 0,
      lines: [{ ledger_group_code: 'I-OR', amount: 0.2 }],
    });
    upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'I-OR', budgeted: 0.3 }],
    });
    const r = getBudgetVsActual({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division', scope_id: 'DIV-0001',
    });
    expect(r.total_variance).toBe(0.1); // not 0.09999…
  });

  it('rejects orphan scope on getBudgetVsActual', () => {
    expect(() =>
      getBudgetVsActual({
        fy: 'FY26-27', budget_type: 'operating', scope_level: 'division', scope_id: 'DIV-NOPE',
      }),
    ).toThrow(/orphan scope_id/);
  });
});

// ─── §D · getBudgetVsAOP — FR-44 wiring into org-planning ────────────────────
describe('§D · getBudgetVsAOP · reads StrategicTarget (the AOP linkage)', () => {
  it('CALLS org-planning-engine.listStrategicTargets', () => {
    const spy = vi.spyOn(orgPlanning, 'listStrategicTargets').mockReturnValue([
      {
        target_id: 'T1', fy: 'FY26-27', horizon: 'annual', level: 'division',
        scope_id: 'DIV-0001', revenue_target: 10000, cost_target: 4000,
        parent_target_id: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ]);
    upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'E-OE', budgeted: 3500 }],
    });
    const r = getBudgetVsAOP({
      fy: 'FY26-27', scope_level: 'division', scope_id: 'DIV-0001', basis: 'cost',
    });
    expect(spy).toHaveBeenCalled();
    expect(r.aop_target).toBe(4000);
    expect(r.budgeted).toBe(3500);
    expect(r.variance).toBe(-500); // budgeted − aop_target
    expect(r.aop_missing).toBe(false);
  });

  it('flags aop_missing=true when no StrategicTarget exists', () => {
    vi.spyOn(orgPlanning, 'listStrategicTargets').mockReturnValue([]);
    upsertBudget({
      fy: 'FY26-27', budget_type: 'operating', scope_level: 'division',
      scope_id: 'DIV-0001', lines: [{ ledger_group_code: 'E-OE', budgeted: 100 }],
    });
    const r = getBudgetVsAOP({
      fy: 'FY26-27', scope_level: 'division', scope_id: 'DIV-0001',
    });
    expect(r.aop_missing).toBe(true);
    expect(r.aop_target).toBe(0);
  });

  it('basis=revenue uses revenue_target from the StrategicTarget', () => {
    vi.spyOn(orgPlanning, 'listStrategicTargets').mockReturnValue([
      {
        target_id: 'T1', fy: 'FY26-27', horizon: 'annual', level: 'division',
        scope_id: 'DIV-0001', revenue_target: 10000, cost_target: 4000,
        parent_target_id: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ]);
    const r = getBudgetVsAOP({
      fy: 'FY26-27', scope_level: 'division', scope_id: 'DIV-0001', basis: 'revenue',
    });
    expect(r.aop_target).toBe(10000);
  });
});

// ─── §E · Audit ──────────────────────────────────────────────────────────────
describe('§E · budget_event audit', () => {
  it('AuditEntityType union includes "budget_event" (mca-roc)', () => {
    expect(auditSrc).toMatch(/\|\s*'budget_event'/);
  });

  it('engine logs via audit-trail-engine with entityType "budget_event"', () => {
    expect(engineSrc).toMatch(/entityType:\s*'budget_event'/);
  });
});

// ─── §F · FR-44 reuse + scope wall ───────────────────────────────────────────
describe('§F · FR-44 reuse · 0-DIFF on source engines · scope wall', () => {
  it('engine does NOT import budget-allocation-engine (PATTERN reuse only)', () => {
    expect(engineSrc).not.toMatch(/from\s+['"]@\/lib\/budget-allocation-engine['"]/);
  });

  it('budget-allocation-engine retains its commitment/consumption surface (0-DIFF reuse anchor)', () => {
    expect(budgetAllocationSrc).toMatch(/export function recordCommitment\(/);
    expect(budgetAllocationSrc).toMatch(/export function recordConsumption\(/);
    expect(typeof budgetAllocation.recordCommitment).toBe('function');
    expect(typeof budgetAllocation.recordConsumption).toBe('function');
  });

  it('engine reuses org-planning-engine (listStrategicTargets · isValidScope)', () => {
    expect(engineSrc).toMatch(/listStrategicTargets/);
    expect(engineSrc).toMatch(/isValidScope/);
  });

  it('engine reuses group-consolidation-engine (buildConsolidatedPnL)', () => {
    expect(engineSrc).toMatch(/buildConsolidatedPnL/);
  });

  it('SCOPE WALL: engine does NOT export forecast / scenario / costing functions', () => {
    const surface = fpaBudgeting as unknown as Record<string, unknown>;
    expect(surface.forecast).toBeUndefined();
    expect(surface.buildForecast).toBeUndefined();
    expect(surface.simulateScenario).toBeUndefined();
    expect(surface.computeCost).toBeUndefined();
    expect(surface.runDriver).toBeUndefined();
    expect(surface.activityBasedCost).toBeUndefined();
  });
});

// ─── §G · Dashboard lane wiring + page + registry ────────────────────────────
describe('§G · Dashboard lane fix · sidebar · CC · registry', () => {
  it("Dashboard.tsx Finance LANES now includes 'fpa-planning' (S116 carryover fix)", () => {
    // Locate the Finance lane block and assert 'fpa-planning' appears within it.
    const financeLane = dashboardSrc.match(/id:\s*'finance'[\s\S]*?ids:\s*\[([\s\S]*?)\]/);
    expect(financeLane).not.toBeNull();
    expect(financeLane![1]).toMatch(/'fpa-planning'/);
  });

  it('sidebar exposes the fpa-budgeting item under requiredCards fpa-planning (S124 A1: module id renamed from fpa-planning-budgeting)', () => {
    expect(sidebarSrc).toMatch(/'fpa-budgeting'/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\['fpa-planning'\]/);
  });

  it('FP&A shell page wires the fpa-budgeting case to BudgetingPage', () => {
    expect(ccPageSrc).toMatch(/case 'fpa-budgeting':\s*return <BudgetingPage \/>;/);
  });

  it('BudgetingPage reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/from '@\/lib\/fpa-budgeting-engine'/);
    expect(pageSrc).toMatch(/upsertBudget/);
    expect(pageSrc).toMatch(/getBudgetVsActual/);
    expect(pageSrc).toMatch(/getBudgetVsAOP/);
  });

  it('sibling-register count is ≥ 189 and contains the new engine exactly once', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(189);
    const hits = SIBLINGS.filter((s) => s.id === 'fpa-budgeting-engine');
    expect(hits.length).toBe(1);
  });

  it('sibling-register: comply360-tier2-extensions-engine still appears exactly once', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits.length).toBe(1);
  });

  it('sprint-history includes S119 backfilled SHA + S120 entry with TBD_AT_BANK', () => {
    const s119 = SPRINTS.find((s) => s.sprintNumber === 119);
    expect(s119?.headSha).toBe('d7489a054eb592beedc0c636d2034441f8156a1d');
    const s120 = SPRINTS.find((s) => s.sprintNumber === 120);
    expect(['TBD_AT_BANK', '749907701208bf70e6e1bedb3863b3b7b37b014f']).toContain(s120?.headSha);
    expect(s120?.newSiblings).toEqual(['fpa-budgeting-engine']);
    expect(s120?.predecessorSha).toBe('d7489a054eb592beedc0c636d2034441f8156a1d');
  });
});
