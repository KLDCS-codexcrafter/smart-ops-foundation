/**
 * @file        src/data/sinha-commercial-invoice-seed-data.ts
 * @purpose     3 Sinha Commercial Invoices · matching 3 EX-3 POs + 3 EX-4 MLGITs · 1 with CICustomeVal edit
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q10=b 3 CIs + 1 revaluation event
 */
import type { CommercialInvoice } from '@/types/commercial-invoice';
import type { CIItemAllocation } from '@/types/ci-item-allocation';

const now = '2026-05-12T00:00:00.000Z';

const emptyAllocation = (cifInr: number, customExchangeRate: number): CIItemAllocation => ({
  part_a: {
    import_valuation_method: 'CIF',
    custom_exchange_rate: customExchangeRate,
    customs_info_active: true,
    fta_preferential_banner_active: false,
    scheme_import_banner_active: false,
    scheme_notification_ref: '',
  },
  part_b: {
    qty: 0, rate_forex: 0, cost_forex: 0, cost_base_inr: 0,
    insurance_inr: 0, freight_inr: 0, exworks_inr: 0, packing_inr: 0,
    cif_total_inr: cifInr, pro_rata_basis: 'value', specific_assignment_pct: null,
  },
  part_c: {
    cif_value_inr: cifInr, actual_cif_value_inr: cifInr,
    royalty_inr: 0, license_fee_inr: 0, svb_loading_pct: 0,
    customs_revaluation_history: [],
  },
  part_d: {
    rows: [], total_custom_duty_inr: 0, gst_assessable_value_inr: cifInr,
    total_landed_value_inr: 0, tdl_gap_chips: [],
  },
  part_e: { total_applicable_duty_inr: 0, duty_pct_on_cif: 0, duty_pct_on_assessable: 0 },
  part_f: {
    per_batch_insurance_inr: 0, per_batch_freight_inr: 0, per_batch_exworks_inr: 0,
    per_batch_packing_inr: 0, per_batch_cha_inr: 0, per_batch_landing_inr: 0,
    per_batch_total_expense_inr: 0, applicable_costing_method: 'Weighted',
  },
});

