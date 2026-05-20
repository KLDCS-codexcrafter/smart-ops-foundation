/**
 * @file        src/data/sinha-import-po-seed-data.ts
 * @purpose     3 Sinha import PO seed (no-FTA China + UAE-CEPA + ASEAN-FTA)
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q10=b 3 seed POs
 */
import type { ImportPurchaseOrder } from '@/types/import-purchase-order';

const now = '2026-05-01T00:00:00.000Z';

export const SINHA_IMPORT_POS: ImportPurchaseOrder[] = [
  {
    id: 'ipo-sinha-001',
    po_number: 'IPO-SINHA-2026-001',
    entity_id: 'sinha-steel',
    status: 'approved',
    po_date: '2026-05-01',
    expected_delivery: '2026-06-15',
    iec_id: 'iec-sinha-001',
    foreign_vendor_id: 'fv-sinha-001',
    currency_code: 'USD',
    booking_rate: 84.50,
    customs_valuation_rate_estimate: 85.10,
    rate_ladder: [
      { id: 'rl-001-a', timestamp: now, voucher_stage: 'po_booking', rate_type: 'buying_rate', rate_value: 84.50, currency_code: 'USD', source: 'ForexRate-master', reference_voucher_id: 'ipo-sinha-001', notes: 'Booking rate at PO creation' },
    ],
    incoterm: 'FOB',
    load_port_code: 'CNSHA',
    discharge_port_code: 'INMUN',
    form_15ca_seed: { requires_form_15ca: true, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
    rms_declaration_id: null,
    lines: [
      { id: 'ipol-001-1', line_no: 1, item_id: 'steel-gp-001', item_name: 'GP Steel Sheet 0.5mm', qty: 5000, uom: 'KGS', rate_foreign_currency: 0.80, basic_value_foreign: 4000, cth_code: '72104900', country_of_origin: 'CN', fta_agreement: null, estimated_bcd_rate: 15, estimated_igst_rate: 18, notes: 'Standard BCD · no FTA' },
    ],
    total_basic_value_foreign: 4000,
    estimated_landed_inr: 4000 * 84.50 * 1.43,
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'ipo-sinha-002',
    po_number: 'IPO-SINHA-2026-002',
    entity_id: 'sinha-steel',
    status: 'approved',
    po_date: '2026-05-03',
    expected_delivery: '2026-06-10',
    iec_id: 'iec-sinha-001',
    foreign_vendor_id: 'fv-sinha-002',
    currency_code: 'USD',
    booking_rate: 84.50,
    customs_valuation_rate_estimate: 85.20,
    rate_ladder: [
      { id: 'rl-002-a', timestamp: now, voucher_stage: 'po_booking', rate_type: 'buying_rate', rate_value: 84.50, currency_code: 'USD', source: 'ForexRate-master', reference_voucher_id: 'ipo-sinha-002', notes: 'UAE-CEPA preferential path' },
    ],
    incoterm: 'CIF',
    load_port_code: 'AEJEA',
    discharge_port_code: 'INMUN',
    form_15ca_seed: { requires_form_15ca: true, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
    rms_declaration_id: null,
    lines: [
      { id: 'ipol-002-1', line_no: 1, item_id: 'steel-gp-002', item_name: 'GP Steel Sheet 0.6mm UAE-CEPA', qty: 3000, uom: 'KGS', rate_foreign_currency: 0.85, basic_value_foreign: 2550, cth_code: '72104900', country_of_origin: 'AE', fta_agreement: 'INDIA_UAE_CEPA', estimated_bcd_rate: 7.5, estimated_igst_rate: 18, notes: 'UAE-CEPA Self-Cert OK · preferential BCD 7.5%' },
    ],
    total_basic_value_foreign: 2550,
    estimated_landed_inr: 2550 * 84.50 * 1.32,
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'ipo-sinha-003',
    po_number: 'IPO-SINHA-2026-003',
    entity_id: 'sinha-steel',
    status: 'draft',
    po_date: '2026-05-05',
    expected_delivery: '2026-05-20',
    iec_id: 'iec-sinha-001',
    foreign_vendor_id: 'fv-sinha-003',
    currency_code: 'SGD',
    booking_rate: 62.30,
    customs_valuation_rate_estimate: 62.80,
    rate_ladder: [
      { id: 'rl-003-a', timestamp: now, voucher_stage: 'po_booking', rate_type: 'buying_rate', rate_value: 62.30, currency_code: 'SGD', source: 'ForexRate-master', reference_voucher_id: 'ipo-sinha-003', notes: 'ASEAN-FTA path' },
    ],
    incoterm: 'CIP',
    load_port_code: 'SGSIN',
    discharge_port_code: 'INMAA',
    form_15ca_seed: { requires_form_15ca: true, form_15ca_ref: null, form_15cb_ref: null, form_15ca_filed_at: null },
    rms_declaration_id: null,
    lines: [
      { id: 'ipol-003-1', line_no: 1, item_id: 'router-001', item_name: 'Network Router 24-port LAN', qty: 50, uom: 'NOS', rate_foreign_currency: 280, basic_value_foreign: 14000, cth_code: '85176290', country_of_origin: 'SG', fta_agreement: 'ASEAN', estimated_bcd_rate: 10, estimated_igst_rate: 18, notes: 'ASEAN-FTA Self-Cert OK · preferential BCD 10%' },
    ],
    total_basic_value_foreign: 14000,
    estimated_landed_inr: 14000 * 62.30 * 1.35,
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
];
