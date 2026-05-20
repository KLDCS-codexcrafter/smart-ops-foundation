/**
 * @file        src/data/sinha-export-po-seed-data.ts
 * @purpose     3 Sinha Export POs · USA/UAE/Japan paths · 3 LUT states · demonstrates Q11=b
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import type { ExportPurchaseOrder, ExportPOLine } from '@/types/export-purchase-order';

const now = '2026-05-19T00:00:00.000Z';

const blankLine = (id: string, line_no: number): ExportPOLine => ({
  id, line_no,
  item_id: '', item_name: '', hsn_code: '', cth_code: '',
  qty: 0, uom: '', selling_rate_foreign: 0, fob_value_foreign: 0, fob_value_inr: 0,
  target_incoterm: 'FOB',
  expected_dispatch_date: '', notes: '',
});

export const SINHA_EXPORT_POS: ExportPurchaseOrder[] = [
  {
    id: 'expo-sinha-001', export_po_no: 'EXPO-SINHA-2026-001', entity_id: 'sinha-trading',
    status: 'submitted_to_buyer', po_date: '2026-05-14', buyer_po_ref: 'PO-USA-2026-9912',
    related_foreign_customer_id: 'fc-sinha-usa-001',
    related_lut_id: 'lut-sinha-2026', related_iec_id: 'iec-sinha-001',
    country_code: 'US', port_of_loading: 'INMUN',
    currency_code: 'USD', selling_rate_at_po: 85.20, booking_rate: 85.00,
    lut_status_at_validation: 'active', lut_validation_date: '2026-05-14T00:00:00.000Z',
    lut_validation_notes: 'LUT active · valid through 2027-03-31',
    doc_pack_id: 'dp-001', doc_pack_country_rule: 'standard',
    buyer_reliability_score_at_commit: 92, buyer_country_risk: 'low',
    is_seis_eligible: false, seis_service_category: null,
    expected_shipping_bill_no: 'SB-PLANNED-2026-001', actual_shipping_bill_id: null,
    lines: [{ ...blankLine('expol-001-1', 1), item_id: 'steel-export-001', item_name: 'Premium GP Steel Coils 1mm', hsn_code: '721049', cth_code: '72104900', qty: 10000, uom: 'KGS', selling_rate_foreign: 1.20, fob_value_foreign: 12000, fob_value_inr: 12000 * 85.00, target_incoterm: 'FOB', expected_dispatch_date: '2026-05-25', notes: 'USA export · GSP Form A · LUT active' }],
    total_fob_value_foreign: 12000, total_fob_value_inr: 12000 * 85.00,
    notes: 'Standard US export · LUT active · A-grade buyer · GSP Form A path', created_at: now, updated_at: now, created_by: 'sinha-exporter',
  },
  {
    id: 'expo-sinha-002', export_po_no: 'EXPO-SINHA-2026-002', entity_id: 'sinha-trading',
    status: 'pending_lut_validation', po_date: '2026-05-16', buyer_po_ref: 'PO-UAE-2026-77821',
    related_foreign_customer_id: 'fc-sinha-uae-001',
    related_lut_id: 'lut-sinha-2026', related_iec_id: 'iec-sinha-001',
    country_code: 'AE', port_of_loading: 'INMUN',
    currency_code: 'USD', selling_rate_at_po: 85.30, booking_rate: 85.00,
    lut_status_at_validation: 'expiring', lut_validation_date: '2026-05-16T00:00:00.000Z',
    lut_validation_notes: 'LUT expiring in 60 days · renewal advised before next PO',
    doc_pack_id: null, doc_pack_country_rule: 'cepa_preferential',
    buyer_reliability_score_at_commit: 84, buyer_country_risk: 'low',
    is_seis_eligible: false, seis_service_category: null,
    expected_shipping_bill_no: null, actual_shipping_bill_id: null,
    lines: [{ ...blankLine('expol-002-1', 1), item_id: 'steel-export-002', item_name: 'GP Steel Sheets 0.8mm UAE-spec', hsn_code: '721049', cth_code: '72104900', qty: 6000, uom: 'KGS', selling_rate_foreign: 1.15, fob_value_foreign: 6900, fob_value_inr: 6900 * 85.00, target_incoterm: 'CFR', expected_dispatch_date: '2026-06-01', notes: 'UAE export · CEPA preferential · UAE-legalized CoO required' }],
    total_fob_value_foreign: 6900, total_fob_value_inr: 6900 * 85.00,
    notes: 'UAE-CEPA export · LUT expiring warning · embassy legalization needed', created_at: now, updated_at: now, created_by: 'sinha-exporter',
  },
  {
    id: 'expo-sinha-003', export_po_no: 'EXPO-SINHA-2026-003', entity_id: 'sinha-trading',
    status: 'draft', po_date: '2026-05-18', buyer_po_ref: 'PO-JP-2026-44521',
    related_foreign_customer_id: 'fc-sinha-jp-001',
    related_lut_id: null,
    related_iec_id: 'iec-sinha-001',
    country_code: 'JP', port_of_loading: 'INMAA',
    currency_code: 'JPY', selling_rate_at_po: 0.575, booking_rate: 0.570,
    lut_status_at_validation: 'not_found', lut_validation_date: null,
    lut_validation_notes: 'No LUT linked · status transition to pending_lut_validation BLOCKED · link active LUT first',
    doc_pack_id: null, doc_pack_country_rule: 'asean_form_ai',
    buyer_reliability_score_at_commit: 76, buyer_country_risk: 'low',
    is_seis_eligible: false, seis_service_category: null,
    expected_shipping_bill_no: null, actual_shipping_bill_id: null,
    lines: [{ ...blankLine('expol-003-1', 1), item_id: 'steel-export-003', item_name: 'High-tensile Steel Rolls JP-spec', hsn_code: '721049', cth_code: '72104900', qty: 5000, uom: 'KGS', selling_rate_foreign: 200, fob_value_foreign: 1000000, fob_value_inr: 1000000 * 0.570, target_incoterm: 'CIF', expected_dispatch_date: '2026-06-15', notes: 'Japan export · ASEAN-FTA path · Form AI · CIF Tokyo' }],
    total_fob_value_foreign: 1000000, total_fob_value_inr: 1000000 * 0.570,
    notes: 'Japan export · LUT MISSING · gate enforcement demo · ASEAN Form AI', created_at: now, updated_at: now, created_by: 'sinha-exporter',
  },
];
