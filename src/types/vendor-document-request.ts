/**
 * @file        src/types/vendor-document-request.ts
 * @purpose     Vendor document request tracker · requested → submitted → verified · overdue auto-flag
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   ccc reference (vendor_document_requests) · references VendorComplianceRecord (doc_type)
 */

export type DocumentRequestStatus =
  | 'requested'
  | 'submitted'
  | 'verified'
  | 'overdue';

export interface VendorDocumentRequest {
  id: string;
  vendor_id: string;
  doc_type: string;
  requested_at: string;
  due_date?: string;
  status: DocumentRequestStatus;
  submitted_ref?: string;
  submitted_at?: string;
  verified_at?: string;
  notes?: string;
}

export const vendorDocRequestsKey = (entityCode: string): string =>
  `erp_vendor_document_requests_${entityCode}`;
