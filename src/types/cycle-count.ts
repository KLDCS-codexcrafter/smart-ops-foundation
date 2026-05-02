/**
 * cycle-count.ts — Physical stocktaking with two-step approval workflow.
 * Sprint T-Phase-1.2.6 · Card #2 sub-sprint 6/6
 *
 * Voucher: existing vt-physical-stock (PSV)
 * Workflow: draft → submitted → approved → posted
 *
 * [JWT] GET/POST/PATCH /api/inventory/cycle-counts
 */

export type CycleCountKind = 'random' | 'periodic_bin' | 'annual_stocktake';
export type CycleCountStatus =
  | 'draft' | 'submitted' | 'approved' | 'rejected' | 'posted' | 'cancelled';

export type VarianceReason =
  | 'count_error'
  | 'pilferage'
  | 'damaged'
  | 'found'
  | 'system_error'
  | 'shrinkage'
  | 'expired'
  | 'unidentified';

export interface CycleCountLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  godown_id: string;
  godown_name: string;
  bin_id: string | null;
  bin_code: string | null;

  system_qty: number;
  physical_qty: number;
  variance_qty: number;
  weighted_avg_rate: number;
  variance_value: number;

  variance_reason: VarianceReason | null;
  variance_notes: string | null;

  recount_qty: number | null;
  recount_at: string | null;
  recount_by_id: string | null;
  recount_by_name: string | null;
}

export interface CycleCount {
  id: string;
  entity_id: string;

  count_no: string;
  count_kind: CycleCountKind;
  count_date: string;
  godown_id: string | null;
  godown_name: string | null;
  bin_filter: string[] | null;
  abc_class_filter: ('A' | 'B' | 'C')[] | null;

  counter_id: string | null;
  counter_name: string | null;
  reviewer_id: string | null;
  reviewer_name: string | null;
  approver_id: string | null;
  approver_name: string | null;

  status: CycleCountStatus;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  posted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;

  lines: CycleCountLine[];

  total_lines: number;
  variance_lines: number;
  total_variance_qty_abs: number;
  total_variance_value: number;
  net_shrinkage_pct: number;

  notes: string | null;
  /** Sprint T-Phase-1.2.5h-b1 · CGST Rule 56(8) edit/delete chain */
  superseded_by?: string | null;
  version?: number;
  /** D-226 UTS · accounting effective date; falls back to primary date when null. */
  effective_date?: string | null;
  /** D-228 Universal Transaction Header (UTH) — all optional · backward compat preserved */
  narration?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  cancel_reason?: string | null;
  reference_no?: string | null;
  voucher_hash?: string | null;
  currency_code?: string | null;
  exchange_rate?: number | null;
  created_at: string;
  updated_at: string;
}

export const cycleCountsKey = (entityCode: string) =>
  `erp_cycle_counts_${entityCode}`;

export const VARIANCE_REASON_LABELS: Record<VarianceReason, string> = {
  count_error:    'Count Error',
  pilferage:      'Pilferage / Theft',
  damaged:        'Damaged',
  found:          'Found (Not in System)',
  system_error:   'System Error',
  shrinkage:      'Shrinkage / Evaporation',
  expired:        'Expired (Disposed)',
  unidentified:   'Unidentified Loss',
};

export const COUNT_STATUS_COLORS: Record<CycleCountStatus, string> = {
  draft:     'bg-gray-500/10 text-gray-700 border-gray-500/30',
  submitted: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  approved:  'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected:  'bg-red-500/10 text-red-700 border-red-500/30',
  posted:    'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  cancelled: 'bg-gray-500/10 text-gray-700 border-gray-500/30',
};

export const COUNT_KIND_LABELS: Record<CycleCountKind, string> = {
  random:           'Random',
  periodic_bin:     'Periodic Bin',
  annual_stocktake: 'Annual Stocktake',
};

export interface CycleCountSuggestion {
  item_id: string;
  item_name: string;
  abc_class: 'A' | 'B' | 'C' | null;
  last_counted_at: string | null;
  days_since_count: number | null;
  threshold_days: number;
  is_overdue: boolean;
  overdue_by_days: number;
}
