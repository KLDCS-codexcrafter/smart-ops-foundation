/**
 * @file        src/lib/org-planning-engine.ts
 * @sibling     NEW @ Sprint 116 · 🎬 Phase 7 opener · Arc D.0 Organisation Planning
 * @pillar      D.0 · Organisation Planning. Annual Operating Plan (AOP) + 3-year strategic plan with
 *              revenue / cost targets cascaded corporate → entity → division → department.
 * @fr-44       REUSES org-structure (Division/Department · `divisionsKey` / `departmentsKey`) +
 *              intercompany-group-structure-engine (`listGroupStructure` for entities). Stores
 *              TARGETS only — does NOT compute from actuals (that lives in D.1 budget/forecast).
 *              Reimplements NEITHER org-structure NOR group-structure. Both stay 0-DIFF.
 * @reads-from  org-structure (DIVISIONS_KEY · DEPARTMENTS_KEY · Division · Department) ·
 *              intercompany-group-structure-engine.listGroupStructure (entities · ownership tree)
 * @scope-wall  AOP / strategic targets only. NO workforce planning (S117) · NO OKR / org-cost
 *              (S118) · NO budget / forecast / scenario (D.1). The scope-wall test asserts NONE of
 *              those exports exist on this engine.
 * @audit       Emits 'org_plan_event' (module 'mca-roc') on upsertStrategicTarget / buildAOP.
 * @sprint      T-Phase-7.D.0.1 · Sprint 116 · Block 3
 * [JWT] Phase 8: GET/POST /api/org-planning/strategic-targets · POST /api/org-planning/aop/{fy}
 */
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import {
  listGroupStructure,
  type GroupStructureNode,
} from '@/lib/intercompany-group-structure-engine';
import { dAdd, dSub, dEq, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'org-structure',                          // Division / Department types + storage keys
    'intercompany-group-structure-engine',    // listGroupStructure for the entity tree
    'decimal-helpers',                        // dAdd / dSub / dEq / round2
    'audit-trail-engine',                     // logAudit for org_plan_event
  ],
  storage_keys: [
    DIVISIONS_KEY,
    DEPARTMENTS_KEY,
    'erp_strategic_targets',
    'erp_group_structure',                    // owned by intercompany-group-structure-engine
  ],
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

export type PlanHorizon = 'annual' | 'three_year';
export type CascadeLevel = 'corporate' | 'entity' | 'division' | 'department';

/** Corporate scope sentinel — there is exactly one "GROUP" node at the apex. */
export const CORPORATE_SCOPE_ID = 'GROUP' as const;

/** Allowed levels (immutable). */
export const CASCADE_LEVELS: readonly CascadeLevel[] = [
  'corporate',
  'entity',
  'division',
  'department',
] as const;

/** Allowed horizons (immutable). */
export const PLAN_HORIZONS: readonly PlanHorizon[] = ['annual', 'three_year'] as const;

/** Default rollup tolerance (decimal-helpers `dEq` default precision = 2 dp). */
export const CASCADE_TOLERANCE_PLACES = 2 as const;

export interface StrategicTarget {
  target_id: string;
  fy: string;                       // e.g. 'FY26-27'
  horizon: PlanHorizon;
  level: CascadeLevel;
  /** entity_id / division_id / department_id, or CORPORATE_SCOPE_ID at the apex. */
  scope_id: string;
  revenue_target: number;           // money · decimal-safe (rounded via round2)
  cost_target: number;              // money · decimal-safe
  /** Cascade linkage — null only at corporate. */
  parent_target_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CascadeBreak {
  parent_target_id: string;
  parent_level: CascadeLevel;
  parent_revenue: number;
  children_revenue_sum: number;
  parent_cost: number;
  children_cost_sum: number;
  reason: 'revenue_mismatch' | 'cost_mismatch';
}

export interface AOPlan {
  plan_id: string;
  fy: string;
  horizon: PlanHorizon;
  targets: StrategicTarget[];
  cascade_balanced: boolean;
  cascade_breaks: CascadeBreak[];
  built_at: string;
  /** Counts of validated scopes read from org-structure + group-structure (FR-91 transparency). */
  scope_counts: {
    entities: number;
    divisions: number;
    departments: number;
  };
}

// ─── Storage (side-store · NEVER touches org-structure / group-structure stores) ─

const STRATEGIC_TARGETS_KEY = 'erp_strategic_targets';

function loadAllTargets(): StrategicTarget[] {
  try {
    // [JWT] GET /api/org-planning/strategic-targets
    const raw = localStorage.getItem(STRATEGIC_TARGETS_KEY);
    return raw ? (JSON.parse(raw) as StrategicTarget[]) : [];
  } catch {
    return [];
  }
}

function saveAllTargets(targets: StrategicTarget[]): void {
  try {
    // [JWT] POST /api/org-planning/strategic-targets
    localStorage.setItem(STRATEGIC_TARGETS_KEY, JSON.stringify(targets));
  } catch {
    /* swallow quota / serialization errors */
  }
}

// ─── Read-only views of the real org tree (FR-44 · reuse · no reimplementation) ──

/** Read the canonical Division list straight from the org-structure store (0-DIFF). */
export function readDivisions(): Division[] {
  try {
    const raw = localStorage.getItem(DIVISIONS_KEY);
    return raw ? (JSON.parse(raw) as Division[]) : [];
  } catch {
    return [];
  }
}

/** Read the canonical Department list straight from the org-structure store (0-DIFF). */
export function readDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch {
    return [];
  }
}

