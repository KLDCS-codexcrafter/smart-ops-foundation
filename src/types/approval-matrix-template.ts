/**
 * @file        approval-matrix-template.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block E1
 * @purpose     Approval Matrix Templates · per-entity (SD-15) · per-voucher_kind.
 * @[JWT]       erp_approval_matrix_templates_<entityCode>
 */
import type { IndentVoucherKind } from './requisition-common';

export interface ApprovalTemplateRequiredApproval {
  role: string;
  avg_response_hours: number;
  is_mandatory: boolean;
}

export interface ApprovalTemplateTier {
  tier_no: 1 | 2 | 3;
  threshold_min: number;
  threshold_max: number;
  required_approvals: ApprovalTemplateRequiredApproval[];
}

export interface ApprovalMatrixTemplate {
  id: string;
  entity_id: string;
  voucher_kind: IndentVoucherKind | 'all';
  name: string;
  is_default: boolean;
  is_active: boolean;
  tiers: ApprovalTemplateTier[];
  created_at: string;
  updated_at: string;
}

export const approvalMatrixTemplatesKey = (entityCode: string): string =>
  `erp_approval_matrix_templates_${entityCode}`;