export const SINHA_COMMERCIAL_INVOICES: CommercialInvoice[] = [
  {
    id: 'ci-sinha-001', ci_number: 'CI-SINHA-2026-001', entity_id: 'sinha-steel', status: 'received_from_vendor',
    ci_date: '2026-05-04', vendor_invoice_no: 'CN-VND-2026-44521',
    related_import_po_id: 'ipo-sinha-001', related_import_po_no: 'IPO-SINHA-2026-001',
    related_mlgit_id: 'mlgit-sinha-001', related_mlgit_no: 'MLGIT-SINHA-2026-001',
    foreign_vendor_id: 'fv-sinha-001', currency_code: 'USD', booking_rate: 84.50, customs_exchange_rate: 85.10, customs_valuation_rate_at_boe: null,
    vessel_or_flight_id: 'IMO9876543', bill_of_lading_no: 'MSCU1234567', port_of_loading: 'CNSHA', port_of_discharge: 'INMUN',
    total_voucher_insurance_inr: 12000, total_voucher_freight_inr: 85000, total_voucher_exworks_inr: 0, total_voucher_packing_inr: 5000,
    lines: [{
      id: 'cil-001-1', line_no: 1, related_import_po_line_id: 'ipol-001-1',
      item_id: 'steel-gp-001', item_name: 'GP Steel Sheet 0.5mm',
      hsn_code: '721049', cth_code: '72104900', country_of_origin: 'CN',
      qty: 5000, uom: 'KGS', rate_foreign_currency: 0.80, fob_value_foreign: 4000, fob_value_inr: 4000 * 84.50,
      gross_weight_kgs: 5000, volume_cbm: 6.5,
      allocation: emptyAllocation(4000 * 85.10 + 102000, 85.10),
      notes: 'Standard BCD path',
    }],
    total_fob_value_foreign: 4000, total_fob_value_inr: 4000 * 84.50,
    total_cif_value_inr: 4000 * 85.10 + 102000, total_actual_cif_inr: 4000 * 85.10 + 102000,
    total_landed_value_inr: 0,
    fta_claimed: false, rule_10_loadings_present: false,
    notes: 'China steel · no FTA', created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'ci-sinha-002', ci_number: 'CI-SINHA-2026-002', entity_id: 'sinha-steel', status: 'sent_to_cha',
    ci_date: '2026-05-06', vendor_invoice_no: 'AE-VND-2026-77821',
    related_import_po_id: 'ipo-sinha-002', related_import_po_no: 'IPO-SINHA-2026-002',
    related_mlgit_id: 'mlgit-sinha-002', related_mlgit_no: 'MLGIT-SINHA-2026-002',
    foreign_vendor_id: 'fv-sinha-002', currency_code: 'USD', booking_rate: 84.50, customs_exchange_rate: 85.20, customs_valuation_rate_at_boe: 85.20,
    vessel_or_flight_id: 'IMO5432109', bill_of_lading_no: 'EMCU7654321', port_of_loading: 'AEJEA', port_of_discharge: 'INMUN',
    total_voucher_insurance_inr: 5000, total_voucher_freight_inr: 35000, total_voucher_exworks_inr: 0, total_voucher_packing_inr: 2000,
    lines: [{
      id: 'cil-002-1', line_no: 1, related_import_po_line_id: 'ipol-002-1',
      item_id: 'steel-gp-002', item_name: 'GP Steel Sheet 0.6mm UAE-CEPA',
      hsn_code: '721049', cth_code: '72104900', country_of_origin: 'AE',
      qty: 3000, uom: 'KGS', rate_foreign_currency: 0.85, fob_value_foreign: 2550, fob_value_inr: 2550 * 84.50,
      gross_weight_kgs: 3000, volume_cbm: 4.0,
      allocation: {
        ...emptyAllocation(2550 * 85.20 + 42000, 85.20),
        part_c: {
          cif_value_inr: 2550 * 85.20 + 42000,
          actual_cif_value_inr: 2550 * 85.20 + 42000 + 5500,
          royalty_inr: 0, license_fee_inr: 0, svb_loading_pct: 0,
          customs_revaluation_history: [{
            id: 'crh-002-a', timestamp: now, user_id: 'customs-officer',
            amount_before_inr: 2550 * 85.20 + 42000,
            amount_after_inr: 2550 * 85.20 + 42000 + 5500,
            variance_inr: 5500, variance_pct: 2.4,
            justification: 'Customs Officer revaluation per CBIC NTF-2026-04 · UAE-CEPA Self-Cert validity 6-month rule',
            gazette_ref: 'CBIC-NTF-2026-04', reference_mlgit_id: 'mlgit-sinha-002',
          }],
        },
      },
      notes: 'UAE-CEPA · CICustomeVal officer-revalued',
    }],
    total_fob_value_foreign: 2550, total_fob_value_inr: 2550 * 84.50,
    total_cif_value_inr: 2550 * 85.20 + 42000, total_actual_cif_inr: 2550 * 85.20 + 42000 + 5500,
    total_landed_value_inr: 0,
    fta_claimed: true, rule_10_loadings_present: false,
    notes: 'UAE-CEPA · 1 CICustomeVal revaluation event captured (Moat #15 demo)',
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'ci-sinha-003', ci_number: 'CI-SINHA-2026-003', entity_id: 'sinha-steel', status: 'draft',
    ci_date: '2026-05-09', vendor_invoice_no: 'SG-VND-2026-99001',
    related_import_po_id: 'ipo-sinha-003', related_import_po_no: 'IPO-SINHA-2026-003',
    related_mlgit_id: 'mlgit-sinha-003', related_mlgit_no: 'MLGIT-SINHA-2026-003',
    foreign_vendor_id: 'fv-sinha-003', currency_code: 'SGD', booking_rate: 62.30, customs_exchange_rate: 62.80, customs_valuation_rate_at_boe: null,
    vessel_or_flight_id: '', bill_of_lading_no: '', port_of_loading: 'SGSIN', port_of_discharge: 'INMAA',
    total_voucher_insurance_inr: 8000, total_voucher_freight_inr: 95000, total_voucher_exworks_inr: 0, total_voucher_packing_inr: 3500,
    lines: [{
      id: 'cil-003-1', line_no: 1, related_import_po_line_id: 'ipol-003-1',
      item_id: 'router-001', item_name: 'Network Router 24-port LAN',
      hsn_code: '851762', cth_code: '85176290', country_of_origin: 'SG',
      qty: 50, uom: 'NOS', rate_foreign_currency: 280, fob_value_foreign: 14000, fob_value_inr: 14000 * 62.30,
      gross_weight_kgs: 250, volume_cbm: 1.8,
      allocation: {
        ...emptyAllocation(14000 * 62.80 + 106500, 62.80),
        part_b: {
          qty: 50, rate_forex: 280, cost_forex: 14000, cost_base_inr: 14000 * 62.80,
          insurance_inr: 8000, freight_inr: 95000, exworks_inr: 0, packing_inr: 3500,
          cif_total_inr: 14000 * 62.80 + 106500,
          pro_rata_basis: 'quantity', specific_assignment_pct: null,
        },
      },
      notes: 'ASEAN-FTA · Air cargo · pro-rata by QUANTITY (per-NOS freight rate · founder caveat demo)',
    }],
    total_fob_value_foreign: 14000, total_fob_value_inr: 14000 * 62.30,
    total_cif_value_inr: 14000 * 62.80 + 106500, total_actual_cif_inr: 14000 * 62.80 + 106500,
    total_landed_value_inr: 0,
    fta_claimed: true, rule_10_loadings_present: false,
    notes: 'Singapore routers · ASEAN · quantity-basis demo per founder caveat (6 bases support)',
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
];
