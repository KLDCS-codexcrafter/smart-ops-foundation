/**
 * @file        capital-indent.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Capital Indent (CAPEX) type · always Finance gate (tier 3)
 * @decisions   D-218, D-220, D-230, D-232, D-234
 * @disciplines SD-13, SD-15, SD-16
 * @[JWT]       erp_capital_indents_<entityCode>
 */
import type { ApprovalEvent, CascadeReason, IndentStatus, MaterialIndentLine, Priority } from './material-indent';

export type CapitalSubType = 'machinery' | 'furniture' | 'computer' | 'vehicle' | 'tools';

export interface CapitalIndentLine extends Omit<MaterialIndentLine, 'cascade_reason'> {
  fixed_asset_pre_link_pending: boolean;
  cwip_account_id: string;
  expected_useful_life_years: number;
  depreciation_method: 'slm' | 'wdv' | null;
}

export interface CapitalIndent {
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
  capital_sub_type: CapitalSubType;
  priority: Priority;
  requested_by_user_id: string;
  requested_by_name: string;
  hod_user_id: string;
  project_id: string | null;
  preferred_vendor_id: string | null;
  lines: CapitalIndentLine[];
  total_estimated_value: number;
  status: IndentStatus;
  approval_tier: 3;
  pending_approver_user_id: string | null;
  approval_history: ApprovalEvent[];
  finance_gate_required: true;
  parent_indent_id: string | null;
  cascade_reason: CascadeReason;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

// [JWT] GET/PUT /api/requestx/capital-indents?entityCode=...
export const capitalIndentsKey = (entityCode: string) => `erp_capital_indents_${entityCode}`;
