/**
 * @file        src/types/vendor-payment-batch.ts
 * @purpose     Vendor payment batch · groups existing PaymentRequisition IDs · FY-stamped · 8yr retention
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · gst_8yr retention floor at birth
 * @disciplines FR-30 · FR-50 · FR-79
 * @[JWT]       N/A · this is grouping metadata · NEVER duplicates existing
 *              PaymentRequisition rows or mutates accounting · disbursement runs through
 *              existing PayOut engines unchanged
 */

import type { RetentionPolicyId } from './record-retention';

export type PaymentBatchStatus = 'draft' | 'queued' | 'released' | 'failed' | 'cancelled';
export type PaymentBatchChannel = 'bank_neft' | 'bank_rtgs' | 'bank_imps' | 'cheque' | 'cash' | 'other';

export interface VendorPaymentBatchLine {
  payment_requisition_id: string;
  party_id: string;
  amount_paise: number;
}

export interface VendorPaymentBatch {
  id: string;
  entity_code: string;
  financial_year: string;
  retention_policy: RetentionPolicyId;     // gst_8yr at birth
  batch_no: string;
  scheduled_date: string;                  // ISO date
  channel: PaymentBatchChannel;
  lines: VendorPaymentBatchLine[];
  line_count: number;
  total_amount_paise: number;
  status: PaymentBatchStatus;
  created_by?: string;
  released_by?: string;
  released_at?: string;
  failure_reason?: string;
  cancelled_at?: string;
  cancelled_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const vendorPaymentBatchKey = (entityCode: string): string =>
  `erp_vendor_payment_batches_${entityCode}`;
