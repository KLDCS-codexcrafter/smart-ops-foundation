/**
 * projx-engine.ts — Pure helpers for ProjX (Project Management hub)
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · ProjX Foundation
 *
 * No side effects, no localStorage writes EXCEPT the documented sequence helper
 * (mirrors nextAssetCentreCode pattern that already touches localStorage).
 *
 * D-216 LOCKED: P&L is computed live, never persisted.
 * Decimal.js (dMul / dAdd / round2) for ALL money math.
 */
import type { Project, ProjectStatus, ProjectStatusEvent } from '@/types/projx/project';
import { round2 } from '@/lib/decimal-helpers';

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

/** Stub engine for 1.1.2-a · full multi-method costing in Phase 1.3.1 */
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
    cost_committed: 0,                       // 1.1.2-b populates from open POs
    margin_amount,
    margin_pct,
    computed_at: new Date().toISOString(),
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

/** Sequence generator — PRJ/YY-YY/NNNN format. NOTE: touches localStorage (intentional, mirrors AssetCentre seq pattern). */
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
  // YY-YY for Indian FY (April-March)
  const m = date.getMonth();
  const y = date.getFullYear();
  const fyStart = m >= 3 ? y : y - 1;
  return `${String(fyStart).slice(-2)}-${String(fyStart + 1).slice(-2)}`;
}

/** Hookpoint stub for 1.5.7 · returns no milestones in 1.1.2-a */
export function inferMilestonesFromQuotation(): never[] {
  return [];
}

/** Hookpoint stub for 1.6.1 · returns null in 1.1.2-a */
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
