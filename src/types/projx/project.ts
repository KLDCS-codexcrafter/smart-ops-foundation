/**
 * project.ts — Project type + ProjectStatus + ProjectType + audit history
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1 · ProjX Foundation
 * Sister to AssetCentre · uses project_centre_id voucher field added in D-218
 *
 * Top 1% structural traits baked in:
 * - Live P&L (D-216): billed_to_date / cost_to_date are denormalized snapshots
 *   refreshed on read, never the source of truth
 * - Estimation snapshot hookpoint (1.5.7): estimation_snapshot_id field
 * - Change Request linkage hookpoint (1.5.7): original_contract_value + current_contract_value
 * - Audit-trail immutability: status_history array, append-only
 * - Schedule Risk Index hookpoint (1.6.1): schedule_risk_index field
 * - Export hookpoint (Card #14 EximX): is_export_project field
 * - Reference Project Library hookpoint (Card #5 EngineeringX): reference_project_id field
 * - Soft delete: deleted_at / deleted_by / deletion_reason
 */

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type ProjectType =
  | 'product_implementation'
  | 'service'
  | 'amc'
  | 'consulting'
  | 'turnkey';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  product_implementation: 'Product Implementation',
  service: 'Service',
  amc: 'AMC / Maintenance',
  consulting: 'Consulting',
  turnkey: 'Turnkey',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning:  'Planning',
  active:    'Active',
  on_hold:   'On Hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  planning:  'bg-blue-500/10 text-blue-700 border-blue-500/30',
  active:    'bg-green-500/10 text-green-700 border-green-500/30',
  on_hold:   'bg-amber-500/10 text-amber-700 border-amber-500/30',
  completed: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  cancelled: 'bg-red-500/10 text-red-700 border-red-500/30',
};

/** Append-only status transition record · audit trail */
export interface ProjectStatusEvent {
  id: string;
  from_status: ProjectStatus | null;       // null = initial creation
  to_status: ProjectStatus;
  changed_by_id: string;
  changed_by_name: string;
  changed_at: string;
  note: string;
}

export interface Project {
  id: string;
  entity_id: string;
  project_no: string;                       // PRJ/YY-YY/NNNN — central generateDocNo
  project_name: string;
  project_code: string;                     // short customer-facing code

  project_type: ProjectType;
  status: ProjectStatus;

  customer_id: string | null;               // FK to GroupCustomer
  customer_name: string | null;

  /** The cost-tagging join key — the single most important architectural field */
  project_centre_id: string;                // FK to ProjectCentre.id (mandatory)

  // ── Origin linkage (filled when "Convert from Quotation/SO" used) ──
  source_quotation_id: string | null;
  source_quotation_no: string | null;
  source_so_id: string | null;
  source_so_no: string | null;

  // ── Top 1% hookpoints (foundation for downstream cards) ──
  reference_project_id: string | null;
  estimation_snapshot_id: string | null;
  is_export_project: boolean;

  // ── Dates ──
  start_date: string;                        // YYYY-MM-DD
  target_end_date: string;
  actual_end_date: string | null;

  // ── Financials (live snapshots · D-216) ──
  original_contract_value: number;
  current_contract_value: number;
  contract_value: number;
  billed_to_date: number;
  cost_to_date: number;
  margin_pct: number;
  change_request_count: number;

  // ── Project Manager ──
  project_manager_id: string | null;
  project_manager_name: string | null;

  // ── Milestones (denormalized · 1.1.2-b populates) ──
  milestone_count: number;
  milestones_completed: number;

  // ── Predictive (1.6.1 InsightX) ──
  schedule_risk_index: number | null;

  // ── Audit trail (append-only) ──
  status_history: ProjectStatusEvent[];

  // ── Standard fields ──
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // ── Soft delete ──
  deleted_at: string | null;
  deleted_by_id: string | null;
  deletion_reason: string | null;
}

export const projectsKey = (entityCode: string): string =>
  `erp_projects_${entityCode}`;
export const PROJECT_SEQ_KEY = (entityCode: string): string =>
  `erp_doc_seq_PRJ_${entityCode}`;
