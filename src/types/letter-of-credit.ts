/**
 * @file        src/types/letter-of-credit.ts
 * @purpose     D-NEW-FJ · Letter of Credit SIBLING type · 10th SIBLING application
 * @sprint      T-Phase-2.A-EX-12-LC-PackingCredit · Block A
 * @decisions   Q-LOCK-3(a) SIBLING type · ExportPurchaseOrder STAYS 0-DIFF · additive only
 * @discipline  Does NOT redefine ExportPurchaseOrder · purely augmentative LC entity
 */

export type LCStatus =
  | 'draft'
  | 'opened'
  | 'advised'
  | 'confirmed'
  | 'amended'
  | 'documents_presented'
  | 'negotiated'
  | 'settled'
  | 'expired'
  | 'cancelled';

export type LCType =
  | 'irrevocable_sight'
  | 'irrevocable_usance'
  | 'confirmed_irrevocable'
  | 'standby'
  | 'transferable'
  | 'red_clause';

export interface LCAmendment {
  amendment_no: number;
  amended_at: string;
  amended_by: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  buyer_consent_received: boolean;
}

export const LC_VALID_TRANSITIONS: Record<LCStatus, LCStatus[]> = {
  draft: ['opened', 'cancelled'],
  opened: ['advised', 'amended', 'cancelled'],
  advised: ['confirmed', 'amended', 'documents_presented', 'expired'],
  confirmed: ['amended', 'documents_presented', 'expired'],
  amended: ['advised', 'confirmed', 'cancelled'],
  documents_presented: ['negotiated', 'amended'],
  negotiated: ['settled'],
  settled: [],
  expired: [],
  cancelled: [],
};

export interface LetterOfCredit {
  id: string;
  lc_no: string;
  entity_id: string;
  status: LCStatus;
  lc_type: LCType;

  related_export_po_id: string;
  related_export_po_no: string;
  related_foreign_customer_id: string;

  issuing_bank_swift: string;
  issuing_bank_name: string;
  issuing_bank_country: string;

  advising_bank_swift: string;
  advising_bank_name: string;
  advising_ad_bank_code: string;

  confirming_bank_swift: string | null;
  confirming_bank_name: string | null;

  negotiating_bank_swift: string | null;
  negotiating_bank_name: string | null;

  currency_code: string;
  lc_amount_foreign: number;
  lc_amount_inr_at_open: number;
  tolerance_pct: number;

  open_date: string;
  expiry_date: string;
  latest_shipment_date: string;
  payment_terms_days: number;
  presentation_period_days: number;

  required_documents: string[];
  partial_shipment_allowed: boolean;
  transshipment_allowed: boolean;

  amendments: LCAmendment[];
  documents_presented_at: string | null;
  negotiated_at: string | null;
  settled_at: string | null;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const lcKey = (entityCode: string): string =>
  `erp_${entityCode}_eximx_letters_of_credit`;

export const STANDARD_LC_DOCUMENT_SET: string[] = [
  'commercial_invoice',
  'packing_list',
  'bill_of_lading',
  'certificate_of_origin',
  'insurance_policy',
];
