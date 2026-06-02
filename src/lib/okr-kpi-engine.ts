/**
 * @file        src/lib/okr-kpi-engine.ts
 * @sibling     NEW @ Sprint 118 · Arc D.0 · OKR/KPI Framework + Org-Cost Allocation
 * @pillar      D.0 · Objective / Key-Result cascade corporate → division → department,
 *              linked to S116 StrategicTargets, plus org-cost allocation across entities
 *              (shares sum to 100% via decimal-helpers · dEq).
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · org-structure (Division / Department · DIVISIONS_KEY / DEPARTMENTS_KEY)
 *                · org-planning-engine (S116) · listStrategicTargets · CascadeLevel
 *                · intercompany-group-structure-engine · listGroupStructure · ownership_pct
 *                · internal-pricing-engine · overhead_allocation_pct pattern (read-only)
 *              All 4 source engines stay 0-DIFF.
 * @reads-from  org-structure · org-planning-engine · intercompany-group-structure-engine ·
 *              internal-pricing-engine (read-only pattern) · decimal-helpers · audit-trail-engine
 * @scope-wall  OKR + org-cost allocation only. NO org-design / succession (S119), NO
 *              budget / forecast / scenario (D.1). The scope-wall test asserts NONE of those
 *              exports exist on the engine surface.
 * @audit       Emits 'okr_cascade_event' (module 'mca-roc') on upsert / KR / allocation.
 * @sprint      T-Phase-7.D.0.3 · Sprint 118 · Block 2
 * [JWT] Phase 8: GET/POST /api/okr/objectives · /api/okr/key-results · /api/org-cost/allocations
 */
import {
  DIVISIONS_KEY,
  DEPARTMENTS_KEY,
  type Division,
  type Department,
} from '@/types/org-structure';
import {
  listStrategicTargets,
  type StrategicTarget,
  type CascadeLevel,
} from '@/lib/org-planning-engine';
import {
  listGroupStructure,
  type GroupStructureNode,
} from '@/lib/intercompany-group-structure-engine';
import { dAdd, dEq, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'org-structure',                              // Division / Department (cascade tree)
    'org-planning-engine',                        // listStrategicTargets · CascadeLevel
    'intercompany-group-structure-engine',        // listGroupStructure · ownership_pct
    'internal-pricing-engine',                    // overhead_allocation_pct pattern (read-only)
    'decimal-helpers',                            // dAdd / dEq / round2
    'audit-trail-engine',                         // logAudit for okr_cascade_event
  ],
  storage_keys: [
    DIVISIONS_KEY,
    DEPARTMENTS_KEY,
    'erp_okr_objectives',
    'erp_okr_key_results',
    'erp_org_cost_allocations',
    'erp_strategic_targets',                      // owned by org-planning-engine
    'erp_group_structure',                        // owned by intercompany-group-structure-engine
  ],
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

/** OKR cascade levels per the sprint spec (subset of S116 CascadeLevel). */
export type OKRLevel = 'corporate' | 'division' | 'department';
export const OKR_LEVELS: readonly OKRLevel[] = ['corporate', 'division', 'department'] as const;

/** Corporate scope sentinel — mirrors S116 CORPORATE_SCOPE_ID. */
export const OKR_CORPORATE_SCOPE_ID = 'GROUP' as const;

/** KR progress bounds (inclusive). */
export const KR_PROGRESS_MIN = 0 as const;
export const KR_PROGRESS_MAX = 100 as const;

