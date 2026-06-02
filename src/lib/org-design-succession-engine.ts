/**
 * @file        src/lib/org-design-succession-engine.ts
 * @sibling     NEW @ Sprint 119 · 🏁 Arc D.0 CAPSTONE · Org Design + Succession + Skills
 * @pillar      D.0 · (1) Re-org SIMULATOR — model a proposed org tree on a SCENARIO COPY
 *              (`erp_org_design_scenario_*` side-store) and compute headcount/cost deltas via
 *              workforce-planning-engine. NEVER mutates the real org-structure keys.
 *              (2) Succession inventory — critical-role coverage RAG (gap/at_risk/covered).
 *              (3) Skills inventory — per-employee skill/proficiency catalog.
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · org-structure (Division / Department · DIVISIONS_KEY / DEPARTMENTS_KEY — READ only)
 *                · workforce-planning-engine (projectWorkforce · HeadcountPlan · cost/headcount deltas)
 *                · Employee (succession candidates + skills inventory source)
 *                · org-planning-engine / okr-kpi-engine (optional context · not required)
 *              All source engines stay 0-DIFF. The real `erp_divisions_*` / `erp_departments_*`
 *              data is NEVER mutated by this engine — scenarios live in `erp_org_design_scenario_*`.
 * @reads-from  org-structure · workforce-planning-engine · employee · decimal-helpers ·
 *              audit-trail-engine
 * @scope-wall  DP-D0-7: re-org simulator + succession + skills INVENTORY only. NO
 *              performance-management (reviews / 360 / calibration), NO compensation-planning
 *              (salary bands / merit), NO budget / forecast / scenario (D.1). The scope-wall
 *              test asserts NONE of those exports exist on this engine.
 * @audit       Emits 'org_design_event' (module 'mca-roc') on simulateReorg / upsertSuccession /
 *              upsertSkill.
 * @sprint      T-Phase-7.D.0.4 · Sprint 119 · Block 2 · 🏁 Arc D.0 Capstone
 * [JWT] Phase 8: GET/POST /api/org-design/scenarios · /api/succession · /api/skills
 */
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
} from '@/types/org-structure';
import {
  EMPLOYEES_KEY,
  type Employee,
} from '@/types/employee';
import {
  projectWorkforce,
  type WorkforceScopeLevel,
} from '@/lib/workforce-planning-engine';
import { dSub, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'org-structure',                  // Division / Department (READ-only · scenario copies its tree)
    'workforce-planning-engine',      // projectWorkforce — cost/headcount deltas
    'employee',                       // Employee — succession + skills source
    'decimal-helpers',                // dSub / round2
    'audit-trail-engine',             // logAudit for org_design_event
  ],
  storage_keys: [
    DIVISIONS_KEY,                            // READ only · NEVER written by this engine
    DEPARTMENTS_KEY,                          // READ only · NEVER written by this engine
    EMPLOYEES_KEY,                            // READ only
    'erp_org_design_scenarios',               // NEW · side-store for scenario copies
    'erp_org_design_succession',              // NEW · succession entries
    'erp_org_design_skills',                  // NEW · skills inventory
  ],
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

export type OrgNodeType = 'division' | 'department';

/** Sentinel scope id at the top of the scenario tree (no real entity coupling). */
export const SCENARIO_ROOT_ID = 'SCENARIO-ROOT' as const;

/** Default per-head cost used when caller does not supply one. */
export const DEFAULT_COST_PER_HEAD = 600_000 as const;

/** Storage-key prefix for the scenario side-store. NEVER overlaps real org-structure keys. */
export const SCENARIO_KEY_PREFIX = 'erp_org_design_scenario_' as const;

/** Build a scenario-copy key for a given scenario_id. Distinct from `erp_divisions_*`. */
export function scenarioCopyKey(scenario_id: string): string {
  return `${SCENARIO_KEY_PREFIX}${scenario_id}`;
}

export interface ProposedOrgNode {
  node_id: string;
  node_type: OrgNodeType;
  parent_id: string | null;
  planned_headcount: number;
}

