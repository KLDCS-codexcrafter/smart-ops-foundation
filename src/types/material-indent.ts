/**
 * @file        material-indent.ts
 * @sprint      T-Phase-1.2.6f-pre-1 (RequestX Foundation)
 * @card        Card #3 · P2P arc · sub-arc RequestX
 * @date        2026-05-02
 * @purpose     Material Indent type · State Machine v3.0 (22 statuses) · D-218
 * @decisions   D-218, D-220, D-230, D-231, D-232, D-234
 * @disciplines SD-13, SD-15, SD-16
 * @reuses      None (new)
 * @[JWT]       erp_material_indents_<entityCode>
 */

export type IndentStatus =
  | 'draft' | 'submitted' | 'pending_hod' | 'pending_purchase' | 'pending_finance'
  | 'approved' | 'rejected' | 'hold' | 'rfq_created' | 'po_created'
  | 'partially_ordered' | 'closed' | 'pre_closed' | 'cancelled'
  | 'stock_available' | 'indent_promoted' | 'partial_fulfilled' | 'short_supplied'
  | 'substitute_received' | 're_indented' | 'quality_rejected_partial' | 'auto_pre_closed';

export type CascadeReason = 'short_supply' | 'qc_rejection' | 'substitute' | null;

export type Priority = 'low' | 'normal' | 'high' | 'urgent' | 'critical_shutdown';

export type IndentCategory =
  | 'import_purchase' | 'samples_purchase' | 'raw_material' | 'packaging_material'
  | 'printing_stationary' | 'housekeeping' | 'electrical';

export type StockCheckStatus = 'pending' | 'available' | 'unavailable' | 'partial';
export type StoreAction = null | 'issued' | 'promoted_to_indent';

export interface MaterialIndentLine {
  id: string;
  line_no: number;
  item_id: string;
  item_name: string;
  description: string;
  uom: string;
  qty: number;
  current_stock_qty: number;
  estimated_rate: number;
  estimated_value: number;
  required_date: string;
  schedule_qty: number | null;
  schedule_date: string | null;
  remarks: string;
  target_godown_id: string;
  target_godown_name: string;
  is_stocked: boolean;
  stock_check_status: StockCheckStatus;
  store_action: StoreAction;
  store_actor_id: string | null;
  store_action_at: string | null;
  parent_indent_line_id: string | null;
  cascade_reason: CascadeReason;
}

export interface ApprovalEvent {
  id: string;
  approver_user_id: string;
  approver_role: string;
  action: 'approved' | 'rejected' | 'sent_back' | 'on_hold' | 'cancelled';
  remarks: string;
  acted_at: string;
}

export interface MaterialIndent {
  id: string;
  entity_id: string;
  voucher_type_id: string;
  voucher_no: string;
  date: string;
  branch_id: string;
  division_id: string;
  originating_department_id: string;
  originating_department_name: string;
  cost_center_id: string;
  category: IndentCategory;
  sub_type: string;
  priority: Priority;
  requested_by_user_id: string;
  requested_by_name: string;
  hod_user_id: string;
  project_id: string | null;
  preferred_vendor_id: string | null;
  payment_terms: string | null;
  lines: MaterialIndentLine[];
  total_estimated_value: number;
  status: IndentStatus;
  approval_tier: 1 | 2 | 3;
  pending_approver_user_id: string | null;
  approval_history: ApprovalEvent[];
  parent_indent_id: string | null;
  cascade_reason: CascadeReason;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/requestx/material-indents?entityCode=...
export const materialIndentsKey = (entityCode: string) => `erp_material_indents_${entityCode}`;
