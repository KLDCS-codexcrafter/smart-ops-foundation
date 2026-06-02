/**
 * @file        src/test/sprint-116/org-planning.test.ts
 * @sprint      Sprint 116 · T-Phase-7.D.0.1 · 🎬 PHASE 7 OPENER · Arc D.0
 * @posture     REFINED LEAN-BEHAVIORAL (Phase 7 · founder-ratified) · ≥20 discrete it() FLOOR (not target).
 *              Behavioral assertions only — NO exact toBe(N) sibling counts (use toBeGreaterThanOrEqual),
 *              NO existsSync future-file tombstones, NO "no S117 entry" absence checks.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  upsertStrategicTarget,
  buildAOP,
  cascadeTargets,
  listStrategicTargets,
  isValidScope,
  readDivisions,
  readDepartments,
  readEntityNodes,
  netTarget,
  READS_FROM,
  CORPORATE_SCOPE_ID,
  CASCADE_LEVELS,
  PLAN_HORIZONS,
  __resetStrategicTargetsForTests,
} from '@/lib/org-planning-engine';
import * as orgPlanningEngine from '@/lib/org-planning-engine';
import { ROLE_DEFAULT_CARDS } from '@/types/card-entitlement';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { DIVISIONS_KEY, DEPARTMENTS_KEY } from '@/types/org-structure';
import { GROUP_STRUCTURE_KEY } from '@/lib/intercompany-group-structure-engine';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/org-planning-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/fpa-planning/AOPStrategicPlanPage.tsx');
const LANDING_PATH = join(ROOT, 'src/pages/erp/fpa-planning/FpaPlanningPage.tsx');
const APPS_PATH = join(ROOT, 'src/components/operix-core/applications.ts');
const CARD_TYPES_PATH = join(ROOT, 'src/types/card-entitlement.ts');
const AUDIT_TYPES_PATH = join(ROOT, 'src/types/audit-trail.ts');
const SIDEBAR_PATH = join(ROOT, 'src/apps/erp/configs/command-center-sidebar-config.ts');
const CC_PAGE_PATH = join(ROOT, 'src/features/command-center/pages/CommandCenterPage.tsx');
const APP_PATH = join(ROOT, 'src/App.tsx');
const ORG_STRUCTURE_PATH = join(ROOT, 'src/types/org-structure.ts');
const GROUP_STRUCTURE_ENGINE_PATH = join(ROOT, 'src/lib/intercompany-group-structure-engine.ts');

const engineSrc = readFileSync(ENGINE_PATH, 'utf8');
const pageSrc = readFileSync(PAGE_PATH, 'utf8');
const landingSrc = readFileSync(LANDING_PATH, 'utf8');
const appsSrc = readFileSync(APPS_PATH, 'utf8');
const cardTypesSrc = readFileSync(CARD_TYPES_PATH, 'utf8');
const auditTypesSrc = readFileSync(AUDIT_TYPES_PATH, 'utf8');
const sidebarSrc = readFileSync(SIDEBAR_PATH, 'utf8');
const ccPageSrc = readFileSync(CC_PAGE_PATH, 'utf8');
const appSrc = readFileSync(APP_PATH, 'utf8');
const orgStructureSrc = readFileSync(ORG_STRUCTURE_PATH, 'utf8');
const groupStructureSrc = readFileSync(GROUP_STRUCTURE_ENGINE_PATH, 'utf8');

// ─── shared fixtures ────────────────────────────────────────────────────────

const FY = 'FY26-27';

function seedTree(): { entityId: string; divisionId: string; departmentId: string } {
  // Group structure node (entity)
  const node = {
    entity_id: 'ENT-1',
    parent_entity_id: null,
    relationship: 'parent',
    ownership_pct: 100,
    consolidation_method: 'full',
    effective_from: '2026-04-01',
  };
  localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([node]));

  const division = {
    id: 'DIV-1', code: 'DIV-0001', name: 'Operations', category: 'operations',
    parent_division_id: null, head_name: 'A', head_email: 'a@x.in',
    location: 'Pune', status: 'active', description: '',
    entity_id: 'ENT-1', created_at: '2026-04-01', updated_at: '2026-04-01',
  };
  localStorage.setItem(DIVISIONS_KEY, JSON.stringify([division]));

  const department = {
    id: 'DEPT-1', code: 'DEPT-0001', name: 'Stores', division_id: 'DIV-1',
    parent_department_id: null, head_name: 'B', head_email: 'b@x.in',
    location: 'Pune', budget: null, status: 'active', description: '',
    entity_id: 'ENT-1', created_at: '2026-04-01', updated_at: '2026-04-01',
  };
  localStorage.setItem(DEPARTMENTS_KEY, JSON.stringify([department]));

  return { entityId: 'ENT-1', divisionId: 'DIV-1', departmentId: 'DEPT-1' };
}

beforeEach(() => {
  localStorage.clear();
  __resetStrategicTargetsForTests();
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · engine scaffold + READS_FROM (FR-44 transparency)', () => {
  it('engine source declares @pillar D.0', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.0/);
  });
  it('engine source declares @fr-44 wall', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('engine source declares @scope-wall (AOP only)', () => {
    expect(engineSrc).toMatch(/@scope-wall/);
    expect(engineSrc).toMatch(/AOP/);
  });
  it('READS_FROM lists org-structure + intercompany-group-structure', () => {
    expect(READS_FROM.engines).toContain('org-structure');
    expect(READS_FROM.engines).toContain('intercompany-group-structure-engine');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · FR-44 reuse of org-structure + group-structure (engine imports + 0-DIFF)', () => {
  it('engine imports org-structure DIVISIONS_KEY / DEPARTMENTS_KEY (not re-declared locally)', () => {
    expect(engineSrc).toMatch(/from\s+['"]@\/types\/org-structure['"]/);
    expect(engineSrc).toMatch(/DIVISIONS_KEY/);
    expect(engineSrc).toMatch(/DEPARTMENTS_KEY/);
  });
  it('engine imports listGroupStructure (not re-declared locally)', () => {
    expect(engineSrc).toMatch(/listGroupStructure/);
    expect(engineSrc).toMatch(/from\s+['"]@\/lib\/intercompany-group-structure-engine['"]/);
  });
  it('engine does NOT re-define Division / Department types', () => {
    expect(engineSrc).not.toMatch(/export\s+interface\s+Division\b/);
    expect(engineSrc).not.toMatch(/export\s+interface\s+Department\b/);
  });
  it('org-structure file still exports the canonical Division + Department interfaces (0-DIFF)', () => {
    expect(orgStructureSrc).toMatch(/export interface Division\b/);
    expect(orgStructureSrc).toMatch(/export interface Department\b/);
  });
  it('intercompany-group-structure-engine still exports listGroupStructure (0-DIFF)', () => {
    expect(groupStructureSrc).toMatch(/export function listGroupStructure/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · scope validation against the real tree', () => {
  it('corporate scope must be CORPORATE_SCOPE_ID', () => {
    expect(isValidScope('corporate', CORPORATE_SCOPE_ID)).toBe(true);
    expect(isValidScope('corporate', 'NOT_GROUP')).toBe(false);
  });
  it('entity scope is validated via listGroupStructure', () => {
    seedTree();
    expect(isValidScope('entity', 'ENT-1')).toBe(true);
    expect(isValidScope('entity', 'GHOST')).toBe(false);
  });
  it('division scope is validated against DIVISIONS_KEY', () => {
    seedTree();
    expect(isValidScope('division', 'DIV-1')).toBe(true);
    expect(isValidScope('division', 'DIV-GHOST')).toBe(false);
  });
  it('department scope is validated against DEPARTMENTS_KEY', () => {
    seedTree();
    expect(isValidScope('department', 'DEPT-1')).toBe(true);
    expect(isValidScope('department', 'DEPT-GHOST')).toBe(false);
  });
  it('engine view fns read from the real stores', () => {
    seedTree();
    expect(readEntityNodes().length).toBeGreaterThanOrEqual(1);
    expect(readDivisions().length).toBeGreaterThanOrEqual(1);
    expect(readDepartments().length).toBeGreaterThanOrEqual(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · upsertStrategicTarget · round-trip + orphan rejection', () => {
  it('round-trips a corporate target', () => {
    const t = upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID,
      revenue_target: 1000, cost_target: 600,
    });
    expect(t.target_id).toContain(FY);
    expect(t.revenue_target).toBe(1000);
    expect(t.cost_target).toBe(600);
    const back = listStrategicTargets({ fy: FY });
    expect(back.map((x) => x.target_id)).toContain(t.target_id);
  });
  it('upsert is idempotent on composite key (no duplicate target_id)', () => {
    upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID,
      revenue_target: 100, cost_target: 50,
    });
    upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID,
      revenue_target: 200, cost_target: 80,
    });
    const all = listStrategicTargets({ fy: FY });
    expect(all.length).toBe(1);
    expect(all[0].revenue_target).toBe(200);
  });
  it('rejects orphan scope_id at division level', () => {
    expect(() =>
      upsertStrategicTarget({
        fy: FY, horizon: 'annual', level: 'division', scope_id: 'DIV-GHOST',
        revenue_target: 1, cost_target: 1,
      }),
    ).toThrow(/orphan scope_id/);
  });
  it('rejects invalid horizon', () => {
    expect(() =>
      upsertStrategicTarget({
        fy: FY,
        horizon: 'forever' as unknown as 'annual',
        level: 'corporate', scope_id: CORPORATE_SCOPE_ID,
        revenue_target: 1, cost_target: 1,
      }),
    ).toThrow(/invalid horizon/);
  });
  it('netTarget = revenue − cost (decimal-safe)', () => {
    const n = netTarget({ revenue_target: 100.10, cost_target: 25.05 });
    expect(n).toBe(75.05);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · cascade structure mirrors the org tree', () => {
  it('cascade orders corporate → entity → division → department', () => {
    const { entityId, divisionId, departmentId } = seedTree();
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID, revenue_target: 1000, cost_target: 600 });
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'entity', scope_id: entityId, revenue_target: 1000, cost_target: 600 });
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'division', scope_id: divisionId, revenue_target: 1000, cost_target: 600 });
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'department', scope_id: departmentId, revenue_target: 1000, cost_target: 600 });
    const rows = cascadeTargets({ fy: FY, horizon: 'annual' });
    const order = rows.map((r) => r.level);
    expect(order.indexOf('corporate')).toBeLessThan(order.indexOf('entity'));
    expect(order.indexOf('entity')).toBeLessThan(order.indexOf('division'));
    expect(order.indexOf('division')).toBeLessThan(order.indexOf('department'));
  });
  it('cascadeTargets filter by from_level skips earlier levels', () => {
    const { entityId, divisionId } = seedTree();
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID, revenue_target: 10, cost_target: 5 });
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'entity', scope_id: entityId, revenue_target: 10, cost_target: 5 });
    upsertStrategicTarget({ fy: FY, horizon: 'annual', level: 'division', scope_id: divisionId, revenue_target: 10, cost_target: 5 });
    const rows = cascadeTargets({ fy: FY, from_level: 'division' });
    expect(rows.every((r) => r.level === 'division' || r.level === 'department')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · buildAOP · cascade_balanced (dEq tolerance)', () => {
  it('cascade_balanced=true when children roll up exactly to parent', () => {
    const { entityId, divisionId } = seedTree();
    const parent = upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'entity', scope_id: entityId,
      revenue_target: 1000, cost_target: 600,
    });
    upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'division', scope_id: divisionId,
      revenue_target: 1000, cost_target: 600, parent_target_id: parent.target_id,
    });
    const plan = buildAOP({ fy: FY, horizon: 'annual' });
    expect(plan.cascade_balanced).toBe(true);
    expect(plan.cascade_breaks.length).toBe(0);
  });
  it('cascade_balanced=false when children do not roll up (revenue mismatch)', () => {
    const { entityId, divisionId } = seedTree();
    const parent = upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'entity', scope_id: entityId,
      revenue_target: 1000, cost_target: 600,
    });
    upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'division', scope_id: divisionId,
      revenue_target: 900, cost_target: 600, parent_target_id: parent.target_id,
    });
    const plan = buildAOP({ fy: FY, horizon: 'annual' });
    expect(plan.cascade_balanced).toBe(false);
    expect(plan.cascade_breaks.some((b) => b.reason === 'revenue_mismatch')).toBe(true);
  });
  it('buildAOP carries scope_counts from the real tree', () => {
    seedTree();
    const plan = buildAOP({ fy: FY, horizon: 'annual' });
    expect(plan.scope_counts.entities).toBeGreaterThanOrEqual(1);
    expect(plan.scope_counts.divisions).toBeGreaterThanOrEqual(1);
    expect(plan.scope_counts.departments).toBeGreaterThanOrEqual(1);
  });
  it('buildAOP stores TARGETS only — never invents actuals/variance keys', () => {
    seedTree();
    const plan = buildAOP({ fy: FY, horizon: 'annual' });
    const keys = Object.keys(plan);
    expect(keys).not.toContain('actuals');
    expect(keys).not.toContain('variance');
    expect(keys).not.toContain('forecast');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · audit emission · org_plan_event', () => {
  it('upsertStrategicTarget appends an org_plan_event to erp_audit_trail', () => {
    upsertStrategicTarget({
      fy: FY, horizon: 'annual', level: 'corporate', scope_id: CORPORATE_SCOPE_ID,
      revenue_target: 1, cost_target: 0, entity_code: 'AUDIT-ENT',
    });
    const raw = localStorage.getItem('erp_audit_trail_AUDIT-ENT');
    expect(raw).toBeTruthy();
    const entries = JSON.parse(raw as string) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'org_plan_event')).toBe(true);
  });
  it('buildAOP also emits an org_plan_event audit row', () => {
    seedTree();
    buildAOP({ fy: FY, horizon: 'annual', entity_code: 'BUILD-ENT' });
    const raw = localStorage.getItem('erp_audit_trail_BUILD-ENT');
    const entries = JSON.parse(raw as string) as Array<{ entity_type: string }>;
    expect(entries.some((e) => e.entity_type === 'org_plan_event')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · NEW card registered (additive · DP-P7-2)', () => {
  it("CardId union includes 'fpa-planning'", () => {
    expect(cardTypesSrc).toMatch(/['"]fpa-planning['"]/);
  });
  it("ROLE_DEFAULT_CARDS.finance includes 'fpa-planning'", () => {
    expect(ROLE_DEFAULT_CARDS.finance).toContain('fpa-planning');
  });
  it("ROLE_DEFAULT_CARDS.hr includes 'fpa-planning'", () => {
    expect(ROLE_DEFAULT_CARDS.hr).toContain('fpa-planning');
  });
  it("applications.ts registers the FP&A card metadata entry", () => {
    expect(appsSrc).toMatch(/id:\s*['"]fpa-planning['"]/);
    expect(appsSrc).toMatch(/route:\s*['"]\/erp\/fpa-planning['"]/);
  });
  it("audit-trail.ts adds the 'org_plan_event' type", () => {
    expect(auditTypesSrc).toMatch(/['"]?org_plan_event['"]?/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · Page #43 wiring (NOT a SIBLID · requiredCards fpa-planning)', () => {
  it('sidebar registers fincore-aop-strategic-plan as type:item with requiredCards fpa-planning', () => {
    expect(sidebarSrc).toMatch(/fincore-aop-strategic-plan/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\[\s*'fpa-planning'\s*\]/);
  });
  it('CC page imports AOPStrategicPlanPage and renders a case for it', () => {
    expect(ccPageSrc).toMatch(/AOPStrategicPlanPage/);
    expect(ccPageSrc).toMatch(/case\s+'fincore-aop-strategic-plan'/);
  });
  it('page reads the engine (no dead UI)', () => {
    expect(pageSrc).toMatch(/buildAOP|upsertStrategicTarget/);
  });
  it('card landing page is wired in App.tsx at /erp/fpa-planning', () => {
    expect(appSrc).toMatch(/FpaPlanningPage/);
    expect(appSrc).toMatch(/path="\/erp\/fpa-planning"/);
  });
  it('landing page renders the FP&A hub copy', () => {
    expect(landingSrc).toMatch(/FP&amp;A|FP&A/);
  });
  it('page #43 is NOT registered as a SIBLID', () => {
    const ids = SIBLINGS.map((s) => s.id);
    expect(ids).not.toContain('fincore-aop-strategic-plan');
    expect(ids).not.toContain('AOPStrategicPlanPage');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · SCOPE WALL — AOP only', () => {
  const banned = [
    'planWorkforce', 'workforcePlan', 'computeWorkforce',
    'planOKR', 'okrCascade', 'computeOrgCost',
    'computeBudget', 'computeForecast', 'computeScenario',
    'simulateScenario', 'computeVariance',
  ];
  for (const fn of banned) {
    it(`engine does NOT export ${fn}`, () => {
      expect((orgPlanningEngine as Record<string, unknown>)[fn]).toBeUndefined();
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · sibling-register · 184 → 185 (time-robust)', () => {
  it('org-planning-engine appears exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'org-planning-engine');
    expect(matches.length).toBe(1);
  });
  it('comply360-tier2-extensions-engine still appears exactly once (FR-CT)', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
  it('getSiblingCount() >= 185 (FLOOR · not exact)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(185);
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · sprint-history · S115 backfill + S116 appended (time-robust)', () => {
  const s115 = SPRINTS.find((s) => s.sprintNumber === 115);
  const s116 = SPRINTS.find((s) => s.sprintNumber === 116);
  const s117 = SPRINTS.find((s) => s.sprintNumber === 117);
  it('S115 headSha backfilled to 1c67f6c5…', () => {
    expect(s115?.headSha).toBe('1c67f6c50f6c58a1da69819b7fe94f6ac4019fc3');
  });
  it('S116 entry exists', () => {
    expect(s116).toBeTruthy();
  });
  it('S116 newSiblings lists org-planning-engine', () => {
    expect(s116?.newSiblings).toContain('org-planning-engine');
  });
  it('S116 headSha is TBD_AT_BANK or a real SHA-ish string (time-robust)', () => {
    const sha = s116?.headSha ?? '';
    expect(typeof sha).toBe('string');
    expect(sha === 'TBD_AT_BANK' || /^[0-9a-f]{7,40}$/i.test(sha)).toBe(true);
  });
  it('S116 predecessorSha is 1c67f6c5…', () => {
    expect(s116?.predecessorSha).toBe('1c67f6c50f6c58a1da69819b7fe94f6ac4019fc3');
  });
  it('S116 grade starts with A', () => {
    expect(s116?.grade?.startsWith('A')).toBe(true);
  });
  it('if a future S117 entry happens to exist, its code is the expected one (if-present-then-valid · NO absence assertion)', () => {
    if (s117) expect(typeof s117.code).toBe('string');
  });
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 116 · constants + horizon sanity', () => {
  it('CASCADE_LEVELS is exactly 4 levels in cascade order', () => {
    expect(CASCADE_LEVELS).toEqual(['corporate', 'entity', 'division', 'department']);
  });
  it('PLAN_HORIZONS includes annual + three_year', () => {
    expect(PLAN_HORIZONS).toContain('annual');
    expect(PLAN_HORIZONS).toContain('three_year');
  });
});
