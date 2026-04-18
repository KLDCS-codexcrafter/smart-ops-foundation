/**
 * credit-hold.ts — Credit hold enforcement types
 * Sprint 8. Dual mode: entity default + per-customer override.
 * [JWT] POST /api/receivx/credit-hold/check
 * [JWT] POST /api/receivx/credit-hold/override
 */

export type CreditHoldMode = 'hard_block' | 'soft_warn' | 'disabled';

export interface CreditHoldCheck {
  party_id: string;
  party_name: string;
  credit_limit: number;
  warning_limit: number;
  current_outstanding: number;
  overdue_outstanding: number;
  new_invoice_amount: number;
  projected_exposure: number;
  ratio: number;
  configured_ratio: number;
  over_limit_by: number;
  effective_mode: CreditHoldMode;
  is_blocked: boolean;
  is_warning: boolean;
  block_reason: string | null;
}

export interface CreditHoldOverride {
  id: string;
  entity_id: string;
  party_id: string;
  party_name: string;
  voucher_type: string;
  voucher_ref: string;
  amount: number;
  current_outstanding: number;
  credit_limit: number;
  over_limit_by: number;
  override_reason: string;
  approved_by_user: string;
  approved_at: string;
  created_at: string;
}

export const creditHoldAuditKey = (e: string) => `erp_credit_hold_audit_${e}`;

/** Per-customer field added to CustomerMasterDefinition */
export interface CustomerCreditHoldOverride {
  credit_hold_mode: CreditHoldMode | null; // null = use entity default
}

export const CREDIT_HOLD_MODE_LABELS: Record<CreditHoldMode, string> = {
  hard_block: 'Hard Block',
  soft_warn: 'Soft Warn',
  disabled: 'Disabled',
};