export interface Objective {
  objective_id: string;
  fy: string;
  level: OKRLevel;
  /** division_id / department_id, or OKR_CORPORATE_SCOPE_ID at the apex. */
  scope_id: string;
  title: string;
  /** Optional link to a S116 StrategicTarget — validated against listStrategicTargets. */
  linked_target_id: string | null;
  /** Optional parent objective for cascade (FK → objective_id of a higher-level objective). */
  parent_objective_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface KeyResult {
  kr_id: string;
  objective_id: string;
  title: string;
  /** Clamped 0..100 by the engine on every write. */
  progress_pct: number;
  /** Optional numeric target/actual pair (display only — not financial). */
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgCostShare {
  /** FK → loadEntities() / listGroupStructure entity_id. */
  entity_id: string;
  /** Share % (0..100). Sum across shares MUST equal 100% (decimal-helpers · dEq). */
  share_pct: number;
}

export interface OrgCostAllocation {
  allocation_id: string;
  fy: string;
  cost_pool: string;
  total_amount: number;
  /** Optional overhead-allocation pct (pattern reuse from internal-pricing-engine). */
  overhead_allocation_pct: number;
  shares: OrgCostShare[];
  /** Per-entity allocated amount = round2(total_amount × share_pct / 100). */
  allocations: { entity_id: string; amount: number }[];
  created_at: string;
  updated_at: string;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const OBJECTIVES_KEY = 'erp_okr_objectives';
const KEY_RESULTS_KEY = 'erp_okr_key_results';
const ORG_COST_KEY = 'erp_org_cost_allocations';

function loadObjectives(): Objective[] {
  try {
    // [JWT] GET /api/okr/objectives
    const raw = localStorage.getItem(OBJECTIVES_KEY);
    return raw ? (JSON.parse(raw) as Objective[]) : [];
  } catch { return []; }
}
function saveObjectives(arr: Objective[]): void {
  try {
    // [JWT] PUT /api/okr/objectives
    localStorage.setItem(OBJECTIVES_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}
function loadKRs(): KeyResult[] {
  try {
    // [JWT] GET /api/okr/key-results
    const raw = localStorage.getItem(KEY_RESULTS_KEY);
    return raw ? (JSON.parse(raw) as KeyResult[]) : [];
  } catch { return []; }
}
function saveKRs(arr: KeyResult[]): void {
  try {
    // [JWT] PUT /api/okr/key-results
    localStorage.setItem(KEY_RESULTS_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}
function loadAllocations(): OrgCostAllocation[] {
  try {
    // [JWT] GET /api/org-cost/allocations
    const raw = localStorage.getItem(ORG_COST_KEY);
    return raw ? (JSON.parse(raw) as OrgCostAllocation[]) : [];
  } catch { return []; }
}
function saveAllocations(arr: OrgCostAllocation[]): void {
  try {
    // [JWT] PUT /api/org-cost/allocations
    localStorage.setItem(ORG_COST_KEY, JSON.stringify(arr));
  } catch { /* non-fatal */ }
}

// ─── Read-only tree probes (FR-44 · 0-DIFF) ──────────────────────────────────

function readDivisions(): Division[] {
  try {
    const raw = localStorage.getItem(DIVISIONS_KEY);
    return raw ? (JSON.parse(raw) as Division[]) : [];
  } catch { return []; }
}
function readDepartments(): Department[] {
  try {
    const raw = localStorage.getItem(DEPARTMENTS_KEY);
    return raw ? (JSON.parse(raw) as Department[]) : [];
  } catch { return []; }
}
function readGroupEntities(): GroupStructureNode[] {
  return listGroupStructure();
}

// ─── Scope validation ────────────────────────────────────────────────────────

export function isValidScope(level: OKRLevel, scope_id: string): boolean {
  if (!scope_id) return false;
  if (level === 'corporate') return scope_id === OKR_CORPORATE_SCOPE_ID;
  if (level === 'division') return readDivisions().some((d) => d.id === scope_id);
  if (level === 'department') return readDepartments().some((d) => d.id === scope_id);
  return false;
}

/** Coerce an OKRLevel into the S116 CascadeLevel surface (1:1 except 'entity' excluded). */
export function asCascadeLevel(level: OKRLevel): CascadeLevel {
  return level;
}

// ─── Objective upsert (idempotent) ───────────────────────────────────────────

export interface UpsertObjectiveInput {
  fy: string;
  level: OKRLevel;
  scope_id: string;
  title: string;
  linked_target_id?: string | null;
  parent_objective_id?: string | null;
  entity_code?: string;
}

function makeObjectiveId(o: Pick<UpsertObjectiveInput, 'fy' | 'level' | 'scope_id' | 'title'>): string {
  return `OBJ::${o.fy}::${o.level}::${o.scope_id}::${o.title}`;
}

function targetExists(target_id: string): boolean {
  return listStrategicTargets().some((t: StrategicTarget) => t.target_id === target_id);
}

export function upsertObjective(input: UpsertObjectiveInput): Objective {
  if (!input.fy) throw new Error('okr-kpi-engine: fy is required');
  if (!OKR_LEVELS.includes(input.level)) {
    throw new Error(`okr-kpi-engine: invalid level '${input.level}'`);
  }
  if (!isValidScope(input.level, input.scope_id)) {
    throw new Error(
      `okr-kpi-engine: orphan scope_id '${input.scope_id}' for level '${input.level}' (not in org tree)`,
    );
  }
  if (!input.title || !input.title.trim()) {
    throw new Error('okr-kpi-engine: title is required');
  }
  if (input.linked_target_id && !targetExists(input.linked_target_id)) {
    throw new Error(
      `okr-kpi-engine: linked_target_id '${input.linked_target_id}' not found in org-planning-engine.listStrategicTargets`,
    );
  }

  const all = loadObjectives();
  const objective_id = makeObjectiveId(input);
  const existing = all.find((o) => o.objective_id === objective_id) ?? null;
  if (input.parent_objective_id && !all.some((o) => o.objective_id === input.parent_objective_id)) {
    throw new Error(
      `okr-kpi-engine: parent_objective_id '${input.parent_objective_id}' not found`,
    );
  }
  const now = new Date().toISOString();
  const next: Objective = {
    objective_id,
    fy: input.fy,
    level: input.level,
    scope_id: input.scope_id,
    title: input.title.trim(),
    linked_target_id: input.linked_target_id ?? existing?.linked_target_id ?? null,
    parent_objective_id:
      input.parent_objective_id === undefined
        ? existing?.parent_objective_id ?? null
        : input.parent_objective_id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  saveObjectives([...all.filter((o) => o.objective_id !== objective_id), next]);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'okr_cascade_event',
      recordId: objective_id,
      recordLabel:
        `OKR · ${input.fy} · ${input.level} · ${input.scope_id} · ${next.title}` +
        (next.linked_target_id ? ` · target=${next.linked_target_id}` : ''),
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'okr-kpi-engine',
    });
  } catch { /* audit append is best-effort */ }

  return next;
}

export function listObjectives(filter?: Partial<Objective>): Objective[] {
  const all = loadObjectives();
  if (!filter) return all;
  return all.filter((o) => {
    const entries = Object.entries(filter) as [keyof Objective, unknown][];
    return entries.every(([k, v]) => v === undefined || o[k] === v);
  });
}

// ─── Key-Result upsert (clamp 0..100) ────────────────────────────────────────

export interface UpsertKeyResultInput {
  objective_id: string;
  title: string;
  progress_pct: number;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  entity_code?: string;
}

function clampProgress(pct: number): number {
  if (typeof pct !== 'number' || Number.isNaN(pct)) return KR_PROGRESS_MIN;
  return Math.max(KR_PROGRESS_MIN, Math.min(KR_PROGRESS_MAX, pct));
}

function makeKRId(input: Pick<UpsertKeyResultInput, 'objective_id' | 'title'>): string {
  return `KR::${input.objective_id}::${input.title}`;
}

export function upsertKeyResult(input: UpsertKeyResultInput): KeyResult {
  if (!input.objective_id) throw new Error('okr-kpi-engine: objective_id is required');
  if (!input.title || !input.title.trim()) throw new Error('okr-kpi-engine: KR title is required');
  const objs = loadObjectives();
  const obj = objs.find((o) => o.objective_id === input.objective_id);
  if (!obj) {
    throw new Error(`okr-kpi-engine: objective '${input.objective_id}' not found`);
  }

  const all = loadKRs();
  const kr_id = makeKRId(input);
  const existing = all.find((k) => k.kr_id === kr_id) ?? null;
  const now = new Date().toISOString();
  const next: KeyResult = {
    kr_id,
    objective_id: input.objective_id,
    title: input.title.trim(),
    progress_pct: clampProgress(input.progress_pct),
    target_value: input.target_value ?? null,
    current_value: input.current_value ?? null,
    unit: input.unit ?? null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  saveKRs([...all.filter((k) => k.kr_id !== kr_id), next]);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'okr_cascade_event',
      recordId: kr_id,
      recordLabel: `KR · ${obj.title} · ${next.title} · ${next.progress_pct}%`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'okr-kpi-engine',
    });
  } catch { /* best-effort */ }

  return next;
}

export function listKeyResults(filter?: Partial<KeyResult>): KeyResult[] {
  const all = loadKRs();
  if (!filter) return all;
  return all.filter((k) => {
    const entries = Object.entries(filter) as [keyof KeyResult, unknown][];
    return entries.every(([key, v]) => v === undefined || k[key] === v);
  });
}

// ─── Org-cost allocation (shares sum to 100% · dEq) ──────────────────────────

export interface AllocateOrgCostInput {
  fy: string;
  cost_pool: string;
  total_amount: number;
  /** Optional overhead-allocation pct (internal-pricing pattern). */
  overhead_allocation_pct?: number;
  shares: OrgCostShare[];
  entity_code?: string;
}

/** Validate every share's entity_id against listGroupStructure (FR-44 reuse). */
function validateShareEntities(shares: OrgCostShare[]): void {
  const known = new Set(readGroupEntities().map((n) => n.entity_id));
  for (const s of shares) {
    if (!s.entity_id) throw new Error('okr-kpi-engine: share.entity_id is required');
    if (!known.has(s.entity_id)) {
      throw new Error(
        `okr-kpi-engine: orphan entity_id '${s.entity_id}' (not in listGroupStructure)`,
      );
    }
    if (typeof s.share_pct !== 'number' || s.share_pct < 0 || s.share_pct > 100) {
      throw new Error(`okr-kpi-engine: share_pct must be 0..100 (got ${s.share_pct})`);
    }
  }
}

export function allocateOrgCost(input: AllocateOrgCostInput): OrgCostAllocation {
  if (!input.fy) throw new Error('okr-kpi-engine: fy is required');
  if (!input.cost_pool || !input.cost_pool.trim()) {
    throw new Error('okr-kpi-engine: cost_pool is required');
  }
  if (typeof input.total_amount !== 'number' || input.total_amount < 0) {
    throw new Error('okr-kpi-engine: total_amount must be a non-negative number');
  }
  if (!Array.isArray(input.shares) || input.shares.length === 0) {
    throw new Error('okr-kpi-engine: shares are required (>=1 row)');
  }
  validateShareEntities(input.shares);

  const sum = input.shares.reduce((acc, s) => dAdd(acc, s.share_pct), 0);
  if (!dEq(sum, 100, 2)) {
    throw new Error(`okr-kpi-engine: shares must sum to 100% (got ${sum})`);
  }

  const overhead = input.overhead_allocation_pct ?? 0;
  if (overhead < 0 || overhead > 100) {
    throw new Error(`okr-kpi-engine: overhead_allocation_pct must be 0..100 (got ${overhead})`);
  }

  const totalWithOverhead = round2(input.total_amount + (input.total_amount * overhead) / 100);
  const allocations = input.shares.map((s) => ({
    entity_id: s.entity_id,
    amount: round2((totalWithOverhead * s.share_pct) / 100),
  }));

  const all = loadAllocations();
  const allocation_id = `ALLOC::${input.fy}::${input.cost_pool}`;
  const existing = all.find((a) => a.allocation_id === allocation_id) ?? null;
  const now = new Date().toISOString();
  const next: OrgCostAllocation = {
    allocation_id,
    fy: input.fy,
    cost_pool: input.cost_pool.trim(),
    total_amount: round2(input.total_amount),
    overhead_allocation_pct: overhead,
    shares: input.shares.map((s) => ({ entity_id: s.entity_id, share_pct: round2(s.share_pct) })),
    allocations,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  saveAllocations([...all.filter((a) => a.allocation_id !== allocation_id), next]);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'okr_cascade_event',
      recordId: allocation_id,
      recordLabel:
        `Org-cost · ${input.fy} · ${next.cost_pool} · total=${next.total_amount} ` +
        `· overhead=${overhead}% · entities=${next.shares.length}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'okr-kpi-engine',
    });
  } catch { /* best-effort */ }

  return next;
}

export function listOrgCostAllocations(filter?: Partial<OrgCostAllocation>): OrgCostAllocation[] {
  const all = loadAllocations();
  if (!filter) return all;
  return all.filter((a) => {
    const entries = Object.entries(filter) as [keyof OrgCostAllocation, unknown][];
    return entries.every(([k, v]) => v === undefined || a[k] === v);
  });
}

/**
 * Derive a default share-set from listGroupStructure using ownership_pct, normalised to
 * sum to 100 (the FR-44 reuse path · no parallel ownership store). Returns [] when the
 * group structure is empty (honest · no fabrication).
 */
export function defaultSharesFromOwnership(): OrgCostShare[] {
  const nodes = readGroupEntities();
  if (nodes.length === 0) return [];
  const total = nodes.reduce((acc, n) => dAdd(acc, n.ownership_pct), 0);
  if (!(total > 0)) return [];
  return nodes.map((n) => ({
    entity_id: n.entity_id,
    share_pct: round2((n.ownership_pct * 100) / total),
  }));
}

// ─── Test-only reset helpers ─────────────────────────────────────────────────

export function __resetOKRForTests(): void {
  try { localStorage.removeItem(OBJECTIVES_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(KEY_RESULTS_KEY); } catch { /* ignore */ }
  try { localStorage.removeItem(ORG_COST_KEY); } catch { /* ignore */ }
}
