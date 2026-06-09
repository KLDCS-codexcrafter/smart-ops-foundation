/**
 * @file        src/types/vendor-payment-batch.ts
 * @purpose     Vendor payment batch · GROUPS existing payment-requisition IDs (no duplicate accounting)
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_payment_batches) · CONSUMES PaymentRequisition (FR-44 wall)
 *              · FY-stamped · P8.6 retention floor honored at birth
 */
import type { RetentionPolicyId } from './record-retention';

export type PaymentBatchStatus = 'draft' | 'approved' | 'released' | 'cancelled';

export interface VendorPaymentBatch {
  id: string;
  batch_no: string;
  fiscal_year_id: string;
  requisition_ids: string[];
  total_amount: number;
  status: PaymentBatchStatus;
  created_at: string;
  updated_at: string;
  released_at?: string;
  created_by?: string;
  notes?: string;
  retention_policy?: RetentionPolicyId;
}

export const vendorPaymentBatchesKey = (entityCode: string): string =>
  `erp_vendor_payment_batches_${entityCode}`;
