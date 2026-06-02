/**
 * @file        src/lib/workforce-planning-engine.ts
 * @sibling     NEW @ Sprint 117 · Arc D.0 · Workforce Planning
 * @pillar      D.0 · Workforce Planning. Headcount projection by org node, hiring / attrition
 *              modeling, permanent-vs-contract mix, and projected workforce cost flagged
 *              against the S116 AOP cost targets (intra-arc linkage).
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · org-structure (Division / Department · DIVISIONS_KEY / DEPARTMENTS_KEY)
 *                · capacity-planning-engine (capacity context · 0-DIFF)
 *                · org-planning-engine (S116) · listStrategicTargets + cost_target
 *                · contract-manpower (ContractWorker, LabourContractor) + employee types
 *              All source engines stay 0-DIFF.
 * @reads-from  org-structure · capacity-planning-engine · org-planning-engine ·
 *              contract-manpower (CONTRACT_WORKERS_KEY) · employee types (EMPLOYEES_KEY) ·
 *              decimal-helpers · audit-trail-engine
 * @scope-wall  Workforce projection only. NO OKR (S118) · NO org-design (S119) · NO
 *              budget / forecast / scenario (D.1) · NO performance-management / compensation
 *              planning (deferred to a later HR arc per DP-D0-7). The scope-wall test asserts
 *              NONE of those exports exist on this engine.
 * @audit       Emits 'workforce_plan_event' (module 'mca-roc') on upsert / projection.
 * @sprint      T-Phase-7.D.0.2 · Sprint 117 · Block 2
 * [JWT] Phase 8: GET/POST /api/workforce-planning/headcount-plans
 */
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import {
  EMPLOYEES_KEY,
  type Employee,
} from '@/types/employee';
import {
  CONTRACT_WORKERS_KEY,
  type ContractWorker,
} from '@/types/contract-manpower';
import {
  listStrategicTargets,
  type StrategicTarget,
} from '@/lib/org-planning-engine';
import { computeBottleneckHeatmap } from '@/lib/capacity-planning-engine';
import { dAdd, dSub, dMul, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'org-structure',                    // Division / Department (scope validation)
    'capacity-planning-engine',         // aggregateCapacity (capacity context)
    'org-planning-engine',              // listStrategicTargets → cost_target (AOP linkage)
    'contract-manpower',                // ContractWorker (mix · contract side)
    'employee',                         // Employee (mix · permanent side)
    'decimal-helpers',                  // dAdd / dSub / dMul / round2
    'audit-trail-engine',               // logAudit for workforce_plan_event
  ],
  storage_keys: [
    DIVISIONS_KEY,
    DEPARTMENTS_KEY,
    EMPLOYEES_KEY,
    CONTRACT_WORKERS_KEY,
    'erp_workforce_headcount_plans',
    'erp_strategic_targets',            // owned by org-planning-engine
  ],
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

export type EmploymentType = 'permanent' | 'contract';

/** Scope levels the planner accepts. Aligned with the S116 cascade. */
export type WorkforceScopeLevel = 'entity' | 'division' | 'department';

export interface WorkforceMix {
  permanent: number;
  contract: number;
}