export interface ReorgScenario {
  scenario_id: string;
  fy: string;
  name: string;
  /** Proposed tree — stored in `erp_org_design_scenario_*`, NOT `erp_divisions_*`. */
  proposed_nodes: ProposedOrgNode[];
  baseline_headcount: number;
  proposed_headcount: number;
  headcount_delta: number;
  baseline_cost: number;
  proposed_cost: number;
  cost_delta: number;
  created_at: string;
  updated_at: string;
}

export type SuccessionReadiness = 'ready_now' | '1-2_years' | 'development';
export type SuccessionCoverage = 'covered' | 'at_risk' | 'gap';

export interface SuccessionSuccessor {
  employee_id: string;
  readiness: SuccessionReadiness;
}

export interface SuccessionEntry {
  role_id: string;
  role_title: string;
  incumbent_employee_id: string | null;
  successors: SuccessionSuccessor[];
  coverage: SuccessionCoverage;
}

export type SkillProficiency = 'basic' | 'proficient' | 'expert';

export interface SkillEntry {
  employee_id: string;
  skill: string;
  proficiency: SkillProficiency;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const SCENARIOS_INDEX_KEY = 'erp_org_design_scenarios';
const SUCCESSION_KEY = 'erp_org_design_succession';
const SKILLS_KEY = 'erp_org_design_skills';

function loadScenarios(): ReorgScenario[] {
  try {
    // [JWT] GET /api/org-design/scenarios
    const raw = localStorage.getItem(SCENARIOS_INDEX_KEY);
    return raw ? (JSON.parse(raw) as ReorgScenario[]) : [];
  } catch {
    return [];
  }
}

function saveScenarios(arr: ReorgScenario[]): void {
  try {
    // [JWT] PUT /api/org-design/scenarios
    localStorage.setItem(SCENARIOS_INDEX_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}

function saveScenarioCopy(scenario_id: string, nodes: ProposedOrgNode[]): void {
  try {
    // [JWT] PUT /api/org-design/scenarios/:id/tree
    // SAFETY: writes ONLY to erp_org_design_scenario_* — NEVER erp_divisions_* / erp_departments_*.
    localStorage.setItem(scenarioCopyKey(scenario_id), JSON.stringify(nodes));
  } catch { /* non-fatal */ }
}

function loadSuccession(): SuccessionEntry[] {
  try {
    // [JWT] GET /api/succession
    const raw = localStorage.getItem(SUCCESSION_KEY);
    return raw ? (JSON.parse(raw) as SuccessionEntry[]) : [];
  } catch {
    return [];
  }
}

function saveSuccession(arr: SuccessionEntry[]): void {
  try {
    // [JWT] PUT /api/succession
    localStorage.setItem(SUCCESSION_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}

function loadSkills(): SkillEntry[] {
  try {
    // [JWT] GET /api/skills
    const raw = localStorage.getItem(SKILLS_KEY);
    return raw ? (JSON.parse(raw) as SkillEntry[]) : [];
  } catch {
    return [];
  }
}

function saveSkills(arr: SkillEntry[]): void {
  try {
    // [JWT] PUT /api/skills
    localStorage.setItem(SKILLS_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
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

// ─── Coverage classification (gap / at_risk / covered) ───────────────────────

export function classifyCoverage(successors: SuccessionSuccessor[]): SuccessionCoverage {
  if (!successors || successors.length === 0) return 'gap';
  if (successors.some((s) => s.readiness === 'ready_now' || s.readiness === '1-2_years')) {
    return 'covered';
  }
  // All successors are 'development' — bench exists but not ready.
  return 'at_risk';
}

// ─── Re-org simulator (scenario copy ONLY · NEVER mutates real org tree) ─────

export interface SimulateReorgInput {
  fy: string;
  name: string;
  proposed_nodes: ProposedOrgNode[];
  /** Optional per-head cost override (defaults to DEFAULT_COST_PER_HEAD). */
  cost_per_head?: number;
  /** Optional scenario_id (idempotent overwrite when supplied). */
  scenario_id?: string;
  /** Optional baseline scope for the via-engine projection (REAL org · READ only). */
  baseline_scope?: { level: WorkforceScopeLevel; scope_id: string };
}

/**
 * Build a scenario copy of a proposed org tree and compute headcount/cost deltas.
 *
 *   proposed_headcount = sum(proposed_nodes.planned_headcount)
 *   baseline_headcount = projectWorkforce(baseline_scope).current_headcount (REAL data · READ)
 *                        OR 0 when no baseline_scope is provided.
 *   *_cost             = headcount × cost_per_head (decimal-safe)
 *
 * SAFETY: writes ONLY to `erp_org_design_scenario_*` + the scenario index. NEVER writes
 * `erp_divisions_*` / `erp_departments_*` — the live org tree stays 0-DIFF.
 */
export function simulateReorg(input: SimulateReorgInput): ReorgScenario {
  if (!input.fy) throw new Error('org-design-succession-engine: fy is required');
  if (!input.name) throw new Error('org-design-succession-engine: name is required');
  if (!Array.isArray(input.proposed_nodes)) {
    throw new Error('org-design-succession-engine: proposed_nodes must be an array');
  }
  const costPerHead = input.cost_per_head ?? DEFAULT_COST_PER_HEAD;
  const now = new Date().toISOString();
  const scenario_id = input.scenario_id ?? `SCN::${input.fy}::${Date.now().toString(36)}`;

  // Baseline via workforce-planning-engine (REAL org · READ only · FR-44 reuse).
  let baseline_headcount = 0;
  if (input.baseline_scope) {
    try {
      const projection = projectWorkforce({
        fy: input.fy,
        scope_level: input.baseline_scope.level,
        scope_id: input.baseline_scope.scope_id,
        cost_per_head: costPerHead,
      });
      baseline_headcount = projection.current_headcount;
    } catch {
      // Orphan baseline scope — honest 0 baseline (FR-91 · no fabrication).
      baseline_headcount = 0;
    }
  }

  const proposed_headcount = input.proposed_nodes.reduce(
    (acc, n) => acc + Math.max(0, n.planned_headcount | 0),
    0,
  );
  const baseline_cost = round2(baseline_headcount * costPerHead);
  const proposed_cost = round2(proposed_headcount * costPerHead);
  const headcount_delta = proposed_headcount - baseline_headcount;
  const cost_delta = round2(dSub(proposed_cost, baseline_cost));

  // Persist scenario copy to the side-store (NEVER touches real org keys).
  saveScenarioCopy(scenario_id, input.proposed_nodes);

  const all = loadScenarios();
  const existing = all.find((s) => s.scenario_id === scenario_id);
  const next: ReorgScenario = {
    scenario_id,
    fy: input.fy,
    name: input.name,
    proposed_nodes: input.proposed_nodes,
    baseline_headcount,
    proposed_headcount,
    headcount_delta,
    baseline_cost,
    proposed_cost,
    cost_delta,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  const filtered = all.filter((s) => s.scenario_id !== scenario_id);
  filtered.push(next);
  saveScenarios(filtered);

  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'org_design_event',
      recordId: scenario_id,
      recordLabel:
        `Re-org · ${input.fy} · ${input.name} · ` +
        `hc Δ=${headcount_delta} · cost Δ=${cost_delta}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'org-design-succession-engine',
    });
  } catch { /* audit best-effort */ }

  return next;
}

export function listReorgScenarios(fy?: string): ReorgScenario[] {
  const all = loadScenarios();
  return fy ? all.filter((s) => s.fy === fy) : all;
}

// ─── Succession ──────────────────────────────────────────────────────────────

export interface UpsertSuccessionInput {
  role_id: string;
  role_title: string;
  incumbent_employee_id: string | null;
  successors: SuccessionSuccessor[];
}

export function upsertSuccession(input: UpsertSuccessionInput): SuccessionEntry {
  if (!input.role_id) throw new Error('org-design-succession-engine: role_id is required');
  if (!input.role_title) throw new Error('org-design-succession-engine: role_title is required');

  // Validate that referenced employees (if any) exist in the REAL Employee master.
  const empIds = new Set(readEmployees().map((e) => e.id));
  if (input.incumbent_employee_id && !empIds.has(input.incumbent_employee_id)) {
    throw new Error(
      `org-design-succession-engine: orphan incumbent_employee_id '${input.incumbent_employee_id}'`,
    );
  }
  for (const s of input.successors) {
    if (!empIds.has(s.employee_id)) {
      throw new Error(
        `org-design-succession-engine: orphan successor employee_id '${s.employee_id}'`,
      );
    }
  }

  const entry: SuccessionEntry = {
    role_id: input.role_id,
    role_title: input.role_title,
    incumbent_employee_id: input.incumbent_employee_id,
    successors: input.successors,
    coverage: classifyCoverage(input.successors),
  };

  const all = loadSuccession();
  const existing = all.find((s) => s.role_id === entry.role_id) ?? null;
  const filtered = all.filter((s) => s.role_id !== entry.role_id);
  filtered.push(entry);
  saveSuccession(filtered);

  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'org_design_event',
      recordId: `SUC::${entry.role_id}`,
      recordLabel: `Succession · ${entry.role_title} · coverage=${entry.coverage}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: entry as unknown as Record<string, unknown>,
      sourceModule: 'org-design-succession-engine',
    });
  } catch { /* audit best-effort */ }

  return entry;
}

export function listSuccession(): SuccessionEntry[] {
  return loadSuccession();
}

export interface SuccessionCoverageSummary {
  total_roles: number;
  covered: number;
  at_risk: number;
  gap: number;
}

export function getSuccessionCoverage(): SuccessionCoverageSummary {
  const all = loadSuccession();
  const summary: SuccessionCoverageSummary = {
    total_roles: all.length,
    covered: 0,
    at_risk: 0,
    gap: 0,
  };
  for (const e of all) summary[e.coverage] += 1;
  return summary;
}

// ─── Skills inventory ────────────────────────────────────────────────────────

export function upsertSkill(input: SkillEntry): SkillEntry {
  if (!input.employee_id) throw new Error('org-design-succession-engine: employee_id is required');
  if (!input.skill) throw new Error('org-design-succession-engine: skill is required');

  const empIds = new Set(readEmployees().map((e) => e.id));
  if (!empIds.has(input.employee_id)) {
    throw new Error(`org-design-succession-engine: orphan employee_id '${input.employee_id}'`);
  }

  const all = loadSkills();
  const existing = all.find(
    (s) => s.employee_id === input.employee_id && s.skill === input.skill,
  ) ?? null;
  const next: SkillEntry = { ...input };
  const filtered = all.filter(
    (s) => !(s.employee_id === input.employee_id && s.skill === input.skill),
  );
  filtered.push(next);
  saveSkills(filtered);

  try {
    logAudit({
      entityCode: 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'org_design_event',
      recordId: `SKL::${input.employee_id}::${input.skill}`,
      recordLabel: `Skill · ${input.employee_id} · ${input.skill} · ${input.proficiency}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'org-design-succession-engine',
    });
  } catch { /* audit best-effort */ }

  return next;
}

export function getSkillsInventory(filter?: Partial<SkillEntry>): SkillEntry[] {
  const all = loadSkills();
  if (!filter) return all;
  return all.filter((s) => {
    if (filter.employee_id && s.employee_id !== filter.employee_id) return false;
    if (filter.skill && s.skill !== filter.skill) return false;
    if (filter.proficiency && s.proficiency !== filter.proficiency) return false;
    return true;
  });
}

// ─── Test-only reset ─────────────────────────────────────────────────────────

export function __resetOrgDesignForTests(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith(SCENARIO_KEY_PREFIX)) keys.push(k);
    }
    for (const k of keys) localStorage.removeItem(k);
    localStorage.removeItem(SCENARIOS_INDEX_KEY);
    localStorage.removeItem(SUCCESSION_KEY);
    localStorage.removeItem(SKILLS_KEY);
  } catch { /* non-fatal */ }
}
