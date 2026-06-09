/**
 * @file        src/types/vendor-document-request.ts
 * @purpose     Admin-to-vendor document request · "please upload your renewed GST cert" workflow
 * @sprint      T-VPG-VendorPortal-Gaps
 * @decisions   D-NEW-DN · CCC reference shape
 */

export type DocumentRequestStatus = 'pending' | 'sent' | 'submitted' | 'verified' | 'rejected' | 'cancelled';

export interface VendorDocumentRequest {
  id: string;
  party_id: string;
  entity_code: string;
  document_type: string;                  // 'gst' | 'pan' | 'msme' | 'iso' | 'bank' | 'address' | custom
  document_label: string;
  reason?: string;
  due_date?: string;                      // ISO date
  status: DocumentRequestStatus;
  requested_by?: string;
  requested_at: string;
  sent_at?: string;
  submitted_at?: string;
  submitted_compliance_record_id?: string; // links to VendorComplianceRecord once vendor uploads
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  reminder_count: number;
  last_reminder_at?: string;
  created_at: string;
  updated_at: string;
}

export const vendorDocumentRequestKey = (entityCode: string): string =>
  `erp_vendor_document_requests_${entityCode}`;
