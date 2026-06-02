/**
 * @file        src/test/sprint-117/workforce-planning.test.ts
 * @sprint      Sprint 117 · T-Phase-7.D.0.2 · Arc D.0 · Workforce Planning
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts, NO existsSync-future
 *              tombstones, NO "no S118 entry" absence checks. Scope-wall via toBeUndefined
 *              on the ENGINE's own surface (time-robust).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  projectWorkforce,
  upsertHeadcountPlan,
  listHeadcountPlans,
  getWorkforceCostVsAOP,
  readAopCostTarget,
  isValidScope,
  getCapacityContextRowCount,
  READS_FROM,
  __resetHeadcountPlansForTests,
  type WorkforceScopeLevel,
} from '@/lib/workforce-planning-engine';
import * as workforceEngine from '@/lib/workforce-planning-engine';
import * as orgPlanningEngine from '@/lib/org-planning-engine';
import { upsertStrategicTarget, __resetStrategicTargetsForTests } from '@/lib/org-planning-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import { EMPLOYEES_KEY } from '@/types/employee';
import { CONTRACT_WORKERS_KEY } from '@/types/contract-manpower';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/workforce-planning-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/workforce-planning/WorkforcePlanningPage.tsx');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const ORG_PLANNING_PATH = join(ROOT, 'src/lib/org-planning-engine.ts');
const CAPACITY_PATH = join(ROOT, 'src/lib/capacity-planning-engine.ts');
const ORG_STRUCTURE_PATH = join(ROOT, 'src/types/org-structure.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const auditSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const orgPlanningSrc = readFileSync(ORG_PLANNING_PATH, 'utf8');
const capacitySrc = readFileSync(CAPACITY_PATH, 'utf8');
const orgStructureSrc = readFileSync(ORG_STRUCTURE_PATH, 'utf8');

// ── Fixtures helpers ─────────────────────────────────────────────────────────
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
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify([
    { id: 'e1', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', employmentType: 'permanent' },
    { id: 'e2', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', employmentType: 'permanent' },
    { id: 'e3', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', employmentType: 'permanent' },
  ]));
  localStorage.setItem(CONTRACT_WORKERS_KEY, JSON.stringify([
    { id: 'c1', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', status: 'active' },
    { id: 'c2', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', status: 'active' },
    { id: 'c3', departmentId: 'DEPT-0001', divisionId: 'DIV-0001', entity_id: 'ENT-1', status: 'inactive' },
  ]));
}

beforeEach(() => {
  localStorage.clear();
  __resetHeadcountPlansForTests();
  __resetStrategicTargetsForTests();
  seedTree();
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · Engine surface · headers + READS_FROM', () => {
  it('engine file declares @pillar D.0', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.0/);
  });
  it('engine file declares @fr-44 reuse intent', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('READS_FROM enumerates the four reused engines/types', () => {
    expect(READS_FROM.engines).toEqual(expect.arrayContaining([
      'org-structure', 'capacity-planning-engine', 'org-planning-engine',
      'contract-manpower', 'employee',
    ]));
  });
  it('READS_FROM lists the workforce headcount-plan storage key', () => {
    expect(READS_FROM.storage_keys).toEqual(expect.arrayContaining(['erp_workforce_headcount_plans']));
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · projectWorkforce — headcount reconciliation', () => {
  it('reads current headcount from employees + active contract workers', () => {
    const r = projectWorkforce({ fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001' });
    expect(r.current_headcount).toBe(5); // 3 perm + 2 active contract
    expect(r.mix.permanent).toBe(3);
    expect(r.mix.contract).toBe(2);
  });
  it('planned = current + hires − attrition (default replacement)', () => {
    const r = projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001', attrition_pct: 20,
    });
    // attrition = round(5 * 0.20) = 1; hires default = attrition → planned = 5
    expect(r.attrition).toBe(1);
    expect(r.hires).toBe(1);
    expect(r.planned_headcount).toBe(5);
  });
  it('explicit hires override grows headcount', () => {
    const r = projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      attrition_pct: 0, hires: 4,
    });
    expect(r.planned_headcount).toBe(9);
  });
  it('orphan scope_id rejected at projection', () => {
    expect(() => projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'NOPE',
    })).toThrow(/orphan/);
  });
  it('attrition_pct clamped to 0..100', () => {
    const r = projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001', attrition_pct: 999,
    });
    expect(r.attrition).toBe(r.current_headcount);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · projected_cost via decimal-helpers + AOP linkage', () => {
  it('projected_cost = planned × cost_per_head', () => {
    const r = projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      attrition_pct: 0, hires: 0, cost_per_head: 500_000,
    });
    expect(r.projected_cost).toBe(5 * 500_000);
  });
  it('engine source imports decimal-helpers (no raw floats)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/decimal-helpers'/);
  });
  it('readAopCostTarget pulls cost_target from org-planning-engine', () => {
    upsertStrategicTarget({
      fy: 'FY26-27', horizon: 'annual', level: 'department', scope_id: 'DEPT-0001',
      revenue_target: 10_000_000, cost_target: 2_500_000, parent_target_id: null,
    });
    expect(readAopCostTarget('FY26-27', 'department', 'DEPT-0001')).toBe(2_500_000);
  });
  it('readAopCostTarget returns undefined when no AOP target is set', () => {
    expect(readAopCostTarget('FY26-27', 'department', 'DEPT-0001')).toBeUndefined();
  });
  it('projectWorkforce computes cost_variance_vs_aop when AOP target present', () => {
    upsertStrategicTarget({
      fy: 'FY26-27', horizon: 'annual', level: 'department', scope_id: 'DEPT-0001',
      revenue_target: 10_000_000, cost_target: 2_000_000, parent_target_id: null,
    });
    const r = projectWorkforce({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      attrition_pct: 0, hires: 0, cost_per_head: 500_000,
    });
    expect(r.aop_cost_target).toBe(2_000_000);
    expect(r.cost_variance_vs_aop).toBe(500_000); // 2.5M − 2.0M
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · upsertHeadcountPlan + listHeadcountPlans + audit', () => {
  it('rejects mismatched reconciliation', () => {
    expect(() => upsertHeadcountPlan({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      current_headcount: 5, planned_headcount: 10, hires: 1, attrition: 0,
      mix: { permanent: 3, contract: 2 }, projected_cost: 0,
    })).toThrow(/planned/);
  });
  it('persists + reloads by composite key', () => {
    upsertHeadcountPlan({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      current_headcount: 5, planned_headcount: 6, hires: 2, attrition: 1,
      mix: { permanent: 3, contract: 2 }, projected_cost: 1_000_000,
    });
    const plans = listHeadcountPlans({ fy: 'FY26-27' });
    expect(plans.length).toBe(1);
    expect(plans[0].planned_headcount).toBe(6);
  });
  it('audit log appends a workforce_plan_event entry on upsert', () => {
    upsertHeadcountPlan({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      current_headcount: 5, planned_headcount: 5, hires: 0, attrition: 0,
      mix: { permanent: 3, contract: 2 }, projected_cost: 1_000_000,
    });
    const auditKeys = Object.keys(localStorage).filter((k) => k.startsWith('erp_audit_'));
    const blob = auditKeys.map((k) => localStorage.getItem(k) ?? '').join('\n');
    expect(blob).toMatch(/workforce_plan_event/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · getWorkforceCostVsAOP — intra-arc S116 linkage', () => {
  it('returns rows only for scopes that have an AOP target (honest)', () => {
    upsertHeadcountPlan({
      fy: 'FY26-27', scope_level: 'department', scope_id: 'DEPT-0001',
      current_headcount: 5, planned_headcount: 5, hires: 0, attrition: 0,
      mix: { permanent: 3, contract: 2 }, projected_cost: 1_000_000,
    });
    expect(getWorkforceCostVsAOP({ fy: 'FY26-27' })).toEqual([]);
    upsertStrategicTarget({
      fy: 'FY26-27', horizon: 'annual', level: 'department', scope_id: 'DEPT-0001',
      revenue_target: 10_000_000, cost_target: 800_000, parent_target_id: null,
    });
    const rows = getWorkforceCostVsAOP({ fy: 'FY26-27' });
    expect(rows.length).toBe(1);
    expect(rows[0].variance).toBe(200_000); // 1.0M − 0.8M
  });
  it('engine source calls org-planning listStrategicTargets (AOP linkage · FR-44)', () => {
    expect(engineSrc).toMatch(/listStrategicTargets/);
    expect(engineSrc).toMatch(/from '@\/lib\/org-planning-engine'/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · FR-44 reuse · 0-DIFF on source engines', () => {
  it('engine imports org-structure types (no parallel store)', () => {
    expect(engineSrc).toMatch(/from '@\/types\/org-structure'/);
  });
  it('engine imports capacity-planning-engine (capacity context)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/capacity-planning-engine'/);
  });
  it('engine imports contract-manpower types (mix · contract side)', () => {
    expect(engineSrc).toMatch(/from '@\/types\/contract-manpower'/);
  });
  it('engine imports employee types (mix · permanent side)', () => {
    expect(engineSrc).toMatch(/from '@\/types\/employee'/);
  });
  it('org-planning-engine still exports listStrategicTargets (0-DIFF · surface preserved)', () => {
    expect(orgPlanningSrc).toMatch(/export function listStrategicTargets/);
  });
  it('capacity-planning-engine still exports computeBottleneckHeatmap (0-DIFF · surface preserved)', () => {
    expect(capacitySrc).toMatch(/export function computeBottleneckHeatmap/);
  });
  it('org-structure still exports DIVISIONS_KEY + DEPARTMENTS_KEY (0-DIFF)', () => {
    expect(orgStructureSrc).toMatch(/export const DIVISIONS_KEY/);
    expect(orgStructureSrc).toMatch(/export const DEPARTMENTS_KEY/);
  });
  it('capacity-context probe returns a non-negative count and never throws', () => {
    const n = getCapacityContextRowCount('ENT-1');
    expect(typeof n).toBe('number');
    expect(n).toBeGreaterThanOrEqual(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · scope validation', () => {
  it('isValidScope true for known department', () => {
    expect(isValidScope('department', 'DEPT-0001')).toBe(true);
  });
  it('isValidScope true for known division', () => {
    expect(isValidScope('division', 'DIV-0001')).toBe(true);
  });
  it('isValidScope true for entity present on division', () => {
    expect(isValidScope('entity', 'ENT-1')).toBe(true);
  });
  it('isValidScope false for orphan scope_id', () => {
    expect(isValidScope('department', 'GHOST')).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · SCOPE WALL (DP-D0-7) — workforce projection only', () => {
  const banned = [
    'planOKR', 'okrCascade', 'computeOrgDesign', 'designOrg',
    'computeBudget', 'computeForecast', 'simulateScenario',
    'planPerformance', 'performanceReview',
    'planCompensation', 'compensationBands',
  ] as const;
  for (const fn of banned) {
    it(`engine does NOT export ${fn} (DP-D0-7 deferred surfaces)`, () => {
      expect((workforceEngine as Record<string, unknown>)[fn]).toBeUndefined();
    });
  }
  it('org-planning-engine still does NOT export workforce surfaces (its own scope wall holds)', () => {
    expect((orgPlanningEngine as Record<string, unknown>).projectWorkforce).toBeUndefined();
    expect((orgPlanningEngine as Record<string, unknown>).getWorkforceCostVsAOP).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · Page #44 wiring (NOT a SIBLID · requiredCards fpa-planning)', () => {
  it('sidebar registers fpa-planning-workforce as type:item with requiredCards fpa-planning', () => {
    expect(sidebarSrc).toMatch(/fpa-planning-workforce/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\[\s*'fpa-planning'\s*\]/);
  });
  it('CC page imports WorkforcePlanningPage and renders a case for it', () => {
    expect(ccPageSrc).toMatch(/WorkforcePlanningPage/);
    expect(ccPageSrc).toMatch(/case\s+'fpa-planning-workforce'/);
  });
  it('page reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/projectWorkforce|getWorkforceCostVsAOP|upsertHeadcountPlan/);
  });
  it('page #44 is NOT registered as a SIBLID', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).not.toContain('fpa-planning-workforce');
    expect(ids).not.toContain('WorkforcePlanningPage');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · audit type · workforce_plan_event (mca-roc)', () => {
  it('AuditEntityType union includes workforce_plan_event', () => {
    expect(auditSrc).toMatch(/workforce_plan_event/);
  });
  it('engine logs via the central audit-trail-engine (no parallel logger)', () => {
    expect(engineSrc).toMatch(/from '@\/lib\/audit-trail-engine'/);
    expect(engineSrc).toMatch(/entityType:\s*'workforce_plan_event'/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · sibling-register · 185 → 186 (time-robust)', () => {
  it('workforce-planning-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'workforce-planning-engine');
    expect(matches.length).toBe(1);
  });
  it('org-planning-engine (S116) still appears exactly once (0-DIFF · FR-CT)', () => {
    expect(SIBLINGS.filter((s) => s.id === 'org-planning-engine').length).toBe(1);
  });
  it('comply360-tier2-extensions-engine still appears exactly once', () => {
    expect(SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine').length).toBe(1);
  });
  it('getSiblingCount() >= 186 (FLOOR · not exact)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(186);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 117 · sprint-history · S116 backfill + S117 appended (time-robust)', () => {
  const s116 = SPRINTS.find((s) => s.sprintNumber === 116);
  const s117 = SPRINTS.find((s) => s.sprintNumber === 117);
  const s118 = SPRINTS.find((s) => s.sprintNumber === 118);
  it('S116 headSha backfilled to 8f5d4cf7…', () => {
    expect(s116?.headSha).toBe('8f5d4cf710fc614fd49b5c07958029204aeddb0e');
  });
  it('S117 entry exists', () => {
    expect(s117).toBeTruthy();
  });
  it('S117 newSiblings lists workforce-planning-engine', () => {
    expect(s117?.newSiblings).toContain('workforce-planning-engine');
  });
  it('S117 headSha is TBD_AT_BANK or a real SHA-ish string (time-robust)', () => {
    const sha = s117?.headSha ?? '';
    expect(typeof sha).toBe('string');
    expect(sha === 'TBD_AT_BANK' || /^[0-9a-f]{7,40}$/i.test(sha)).toBe(true);
  });
  it('S117 predecessorSha is 8f5d4cf7…', () => {
    expect(s117?.predecessorSha).toBe('8f5d4cf710fc614fd49b5c07958029204aeddb0e');
  });
  it('S117 grade starts with A', () => {
    expect(s117?.grade?.startsWith('A')).toBe(true);
  });
  it('if a future S118 entry exists, its code is a string (if-present-then-valid · NO absence assertion)', () => {
    if (s118) expect(typeof s118.code).toBe('string');
  });
});

// Test-only: silence unused-var for fixture helper across describes
const _scopeLevelTypeProbe: WorkforceScopeLevel = 'department';
void _scopeLevelTypeProbe;
