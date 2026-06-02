/**
 * @file        src/lib/fpa-budgeting-engine.ts
 * @sibling     NEW @ Sprint 120 · 🎬 Arc D.1 OPENER · FP&A Budgeting
 * @pillar      D.1 · Operating / Capital / Cash budgets at the org-node level (entity ·
 *              division · department) with budget-vs-actual (via consolidated P&L) and
 *              budget-vs-AOP-target (via S116 StrategicTarget) comparisons.
 * @fr-44       REUSES — does NOT reimplement — all of:
 *                · budget-allocation-engine PATTERN (commitment / consumption ledger from
 *                  procurement-scoped budgets) · NEVER edited or called (0-DIFF)
 *                · org-planning-engine (S116) · listStrategicTargets · isValidScope ·
 *                  CascadeLevel — for budget-vs-AOP linkage + scope_id validation
 *                · group-consolidation-engine (S109) · buildConsolidatedPnL — actuals
 *                  source for budget-vs-actual
 *                · org-structure (Division / Department · READ via org-planning helpers)
 *              All source engines stay 0-DIFF.
 * @reads-from  org-planning-engine · group-consolidation-engine · org-structure ·
 *              decimal-helpers · audit-trail-engine
 * @scope-wall  DP-D1-9: budgeting ONLY. NO forecasting (S121), NO scenario planning
 *              (S122-123), NO cost / driver / activity-based costing (S124-125). The
 *              scope-wall test asserts NONE of those exports exist on this engine.
 * @audit       Emits 'budget_event' (module 'mca-roc') on upsertBudget /
 *              getBudgetVsActual / getBudgetVsAOP.
 * @sprint      T-Phase-7.D.1.1 · Sprint 120 · Block 3
 * [JWT] Phase 8: GET/POST /api/fpa-budgeting/budgets · /api/fpa-budgeting/vs-actual ·
 *               /api/fpa-budgeting/vs-aop
 */
