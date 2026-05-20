/**
 * @file        src/types/form-15ca-15cb.ts
 * @purpose     Form15CASubmission · CBDT Part A/B/C/D + CA certification · sibling to EX-3 Form15CASeed
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q2=a FULL workflow · import-purchase-order.ts STAYS 0-diff · sibling extension
 */

export type Form15CAPart = 'Part_A' | 'Part_B' | 'Part_C' | 'Part_D';

export const FORM_15CA_PART_DESCRIPTIONS: Record<Form15CAPart, string> = {
  Part_A: 'Remittance ≤ ₹5L · NO 15CB required · self-declaration only',
  Part_B: 'Remittance > ₹5L · order/certificate from AO (Assessing Officer) under section 195',
  Part_C: 'Remittance > ₹5L · 15CB from CA mandatory · TDS computed by CA',
  Part_D: 'Specified exempt remittance · DTAA / specified list · NO 15CB required',
};

export type Form15CAStatus =
  | 'draft'
  | 'ca_certification_pending'
  | 'ca_certified'
  | 'filed_with_efiling'
  | 'acknowledged'
  | 'rejected';

export const FORM_15CA_VALID_TRANSITIONS: Record<Form15CAStatus, Form15CAStatus[]> = {
  draft: ['ca_certification_pending', 'filed_with_efiling'],
  ca_certification_pending: ['ca_certified', 'rejected'],
  ca_certified: ['filed_with_efiling'],
  filed_with_efiling: ['acknowledged', 'rejected'],
  acknowledged: [],
  rejected: [],
};

export interface Form15CASubmission {
  id: string;
  form_15ca_ref: string;
  form_15cb_ref: string | null;
  entity_id: string;
  status: Form15CAStatus;
  part: Form15CAPart;

  related_import_po_id: string;
  related_tt_payment_id: string | null;

  rbi_purpose_code: string;
  amount_foreign: number;
  amount_inr: number;
  currency_code: string;

  ca_name: string;
  ca_membership_no: string;
  ca_certified_at: string | null;
  ca_digital_signature_ref: string | null;

  efiling_acknowledgment_no: string | null;
  efiling_filed_at: string | null;

  tds_rate_pct: number;
  tds_amount_inr: number;
  dtaa_country_code: string | null;
  dtaa_article_ref: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const form15CAKey = (entityCode: string): string =>
  `erp_${entityCode}_form_15ca_submissions`;
