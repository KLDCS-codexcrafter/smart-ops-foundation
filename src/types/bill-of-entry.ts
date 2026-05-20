/**
 * @file        src/types/bill-of-entry.ts
 * @purpose     Bill of Entry · sibling type · 6th sibling pattern · GL commit point for entire Import chain
 * @who         Import operators · CHA · customs officer · finance reconciliation · audit
 * @when        Phase 1.EX-6 · GL commit · consumed by EX-7 export-mirror · EX-8 reconciliation · EX-9 compliance
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @iso         Functional Suitability · Reliability · Maintainability (ISO 25010)
 * @decisions   EX-6-Q1=b sibling · EX-6-Q2=a 3 BoE types · EX-6-Q8=a Project Imports Sec 25 seed
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26 entity-scoped localStorage · FR-80 exhaustive switch
 */

export type BoEType = 'home_consumption' | 'warehouse' | 'ex_bond';

export const BOE_TYPE_DESCRIPTIONS: Record<BoEType, string> = {
  home_consumption: 'Home Consumption · duty paid immediately · goods released to importer',
  warehouse: 'Warehouse · duty deferred · goods stored in bonded warehouse · pay later',
  ex_bond: 'Ex-Bond · goods leaving bonded warehouse · duty paid now on ex-bond clearance',
};

export type BoEStatus =
  | 'draft'
  | 'submitted_to_icegate'
  | 'rms_assigned'
  | 'examination_pending'
  | 'duty_paid'
  | 'cleared'
  | 'cancelled';

export const BOE_VALID_TRANSITIONS: Record<BoEStatus, BoEStatus[]> = {
  draft: ['submitted_to_icegate', 'cancelled'],
  submitted_to_icegate: ['rms_assigned', 'cancelled'],
  rms_assigned: ['examination_pending', 'duty_paid'],
  examination_pending: ['duty_paid', 'cancelled'],
  duty_paid: ['cleared'],
  cleared: [],
  cancelled: [],
};

export interface BoELine {
  id: string;
  line_no: number;
  related_ci_line_id: string;
  related_import_po_line_id: string;
  item_id: string;
  item_name: string;
  cth_code: string;
  country_of_origin: string;
  qty: number;
  uom: string;

  final_cif_inr: number;
  final_assessable_inr: number;
  bcd_inr: number;
  sws_inr: number;
  igst_inr: number;
  comp_cess_inr: number;
  anti_dumping_inr: number;
  safeguard_inr: number;
  landing_inr: number;
  total_duty_inr: number;
  total_landed_inr: number;

  notes: string;
}

export interface BillOfEntry {
  id: string;
  boe_no: string;
  entity_id: string;
  boe_type: BoEType;
  status: BoEStatus;

  assessment_no: string;
  filing_date: string;
  port_of_clearance: string;
  ce_section: string;

  related_ci_id: string;
  related_ci_no: string;
  related_mlgit_id: string;
  related_mlgit_no: string;
  related_rms_declaration_id: string | null;

  icegate_submission_id: string | null;
  icegate_response_timestamp: string | null;
  icegate_simulated_lane: 'green' | 'yellow' | 'red' | null;

  importer_aeo_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo';
  port_aeo_tier_supported: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo';
  aeo_fast_track_eligible: boolean;
  aeo_override_applied: boolean;

  is_project_import: boolean;
  project_import_notification_ref: string | null;
  project_import_concessional_duty_pct: number | null;

  dwell_days_used: number;
  demurrage_free_days_available: number;
  demurrage_chargeable_days: number;
  demurrage_total_inr: number;

  lines: BoELine[];
  total_assessable_inr: number;
  total_duty_inr: number;
  total_igst_inr: number;
  total_comp_cess_inr: number;
  total_demurrage_inr: number;
  total_landed_inr: number;

  posted_voucher_ids: string[];

  notes: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const billOfEntryKey = (entityCode: string): string =>
  `erp_${entityCode}_bills_of_entry`;
