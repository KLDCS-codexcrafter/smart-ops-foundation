/**
 * @file        src/types/export-purchase-order.ts
 * @purpose     Export Purchase Order · sibling type · 7th sibling pattern · FIRST export-side sprint
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 * @decisions   EX-7a-Q1=b sibling · Q2=a mirror structure export semantics · Q3=a LUT hard gate · Q5=a reuse 11 Incoterm
 */
import type { IncotermType } from './foreign-customer';

export type ExportPOStatus =
  | 'draft'
  | 'pending_lut_validation'
  | 'lut_validated'
  | 'submitted_to_buyer'
  | 'accepted_by_buyer'
  | 'in_production'
  | 'ready_for_shipping'
  | 'shipped'
  | 'cancelled';

export const EXPORT_PO_VALID_TRANSITIONS: Record<ExportPOStatus, ExportPOStatus[]> = {
  draft: ['pending_lut_validation', 'cancelled'],
  pending_lut_validation: ['lut_validated', 'cancelled'],
  lut_validated: ['submitted_to_buyer', 'cancelled'],
  submitted_to_buyer: ['accepted_by_buyer', 'cancelled'],
  accepted_by_buyer: ['in_production', 'cancelled'],
  in_production: ['ready_for_shipping', 'cancelled'],
  ready_for_shipping: ['shipped'],
  shipped: [],
  cancelled: [],
};

export interface ExportPOLine {
  id: string;
  line_no: number;
  item_id: string;
  item_name: string;
  hsn_code: string;
  cth_code: string;
  qty: number;
  uom: string;
  selling_rate_foreign: number;
  fob_value_foreign: number;
  fob_value_inr: number;
  target_incoterm: IncotermType;
  expected_dispatch_date: string;
  notes: string;
}

export interface ExportPurchaseOrder {
  id: string;
  export_po_no: string;
  entity_id: string;
  status: ExportPOStatus;
  po_date: string;
  buyer_po_ref: string;

  related_foreign_customer_id: string;
  related_lut_id: string | null;
  related_iec_id: string;
  country_code: string;
  port_of_loading: string;

  currency_code: string;
  selling_rate_at_po: number;
  booking_rate: number;

  lut_status_at_validation: 'active' | 'expiring' | 'expired' | 'not_found';
  lut_validation_date: string | null;
  lut_validation_notes: string;

  doc_pack_id: string | null;
  doc_pack_country_rule: 'standard' | 'uae_legalized' | 'eu_eur1' | 'asean_form_ai' | 'cepa_preferential';

  buyer_reliability_score_at_commit: number;
  buyer_country_risk: 'low' | 'medium' | 'high';

  is_seis_eligible: boolean;
  seis_service_category: string | null;

  expected_shipping_bill_no: string | null;
  actual_shipping_bill_id: string | null;

  lines: ExportPOLine[];
  total_fob_value_foreign: number;
  total_fob_value_inr: number;

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const exportPOKey = (entityCode: string): string =>
  `erp_${entityCode}_export_purchase_orders`;
