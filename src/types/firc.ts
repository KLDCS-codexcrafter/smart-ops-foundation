/**
 * @file        src/types/firc.ts
 * @purpose     FIRC · Foreign Inward Remittance Certificate · DISTINCT from EBRC (v7 Gap #2)
 * @sprint      T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
 * @decisions   EX-7c-Q2=a 3 distinct types
 */

export type FIRCStatus = 'pending' | 'issued' | 'allocated' | 'cancelled';

export interface FIRC {
  id: string;
  firc_no: string;
  entity_id: string;
  status: FIRCStatus;

  ad_bank_name: string;
  bank_credit_date: string;
  bank_credit_ref: string;
  remitting_bank: string;
  remitter_name: string;
  amount_foreign: number;
  amount_inr: number;
  realised_rate: number;
  currency_code: string;
  purpose_code: string;

  allocated_realisation_ids: string[];

  notes: string;
  created_at: string;
  updated_at: string;
}

export const fircKey = (entityCode: string): string => `erp_${entityCode}_fircs`;
