/**
 * @file        src/test/sprint-119/org-design-succession.test.ts
 * @sprint      Sprint 119 · T-Phase-7.D.0.4 · 🏁 Arc D.0 Capstone · Org Design + Succession
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts, NO existsSync-future
 *              tombstones, NO "no S120 entry" absence checks. Scope-wall via toBeUndefined
 *              on the engine's own surface (time-robust).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  simulateReorg,
  listReorgScenarios,
  upsertSuccession,
  listSuccession,
  getSuccessionCoverage,
  upsertSkill,
  getSkillsInventory,
  classifyCoverage,
  scenarioCopyKey,
  SCENARIO_KEY_PREFIX,
  READS_FROM,
  __resetOrgDesignForTests,
} from '@/lib/org-design-succession-engine';
import * as orgDesign from '@/lib/org-design-succession-engine';
import * as workforce from '@/lib/workforce-planning-engine';

import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import { EMPLOYEES_KEY, type Employee } from '@/types/employee';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/org-design-succession-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/org-design/OrgDesignSimulatorPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/fpa-planning-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');

// ── Fixtures ─────────────────────────────────────────────────────────────────
function seedTree() {
  const divs: Division[] = [{
    id: 'DIV-0001', code: 'DIV-0001', name: 'Engineering', category: 'technical',
    parent_division_id: null, head_name: 'A', head_email: 'a@b.in', location: 'Pune',
    status: 'active', description: '', entity_id: 'ENT-1',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }];
  const depts: Department[] = [{
    id: 'DEPT-0001', code: 'DEPT-0001', name: 'Backend', division_id: 'DIV-0001',
    parent_department_id: null, head_name: 'B', head_email: 'b@b.in', location: 'Pune',
    budget: null, status: 'active', description: '', entity_id: 'ENT-1',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }];
  localStorage.setItem(DIVISIONS_KEY, JSON.stringify(divs));
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify(depts));
}

function seedEmployees() {
  const emps: Partial<Employee>[] = [
    { id: 'EMP-1', empCode: 'EMP-1', firstName: 'A', lastName: 'X', divisionId: 'DIV-0001', departmentId: 'DEPT-0001', entityId: 'ENT-1', status: 'active', employmentType: 'permanent' },
    { id: 'EMP-2', empCode: 'EMP-2', firstName: 'B', lastName: 'Y', divisionId: 'DIV-0001', departmentId: 'DEPT-0001', entityId: 'ENT-1', status: 'active', employmentType: 'permanent' },
    { id: 'EMP-3', empCode: 'EMP-3', firstName: 'C', lastName: 'Z', divisionId: 'DIV-0001', departmentId: 'DEPT-0001', entityId: 'ENT-1', status: 'active', employmentType: 'permanent' },
  ];
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(emps));
}

function snapshotRealOrg(): { divs: string | null; depts: string | null } {
  return {
    divs: localStorage.getItem(DIVISIONS_KEY),
    depts: localStorage.getItem(DEPARTMENTS_KEY),
  };
}

beforeEach(() => {
  localStorage.clear();
  __resetOrgDesignForTests();
  seedTree();
  seedEmployees();
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 119 · Engine surface · headers + READS_FROM', () => {
  it('engine file declares @pillar D.0', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.0/);
  });
  it('engine file declares @fr-44 reuse', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('engine file declares @scope-wall', () => {
    expect(engineSrc).toMatch(/@scope-wall/);
  });
  it('engine file emits org_design_event audit type', () => {
    expect(engineSrc).toMatch(/org_design_event/);
  });
  it('READS_FROM names org-structure + workforce-planning + employee', () => {
    expect(READS_FROM.engines).toContain('org-structure');
    expect(READS_FROM.engines).toContain('workforce-planning-engine');
    expect(READS_FROM.engines).toContain('employee');
  });
  it('scenario side-store prefix is distinct from real org keys', () => {
    expect(SCENARIO_KEY_PREFIX).toBe('erp_org_design_scenario_');
    expect(SCENARIO_KEY_PREFIX).not.toContain('erp_divisions_');
    expect(SCENARIO_KEY_PREFIX).not.toContain('erp_departments_');
  });
});

describe('Sprint 119 · Re-org simulator · scenario copy & deltas', () => {
  it('simulateReorg requires fy and name', () => {
    expect(() => simulateReorg({ fy: '', name: 'x', proposed_nodes: [] })).toThrow(/fy/);
    expect(() => simulateReorg({ fy: 'FY26-27', name: '', proposed_nodes: [] })).toThrow(/name/);
  });
  it('computes proposed_headcount as the sum of node headcounts', () => {
    const r = simulateReorg({
      fy: 'FY26-27', name: 'P1',
      proposed_nodes: [
        { node_id: 'A', node_type: 'division', parent_id: null, planned_headcount: 10 },
        { node_id: 'B', node_type: 'department', parent_id: 'A', planned_headcount: 7 },
      ],
    });
    expect(r.proposed_headcount).toBe(17);
  });
  it('CALLS workforce-planning-engine.projectWorkforce when baseline_scope is given (FR-44 reuse)', () => {
    const spy = vi.spyOn(workforce, 'projectWorkforce');
    simulateReorg({
      fy: 'FY26-27', name: 'P2',
      proposed_nodes: [{ node_id: 'A', node_type: 'division', parent_id: null, planned_headcount: 5 }],
      baseline_scope: { level: 'division', scope_id: 'DIV-0001' },
    });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
  it('uses 0 baseline when no baseline_scope provided (honest · no fabrication)', () => {
    const r = simulateReorg({
      fy: 'FY26-27', name: 'P3',
      proposed_nodes: [{ node_id: 'A', node_type: 'division', parent_id: null, planned_headcount: 5 }],
    });
    expect(r.baseline_headcount).toBe(0);
    expect(r.headcount_delta).toBe(5);
  });
  it('cost_delta is decimal-safe (round2) and equals proposed_cost − baseline_cost', () => {
    const r = simulateReorg({
      fy: 'FY26-27', name: 'P4',
      proposed_nodes: [{ node_id: 'A', node_type: 'division', parent_id: null, planned_headcount: 3 }],
      cost_per_head: 600_000,
    });
    expect(r.proposed_cost).toBeCloseTo(1_800_000, 2);
    expect(r.cost_delta).toBeCloseTo(r.proposed_cost - r.baseline_cost, 2);
  });
  it('★ SAFETY: simulateReorg does NOT mutate erp_divisions_* / erp_departments_* (real org 0-DIFF)', () => {
    const before = snapshotRealOrg();
    simulateReorg({
      fy: 'FY26-27', name: 'SAFE',
      proposed_nodes: [
        { node_id: 'X', node_type: 'division', parent_id: null, planned_headcount: 99 },
        { node_id: 'Y', node_type: 'department', parent_id: 'X', planned_headcount: 50 },
      ],
      baseline_scope: { level: 'division', scope_id: 'DIV-0001' },
    });
    const after = snapshotRealOrg();
    expect(after.divs).toBe(before.divs);
    expect(after.depts).toBe(before.depts);
  });
  it('★ SAFETY: writes ONLY to the erp_org_design_scenario_* side-store', () => {
    const r = simulateReorg({
      fy: 'FY26-27', name: 'SIDE',
      proposed_nodes: [{ node_id: 'Z', node_type: 'division', parent_id: null, planned_headcount: 4 }],
    });
    const sideRaw = localStorage.getItem(scenarioCopyKey(r.scenario_id));
    expect(sideRaw).not.toBeNull();
    // The side key has the right prefix.
    expect(scenarioCopyKey(r.scenario_id).startsWith(SCENARIO_KEY_PREFIX)).toBe(true);
  });
  it('listReorgScenarios filters by fy', () => {
    simulateReorg({ fy: 'FY26-27', name: 'A', proposed_nodes: [] });
    simulateReorg({ fy: 'FY27-28', name: 'B', proposed_nodes: [] });
    expect(listReorgScenarios('FY26-27').length).toBeGreaterThanOrEqual(1);
    expect(listReorgScenarios('FY99-99').length).toBe(0);
  });
  it('is idempotent on supplied scenario_id (overwrite, not duplicate)', () => {
    simulateReorg({ fy: 'FY26-27', name: 'X', scenario_id: 'FIXED', proposed_nodes: [] });
    simulateReorg({ fy: 'FY26-27', name: 'X2', scenario_id: 'FIXED', proposed_nodes: [] });
    const arr = listReorgScenarios('FY26-27').filter((s) => s.scenario_id === 'FIXED');
    expect(arr.length).toBe(1);
    expect(arr[0].name).toBe('X2');
  });
});

describe('Sprint 119 · Succession coverage (RAG)', () => {
  it('classifyCoverage returns gap when no successors', () => {
    expect(classifyCoverage([])).toBe('gap');
  });
  it('classifyCoverage returns covered when a ready_now or 1-2_years successor exists', () => {
    expect(classifyCoverage([{ employee_id: 'EMP-2', readiness: 'ready_now' }])).toBe('covered');
    expect(classifyCoverage([{ employee_id: 'EMP-2', readiness: '1-2_years' }])).toBe('covered');
  });
  it('classifyCoverage returns at_risk when only development-stage successors', () => {
    expect(classifyCoverage([{ employee_id: 'EMP-2', readiness: 'development' }])).toBe('at_risk');
  });
  it('upsertSuccession rejects orphan incumbent employee', () => {
    expect(() => upsertSuccession({
      role_id: 'R1', role_title: 'CTO', incumbent_employee_id: 'NOPE', successors: [],
    })).toThrow(/orphan/);
  });
  it('upsertSuccession rejects orphan successor employee', () => {
    expect(() => upsertSuccession({
      role_id: 'R1', role_title: 'CTO', incumbent_employee_id: null,
      successors: [{ employee_id: 'NOPE', readiness: 'ready_now' }],
    })).toThrow(/orphan/);
  });
  it('upsertSuccession assigns coverage from classifier', () => {
    const e = upsertSuccession({
      role_id: 'R1', role_title: 'CTO', incumbent_employee_id: 'EMP-1',
      successors: [{ employee_id: 'EMP-2', readiness: 'ready_now' }],
    });
    expect(e.coverage).toBe('covered');
  });
  it('getSuccessionCoverage counts roles per RAG bucket', () => {
    upsertSuccession({ role_id: 'R1', role_title: 'A', incumbent_employee_id: 'EMP-1', successors: [{ employee_id: 'EMP-2', readiness: 'ready_now' }] });
    upsertSuccession({ role_id: 'R2', role_title: 'B', incumbent_employee_id: 'EMP-2', successors: [{ employee_id: 'EMP-3', readiness: 'development' }] });
    upsertSuccession({ role_id: 'R3', role_title: 'C', incumbent_employee_id: 'EMP-3', successors: [] });
    const s = getSuccessionCoverage();
    expect(s.total_roles).toBeGreaterThanOrEqual(3);
    expect(s.covered).toBeGreaterThanOrEqual(1);
    expect(s.at_risk).toBeGreaterThanOrEqual(1);
    expect(s.gap).toBeGreaterThanOrEqual(1);
  });
  it('upsertSuccession is idempotent by role_id (overwrite)', () => {
    upsertSuccession({ role_id: 'R1', role_title: 'A', incumbent_employee_id: 'EMP-1', successors: [] });
    upsertSuccession({ role_id: 'R1', role_title: 'A2', incumbent_employee_id: 'EMP-1', successors: [] });
    const all = listSuccession().filter((e) => e.role_id === 'R1');
    expect(all.length).toBe(1);
    expect(all[0].role_title).toBe('A2');
  });
});

describe('Sprint 119 · Skills inventory', () => {
  it('upsertSkill rejects orphan employee_id', () => {
    expect(() => upsertSkill({ employee_id: 'NOPE', skill: 'React', proficiency: 'expert' }))
      .toThrow(/orphan/);
  });
  it('upsertSkill persists and getSkillsInventory returns it', () => {
    upsertSkill({ employee_id: 'EMP-1', skill: 'React', proficiency: 'expert' });
    expect(getSkillsInventory({ employee_id: 'EMP-1' }).length).toBeGreaterThanOrEqual(1);
  });
  it('upsertSkill is idempotent by (employee_id, skill)', () => {
    upsertSkill({ employee_id: 'EMP-1', skill: 'React', proficiency: 'basic' });
    upsertSkill({ employee_id: 'EMP-1', skill: 'React', proficiency: 'expert' });
    const rows = getSkillsInventory({ employee_id: 'EMP-1', skill: 'React' });
    expect(rows.length).toBe(1);
    expect(rows[0].proficiency).toBe('expert');
  });
  it('getSkillsInventory filters by proficiency', () => {
    upsertSkill({ employee_id: 'EMP-1', skill: 'React', proficiency: 'expert' });
    upsertSkill({ employee_id: 'EMP-2', skill: 'SQL', proficiency: 'basic' });
    expect(getSkillsInventory({ proficiency: 'expert' }).length).toBeGreaterThanOrEqual(1);
  });
});

describe('Sprint 119 · Scope wall (DP-D0-7) · engine surface', () => {
  it('does NOT export performance-management symbols', () => {
    const e = orgDesign as unknown as Record<string, unknown>;
    expect(e.startReviewCycle).toBeUndefined();
    expect(e.run360).toBeUndefined();
    expect(e.calibrate).toBeUndefined();
  });
  it('does NOT export compensation-planning symbols', () => {
    const e = orgDesign as unknown as Record<string, unknown>;
    expect(e.upsertSalaryBand).toBeUndefined();
    expect(e.runMeritCycle).toBeUndefined();
    expect(e.computeCompensation).toBeUndefined();
  });
  it('does NOT export budget/forecast/scenario symbols', () => {
    const e = orgDesign as unknown as Record<string, unknown>;
    expect(e.buildBudget).toBeUndefined();
    expect(e.buildForecast).toBeUndefined();
    expect(e.runScenario).toBeUndefined();
  });
});

describe('Sprint 119 · Wiring · page + sidebar + CC + audit', () => {
  it('OrgDesignSimulatorPage imports from the org-design engine', () => {
    expect(pageSrc).toMatch(/from '@\/lib\/org-design-succession-engine'/);
  });
  it('Page UI labels the scenario-copy safety boundary', () => {
    expect(pageSrc).toMatch(/SCENARIO/i);
  });
  it('Sidebar registers fpa-org-design under the fpa-planning card (S124 A1: module id renamed from fpa-planning-org-design)', () => {
    expect(sidebarSrc).toMatch(/'fpa-org-design'/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\['fpa-planning'\]/);
  });
  it('FP&A shell page routes the new module', () => {
    expect(ccPageSrc).toMatch(/'fpa-org-design'/);
    expect(ccPageSrc).toMatch(/OrgDesignSimulatorPage/);
  });
  it('audit-trail.ts declares the new org_design_event type', () => {
    expect(auditSrc).toMatch(/'org_design_event'/);
  });
});

describe('Sprint 119 · Registry discipline', () => {
  it('sibling-register contains exactly one org-design-succession-engine entry', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'org-design-succession-engine');
    expect(matches.length).toBe(1);
  });
  it('comply360-tier2-extensions-engine stays at exactly 1 entry', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
  it('sibling count is at least 188 after this sprint', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(188);
  });
  it('sprint-history has an S119 entry with TBD_AT_BANK or a real SHA', () => {
    const s119 = SPRINTS.find((s) => s.sprintNumber === 119);
    expect(s119).toBeDefined();
    expect(s119?.headSha === 'TBD_AT_BANK' || /^[0-9a-f]{8}/.test(s119?.headSha ?? '')).toBe(true);
    expect(s119?.newSiblings).toContain('org-design-succession-engine');
  });
  it('sprint-history has S118 backfilled (not TBD_AT_BANK)', () => {
    const s118 = SPRINTS.find((s) => s.sprintNumber === 118);
    expect(s118?.headSha).not.toBe('TBD_AT_BANK');
    expect(s118?.headSha).toMatch(/^ae0c78fd/);
  });
  it('predecessor of S119 is the S118 head SHA', () => {
    const s118 = SPRINTS.find((s) => s.sprintNumber === 118);
    const s119 = SPRINTS.find((s) => s.sprintNumber === 119);
    expect(s119?.predecessorSha).toBe(s118?.headSha);
  });
});
