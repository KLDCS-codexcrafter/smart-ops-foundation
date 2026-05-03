/**
 * procurement-enquiry.ts — Procurement Enquiry voucher types
 * Sprint T-Phase-1.2.6f-a · per founder Procurement_management.docx
 * [JWT] GET /api/procure360/enquiries
 */

export type ProcurementEnquiryStatus =
  | 'draft' | 'submitted'
  | 'pending_approval' | 'approved' | 'rejected' | 'hold'
  | 'rfq_generation_pending' | 'rfqs_dispatched'
  | 'quotations_pending' | 'quotations_received'
  | 'award_pending' | 'awarded' | 'cancelled' | 'closed';

export type VendorSelectionMode = 'single' | 'scoring' | 'floating';

export interface VendorSelectionOverride {
  line_id: string;
  mode: VendorSelectionMode;
  reason: string;
}

export interface ProcurementEnquiryLine {
  id: string;
  line_no: number;
  source_indent_id: string | null;
  source_indent_line_id: string | null;
  item_id: string;
  item_name: string;
  uom: string;
  required_qty: number;
  current_stock_qty: number;
  estimated_rate: number | null;
  estimated_value: number | null;
  required_date: string;
  schedule_date: string;
  vendor_mode_override: VendorSelectionMode | null;
  override_reason: string | null;
  matched_vendor_ids: string[];
  remarks: string;
  status: ProcurementEnquiryStatus;
}

export interface ItemVendorMatchPair {
  line_id: string;
  item_id: string;
  vendor_id: string;
  is_matched: boolean;
  override_reason: string | null;
}

export interface ItemVendorOverride {
  line_id: string;
  vendor_id: string;
  reason: string;
  approved_by_user_id: string;
  approved_at: string;
}

export interface ProcurementEnquiry {
  id: string;
  enquiry_no: string;
  enquiry_date: string;
  entity_id: string;
  branch_id: string | null;
  division_id: string | null;
  department_id: string | null;
  cost_center_id: string | null;
  source_indent_ids: string[];
  is_standalone: boolean;
  standalone_approval_tier: 1 | 2 | 3 | null;
  vendor_mode: VendorSelectionMode;
  selected_vendor_ids: string[];
  vendor_overrides: VendorSelectionOverride[];
  item_vendor_matrix: ItemVendorMatchPair[];
  matrix_overrides: ItemVendorOverride[];
  lines: ProcurementEnquiryLine[];
  requested_by_user_id: string;
  hod_id: string | null;
  purchase_manager_id: string | null;
  director_id: string | null;
  approval_stage: 'hod' | 'purchase' | 'director' | null;
  rfq_ids: string[];
  awarded_quotation_ids: string[];
  award_notes: string;
  awarded_at: string | null;
  awarded_by_user_id: string | null;
  notes: string;
  status: ProcurementEnquiryStatus;
  created_at: string;
  updated_at: string;
}

export const procurementEnquiriesKey = (entityCode: string): string =>
  `erp_procurement_enquiries_${entityCode}`;