/** Read the canonical entity nodes from intercompany-group-structure-engine (0-DIFF). */
export function readEntityNodes(): GroupStructureNode[] {
  return listGroupStructure();
}

// ─── Scope validation (rejects orphan scope_id) ──────────────────────────────

export function isValidScope(level: CascadeLevel, scope_id: string): boolean {
  if (level === 'corporate') return scope_id === CORPORATE_SCOPE_ID;
  if (level === 'entity') {
    return readEntityNodes().some((n) => n.entity_id === scope_id);
  }
  if (level === 'division') {
    return readDivisions().some((d) => d.id === scope_id);
  }
  if (level === 'department') {
    return readDepartments().some((d) => d.id === scope_id);
  }
  return false;
}

// ─── Upsert (idempotent) ─────────────────────────────────────────────────────

function makeTargetId(t: Pick<StrategicTarget, 'fy' | 'horizon' | 'level' | 'scope_id'>): string {
  return `${t.fy}::${t.horizon}::${t.level}::${t.scope_id}`;
}

export interface UpsertInput {
  fy: string;
  horizon: PlanHorizon;
  level: CascadeLevel;
  scope_id: string;
  revenue_target: number;
  cost_target: number;
  parent_target_id?: string | null;
  entity_code?: string;             // for audit-trail attribution
}

