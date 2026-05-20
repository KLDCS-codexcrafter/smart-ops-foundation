/**
 * @file        src/data/sinha-bill-of-entry-seed-data.ts
 * @purpose     3 Sinha BoEs · 1 per BoE type · 1 with project_import flag · matches EX-5 CIs
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q11=b 3 BoEs (home_consumption · warehouse · ex_bond)
 */
import type { BillOfEntry, BoELine } from '@/types/bill-of-entry';

const now = '2026-05-14T00:00:00.000Z';

const blankBoELine = (id: string, line_no: number): BoELine => ({
  id, line_no,
  related_ci_line_id: '', related_import_po_line_id: '',
  item_id: '', item_name: '', cth_code: '', country_of_origin: '',
  qty: 0, uom: '',
  final_cif_inr: 0, final_assessable_inr: 0, bcd_inr: 0, sws_inr: 0,
  igst_inr: 0, comp_cess_inr: 0, anti_dumping_inr: 0, safeguard_inr: 0,
  landing_inr: 0, total_duty_inr: 0, total_landed_inr: 0,
  notes: '',
});

export const SINHA_BILLS_OF_ENTRY: BillOfEntry[] = [
  {
    id: 'boe-sinha-001', boe_no: 'BOE-SINHA-2026-001', entity_id: 'sinha-steel',
    boe_type: 'home_consumption', status: 'cleared',
    assessment_no: 'ASMT-2026-INMUN-44521', filing_date: '2026-05-12',
    port_of_clearance: 'INMUN', ce_section: 'Group-VII',
    related_ci_id: 'ci-sinha-001', related_ci_no: 'CI-SINHA-2026-001',
    related_mlgit_id: 'mlgit-sinha-001', related_mlgit_no: 'MLGIT-SINHA-2026-001',
    related_rms_declaration_id: 'rms-sinha-001',
    icegate_submission_id: 'IG-SUB-2026-MUN-77821', icegate_response_timestamp: '2026-05-12T10:00:00.000Z',
    icegate_simulated_lane: 'green',
    importer_aeo_tier: 'tier_2', port_aeo_tier_supported: 'tier_2',
    aeo_fast_track_eligible: true, aeo_override_applied: true,
    is_project_import: false, project_import_notification_ref: null, project_import_concessional_duty_pct: null,
    dwell_days_used: 2, demurrage_free_days_available: 5, demurrage_chargeable_days: 0, demurrage_total_inr: 0,
    lines: [{ ...blankBoELine('boel-001-1', 1), related_ci_line_id: 'cil-001-1', item_id: 'steel-gp-001', item_name: 'GP Steel Sheet 0.5mm', cth_code: '72104900', country_of_origin: 'CN', qty: 5000, uom: 'KGS', final_cif_inr: 528500, final_assessable_inr: 533785, bcd_inr: 53378, sws_inr: 5338, igst_inr: 110249, comp_cess_inr: 0, anti_dumping_inr: 0, safeguard_inr: 0, landing_inr: 5285, total_duty_inr: 168965, total_landed_inr: 702750, notes: 'Standard China BCD path · AEO Tier-2 auto-green' }],
    total_assessable_inr: 533785, total_duty_inr: 168965, total_igst_inr: 110249, total_comp_cess_inr: 0, total_demurrage_inr: 0, total_landed_inr: 702750,
    posted_voucher_ids: ['av-sinha-001-cd', 'av-sinha-001-igst', 'av-sinha-001-lh'],
    notes: 'Home Consumption · AEO fast-track demo · 3 vouchers posted', created_at: now, updated_at: now, created_by: 'sinha-cha',
  },
  {
    id: 'boe-sinha-002', boe_no: 'BOE-SINHA-2026-002', entity_id: 'sinha-steel',
    boe_type: 'warehouse', status: 'duty_paid',
    assessment_no: 'ASMT-2026-INMUN-44522', filing_date: '2026-05-13',
    port_of_clearance: 'INMUN', ce_section: 'Group-VII',
    related_ci_id: 'ci-sinha-002', related_ci_no: 'CI-SINHA-2026-002',
    related_mlgit_id: 'mlgit-sinha-002', related_mlgit_no: 'MLGIT-SINHA-2026-002',
    related_rms_declaration_id: 'rms-sinha-002',
    icegate_submission_id: 'IG-SUB-2026-MUN-77822', icegate_response_timestamp: '2026-05-13T11:00:00.000Z',
    icegate_simulated_lane: 'yellow',
    importer_aeo_tier: 'tier_2', port_aeo_tier_supported: 'tier_2',
    aeo_fast_track_eligible: true, aeo_override_applied: false,
    is_project_import: true, project_import_notification_ref: 'CBIC-NTF-PRJ-2026-04', project_import_concessional_duty_pct: 5.0,
    dwell_days_used: 4, demurrage_free_days_available: 5, demurrage_chargeable_days: 0, demurrage_total_inr: 0,
    lines: [{ ...blankBoELine('boel-002-1', 1), related_ci_line_id: 'cil-002-1', item_id: 'steel-gp-002', item_name: 'GP Steel Sheet 0.6mm UAE-CEPA', cth_code: '72104900', country_of_origin: 'AE', qty: 3000, uom: 'KGS', final_cif_inr: 264560, final_assessable_inr: 267206, bcd_inr: 13360, sws_inr: 1336, igst_inr: 50625, comp_cess_inr: 0, anti_dumping_inr: 0, safeguard_inr: 0, landing_inr: 2646, total_duty_inr: 67967, total_landed_inr: 332527, notes: 'Warehouse BoE · UAE-CEPA preferential BCD @ 5% · Project Import Sec 25 demo' }],
    total_assessable_inr: 267206, total_duty_inr: 67967, total_igst_inr: 50625, total_comp_cess_inr: 0, total_demurrage_inr: 0, total_landed_inr: 332527,
    posted_voucher_ids: ['av-sinha-002-cd', 'av-sinha-002-igst', 'av-sinha-002-lh'],
    notes: 'Warehouse · Project Imports Sec 25 (v7 Gap #9) · 3 vouchers posted', created_at: now, updated_at: now, created_by: 'sinha-cha',
  },
  {
    id: 'boe-sinha-003', boe_no: 'BOE-SINHA-2026-003', entity_id: 'sinha-steel',
    boe_type: 'ex_bond', status: 'submitted_to_icegate',
    assessment_no: '', filing_date: '2026-05-14',
    port_of_clearance: 'INMAA', ce_section: 'Group-V',
    related_ci_id: 'ci-sinha-003', related_ci_no: 'CI-SINHA-2026-003',
    related_mlgit_id: 'mlgit-sinha-003', related_mlgit_no: 'MLGIT-SINHA-2026-003',
    related_rms_declaration_id: null,
    icegate_submission_id: 'IG-SUB-2026-MAA-99001', icegate_response_timestamp: null,
    icegate_simulated_lane: null,
    importer_aeo_tier: 'tier_2', port_aeo_tier_supported: 'tier_1',
    aeo_fast_track_eligible: true, aeo_override_applied: false,
    is_project_import: false, project_import_notification_ref: null, project_import_concessional_duty_pct: null,
    dwell_days_used: 6, demurrage_free_days_available: 5, demurrage_chargeable_days: 1, demurrage_total_inr: 4500,
    lines: [{ ...blankBoELine('boel-003-1', 1), related_ci_line_id: 'cil-003-1', item_id: 'router-001', item_name: 'Network Router 24-port LAN', cth_code: '85176290', country_of_origin: 'SG', qty: 50, uom: 'NOS', final_cif_inr: 985700, final_assessable_inr: 995557, bcd_inr: 0, sws_inr: 0, igst_inr: 179200, comp_cess_inr: 0, anti_dumping_inr: 0, safeguard_inr: 0, landing_inr: 9857, total_duty_inr: 189057, total_landed_inr: 1174757, notes: 'Ex-Bond · ASEAN-FTA preferential BCD = 0 · demurrage 1 day @ ₹4500' }],
    total_assessable_inr: 995557, total_duty_inr: 189057, total_igst_inr: 179200, total_comp_cess_inr: 0, total_demurrage_inr: 4500, total_landed_inr: 1174757,
    posted_voucher_ids: [],
    notes: 'Ex-Bond · ASEAN preferential · demurrage demo (1 chargeable day) · ICEGATE response pending', created_at: now, updated_at: now, created_by: 'sinha-cha',
  },
];
