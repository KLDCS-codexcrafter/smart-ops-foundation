/**
 * @file        rate-contract.ts
 * @sprint      T-Phase-1.2.6f-c-3 · Blocks E-G · per D-293
 * @purpose     Rate Contract — vendor-locked rate for a SKU/HSN over a validity window.
 *              Used by PO creation to auto-fill rate · enforce ceiling · drive Best Price reports.
 */

export type RateContractStatus = 'draft' | 'active' | 'expired' | 'cancelled';

export interface RateContractLine {
  id: string;
  item_id: string;
  item_name: string;
  hsn_sac: string;
  uom: string;
  agreed_rate: number;       // ₹ per unit
  ceiling_rate: number;      // ₹ per unit · max purchase rate
  min_qty: number;
  max_qty: number;
  tax_pct: number;
  notes: string;
}

export interface RateContract {
  id: string;
  contract_no: string;
  contract_date: string;
  entity_id: string;

  vendor_id: string;
  vendor_name: string;

  valid_from: string;
  valid_to: string;

  currency: 'INR';
  payment_terms: string;
  delivery_terms: string;

  lines: RateContractLine[];

  total_value: number;       // sum of (agreed_rate * max_qty) for reporting

  status: RateContractStatus;
  notes: string;

  created_by: string;
  created_at: string;
  updated_at: string;
}

export const rateContractKey = (e: string): string => `erp_rate_contracts_${e}`;
