/**
 * @file        src/types/vendor-dcn.ts
 * @purpose     Vendor Debit/Credit Note intent registry · FY-stamped · 8yr retention
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · gst_8yr retention floor honored at birth
 * @disciplines FR-30 · FR-50 · FR-79 (FY-stamping)
 * @[JWT]       N/A (type) — Phase-2: real DN/CN accounting voucher emission lives in FinCore
 *
 * NOTE: This is an INTENT registry only. Actual debit/credit accounting vouchers
 * are written by existing FinCore voucher engines · this type DOES NOT mutate
 * any accounting ledger.
 */

import type { RetentionPolicyId } from './record-retention';

export type DcnKind = 'debit_note' | 'credit_note';
export type DcnReason =
  | 'rate_difference'
  | 'quantity_difference'
  | 'quality_rejection'
  | 'discount_post_invoice'
  | 'tax_correction'
  | 'other';
export type DcnStatus = 'draft' | 'submitted' | 'approved' | 'voucher_posted' | 'cancelled';

export interface VendorDcn {
  id: string;
  party_id: string;
  entity_code: string;
  financial_year: string;                  // FR-79 stamp · e.g. '2026-27'
  retention_policy: RetentionPolicyId;     // P8.6 floor · gst_8yr
  kind: DcnKind;
  reason: DcnReason;
  reason_note?: string;
  reference_voucher_id?: string;           // ref to original bill/invoice (read-only)
  reference_voucher_no?: string;
  amount_paise: number;                    // strict integer paise per Indian locale rule
  tax_amount_paise?: number;
  status: DcnStatus;
  posted_voucher_id?: string;              // populated after FinCore voucher posted
  created_by?: string;
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const vendorDcnKey = (entityCode: string): string =>
  `erp_vendor_dcn_${entityCode}`;
