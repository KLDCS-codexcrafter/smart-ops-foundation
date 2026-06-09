/**
 * @file        src/types/vendor-dcn.ts
 * @purpose     Vendor Debit/Credit Note · FY-stamped · P8.6 retention floor honored at birth
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_debit_credit_notes + dcn_lines) · NOT an accounting voucher
 *              (records intent only · accounting flows through existing voucher path · 0-DIFF)
 */
import type { RetentionPolicyId } from './record-retention';

export type DcnType = 'debit' | 'credit';
export type DcnStatus = 'draft' | 'approved' | 'posted' | 'cancelled';

export interface VendorDcnLine {
  id: string;
  description: string;
  quantity?: number;
  rate?: number;
  amount: number;
  gst_rate_pct?: number;
  reference?: string;
}

export interface VendorDebitCreditNote {
  id: string;
  vendor_id: string;
  type: DcnType;
  dcn_no: string;
  fiscal_year_id: string;
  reason: string;
  lines: VendorDcnLine[];
  amount: number;
  status: DcnStatus;
  created_at: string;
  updated_at: string;
  created_by?: string;
  retention_policy?: RetentionPolicyId;
}

export const vendorDcnKey = (entityCode: string): string =>
  `erp_vendor_dcn_${entityCode}`;
