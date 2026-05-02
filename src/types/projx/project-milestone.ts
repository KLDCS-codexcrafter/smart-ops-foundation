/**
 * project-milestone.ts — Milestone definition + status + invoice linkage
 * Sprint T-Phase-1.1.2-b · ProjX Transactions
 */

export type MilestoneStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'blocked';

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
  blocked:     'Blocked',
};

export const MILESTONE_STATUS_COLORS: Record<MilestoneStatus, string> = {
  pending:     'bg-slate-500/10 text-slate-700 border-slate-500/30',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  completed:   'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  cancelled:   'bg-red-500/10 text-red-700 border-red-500/30',
  blocked:     'bg-amber-500/10 text-amber-700 border-amber-500/30',
};

export interface ProjectMilestone {
  id: string;
  entity_id: string;
  project_id: string;
  project_centre_id: string;

  milestone_no: string;                      // M-01, M-02
  milestone_name: string;
  description: string;

  target_date: string;
  actual_completion_date: string | null;
  status: MilestoneStatus;

  invoice_pct: number;                       // 0-100
  invoice_amount: number;                    // computed via dMul + round2
  is_billed: boolean;
  invoice_voucher_id: string | null;
  invoice_voucher_no: string | null;

  blocks_milestone_ids: string[];

  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  created_at: string;
  updated_at: string;
}

export const projectMilestonesKey = (entityCode: string): string =>
  `erp_project_milestones_${entityCode}`;
export const MILESTONE_SEQ_KEY = (entityCode: string, projectId: string): string =>
  `erp_doc_seq_MS_${entityCode}_${projectId}`;

export function canTransitionMilestoneStatus(
  from: MilestoneStatus,
  to: MilestoneStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: true };
  if (from === 'completed') return { ok: false, reason: 'Completed milestones cannot change status' };
  if (from === 'cancelled') return { ok: false, reason: 'Cancelled milestones cannot change status' };
  if (from === 'pending' && to === 'completed') {
    return { ok: false, reason: 'Move to In Progress before Completed' };
  }
  return { ok: true };
}
