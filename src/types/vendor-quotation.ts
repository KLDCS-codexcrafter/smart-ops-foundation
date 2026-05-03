/**
 * vendor-quotation.ts — Vendor quotations submitted in response to RFQ
 * Sprint T-Phase-1.2.6f-a
 * [JWT] GET /api/procure360/vendor-quotations
 */

export type VendorQuotationStatus =
  | 'draft' | 'submitted' | 'under_review' | 'awarded' | 'rejected' | 'expired';

export type QuotationSubmissionSource =
  | 'portal_submission' | 'manual_entry' | 'email_offline'
  | 'whatsapp_offline' | 'phone_offline';

export interface VendorQuotationLine {
  id: string;
  line_no: number;
  enquiry_line_id: string;
  item_id: string;
  qty_quoted: number;
  rate: number;
  discount_percent: number;
  tax_percent: number;
  amount_after_tax: number;
  delivery_days: number;
  remarks: string;
  is_supplied: boolean;
}

export interface VendorQuotation {
  id: string;
  quotation_no: string;
  parent_rfq_id: string;
  parent_enquiry_id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  lines: VendorQuotationLine[];
  total_value: number;
  total_tax: number;
  total_after_tax: number;
  payment_terms: string;
  payment_terms_days: number;
  delivery_terms: string;
  validity_days: number;
  validity_until: string;
  vendor_gstin: string | null;
  vendor_msme_status: 'micro' | 'small' | 'medium' | 'none' | null;
  tds_section: string | null;
  rcm_applicable: boolean;
  source: QuotationSubmissionSource;
  submitted_at: string;
  submitted_by: string;
  is_awarded: boolean;
  award_at: string | null;
  award_remarks: string | null;
  status: VendorQuotationStatus;
  created_at: string;
  updated_at: string;
}

export const vendorQuotationsKey = (entityCode: string): string =>
  `erp_vendor_quotations_${entityCode}`;
