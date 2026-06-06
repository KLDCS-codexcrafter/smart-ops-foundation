/**
 * @file        src/test/sprint-118/okr-kpi.test.ts
 * @sprint      Sprint 118 · T-Phase-7.D.0.3 · Arc D.0 · OKR/KPI + Org-Cost
 * @posture     LEAN-BEHAVIORAL (Phase 7 standard · §N FLOOR ≥20 discrete it()).
 *              Behavioral only — toBeGreaterThanOrEqual on counts, NO existsSync-future
 *              tombstones, NO "no S119 entry" absence checks. Scope-wall via toBeUndefined
 *              on the engine's own surface (time-robust).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  upsertObjective,
  listObjectives,
  upsertKeyResult,
  listKeyResults,
  allocateOrgCost,
  listOrgCostAllocations,
  defaultSharesFromOwnership,
  isValidScope,
  asCascadeLevel,
  OKR_LEVELS,
  OKR_CORPORATE_SCOPE_ID,
  KR_PROGRESS_MIN,
  KR_PROGRESS_MAX,
  READS_FROM,
  __resetOKRForTests,
} from '@/lib/okr-kpi-engine';
import * as okrEngine from '@/lib/okr-kpi-engine';
import {
  upsertStrategicTarget,
  __resetStrategicTargetsForTests,
} from '@/lib/org-planning-engine';
import { upsertGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { SIBLINGS, getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import { loadEntities } from '@/data/mock-entities';

const ROOT = process.cwd();
const ENGINE_PATH = join(ROOT, 'src/lib/okr-kpi-engine.ts');
const PAGE_PATH = join(ROOT, 'src/features/okr-framework/OKRFrameworkPage.tsx');
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

function seedGroup() {
  const entities = loadEntities();
  if (entities.length >= 2) {
    upsertGroupStructure({
      entity_id: entities[0].id,
      parent_entity_id: null,
      relationship: 'parent',
      ownership_pct: 100,
      consolidation_method: 'full',
      effective_from: '2026-04-01',
    });
    upsertGroupStructure({
      entity_id: entities[1].id,
      parent_entity_id: entities[0].id,
      relationship: 'subsidiary',
      ownership_pct: 60,
      consolidation_method: 'full',
      effective_from: '2026-04-01',
    });
  }
}

beforeEach(() => {
  localStorage.clear();
  __resetOKRForTests();
  __resetStrategicTargetsForTests();
  seedTree();
  seedGroup();
});

// ────────────────────────────────────────────────────────────────────────────
describe('Sprint 118 · Engine surface · headers + READS_FROM', () => {
  it('engine file declares @pillar D.0', () => {
    expect(engineSrc).toMatch(/@pillar\s+D\.0/);
  });
  it('engine file declares @fr-44 reuse', () => {
    expect(engineSrc).toMatch(/@fr-44/);
  });
  it('engine file declares @scope-wall', () => {
    expect(engineSrc).toMatch(/@scope-wall/);
  });
  it('engine file declares @audit okr_cascade_event', () => {
    expect(engineSrc).toMatch(/okr_cascade_event/);
  });
  it('READS_FROM names org-structure + org-planning + group-structure + internal-pricing', () => {
    expect(READS_FROM.engines).toContain('org-structure');
    expect(READS_FROM.engines).toContain('org-planning-engine');
    expect(READS_FROM.engines).toContain('intercompany-group-structure-engine');
    expect(READS_FROM.engines).toContain('internal-pricing-engine');
  });
  it('OKR_LEVELS contains corporate/division/department only', () => {
    expect([...OKR_LEVELS]).toEqual(['corporate', 'division', 'department']);
  });
  it('OKR_CORPORATE_SCOPE_ID is the GROUP apex sentinel', () => {
    expect(OKR_CORPORATE_SCOPE_ID).toBe('GROUP');
  });
  it('KR progress bounds are 0..100', () => {
    expect(KR_PROGRESS_MIN).toBe(0);
    expect(KR_PROGRESS_MAX).toBe(100);
  });
  it('asCascadeLevel returns identity for OKR levels', () => {
    expect(asCascadeLevel('division')).toBe('division');
    expect(asCascadeLevel('department')).toBe('department');
    expect(asCascadeLevel('corporate')).toBe('corporate');
  });
});

describe('Sprint 118 · Scope validation', () => {
  it('rejects orphan division scope', () => {
    expect(isValidScope('division', 'DIV-9999')).toBe(false);
  });
  it('accepts a seeded division scope', () => {
    expect(isValidScope('division', 'DIV-0001')).toBe(true);
  });
  it('accepts a seeded department scope', () => {
    expect(isValidScope('department', 'DEPT-0001')).toBe(true);
  });
  it('accepts corporate scope only with GROUP sentinel', () => {
    expect(isValidScope('corporate', 'GROUP')).toBe(true);
    expect(isValidScope('corporate', 'NOT-GROUP')).toBe(false);
  });
});

describe('Sprint 118 · Objective upsert + cascade linkage', () => {
  it('throws on orphan scope_id', () => {
    expect(() =>
      upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-X', title: 'X' }),
    ).toThrow(/orphan/);
  });
  it('requires title', () => {
    expect(() =>
      upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: '' }),
    ).toThrow(/title/);
  });
  it('creates an objective when scope is valid', () => {
    const o = upsertObjective({
      fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'Grow ARR 20%',
    });
    expect(o.objective_id).toMatch(/OBJ::FY26-27::division::DIV-0001/);
    expect(listObjectives({ fy: 'FY26-27' }).length).toBeGreaterThanOrEqual(1);
  });
  it('is idempotent by composite key (no duplicates)', () => {
    upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'A' });
    upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'A' });
    expect(listObjectives({ fy: 'FY26-27' }).length).toBe(1);
  });
  it('rejects linked_target_id that does not exist in org-planning', () => {
    expect(() =>
      upsertObjective({
        fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'A',
        linked_target_id: 'NOPE',
      }),
    ).toThrow(/listStrategicTargets/);
  });
  it('accepts a linked_target_id that exists in org-planning (S116 reuse)', () => {
    const t = upsertStrategicTarget({
      fy: 'FY26-27', horizon: 'annual', level: 'division', scope_id: 'DIV-0001',
      revenue_target: 1000, cost_target: 600,
    });
    const o = upsertObjective({
      fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'Linked',
      linked_target_id: t.target_id,
    });
    expect(o.linked_target_id).toBe(t.target_id);
  });
  it('supports parent_objective_id cascade', () => {
    const parent = upsertObjective({
      fy: 'FY26-27', level: 'corporate', scope_id: 'GROUP', title: 'Top',
    });
    const child = upsertObjective({
      fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'Child',
      parent_objective_id: parent.objective_id,
    });
    expect(child.parent_objective_id).toBe(parent.objective_id);
  });
  it('rejects unknown parent_objective_id', () => {
    expect(() =>
      upsertObjective({
        fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'Z',
        parent_objective_id: 'OBJ::not::a::real::one',
      }),
    ).toThrow(/parent/);
  });
});

describe('Sprint 118 · Key-Result clamp + linkage', () => {
  it('clamps progress > 100 to 100', () => {
    const o = upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'O' });
    const k = upsertKeyResult({ objective_id: o.objective_id, title: 'KR1', progress_pct: 150 });
    expect(k.progress_pct).toBe(100);
  });
  it('clamps progress < 0 to 0', () => {
    const o = upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'O' });
    const k = upsertKeyResult({ objective_id: o.objective_id, title: 'KR2', progress_pct: -10 });
    expect(k.progress_pct).toBe(0);
  });
  it('keeps in-range progress as-is', () => {
    const o = upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'O' });
    const k = upsertKeyResult({ objective_id: o.objective_id, title: 'KR3', progress_pct: 42 });
    expect(k.progress_pct).toBe(42);
  });
  it('rejects KR for an unknown objective', () => {
    expect(() =>
      upsertKeyResult({ objective_id: 'OBJ::none', title: 'x', progress_pct: 0 }),
    ).toThrow(/objective/);
  });
  it('upsert is idempotent on (objective_id, title)', () => {
    const o = upsertObjective({ fy: 'FY26-27', level: 'division', scope_id: 'DIV-0001', title: 'O' });
    upsertKeyResult({ objective_id: o.objective_id, title: 'K', progress_pct: 10 });
    upsertKeyResult({ objective_id: o.objective_id, title: 'K', progress_pct: 90 });
    const krs = listKeyResults({ objective_id: o.objective_id });
    expect(krs.length).toBe(1);
    expect(krs[0].progress_pct).toBe(90);
  });
});

describe('Sprint 118 · Org-cost allocation (shares sum to 100 · dEq)', () => {
  it('rejects shares that do not sum to 100', () => {
    const entities = loadEntities();
    expect(() =>
      allocateOrgCost({
        fy: 'FY26-27', cost_pool: 'pool', total_amount: 1000,
        shares: [
          { entity_id: entities[0].id, share_pct: 30 },
          { entity_id: entities[1].id, share_pct: 30 },
        ],
      }),
    ).toThrow(/100/);
  });
  it('rejects orphan entity_id in shares', () => {
    expect(() =>
      allocateOrgCost({
        fy: 'FY26-27', cost_pool: 'pool', total_amount: 1000,
        shares: [{ entity_id: 'NOT-AN-ENTITY', share_pct: 100 }],
      }),
    ).toThrow(/orphan/);
  });
  it('accepts valid shares summing to 100 and stores per-entity amounts', () => {
    const entities = loadEntities();
    const a = allocateOrgCost({
      fy: 'FY26-27', cost_pool: 'corp-oh', total_amount: 1000,
      shares: [
        { entity_id: entities[0].id, share_pct: 60 },
        { entity_id: entities[1].id, share_pct: 40 },
      ],
    });
    expect(a.allocations.length).toBe(2);
    expect(a.allocations[0].amount + a.allocations[1].amount).toBeCloseTo(1000, 2);
  });
  it('applies overhead_allocation_pct in the internal-pricing pattern', () => {
    const entities = loadEntities();
    const a = allocateOrgCost({
      fy: 'FY26-27', cost_pool: 'oh', total_amount: 1000, overhead_allocation_pct: 10,
      shares: [{ entity_id: entities[0].id, share_pct: 100 }],
    });
    expect(a.allocations[0].amount).toBeCloseTo(1100, 2);
  });
  it('defaultSharesFromOwnership returns rows normalised to 100', () => {
    const shares = defaultSharesFromOwnership();
    expect(shares.length).toBeGreaterThanOrEqual(1);
    const sum = shares.reduce((acc, s) => acc + s.share_pct, 0);
    expect(sum).toBeCloseTo(100, 1);
  });
  it('listOrgCostAllocations filters by FY', () => {
    const entities = loadEntities();
    allocateOrgCost({
      fy: 'FY26-27', cost_pool: 'p1', total_amount: 100,
      shares: [{ entity_id: entities[0].id, share_pct: 100 }],
    });
    expect(listOrgCostAllocations({ fy: 'FY26-27' }).length).toBeGreaterThanOrEqual(1);
    expect(listOrgCostAllocations({ fy: 'FY99-99' }).length).toBe(0);
  });
});

describe('Sprint 118 · Scope wall (DP-D0-7) · engine surface', () => {
  it('does NOT export org-design symbols', () => {
    expect((okrEngine as unknown as Record<string, unknown>).upsertOrgDesign).toBeUndefined();
    expect((okrEngine as unknown as Record<string, unknown>).buildSuccessionPlan).toBeUndefined();
  });
  it('does NOT export budget/forecast/scenario symbols', () => {
    expect((okrEngine as unknown as Record<string, unknown>).buildBudget).toBeUndefined();
    expect((okrEngine as unknown as Record<string, unknown>).buildForecast).toBeUndefined();
    expect((okrEngine as unknown as Record<string, unknown>).runScenario).toBeUndefined();
  });
});

describe('Sprint 118 · Wiring · page + sidebar + CC + audit', () => {
  it('OKRFrameworkPage imports from the OKR engine', () => {
    expect(pageSrc).toMatch(/from '@\/lib\/okr-kpi-engine'/);
  });
  it('Sidebar registers fpa-planning-okr-framework with the fpa-planning card', () => {
    expect(sidebarSrc).toMatch(/fpa-planning-okr-framework/);
    expect(sidebarSrc).toMatch(/requiredCards:\s*\['fpa-planning'\]/);
  });
  it('CommandCenterPage routes the new module', () => {
    expect(ccPageSrc).toMatch(/fpa-planning-okr-framework/);
    expect(ccPageSrc).toMatch(/OKRFrameworkPage/);
  });
  it('audit-trail.ts declares the new okr_cascade_event type', () => {
    expect(auditSrc).toMatch(/'okr_cascade_event'/);
  });
});

describe('Sprint 118 · Registry discipline', () => {
  it('sibling-register contains exactly one okr-kpi-engine entry', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'okr-kpi-engine');
    expect(matches.length).toBe(1);
  });
  it('sibling count is at least 187 after this sprint', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(187);
  });
  it('sprint-history has an S118 entry with TBD_AT_BANK or a real SHA', () => {
    const s118 = SPRINTS.find((s) => s.sprintNumber === 118);
    expect(s118).toBeDefined();
    expect(s118?.headSha === 'TBD_AT_BANK' || /^[0-9a-f]{8}/.test(s118?.headSha ?? '')).toBe(true);
  });
  it('sprint-history has S117 backfilled (not TBD_AT_BANK)', () => {
    const s117 = SPRINTS.find((s) => s.sprintNumber === 117);
    expect(s117).toBeDefined();
    expect(s117?.headSha).not.toBe('TBD_AT_BANK');
  });
  it('predecessor of S118 is the S117 head SHA', () => {
    const s118 = SPRINTS.find((s) => s.sprintNumber === 118);
    const s117 = SPRINTS.find((s) => s.sprintNumber === 117);
    expect(s118?.predecessorSha).toBe(s117?.headSha);
  });
});
