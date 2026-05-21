/**
 * @file        src/types/form-3ceb.ts
 * @purpose     D-NEW-FE · Form 3CEB SIBLING type · CA-certified Section 92E TP report
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block C
 * @decisions   Q-LOCK-5(a) 8th SIBLING · Q-LOCK-8(a) 1 NEW FR-26 layer · immutable post-CA-signing
 * @discipline  ADDITIVE type · does NOT redefine TPDocumentation/ImportPO/ExportPO/Form15CA
 */

export type Form3CEBStatus =
  | 'draft'
  | 'review_pending'
  | 'ca_signed'
  | 'filed_with_dgit'
  | 'amended';

export type ALPMethodCode = 'CUP' | 'RPM' | 'CPM' | 'PSM' | 'TNMM' | 'OTHER';

export interface RelatedPartyTransaction {
  transaction_id: string;
  party_name: string;
  party_country: string;
  party_relationship: 'parent' | 'subsidiary' | 'associate' | 'joint_venture' | 'other_related';
  transaction_type: 'goods_import' | 'goods_export' | 'services_received' | 'services_rendered' | 'loan' | 'royalty' | 'tt_payment_15ca';
  total_value_inr: number;
  alp_method_used: ALPMethodCode;
  is_at_arms_length: boolean;
  related_po_ids: string[];
}

export interface Form3CEBSnapshot {
  id: string;
  snapshot_no: string;
  entity_id: string;
  financial_year: string;
  status: Form3CEBStatus;

  total_international_transactions_inr: number;
  threshold_inr: number;
  is_above_threshold: boolean;
  filing_due_date: string;

  ca_membership_no: string | null;
  ca_signed_at: string | null;
  ca_digital_signature_hash: string | null;

  dgit_acknowledgment_no: string | null;
  filed_at: string | null;

  related_party_transactions: RelatedPartyTransaction[];
  total_related_parties: number;

  notes: string;
  created_at: string;
  updated_at: string;
}

export const form3CEBSnapshotKey = (entityCode: string): string =>
  `erp_${entityCode}_eximx_form_3ceb_snapshots`;

export const FORM_3CEB_THRESHOLD_INR = 10_000_000;
export const FORM_3CEB_FILING_MONTH_DAY = '09-30';
