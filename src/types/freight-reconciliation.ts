/**
 * freight-reconciliation.ts — Match results + dispute types + tolerance hierarchy
 * Sprint 15c-1. Pure data types.
 * [JWT] GET/POST /api/dispatch/match-lines, /api/dispatch/disputes
 */

import type { PayerModel } from './transporter-invoice';

export type MatchStatus =
  | 'exact_match'
  | 'within_tolerance'
  | 'over_billed'
  | 'under_billed'
  | 'ghost_lr'
  | 'missing_rate_card'
  | 'missing_weight'
  | 'rate_calc_failed';

export interface ToleranceConfig {
  pct: number;
  amount_paise: number;
  source: 'invoice' | 'rate_card' | 'tenant_default';
}

export interface MatchLine {
  id: string;
  entity_id: string;
  invoice_id: string;
  invoice_line_id: string;
  lr_no: string;
  dln_voucher_id?: string | null;
  dln_voucher_no?: string | null;
  expected_amount: number;
  declared_amount: number;
  variance_amount: number;
  variance_pct: number;
  status: MatchStatus;
  tolerance_used: ToleranceConfig;
  payer_model: PayerModel;
  auto_decision: 'approve' | 'flag' | 'dispute' | 'none';
  final_decision?: 'approve' | 'reject' | 'dispute' | 'pending';
  decided_by?: string;
  decided_at?: string;
  dispute_id?: string | null;
  notes?: string;
  computed_at: string;
}
export const matchLinesKey = (e: string) => `erp_freight_match_lines_${e}`;

export type DisputeStatus =
  | 'raised'
  | 'under_review'
  | 'response_received'
  | 'resolved_in_favor_of_us'
  | 'resolved_in_favor_of_transporter'
  | 'resolved_split'
  | 'escalated'
  | 'withdrawn';

export interface DisputeEvent {
  at: string;
  by: string;
  action: 'raised' | 'notified' | 'response' | 'review' | 'resolved' | 'escalated' | 'withdrawn';
  notes?: string;
}

export interface Dispute {
  id: string;
  entity_id: string;
  invoice_id: string;
  match_line_id: string;
  lr_no: string;
  logistic_id: string;
  logistic_name: string;
  dispute_reason: string;
  amount_in_dispute: number;
  variance_amount: number;
  variance_pct: number;
  status: DisputeStatus;
  raised_at: string;
  raised_by: string;
  response_text?: string;
  response_at?: string;
  response_from?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_amount?: number;
  resolution_notes?: string;
  history: DisputeEvent[];
  created_at: string;
  updated_at: string;
}

export const disputesKey = (e: string) => `erp_disputes_${e}`;

/** Tenant-level default tolerance settings. */
export interface TenantToleranceDefault {
  tolerance_pct: number;
  tolerance_amount_paise: number;
  escalation_variance_pct: number;
  escalation_amount_paise: number;
  updated_at: string;
  updated_by: string;
}
export const tenantTolerancesKey = (e: string) => `erp_freight_tolerance_${e}`;

export const DEFAULT_TENANT_TOLERANCE: TenantToleranceDefault = {
  tolerance_pct: 5,
  tolerance_amount_paise: 50000,
  escalation_variance_pct: 10,
  escalation_amount_paise: 500000,
  updated_at: new Date(0).toISOString(),
  updated_by: 'system',
};