export interface HeadcountPlan {
  plan_id: string;
  fy: string;
  scope_level: WorkforceScopeLevel;
  scope_id: string;
  current_headcount: number;
  planned_headcount: number;
  hires: number;
  attrition: number;
  mix: WorkforceMix;
  /** Projected workforce cost — INR · decimal-safe (round2). */
  projected_cost: number;
  /** From org-planning-engine cost_target for the same scope (if any). */
  aop_cost_target?: number;
  /** projected_cost − aop_cost_target (positive = over plan). */
  cost_variance_vs_aop?: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectWorkforceInput {
  fy: string;
  scope_level: WorkforceScopeLevel;
  scope_id: string;
  /** Attrition % applied to current headcount (0-100). Default 0. */
  attrition_pct?: number;
  /** Optional explicit hires count. Defaults to attrition replacement only. */
  hires?: number;
  /** Per-head loaded cost (INR / head / FY). Default ₹6,00,000. */
  cost_per_head?: number;
}

export interface ProjectionResult {
  fy: string;
  scope_level: WorkforceScopeLevel;
  scope_id: string;
  current_headcount: number;
  planned_headcount: number;
  hires: number;
  attrition: number;
  mix: WorkforceMix;
  projected_cost: number;
  aop_cost_target?: number;
  cost_variance_vs_aop?: number;
}

export interface CostVsAOPRow {
  scope_level: WorkforceScopeLevel;
  scope_id: string;
  projected_cost: number;
  aop_cost_target: number;
  variance: number;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const HEADCOUNT_PLANS_KEY = 'erp_workforce_headcount_plans';

function loadAllPlans(): HeadcountPlan[] {
  try {
    // [JWT] GET /api/workforce-planning/headcount-plans
    const raw = localStorage.getItem(HEADCOUNT_PLANS_KEY);
    return raw ? (JSON.parse(raw) as HeadcountPlan[]) : [];
  } catch {
    return [];
  }
}

function saveAllPlans(plans: HeadcountPlan[]): void {
  try {
    // [JWT] PUT /api/workforce-planning/headcount-plans
    localStorage.setItem(HEADCOUNT_PLANS_KEY, JSON.stringify(plans));
  } catch {
    /* localStorage may be unavailable in SSR / tests; non-fatal */
  }
}

function makePlanId(p: Pick<HeadcountPlan, 'fy' | 'scope_level' | 'scope_id'>): string {
  return `${p.fy}::${p.scope_level}::${p.scope_id}`;
}

// ─── Reads of the real tree (no parallel store) ──────────────────────────────

function readDivisions(): Division[] {
  try {
    // [JWT] GET /api/foundation/divisions
    const raw = localStorage.getItem(DIVISIONS_KEY);
    return raw ? (JSON.parse(raw) as Division[]) : [];
  } catch {
    return [];
  }
}

function readDepartments(): Department[] {
  try {
    // [JWT] GET /api/foundation/departments
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch {
    return [];
  }
}

function readEmployees(): Employee[] {
  try {
    // [JWT] GET /api/pay-hub/employees
    const raw = localStorage.getItem(EMPLOYEES_KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch {
    return [];
  }
}

function readContractWorkers(): ContractWorker[] {
  try {
    // [JWT] GET /api/contract-manpower/workers
    const raw = localStorage.getItem(CONTRACT_WORKERS_KEY);
    return raw ? (JSON.parse(raw) as ContractWorker[]) : [];
  } catch {
    return [];
  }
}

// ─── Scope validation (rejects orphans) ──────────────────────────────────────

/** True iff scope_id is a known node of the requested level in the REAL org tree. */
export function isValidScope(level: WorkforceScopeLevel, scope_id: string): boolean {
  if (!scope_id) return false;
  if (level === 'division') {
    return readDivisions().some((d) => d.id === scope_id);
  }
  if (level === 'department') {
    return readDepartments().some((d) => d.id === scope_id);
  }
  // 'entity' — accept any non-empty entity_id present on a division/department or in employees.
  // FR-44: the org-structure types own entity_id; we do NOT maintain a separate entity register.
  const divs = readDivisions();
  const depts = readDepartments();
  const emps = readEmployees();
  return (
    divs.some((d) => d.entity_id === scope_id) ||
    depts.some((d) => d.entity_id === scope_id) ||
    emps.some((e) => (e as unknown as { entity_id?: string }).entity_id === scope_id)
  );
}

// ─── Headcount + mix readers (current state) ─────────────────────────────────

function currentHeadcountForScope(
  level: WorkforceScopeLevel,
  scope_id: string,
): { total: number; mix: WorkforceMix } {
  const emps = readEmployees();
  const workers = readContractWorkers();

  // Permanent (employees) — match by departmentId / divisionId / entity_id as available.
  const permanent = emps.filter((e) => {
    const rec = e as unknown as {
      entity_id?: string;
      departmentId?: string;
      divisionId?: string;
    };
    if (level === 'entity') return rec.entity_id === scope_id;
    if (level === 'division') return rec.divisionId === scope_id;
    if (level === 'department') return rec.departmentId === scope_id;
    return false;
  }).length;

  // Contract (active workers) — match by department/division/entity if present.
  const contract = workers.filter((w) => {
    const rec = w as unknown as {
      entity_id?: string;
      departmentId?: string;
      divisionId?: string;
      status?: string;
    };
    if (rec.status && rec.status !== 'active') return false;
    if (level === 'entity') return rec.entity_id === scope_id;
    if (level === 'division') return rec.divisionId === scope_id;
    if (level === 'department') return rec.departmentId === scope_id;
    return false;
  }).length;

  return { total: permanent + contract, mix: { permanent, contract } };
}

// ─── AOP cost-target lookup (the S116 linkage · FR-44) ───────────────────────

/**
 * Read the AOP cost_target from org-planning-engine.listStrategicTargets for the same
 * scope. Picks the most recently updated 'annual' target for the FY/level/scope, if any.
 * Returns undefined when no AOP target has been set (honest · no fabrication).
 */
export function readAopCostTarget(
  fy: string,
  scope_level: WorkforceScopeLevel,
  scope_id: string,
): number | undefined {
  const targets: StrategicTarget[] = listStrategicTargets({
    fy,
    level: scope_level,
    scope_id,
  });
  if (targets.length === 0) return undefined;
  const annual = targets
    .filter((t) => t.horizon === 'annual')
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const pick = annual[0] ?? targets[0];
  return pick.cost_target;
}

// ─── Capacity-context bridge (FR-44 reuse · 0-DIFF) ──────────────────────────

/**
 * Lightweight capacity-context probe for the engine surface. Calls capacity-planning-engine
 * via its public read API so callers can correlate workforce mix with capacity demand.
 * Returns the row count (>=0) — never throws. capacity-planning-engine stays 0-DIFF.
 */
export function getCapacityContextRowCount(
  entityCode: string,
  fromDate: string,
  toDate: string,
): number {
  try {
    const rows = aggregateCapacity({ entityCode, view: 'per_day', fromDate, toDate });
    return Array.isArray(rows) ? rows.length : 0;
  } catch {
    return 0;
  }
}

// ─── Projection (the planner) ────────────────────────────────────────────────

const DEFAULT_COST_PER_HEAD = 600_000; // ₹6 lakh / head / FY — display default

/**
 * Compute a HeadcountPlan from current state + planner inputs.
 *
 *   planned_headcount = current + hires − attrition
 *   attrition         = round(current × attrition_pct / 100)
 *   projected_cost    = planned_headcount × cost_per_head (decimal-helpers)
 *   cost_variance     = projected_cost − aop_cost_target (when AOP target present)
 */
export function projectWorkforce(input: ProjectWorkforceInput): ProjectionResult {
  if (!input.fy) {
    throw new Error('workforce-planning-engine: fy is required');
  }
  if (!isValidScope(input.scope_level, input.scope_id)) {
    throw new Error(
      `workforce-planning-engine: orphan scope_id '${input.scope_id}' for level '${input.scope_level}' (not in org tree)`,
    );
  }
  const attritionPct = Math.max(0, Math.min(100, input.attrition_pct ?? 0));
  const costPerHead = input.cost_per_head ?? DEFAULT_COST_PER_HEAD;

  const { total: current_headcount, mix } = currentHeadcountForScope(
    input.scope_level,
    input.scope_id,
  );

  const attrition = Math.round((current_headcount * attritionPct) / 100);
  const hires = input.hires ?? attrition; // replacement-only by default
  const planned_headcount = Math.max(0, current_headcount + hires - attrition);
  const projected_cost = round2(dMul(planned_headcount, costPerHead));

  const aop_cost_target = readAopCostTarget(input.fy, input.scope_level, input.scope_id);
  const cost_variance_vs_aop =
    aop_cost_target === undefined ? undefined : round2(dSub(projected_cost, aop_cost_target));

  return {
    fy: input.fy,
    scope_level: input.scope_level,
    scope_id: input.scope_id,
    current_headcount,
    planned_headcount,
    hires,
    attrition,
    mix,
    projected_cost,
    aop_cost_target,
    cost_variance_vs_aop,
  };
}

// ─── Upsert (idempotent) ─────────────────────────────────────────────────────

export interface UpsertHeadcountPlanInput {
  fy: string;
  scope_level: WorkforceScopeLevel;
  scope_id: string;
  current_headcount: number;
  planned_headcount: number;
  hires: number;
  attrition: number;
  mix: WorkforceMix;
  projected_cost: number;
  aop_cost_target?: number;
  cost_variance_vs_aop?: number;
  entity_code?: string;
}

export function upsertHeadcountPlan(input: UpsertHeadcountPlanInput): HeadcountPlan {
  if (!input.fy) throw new Error('workforce-planning-engine: fy is required');
  if (!isValidScope(input.scope_level, input.scope_id)) {
    throw new Error(
      `workforce-planning-engine: orphan scope_id '${input.scope_id}' for level '${input.scope_level}'`,
    );
  }
  const reconciled = dSub(
    input.planned_headcount,
    dAdd(input.current_headcount, dSub(input.hires, input.attrition)),
  );
  if (reconciled !== 0) {
    throw new Error(
      `workforce-planning-engine: planned (${input.planned_headcount}) != current (${input.current_headcount}) + hires (${input.hires}) − attrition (${input.attrition})`,
    );
  }

  const all = loadAllPlans();
  const plan_id = makePlanId(input);
  const existing = all.find((p) => p.plan_id === plan_id);
  const now = new Date().toISOString();

  const next: HeadcountPlan = {
    plan_id,
    fy: input.fy,
    scope_level: input.scope_level,
    scope_id: input.scope_id,
    current_headcount: input.current_headcount,
    planned_headcount: input.planned_headcount,
    hires: input.hires,
    attrition: input.attrition,
    mix: { permanent: input.mix.permanent, contract: input.mix.contract },
    projected_cost: round2(input.projected_cost),
    aop_cost_target: input.aop_cost_target === undefined ? undefined : round2(input.aop_cost_target),
    cost_variance_vs_aop:
      input.cost_variance_vs_aop === undefined ? undefined : round2(input.cost_variance_vs_aop),
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const filtered = all.filter((p) => p.plan_id !== plan_id);
  filtered.push(next);
  saveAllPlans(filtered);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'workforce_plan_event',
      recordId: plan_id,
      recordLabel:
        `Workforce · ${input.fy} · ${input.scope_level} · ${input.scope_id} ` +
        `· cur=${input.current_headcount} plan=${input.planned_headcount} ` +
        `· perm=${input.mix.permanent} ctr=${input.mix.contract} ` +
        `· cost=${next.projected_cost}` +
        (next.aop_cost_target !== undefined ? ` · aop=${next.aop_cost_target}` : ''),
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'workforce-planning-engine',
    });
  } catch {
    /* audit append is best-effort; storage errors must not break the write */
  }

  return next;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export function listHeadcountPlans(filter?: Partial<HeadcountPlan>): HeadcountPlan[] {
  const all = loadAllPlans();
  if (!filter) return all;
  return all.filter((p) => {
    const entries = Object.entries(filter) as [keyof HeadcountPlan, unknown][];
    return entries.every(([k, v]) => v === undefined || p[k] === v);
  });
}

// ─── Cost-vs-AOP (the intra-arc linkage) ─────────────────────────────────────

/**
 * For the FY, return one row per persisted plan that has an AOP cost_target (read live
 * from org-planning-engine), with projected_cost vs target and variance. Rows without an
 * AOP target are skipped — honest, no fabrication (FR-91 · DP-A4-8).
 */
export function getWorkforceCostVsAOP(input: { fy: string }): CostVsAOPRow[] {
  const plans = listHeadcountPlans({ fy: input.fy });
  const rows: CostVsAOPRow[] = [];
  for (const p of plans) {
    const aop = readAopCostTarget(p.fy, p.scope_level, p.scope_id);
    if (aop === undefined) continue;
    rows.push({
      scope_level: p.scope_level,
      scope_id: p.scope_id,
      projected_cost: round2(p.projected_cost),
      aop_cost_target: round2(aop),
      variance: round2(dSub(p.projected_cost, aop)),
    });
  }
  return rows;
}

// ─── Test-only helpers ───────────────────────────────────────────────────────

export function __resetHeadcountPlansForTests(): void {
  try {
    localStorage.removeItem(HEADCOUNT_PLANS_KEY);
  } catch {
    /* non-fatal */
  }
}
