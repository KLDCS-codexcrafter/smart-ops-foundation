/**
 * @file        src/types/shipping-bill.ts
 * @purpose     Shipping Bill · 8th sibling pattern · Export chain GL commit · symmetric to BoE
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q1=b sibling · EX-7b-Q2=a 3 SB types · EX-7b-Q7=a Self-Sealing fields
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped · FR-80 exhaustive switch
 */

export type ShippingBillType = 'free' | 'drawback' | 'dfia_advance_authorization';

export const SB_TYPE_DESCRIPTIONS: Record<ShippingBillType, string> = {
  free: 'Free Shipping Bill · standard export · no duty scheme claim',
  drawback: 'Drawback Shipping Bill · claim refund of input duties · Section 75',
  dfia_advance_authorization: 'DFIA/AA Shipping Bill · duty-free import authorization scheme',
};

export type ShippingBillStatus =
  | 'draft'
  | 'submitted_to_icegate'
  | 'sb_assigned'
  | 'examination_pending'
  | 'let_export_granted'
  | 'goods_dispatched'
  | 'cancelled';

export const SB_VALID_TRANSITIONS: Record<ShippingBillStatus, ShippingBillStatus[]> = {
  draft: ['submitted_to_icegate', 'cancelled'],
  submitted_to_icegate: ['sb_assigned', 'cancelled'],
  sb_assigned: ['examination_pending', 'let_export_granted'],
  examination_pending: ['let_export_granted', 'cancelled'],
  let_export_granted: ['goods_dispatched'],
  goods_dispatched: [],
  cancelled: [],
};

export interface ShippingBillLine {
  id: string;
  line_no: number;
  related_export_po_line_id: string;
  item_id: string;
  item_name: string;
  hsn_code: string;
  cth_code: string;
  country_of_destination: string;
  qty: number;
  uom: string;
  fob_value_foreign: number;
  fob_value_inr: number;
  freight_inr: number;
  insurance_inr: number;
  cif_value_foreign: number;
  cif_value_inr: number;
  drawback_amount_inr: number;
  drawback_rate_pct: number;
  drawback_cap_inr: number;
  rodtep_rate_pct: number;
  rodtep_value_inr: number;
  notes: string;
}

export interface ShippingBill {
  id: string;
  sb_no: string;
  entity_id: string;
  sb_type: ShippingBillType;
  status: ShippingBillStatus;

  filing_date: string;
  port_of_loading: string;
  ce_section: string;

  related_export_po_id: string;
  related_export_po_no: string;
  related_dispatch_mirror_id: string;
  related_foreign_customer_id: string;
  related_lut_id: string;
  related_iec_id: string;
  related_rms_declaration_id: string | null;
  related_egm_id: string | null;
  related_leo_id: string | null;

  icegate_submission_id: string | null;
  icegate_response_timestamp: string | null;
  icegate_assigned_sb_no: string | null;

  importer_aeo_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo';
  aeo_fast_track_eligible: boolean;

  is_self_sealing_facility: boolean;
  self_sealing_authorization_no: string | null;
  self_sealing_authorization_valid_to: string | null;

  coo_rule_kind: 'standard' | 'uae_legalized' | 'eu_eur1' | 'asean_form_ai' | 'cepa_preferential' | 'gsp_form_a';
  coo_legalization_state: 'not_required' | 'chamber_attested' | 'embassy_submitted' | 'legalized_returned';
  coo_chamber_attested_at: string | null;
  coo_embassy_submitted_at: string | null;
  coo_legalized_returned_at: string | null;
  coo_legalization_cost_inr: number;

  igst_exemption_claimed: boolean;
  rodtep_total_inr: number;
  drawback_total_inr: number;

  lines: ShippingBillLine[];
  total_fob_value_foreign: number;
  total_fob_value_inr: number;
  total_freight_inr: number;
  total_insurance_inr: number;
  total_cif_value_inr: number;

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const shippingBillKey = (entityCode: string): string =>
  `erp_${entityCode}_shipping_bills`;
