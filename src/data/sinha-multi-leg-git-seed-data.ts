/**
 * @file        src/data/sinha-multi-leg-git-seed-data.ts
 * @purpose     3 multi-leg GITs matching 3 EX-3 Sinha POs (Q10=b)
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import type { MultiLegGoodsInTransit } from '@/types/multi-leg-git';

const now = '2026-05-10T00:00:00.000Z';

export const SINHA_MULTI_LEG_GITS: MultiLegGoodsInTransit[] = [
  {
    id: 'mlgit-sinha-001',
    mlgit_no: 'MLGIT-SINHA-2026-001',
    entity_id: 'sinha-steel',
    related_import_po_id: 'ipo-sinha-001',
    related_import_po_no: 'IPO-SINHA-2026-001',
    leg1: { leg_no: 1, state: 'handed_over', skip_flag: false, port_code: 'CNSHA', vendor_handover_date: '2026-05-02', port_arrival_date: '2026-05-03', notes: 'Vendor delivered to Shanghai port' },
    leg2: { leg_no: 2, state: 'arrived', skip_flag: false, vessel_or_flight_id: 'IMO9876543', carrier: 'MSC', bill_of_lading_no: 'MSCU1234567', loaded_date: '2026-05-04', expected_arrival: '2026-05-25', actual_arrival: '2026-05-26', notes: 'CN-IN sea route' },
    leg3: { leg_no: 3, state: 'in_transit', skip_flag: false, port_code: 'INMUN', discharge_date: '2026-05-26', customs_cleared_date: null, rms_lane: 'yellow', notes: 'Mundra discharge · RMS yellow' },
    leg4: { leg_no: 4, state: 'pending', skip_flag: false, facility: { facility_code: 'CFS-MUN-001', facility_name: 'Mundra CFS Main', facility_type: 'cfs', location: 'Mundra, Gujarat', is_ccsp_facility: true, ccsp_license_no: 'CCSP-GJ-001-2024', ccsp_license_expiry: '2027-03-31', capacity_teu: 5000, has_bonded_warehousing: true, has_temperature_controlled: false }, arrival_date: null, dispatch_date: null, dwell_time_days: 0, notes: '' },
    leg5: { leg_no: 5, state: 'pending', skip_flag: false, warehouse_code: 'WH-SINHA-MUM', arrival_date: null, received_by: null, notes: '' },
    overall_state: 'mid_journey',
    origination_date: '2026-05-02',
    closure_date: null,
    reconciliation_events: [
      { id: 're-001-a', timestamp: now, user_id: 'sinha-importer', event_type: 'initial_booking', bucket: 'booked', amount_before_inr: 0, amount_after_inr: 4000 * 84.50, variance_inr: 4000 * 84.50, variance_pct: 0, justification: 'PO booked at buying_rate 84.50', gazette_ref: '', reference_voucher_id: 'ipo-sinha-001', notes: '' },
    ],
    booked_total_inr: 4000 * 84.50,
    custom_revalued_total_inr: 0,
    actual_landed_total_inr: 0,
    allocation_method: 'by_value',
    allocated_costs: [],
    notes: 'China steel · standard BCD path · awaiting BoE',
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'mlgit-sinha-002',
    mlgit_no: 'MLGIT-SINHA-2026-002',
    entity_id: 'sinha-steel',
    related_import_po_id: 'ipo-sinha-002',
    related_import_po_no: 'IPO-SINHA-2026-002',
    leg1: { leg_no: 1, state: 'handed_over', skip_flag: false, port_code: 'AEJEA', vendor_handover_date: '2026-05-04', port_arrival_date: '2026-05-05', notes: 'Jebel Ali handover' },
    leg2: { leg_no: 2, state: 'handed_over', skip_flag: false, vessel_or_flight_id: 'IMO5432109', carrier: 'EMC', bill_of_lading_no: 'EMCU7654321', loaded_date: '2026-05-06', expected_arrival: '2026-05-16', actual_arrival: '2026-05-15', notes: 'UAE-CEPA preferential cargo' },
    leg3: { leg_no: 3, state: 'arrived', skip_flag: false, port_code: 'INMUN', discharge_date: '2026-05-15', customs_cleared_date: '2026-05-16', rms_lane: 'green', notes: 'AEO Tier-1 fast-tracked' },
    leg4: { leg_no: 4, state: 'in_transit', skip_flag: false, facility: { facility_code: 'CFS-MUN-001', facility_name: 'Mundra CFS Main', facility_type: 'cfs', location: 'Mundra, Gujarat', is_ccsp_facility: true, ccsp_license_no: 'CCSP-GJ-001-2024', ccsp_license_expiry: '2027-03-31', capacity_teu: 5000, has_bonded_warehousing: true, has_temperature_controlled: false }, arrival_date: '2026-05-17', dispatch_date: null, dwell_time_days: 2, notes: '' },
    leg5: { leg_no: 5, state: 'pending', skip_flag: false, warehouse_code: 'WH-SINHA-MUM', arrival_date: null, received_by: null, notes: '' },
    overall_state: 'final_leg',
    origination_date: '2026-05-04',
    closure_date: null,
    reconciliation_events: [
      { id: 're-002-a', timestamp: now, user_id: 'sinha-importer', event_type: 'initial_booking', bucket: 'booked', amount_before_inr: 0, amount_after_inr: 2550 * 84.50, variance_inr: 2550 * 84.50, variance_pct: 0, justification: 'PO booked at buying_rate 84.50', gazette_ref: '', reference_voucher_id: 'ipo-sinha-002', notes: '' },
      { id: 're-002-b', timestamp: now, user_id: 'customs-officer', event_type: 'customs_revaluation', bucket: 'custom_revalued', amount_before_inr: 2550 * 84.50, amount_after_inr: 2550 * 85.20, variance_inr: 2550 * 0.70, variance_pct: 0.829, justification: 'Customs Officer revalued at customs_valuation_rate 85.20', gazette_ref: 'CBIC-NTF-2026-04', reference_voucher_id: 'ipo-sinha-002', notes: 'Moat #15 audit · Moat #16 dual-rate variance' },
    ],
    booked_total_inr: 2550 * 84.50,
    custom_revalued_total_inr: 2550 * 85.20,
    actual_landed_total_inr: Math.round(2550 * 84.50 * 1.07),

    allocation_method: 'by_value',
    allocated_costs: [],
    notes: 'UAE-CEPA · AEO green lane · customs revaluation captured',
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
  {
    id: 'mlgit-sinha-003',
    mlgit_no: 'MLGIT-SINHA-2026-003',
    entity_id: 'sinha-steel',
    related_import_po_id: 'ipo-sinha-003',
    related_import_po_no: 'IPO-SINHA-2026-003',
    leg1: { leg_no: 1, state: 'pending', skip_flag: false, port_code: 'SGSIN', vendor_handover_date: null, port_arrival_date: null, notes: '' },
    leg2: { leg_no: 2, state: 'pending', skip_flag: true, vessel_or_flight_id: '', carrier: '', bill_of_lading_no: '', loaded_date: null, expected_arrival: null, actual_arrival: null, notes: 'Air cargo · skip vessel leg' },
    leg3: { leg_no: 3, state: 'pending', skip_flag: false, port_code: 'INMAA', discharge_date: null, customs_cleared_date: null, rms_lane: null, notes: 'Chennai airport' },
    leg4: { leg_no: 4, state: 'pending', skip_flag: true, facility: { facility_code: '', facility_name: '', facility_type: 'cfs', location: '', is_ccsp_facility: false, ccsp_license_no: null, ccsp_license_expiry: null, capacity_teu: 0, has_bonded_warehousing: false, has_temperature_controlled: false }, arrival_date: null, dispatch_date: null, dwell_time_days: 0, notes: 'Air cargo · direct to warehouse · skip CFS' },
    leg5: { leg_no: 5, state: 'pending', skip_flag: false, warehouse_code: 'WH-SINHA-MAA', arrival_date: null, received_by: null, notes: '' },
    overall_state: 'originating',
    origination_date: '2026-05-08',
    closure_date: null,
    reconciliation_events: [],
    booked_total_inr: 14000 * 62.30,
    custom_revalued_total_inr: 0,
    actual_landed_total_inr: 0,
    allocation_method: 'by_value',
    allocated_costs: [],
    notes: 'Singapore routers · air cargo · ASEAN-FTA · 3-leg journey (legs 2 + 4 skipped)',
    created_at: now, updated_at: now, created_by: 'sinha-importer',
  },
];