export function upsertStrategicTarget(input: UpsertInput): StrategicTarget {
  if (!input.fy || typeof input.fy !== 'string') {
    throw new Error('org-planning-engine: fy is required');
  }
  if (!PLAN_HORIZONS.includes(input.horizon)) {
    throw new Error(`org-planning-engine: invalid horizon '${input.horizon}'`);
  }
  if (!CASCADE_LEVELS.includes(input.level)) {
    throw new Error(`org-planning-engine: invalid level '${input.level}'`);
  }
  if (!isValidScope(input.level, input.scope_id)) {
    throw new Error(
      `org-planning-engine: orphan scope_id '${input.scope_id}' for level '${input.level}' ` +
        '— not present in org-structure / group-structure tree',
    );
  }
  if (typeof input.revenue_target !== 'number' || Number.isNaN(input.revenue_target)) {
    throw new Error('org-planning-engine: revenue_target must be a number');
  }
  if (typeof input.cost_target !== 'number' || Number.isNaN(input.cost_target)) {
    throw new Error('org-planning-engine: cost_target must be a number');
  }

  const all = loadAllTargets();
  const target_id = makeTargetId(input);
  const now = new Date().toISOString();
  const existing = all.find((t) => t.target_id === target_id) ?? null;

  const next: StrategicTarget = {
    target_id,
    fy: input.fy,
    horizon: input.horizon,
    level: input.level,
    scope_id: input.scope_id,
    revenue_target: round2(input.revenue_target),
    cost_target: round2(input.cost_target),
    parent_target_id:
      input.parent_target_id === undefined
        ? existing?.parent_target_id ?? null
        : input.parent_target_id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const filtered = all.filter((t) => t.target_id !== target_id);
  filtered.push(next);
  saveAllTargets(filtered);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'org_plan_event',
      recordId: target_id,
      recordLabel:
        `AOP · ${input.fy} · ${input.horizon} · ${input.level} · ${input.scope_id} ` +
        `· rev=${next.revenue_target} cost=${next.cost_target}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'org-planning-engine',
    });
  } catch {
    /* audit append is best-effort; storage errors must not break the write */
  }

  return next;
}

// ─── Listing / cascade ───────────────────────────────────────────────────────

export function listStrategicTargets(filter?: Partial<StrategicTarget>): StrategicTarget[] {
  const all = loadAllTargets();
  if (!filter) return all;
  return all.filter((t) => {
    const entries = Object.entries(filter) as [keyof StrategicTarget, unknown][];
    return entries.every(([k, v]) => v === undefined || t[k] === v);
  });
}

export interface CascadeInput {
  fy: string;
  horizon?: PlanHorizon;
  from_level?: CascadeLevel;
}

/**
 * Return targets matching the cascade view — defaults to the full cascade for the FY.
 * Order: corporate → entity → division → department (mirrors the org tree).
 */
export function cascadeTargets(input: CascadeInput): StrategicTarget[] {
  const targets = loadAllTargets().filter((t) => t.fy === input.fy);
  const horizonFiltered = input.horizon
    ? targets.filter((t) => t.horizon === input.horizon)
    : targets;
  const fromIdx = input.from_level ? CASCADE_LEVELS.indexOf(input.from_level) : 0;
  const allowed = new Set(CASCADE_LEVELS.slice(Math.max(0, fromIdx)));
  return horizonFiltered
    .filter((t) => allowed.has(t.level))
    .sort((a, b) => {
      const la = CASCADE_LEVELS.indexOf(a.level);
      const lb = CASCADE_LEVELS.indexOf(b.level);
      if (la !== lb) return la - lb;
      return a.scope_id.localeCompare(b.scope_id);
    });
}

// ─── buildAOP — cascade balance check (decimal-helpers · dEq tolerance) ──────

function computeBreaks(targets: StrategicTarget[]): CascadeBreak[] {
  const byParent = new Map<string, StrategicTarget[]>();
  for (const t of targets) {
    if (!t.parent_target_id) continue;
    const arr = byParent.get(t.parent_target_id) ?? [];
    arr.push(t);
    byParent.set(t.parent_target_id, arr);
  }
  const breaks: CascadeBreak[] = [];
  for (const parent of targets) {
    const kids = byParent.get(parent.target_id);
    if (!kids || kids.length === 0) continue;
    const revSum = kids.reduce((acc, k) => dAdd(acc, k.revenue_target), 0);
    const costSum = kids.reduce((acc, k) => dAdd(acc, k.cost_target), 0);
    if (!dEq(parent.revenue_target, revSum, CASCADE_TOLERANCE_PLACES)) {
      breaks.push({
        parent_target_id: parent.target_id,
        parent_level: parent.level,
        parent_revenue: parent.revenue_target,
        children_revenue_sum: round2(revSum),
        parent_cost: parent.cost_target,
        children_cost_sum: round2(costSum),
        reason: 'revenue_mismatch',
      });
    }
    if (!dEq(parent.cost_target, costSum, CASCADE_TOLERANCE_PLACES)) {
      breaks.push({
        parent_target_id: parent.target_id,
        parent_level: parent.level,
        parent_revenue: parent.revenue_target,
        children_revenue_sum: round2(revSum),
        parent_cost: parent.cost_target,
        children_cost_sum: round2(costSum),
        reason: 'cost_mismatch',
      });
    }
  }
  return breaks;
}

export interface BuildAOPInput {
  fy: string;
  horizon: PlanHorizon;
  entity_code?: string;
}

export function buildAOP(input: BuildAOPInput): AOPlan {
  if (!input.fy) throw new Error('org-planning-engine: fy is required for buildAOP');
  if (!PLAN_HORIZONS.includes(input.horizon)) {
    throw new Error(`org-planning-engine: invalid horizon '${input.horizon}'`);
  }
  // FR-44 transparency: read the real scope counts at build time
  const scope_counts = {
    entities: readEntityNodes().length,
    divisions: readDivisions().length,
    departments: readDepartments().length,
  };

  const targets = cascadeTargets({ fy: input.fy, horizon: input.horizon });
  const breaks = computeBreaks(targets);
  const balanced = breaks.length === 0;
  const built_at = new Date().toISOString();
  const plan: AOPlan = {
    plan_id: `aop::${input.fy}::${input.horizon}`,
    fy: input.fy,
    horizon: input.horizon,
    targets,
    cascade_balanced: balanced,
    cascade_breaks: breaks,
    built_at,
    scope_counts,
  };

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'create',
      entityType: 'org_plan_event',
      recordId: plan.plan_id,
      recordLabel:
        `AOP build · ${input.fy} · ${input.horizon} · ${targets.length} targets · ` +
        `balanced=${balanced} · breaks=${breaks.length}`,
      beforeState: null,
      afterState: {
        fy: plan.fy,
        horizon: plan.horizon,
        target_count: targets.length,
        cascade_balanced: balanced,
        break_count: breaks.length,
        scope_counts,
      },
      sourceModule: 'org-planning-engine',
    });
  } catch {
    /* audit append best-effort */
  }

  return plan;
}

// ─── Helpers exposed for the page (READ-ONLY · no mutation) ──────────────────

/** Net target = revenue − cost · decimal-safe. Useful for the page summary card. */
export function netTarget(t: Pick<StrategicTarget, 'revenue_target' | 'cost_target'>): number {
  return round2(dSub(t.revenue_target, t.cost_target));
}

/** Clear all stored targets (test-only helper — guarded so prod UI never calls it). */
export function __resetStrategicTargetsForTests(): void {
  try {
    localStorage.removeItem(STRATEGIC_TARGETS_KEY);
  } catch {
    /* ignore */
  }
}
