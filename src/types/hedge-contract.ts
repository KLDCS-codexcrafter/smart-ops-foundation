/**
 * @file        src/types/hedge-contract.ts
 * @purpose     HedgeContract · forward currency contract · forex risk management
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q3=a sibling pattern · currency.ts STAYS 0-diff
 */

export type HedgeDirection = 'forward_sell' | 'forward_buy';

export type HedgeStatus = 'open' | 'matured_settled' | 'matured_unsettled' | 'cancelled';

export const HEDGE_VALID_TRANSITIONS: Record<HedgeStatus, HedgeStatus[]> = {
  open: ['matured_settled', 'matured_unsettled', 'cancelled'],
  matured_settled: [],
  matured_unsettled: ['matured_settled'],
  cancelled: [],
};

export interface HedgeContract {
  id: string;
  hedge_contract_no: string;
  entity_id: string;
  status: HedgeStatus;
  direction: HedgeDirection;

  ad_bank_code: string;
  ad_bank_name: string;

  currency_code: string;
  notional_amount_foreign: number;
  forward_rate_locked: number;
  notional_amount_inr_at_lock: number;

  booking_date: string;
  maturity_date: string;
  settlement_date: string | null;

  linked_export_po_id: string | null;
  linked_import_po_id: string | null;
  is_speculative: boolean;

  spot_rate_at_maturity: number | null;
  settlement_variance_inr: number;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const hedgeContractKey = (entityCode: string): string =>
  `erp_${entityCode}_hedge_contracts`;
