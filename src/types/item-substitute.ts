/**
 * item-substitute.ts — Approved substitute materials per item.
 * Sprint T-Phase-1.2.5
 */

export type SubstituteApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ItemSubstitute {
  id: string;
  entity_id: string;

  primary_item_id: string;
  primary_item_code: string;
  primary_item_name: string;

  substitute_item_id: string;
  substitute_item_code: string;
  substitute_item_name: string;

  /** 1 unit primary = ratio units substitute */
  ratio: number;

  scenarios: string[];
  notes: string | null;

  approval_status: SubstituteApprovalStatus;
  approved_by_id: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  approval_doc_ref: string | null;

  effective_from: string;
  effective_until: string | null;
  is_active: boolean;

  used_count: number;
  last_used_at: string | null;

  created_at: string;
  updated_at: string;
}

export const itemSubstitutesKey = (entityCode: string): string =>
  `erp_item_substitutes_${entityCode}`;
