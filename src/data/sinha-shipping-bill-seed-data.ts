/**
 * @file        src/data/sinha-shipping-bill-seed-data.ts
 * @purpose     3 Sinha Shipping Bills · 3 SB types · 3 LEO states
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q11=b 3 SBs (free · drawback · dfia)
 */
import type { ShippingBill, ShippingBillLine } from '@/types/shipping-bill';

const now = '2026-05-19T00:00:00.000Z';

const blankSBLine = (id: string, line_no: number): ShippingBillLine => ({
  id, line_no, related_export_po_line_id: '',
  item_id: '', item_name: '', hsn_code: '', cth_code: '',
  country_of_destination: '', qty: 0, uom: '',
  fob_value_foreign: 0, fob_value_inr: 0, freight_inr: 0, insurance_inr: 0,
  cif_value_foreign: 0, cif_value_inr: 0,
  drawback_amount_inr: 0, drawback_rate_pct: 0, drawback_cap_inr: 0,
  rodtep_rate_pct: 0, rodtep_value_inr: 0, notes: '',
});

export const SINHA_SHIPPING_BILLS: ShippingBill[] = [
  {
    id: 'sb-sinha-001', sb_no: 'SB-SINHA-2026-001', entity_id: 'sinha-trading',
    sb_type: 'free', status: 'goods_dispatched',
    filing_date: '2026-05-15', port_of_loading: 'INMUN', ce_section: 'Group-VII-Export',
    related_export_po_id: 'expo-sinha-001', related_export_po_no: 'EXPO-SINHA-2026-001',
    related_dispatch_mirror_id: 'edm-sinha-001',
    related_foreign_customer_id: 'fc-sinha-usa-001', related_lut_id: 'lut-sinha-2026', related_iec_id: 'iec-sinha-001',
    related_rms_declaration_id: 'rms-sb-001', related_egm_id: 'egm-001', related_leo_id: 'leo-001',
    icegate_submission_id: 'IG-SB-2026-INMUN-44521', icegate_response_timestamp: '2026-05-15T10:00:00.000Z',
    icegate_assigned_sb_no: 'SB/INMUN/2026/EXP/77821',
    importer_aeo_tier: 'tier_2', aeo_fast_track_eligible: true,
    is_self_sealing_facility: false, self_sealing_authorization_no: null, self_sealing_authorization_valid_to: null,
    coo_rule_kind: 'standard', coo_legalization_state: 'not_required',
    coo_chamber_attested_at: null, coo_embassy_submitted_at: null, coo_legalized_returned_at: null, coo_legalization_cost_inr: 0,
    igst_exemption_claimed: true, rodtep_total_inr: 16224, drawback_total_inr: 0,
    lines: [{ ...blankSBLine('sbl-001-1', 1), related_export_po_line_id: 'epol-001-1', item_id: 'steel-gp-001', item_name: 'GP Steel Sheet 0.5mm', hsn_code: '721049', cth_code: '72104900', country_of_destination: 'US', qty: 8000, uom: 'KGS', fob_value_foreign: 9600, fob_value_inr: 811200, freight_inr: 32000, insurance_inr: 8000, cif_value_foreign: 10073, cif_value_inr: 851200, drawback_amount_inr: 0, drawback_rate_pct: 0, drawback_cap_inr: 0, rodtep_rate_pct: 2.0, rodtep_value_inr: 16224, notes: 'Free SB · USA standard CoO · LUT active · RoDTEP @ 2%' }],
    total_fob_value_foreign: 9600, total_fob_value_inr: 811200, total_freight_inr: 32000, total_insurance_inr: 8000, total_cif_value_inr: 851200,
    notes: 'Free SB · USA · LEO closed · vessel dispatched · RoDTEP ₹16,224', created_at: now, updated_at: now, created_by: 'sinha-cha-export',
  },
  {
    id: 'sb-sinha-002', sb_no: 'SB-SINHA-2026-002', entity_id: 'sinha-trading',
    sb_type: 'drawback', status: 'let_export_granted',
    filing_date: '2026-05-17', port_of_loading: 'INMUN', ce_section: 'Group-VII-Export',
    related_export_po_id: 'expo-sinha-002', related_export_po_no: 'EXPO-SINHA-2026-002',
    related_dispatch_mirror_id: 'edm-sinha-002',
    related_foreign_customer_id: 'fc-sinha-uae-001', related_lut_id: 'lut-sinha-2026', related_iec_id: 'iec-sinha-001',
    related_rms_declaration_id: 'rms-sb-002', related_egm_id: null, related_leo_id: 'leo-002',
    icegate_submission_id: 'IG-SB-2026-INMUN-44522', icegate_response_timestamp: '2026-05-17T11:00:00.000Z',
    icegate_assigned_sb_no: 'SB/INMUN/2026/EXP/77822',
    importer_aeo_tier: 'tier_2', aeo_fast_track_eligible: true,
    is_self_sealing_facility: false, self_sealing_authorization_no: null, self_sealing_authorization_valid_to: null,
    coo_rule_kind: 'cepa_preferential', coo_legalization_state: 'embassy_submitted',
    coo_chamber_attested_at: '2026-05-16T00:00:00.000Z', coo_embassy_submitted_at: '2026-05-17T00:00:00.000Z', coo_legalized_returned_at: null, coo_legalization_cost_inr: 4200,
    igst_exemption_claimed: true, rodtep_total_inr: 10395, drawback_total_inr: 25988,
    lines: [{ ...blankSBLine('sbl-002-1', 1), related_export_po_line_id: 'epol-002-1', item_id: 'steel-gp-002', item_name: 'GP Steel Sheet 0.6mm UAE-CEPA', hsn_code: '721049', cth_code: '72104900', country_of_destination: 'AE', qty: 5000, uom: 'KGS', fob_value_foreign: 22500, fob_value_inr: 519750, freight_inr: 18000, insurance_inr: 4500, cif_value_foreign: 23474, cif_value_inr: 542250, drawback_amount_inr: 25988, drawback_rate_pct: 5.0, drawback_cap_inr: 50000, rodtep_rate_pct: 2.0, rodtep_value_inr: 10395, notes: 'Drawback SB · UAE-CEPA · Embassy submitted · Drawback 5% (cap ₹50k)' }],
    total_fob_value_foreign: 22500, total_fob_value_inr: 519750, total_freight_inr: 18000, total_insurance_inr: 4500, total_cif_value_inr: 542250,
    notes: 'Drawback SB · UAE-CEPA · CoO embassy_submitted · LEO granted · awaiting EGM', created_at: now, updated_at: now, created_by: 'sinha-cha-export',
  },
  {
    id: 'sb-sinha-003', sb_no: 'SB-SINHA-2026-003', entity_id: 'sinha-trading',
    sb_type: 'dfia_advance_authorization', status: 'examination_pending',
    filing_date: '2026-05-18', port_of_loading: 'INMAA', ce_section: 'Group-V-Export',
    related_export_po_id: 'expo-sinha-003', related_export_po_no: 'EXPO-SINHA-2026-003',
    related_dispatch_mirror_id: 'edm-sinha-003',
    related_foreign_customer_id: 'fc-sinha-jp-001', related_lut_id: 'lut-sinha-2026', related_iec_id: 'iec-sinha-001',
    related_rms_declaration_id: null, related_egm_id: null, related_leo_id: 'leo-003',
    icegate_submission_id: 'IG-SB-2026-INMAA-99001', icegate_response_timestamp: '2026-05-18T09:00:00.000Z',
    icegate_assigned_sb_no: 'SB/INMAA/2026/EXP/99001',
    importer_aeo_tier: 'tier_2', aeo_fast_track_eligible: true,
    is_self_sealing_facility: true, self_sealing_authorization_no: 'AEO-SS-AUTH-2026-IN-0042', self_sealing_authorization_valid_to: '2027-03-31',
    coo_rule_kind: 'asean_form_ai', coo_legalization_state: 'chamber_attested',
    coo_chamber_attested_at: '2026-05-18T00:00:00.000Z', coo_embassy_submitted_at: null, coo_legalized_returned_at: null, coo_legalization_cost_inr: 1200,
    igst_exemption_claimed: false, rodtep_total_inr: 0, drawback_total_inr: 0,
    lines: [{ ...blankSBLine('sbl-003-1', 1), related_export_po_line_id: 'epol-003-1', item_id: 'router-001', item_name: 'Network Router 24-port LAN', hsn_code: '851762', cth_code: '85176290', country_of_destination: 'JP', qty: 100, uom: 'NOS', fob_value_foreign: 2500000, fob_value_inr: 1400000, freight_inr: 45000, insurance_inr: 14000, cif_value_foreign: 2605714, cif_value_inr: 1459000, drawback_amount_inr: 0, drawback_rate_pct: 0, drawback_cap_inr: 0, rodtep_rate_pct: 0, rodtep_value_inr: 0, notes: 'DFIA SB · Japan EPA · Self-sealing · AEO Tier-2 · examination pending' }],
    total_fob_value_foreign: 2500000, total_fob_value_inr: 1400000, total_freight_inr: 45000, total_insurance_inr: 14000, total_cif_value_inr: 1459000,
    notes: 'DFIA SB · Japan EPA Form AI · Self-Sealing (v7 Gap #10) · examination pending', created_at: now, updated_at: now, created_by: 'sinha-cha-export',
  },
];