import {
  listStrategicTargets,
  isValidScope as isValidOrgPlanningScope,
  type CascadeLevel,
  type StrategicTarget,
} from '@/lib/org-planning-engine';
import {
  buildConsolidatedPnL,
  type ConsolidatedPnL,
} from '@/lib/group-consolidation-engine';
import { dAdd, dSub, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── READS_FROM declaration (transparency · FR-91) ───────────────────────────

export const READS_FROM = Object.freeze({
  engines: [
    'org-planning-engine',            // listStrategicTargets · isValidScope · CascadeLevel
    'group-consolidation-engine',     // buildConsolidatedPnL — actuals source
    'org-structure',                  // Division / Department (read via org-planning helpers)
    'decimal-helpers',                // dAdd / dSub / round2
    'audit-trail-engine',             // logAudit for budget_event
  ],
  patterns: [
    // FR-44 · PATTERN REUSE only — budget-allocation-engine is NEVER called or edited.
    'budget-allocation-engine::commitment-consumption',
  ],
  storage_keys: [
    'erp_fpa_budgets',                // NEW · owned by this engine
    'erp_strategic_targets',          // READ-only · owned by org-planning-engine
  ],
} as const);

// ─── Public types ────────────────────────────────────────────────────────────

/** The three FP&A budget types per the sprint spec. */
export type BudgetType = 'operating' | 'capital' | 'cash';
export const BUDGET_TYPES: readonly BudgetType[] = ['operating', 'capital', 'cash'] as const;

/**
 * Scope level for a budget. Mirrors S116 CascadeLevel minus 'corporate' — FP&A budgets
 * are anchored to a real org node (entity / division / department).
 */
export type BudgetScopeLevel = Exclude<CascadeLevel, 'corporate'>;
export const BUDGET_SCOPE_LEVELS: readonly BudgetScopeLevel[] = [
  'entity',
  'division',
  'department',
] as const;

/** One line of a budget — keyed by ledger group code (mirrors consolidated P&L lines). */
export interface FPABudgetLine {
  ledger_group_code: string;
  budgeted: number;
  actual?: number;
  variance?: number;
}

export interface FPABudget {
  budget_id: string;
  fy: string;
  budget_type: BudgetType;
  scope_level: BudgetScopeLevel;
  /** entity_id / division_id / department_id (validated vs org-structure). */
  scope_id: string;
  lines: FPABudgetLine[];
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  /** From the matching S116 StrategicTarget (cost_target for operating/capital, revenue_target inverted for cash · null when no AOP link). */
  aop_target?: number;
  vs_aop_variance?: number;
  created_at: string;
  updated_at: string;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const BUDGETS_KEY = 'erp_fpa_budgets';

function loadAll(): FPABudget[] {
  try {
    // [JWT] GET /api/fpa-budgeting/budgets
    const raw = localStorage.getItem(BUDGETS_KEY);
    return raw ? (JSON.parse(raw) as FPABudget[]) : [];
  } catch {
    return [];
  }
}

function saveAll(arr: FPABudget[]): void {
  try {
    // [JWT] PUT /api/fpa-budgeting/budgets
    localStorage.setItem(BUDGETS_KEY, JSON.stringify(arr));
  } catch {
    /* non-fatal */
  }
}

// ─── Scope validation (FR-44 reuse) ──────────────────────────────────────────

/**
 * Validate a budget scope against the real org-structure tree by delegating to the
 * S116 org-planning-engine helper (single source of truth · 0-DIFF reuse).
 */
export function isValidBudgetScope(level: BudgetScopeLevel, scope_id: string): boolean {
  return isValidOrgPlanningScope(level as CascadeLevel, scope_id);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeBudgetId(fy: string, type: BudgetType, level: BudgetScopeLevel, scope_id: string): string {
  return `BUD::${fy}::${type}::${level}::${scope_id}`;
}

function sumBudgeted(lines: readonly FPABudgetLine[]): number {
  return round2(lines.reduce((acc, l) => dAdd(acc, l.budgeted ?? 0), 0));
}

function sumActual(lines: readonly FPABudgetLine[]): number {
  return round2(lines.reduce((acc, l) => dAdd(acc, l.actual ?? 0), 0));
}

// ─── Upsert ──────────────────────────────────────────────────────────────────

export interface UpsertBudgetInput {
  fy: string;
  budget_type: BudgetType;
  scope_level: BudgetScopeLevel;
  scope_id: string;
  lines: FPABudgetLine[];
  entity_code?: string;             // optional · audit attribution
}

/**
 * Idempotent upsert by composite key {fy, budget_type, scope_level, scope_id}.
 * Validates scope_id against the real org tree (rejects orphans · FR-91).
 * Totals via decimal-helpers · variance = budgeted − actual.
 */
export function upsertBudget(input: UpsertBudgetInput): FPABudget {
  if (!input.fy || typeof input.fy !== 'string') {
    throw new Error('fpa-budgeting-engine: fy is required');
  }
  if (!BUDGET_TYPES.includes(input.budget_type)) {
    throw new Error(`fpa-budgeting-engine: invalid budget_type '${input.budget_type}'`);
  }
  if (!BUDGET_SCOPE_LEVELS.includes(input.scope_level)) {
    throw new Error(`fpa-budgeting-engine: invalid scope_level '${input.scope_level}'`);
  }
  if (!isValidBudgetScope(input.scope_level, input.scope_id)) {
    throw new Error(
      `fpa-budgeting-engine: orphan scope_id '${input.scope_id}' for level '${input.scope_level}' ` +
        '— not present in org-structure / group-structure tree',
    );
  }
  if (!Array.isArray(input.lines)) {
    throw new Error('fpa-budgeting-engine: lines must be an array');
  }

  const budget_id = makeBudgetId(input.fy, input.budget_type, input.scope_level, input.scope_id);
  const now = new Date().toISOString();
  const all = loadAll();
  const existing = all.find((b) => b.budget_id === budget_id) ?? null;

  // Normalise lines · variance = budgeted − actual (decimal-safe)
  const lines: FPABudgetLine[] = input.lines.map((l) => {
    const budgeted = round2(l.budgeted ?? 0);
    const actual = l.actual === undefined ? undefined : round2(l.actual);
    const variance =
      actual === undefined ? undefined : round2(dSub(budgeted, actual));
    return { ledger_group_code: l.ledger_group_code, budgeted, actual, variance };
  });

  const total_budgeted = sumBudgeted(lines);
  const total_actual = sumActual(lines);
  const total_variance = round2(dSub(total_budgeted, total_actual));

  const next: FPABudget = {
    budget_id,
    fy: input.fy,
    budget_type: input.budget_type,
    scope_level: input.scope_level,
    scope_id: input.scope_id,
    lines,
    total_budgeted,
    total_actual,
    total_variance,
    aop_target: existing?.aop_target,
    vs_aop_variance: existing?.vs_aop_variance,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  const filtered = all.filter((b) => b.budget_id !== budget_id);
  filtered.push(next);
  saveAll(filtered);

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: existing ? 'update' : 'create',
      entityType: 'budget_event',
      recordId: budget_id,
      recordLabel:
        `Budget · ${input.fy} · ${input.budget_type} · ${input.scope_level} · ${input.scope_id} ` +
        `· budgeted=${total_budgeted}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'fpa-budgeting-engine',
    });
  } catch {
    /* audit best-effort */
  }

  return next;
}

// ─── Listing ─────────────────────────────────────────────────────────────────

export function listBudgets(filter?: Partial<FPABudget>): FPABudget[] {
  const all = loadAll();
  if (!filter) return all;
  return all.filter((b) => {
    const entries = Object.entries(filter) as [keyof FPABudget, unknown][];
    return entries.every(([k, v]) => v === undefined || b[k] === v);
  });
}

export function getBudget(
  fy: string,
  budget_type: BudgetType,
  scope_level: BudgetScopeLevel,
  scope_id: string,
): FPABudget | null {
  const id = makeBudgetId(fy, budget_type, scope_level, scope_id);
  return loadAll().find((b) => b.budget_id === id) ?? null;
}

// ─── Budget vs Actual (FR-44 · actuals come from S109 consolidated P&L) ──────

export interface BudgetVsActualInput {
  fy: string;
  budget_type: BudgetType;
  scope_level: BudgetScopeLevel;
  scope_id: string;
  entity_code?: string;
}

/**
 * Pull actuals from group-consolidation-engine.buildConsolidatedPnL by ledger_group_code
 * and recompute per-line + total variance via decimal-helpers. The budget record is
 * persisted with the refreshed actuals so the page can render straight from listBudgets.
 *
 * If the budget does not exist, returns a skeleton (no fabrication · FR-91).
 */
export function getBudgetVsActual(input: BudgetVsActualInput): FPABudget {
  if (!isValidBudgetScope(input.scope_level, input.scope_id)) {
    throw new Error(
      `fpa-budgeting-engine: orphan scope_id '${input.scope_id}' for level '${input.scope_level}'`,
    );
  }
  const existing = getBudget(input.fy, input.budget_type, input.scope_level, input.scope_id);

  // Read actuals from the consolidated P&L (FR-44 · 0-DIFF on group-consolidation-engine).
  const pnl: ConsolidatedPnL = buildConsolidatedPnL({ fy: input.fy });
  const actualByCode = new Map<string, number>();
  for (const line of pnl.lines) {
    actualByCode.set(line.ledger_group_code, round2(line.amount));
  }

  const baseLines = existing?.lines ?? [];
  const lines: FPABudgetLine[] = baseLines.map((l) => {
    const budgeted = round2(l.budgeted ?? 0);
    const actual = round2(actualByCode.get(l.ledger_group_code) ?? 0);
    const variance = round2(dSub(budgeted, actual));
    return { ledger_group_code: l.ledger_group_code, budgeted, actual, variance };
  });

  const total_budgeted = sumBudgeted(lines);
  const total_actual = sumActual(lines);
  const total_variance = round2(dSub(total_budgeted, total_actual));

  const budget_id = makeBudgetId(input.fy, input.budget_type, input.scope_level, input.scope_id);
  const now = new Date().toISOString();

  const next: FPABudget = {
    budget_id,
    fy: input.fy,
    budget_type: input.budget_type,
    scope_level: input.scope_level,
    scope_id: input.scope_id,
    lines,
    total_budgeted,
    total_actual,
    total_variance,
    aop_target: existing?.aop_target,
    vs_aop_variance: existing?.vs_aop_variance,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  // Persist refreshed actuals back into the budget record (if a budget existed).
  if (existing) {
    const all = loadAll().filter((b) => b.budget_id !== budget_id);
    all.push(next);
    saveAll(all);
  }

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'view',
      entityType: 'budget_event',
      recordId: budget_id,
      recordLabel:
        `BudgetVsActual · ${input.fy} · ${input.budget_type} · ${input.scope_level} · ${input.scope_id} ` +
        `· var=${total_variance}`,
      beforeState: (existing as unknown as Record<string, unknown> | null) ?? null,
      afterState: next as unknown as Record<string, unknown>,
      sourceModule: 'fpa-budgeting-engine',
    });
  } catch {
    /* audit best-effort */
  }

  return next;
}

// ─── Budget vs AOP (FR-44 · pulls StrategicTarget from S116 org-planning) ────

export interface BudgetVsAOPInput {
  fy: string;
  scope_level: BudgetScopeLevel;
  scope_id: string;
  /**
   * Which AOP figure to compare against. Defaults to 'cost' (operating/capital budgets
   * naturally compare to AOP cost_target). 'revenue' is available for revenue-side budgets.
   */
  basis?: 'cost' | 'revenue';
  budget_type?: BudgetType;
  entity_code?: string;
}

export interface BudgetVsAOPResult {
  fy: string;
  scope_level: BudgetScopeLevel;
  scope_id: string;
  basis: 'cost' | 'revenue';
  budgeted: number;
  aop_target: number;
  variance: number;
  /** True when no matching StrategicTarget exists for this scope (no AOP link · honest). */
  aop_missing: boolean;
}

/**
 * Reads org-planning-engine.listStrategicTargets and returns the budgeted-vs-AOP
 * comparison for the given scope. Variance = budgeted − aop_target (decimal-helpers).
 * No fabrication: when no matching target exists, aop_missing=true and aop_target=0.
 */
export function getBudgetVsAOP(input: BudgetVsAOPInput): BudgetVsAOPResult {
  if (!isValidBudgetScope(input.scope_level, input.scope_id)) {
    throw new Error(
      `fpa-budgeting-engine: orphan scope_id '${input.scope_id}' for level '${input.scope_level}'`,
    );
  }
  const basis = input.basis ?? 'cost';

  // Sum budgeted across budget types (or filter by one if requested).
  const all = loadAll().filter(
    (b) => b.fy === input.fy && b.scope_level === input.scope_level && b.scope_id === input.scope_id,
  );
  const budgets = input.budget_type ? all.filter((b) => b.budget_type === input.budget_type) : all;
  const budgeted = round2(budgets.reduce((acc, b) => dAdd(acc, b.total_budgeted), 0));

  // Pull the matching StrategicTarget from S116 (FR-44 reuse · the AOP linkage).
  const targets: StrategicTarget[] = listStrategicTargets({
    fy: input.fy,
    level: input.scope_level as CascadeLevel,
    scope_id: input.scope_id,
  });
  const target = targets[0] ?? null;
  const aop_target = target
    ? round2(basis === 'cost' ? target.cost_target : target.revenue_target)
    : 0;
  const variance = round2(dSub(budgeted, aop_target));

  const result: BudgetVsAOPResult = {
    fy: input.fy,
    scope_level: input.scope_level,
    scope_id: input.scope_id,
    basis,
    budgeted,
    aop_target,
    variance,
    aop_missing: target === null,
  };

  // Persist aop_target / vs_aop_variance back onto the matching budget records (if any).
  if (budgets.length > 0) {
    const others = loadAll().filter(
      (b) => !budgets.some((x) => x.budget_id === b.budget_id),
    );
    const updated = budgets.map((b) => ({
      ...b,
      aop_target,
      vs_aop_variance: round2(dSub(b.total_budgeted, aop_target)),
      updated_at: new Date().toISOString(),
    }));
    saveAll([...others, ...updated]);
  }

  try {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'view',
      entityType: 'budget_event',
      recordId: `AOP::${input.fy}::${input.scope_level}::${input.scope_id}::${basis}`,
      recordLabel:
        `BudgetVsAOP · ${input.fy} · ${input.scope_level} · ${input.scope_id} ` +
        `· basis=${basis} · budgeted=${budgeted} · aop=${aop_target} · var=${variance}`,
      beforeState: null,
      afterState: result as unknown as Record<string, unknown>,
      sourceModule: 'fpa-budgeting-engine',
    });
  } catch {
    /* audit best-effort */
  }

  return result;
}

// ─── Test-only reset ─────────────────────────────────────────────────────────

export function __resetFPABudgetingForTests(): void {
  try {
    localStorage.removeItem(BUDGETS_KEY);
  } catch {
    /* non-fatal */
  }
}
