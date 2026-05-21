/**
 * @file        src/types/packing-credit.ts
 * @purpose     D-NEW-FK · Packing Credit (PCFC + EPC) SIBLING type · 11th SIBLING application
 * @sprint      T-Phase-2.A-EX-12-LC-PackingCredit · Block B
 * @decisions   Q-LOCK-4(a) PCFC + EPC unified via discriminator · ExportPO + ExportRealisation STAY 0-DIFF
 */

export type PCVariant = 'PCFC' | 'EPC';

export type PCStatus =
  | 'draft'
  | 'sanctioned'
  | 'drawn'
  | 'partially_liquidated'
  | 'fully_liquidated'
  | 'overdue'
  | 'cancelled';

export const PC_VALID_TRANSITIONS: Record<PCStatus, PCStatus[]> = {
  draft: ['sanctioned', 'cancelled'],
  sanctioned: ['drawn', 'cancelled'],
  drawn: ['partially_liquidated', 'fully_liquidated', 'overdue'],
  partially_liquidated: ['partially_liquidated', 'fully_liquidated', 'overdue'],
  fully_liquidated: [],
  overdue: ['partially_liquidated', 'fully_liquidated', 'cancelled'],
  cancelled: [],
};

export interface PCLiquidationEvent {
  liquidation_no: number;
  liquidated_at: string;
  liquidated_via: 'export_realisation_receipt' | 'cash_payment' | 'rollover';
  related_realisation_id: string | null;
  amount_foreign: number;
  amount_inr: number;
  outstanding_remaining_inr: number;
}

export interface PackingCreditContract {
  id: string;
  pc_contract_no: string;
  entity_id: string;
  status: PCStatus;
  variant: PCVariant;

  related_export_po_id: string;
  related_export_po_no: string;
  related_foreign_customer_id: string;

  ad_bank_code: string;
  ad_bank_name: string;

  currency_code: string;
  sanctioned_amount_foreign: number;
  sanctioned_amount_inr: number;
  drawn_amount_foreign: number;
  drawn_amount_inr: number;

  interest_rate_pct: number;
  rbi_tenor_days: number;

  sanction_date: string;
  drawdown_date: string | null;
  liquidation_deadline: string;
  liquidations: PCLiquidationEvent[];

  outstanding_amount_inr: number;
  days_to_deadline: number;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const packingCreditKey = (entityCode: string): string =>
  `erp_${entityCode}_eximx_packing_credit_contracts`;

export const RBI_PC_TENOR_DAYS = 270;
