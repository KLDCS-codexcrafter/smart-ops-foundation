/**
 * projx-engine.ts — Pure helpers for ProjX (Project Management hub)
 * Sprint T-Phase-1.1.2-a · ProjX Foundation
 * Sprint T-Phase-1.1.2-b · UPGRADED computeProjectPnL with full args (stub kept for back-compat)
 *
 * D-216 LOCKED: P&L is computed live, never persisted.
 * Decimal.js (dMul / dAdd / round2) for ALL money math.
 */
import type { Project, ProjectStatus, ProjectStatusEvent } from '@/types/projx/project';
import type { ProjectMilestone } from '@/types/projx/project-milestone';
import type { TimeEntry } from '@/types/projx/time-entry';
import type { ProjectResource } from '@/types/projx/project-resource';
import type { ExpenseClaim } from '@/types/employee-finance';
import { dAdd, dMul, round2 } from '@/lib/decimal-helpers';

/** Result type — no values persisted, computed live (D-216) */
export interface ProjectPnLResult {
  revenue_billed: number;
  revenue_pending: number;
  cost_incurred: number;
  cost_committed: number;
  margin_amount: number;
  margin_pct: number;
  computed_at: string;
}

/** Stub engine kept for backward-compat with 1.1.2-a code · zeros new fields */
export function computeProjectPnLStub(project: Project): ProjectPnLResult {
  const revenue_billed = project.billed_to_date;
  const cost_incurred = project.cost_to_date;
  const margin_amount = round2(revenue_billed - cost_incurred);
  const revenue_pending = round2(project.contract_value - revenue_billed);
  const margin_pct = revenue_billed > 0
    ? round2((margin_amount / revenue_billed) * 100)
    : 0;
  return {
    revenue_billed,
    revenue_pending,
    cost_incurred,
    cost_committed: 0,
    margin_amount,
    margin_pct,
    computed_at: new Date().toISOString(),
  };
}

/**
 * Sprint 1.1.2-b · Full P&L computation with milestones, time entries, expense claims, resources.
 * D-216: Computed LIVE only · NEVER persisted.
 */
export function computeProjectPnL(
  project: Project,
  milestones: ProjectMilestone[],
  timeEntries: TimeEntry[],
  expenseClaims: ExpenseClaim[],
  resources: ProjectResource[],
): ProjectPnLResult {
  const projectMs = milestones.filter(m => m.project_id === project.id);
  const billedMs = projectMs.filter(m => m.is_billed);
  const revenue_billed = round2(billedMs.reduce((s, m) => dAdd(s, m.invoice_amount), 0));
  const revenue_pending = round2(project.contract_value - revenue_billed);

  const approvedTimeEntries = timeEntries.filter(t =>
    t.project_id === project.id && t.status === 'approved');
  const timeCost = approvedTimeEntries.reduce(
    (s, t) => dAdd(s, dMul(t.hours, t.hourly_rate)), 0);

  // 1.1.2-c will fully wire ExpenseClaim → project_centre_id linkage.
  // Today: ExpenseClaim has no project_centre_id field, so we skip safely.
  const expenseCost = 0;
  void expenseClaims;

  const cost_incurred = round2(dAdd(timeCost, expenseCost));

  // cost_committed: remaining business days × allocation_pct/100 × daily_cost_rate, summed
  const today = new Date().toISOString().slice(0, 10);
  const projectResources = resources.filter(r =>
    r.project_id === project.id && r.is_active);
  let cost_committed_raw = 0;
  for (const r of projectResources) {
    const fromDate = r.allocated_from > today ? r.allocated_from : today;
    const untilDate = r.allocated_until ?? project.target_end_date;
    if (untilDate < fromDate) continue;
    const days = computeBusinessDays(fromDate, untilDate);
    const personCost = dMul(dMul(days, r.allocation_pct / 100), r.daily_cost_rate);
    cost_committed_raw = dAdd(cost_committed_raw, personCost);
  }
  const cost_committed = round2(cost_committed_raw);

  const margin_amount = round2(revenue_billed - cost_incurred);
  const margin_pct = revenue_billed > 0
    ? round2((margin_amount / revenue_billed) * 100)
    : 0;

  return {
    revenue_billed, revenue_pending, cost_incurred, cost_committed,
    margin_amount, margin_pct,
    computed_at: new Date().toISOString(),
  };
}

/** Compute business days (Mon-Fri) between two ISO dates inclusive */
export function computeBusinessDays(fromDate: string, toDate: string): number {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  if (end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Recompute project's denormalized snapshots based on PnL · D-216 (returns updated obj; persistence is hook responsibility) */
export function recomputeProjectFinancials(
  project: Project,
  pnl: ProjectPnLResult,
): Project {
  return {
    ...project,
    billed_to_date: pnl.revenue_billed,
    cost_to_date: pnl.cost_incurred,
    margin_pct: pnl.margin_pct,
    updated_at: new Date().toISOString(),
  };
}

/** Validates project status transition · enforces lifecycle rules */
export function canTransitionStatus(
  from: ProjectStatus | null,
  to: ProjectStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === null) {
    if (to === 'planning') return { ok: true };
    return { ok: false, reason: 'New project must start in planning status' };
  }
  if (from === to) return { ok: true };
  if (from === 'completed') return { ok: false, reason: 'Completed projects cannot change status' };
  if (from === 'cancelled') return { ok: false, reason: 'Cancelled projects cannot change status' };
  if (from === 'active' && to === 'planning') {
    return { ok: false, reason: 'Use on_hold instead of going back to planning' };
  }
  return { ok: true };
}

/** Sequence generator — PRJ/YY-YY/NNNN format. */
export function nextProjectCode(entityCode: string): string {
  const fy = computeFYShort(new Date());
  const seqKey = `erp_doc_seq_PRJ_${entityCode}`;
  // [JWT] POST /api/projx/projects/next-no
  const raw = localStorage.getItem(seqKey);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  localStorage.setItem(seqKey, String(seq));
  return `PRJ/${fy}/${String(seq).padStart(4, '0')}`;
}

function computeFYShort(date: Date): string {
  const m = date.getMonth();
  const y = date.getFullYear();
  const fyStart = m >= 3 ? y : y - 1;
  return `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
}

/** Hookpoint stub for 1.5.7 · returns no milestones in 1.1.2-b */
export function inferMilestonesFromQuotation(): never[] {
  return [];
}

/** Hookpoint stub for 1.6.1 · returns null in 1.1.2-b */
export function computeScheduleRiskIndex(): number | null {
  return null;
}

/** Build initial status_history event for new project */
export function makeInitialStatusEvent(
  changedBy: { id: string; name: string },
  initialStatus: ProjectStatus = 'planning',
): ProjectStatusEvent {
  return {
    id: `pse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from_status: null,
    to_status: initialStatus,
    changed_by_id: changedBy.id,
    changed_by_name: changedBy.name,
    changed_at: new Date().toISOString(),
    note: 'Project created',
  };
}

/** Build a status transition event */
export function makeStatusEvent(
  fromStatus: ProjectStatus,
  toStatus: ProjectStatus,
  changedBy: { id: string; name: string },
  note: string,
): ProjectStatusEvent {
  return {
    id: `pse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from_status: fromStatus,
    to_status: toStatus,
    changed_by_id: changedBy.id,
    changed_by_name: changedBy.name,
    changed_at: new Date().toISOString(),
    note: note || `Status changed from ${fromStatus} to ${toStatus}`,
  };
}
