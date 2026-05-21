/**
 * @file        src/types/bcd-calc-snapshot.ts
 * @purpose     BCD Calculator snapshot persistence · FR-26 entity-scoped localStorage
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q10=a FR-26 entity-scoped persistence
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26
 */

export interface BCDCalcSnapshot {
  id: string;
  snapshot_no: string;
  entity_id: string;
  cth_code: string;
  country_code: string;
  cif_value_inr: number;
  effective_date: string;
  fta_treaty_code: string | null;
  bcd_inr: number;
  sws_inr: number;
  igst_inr: number;
  comp_cess_inr: number;
  anti_dumping_inr: number;
  safeguard_inr: number;
  landing_inr: number;
  total_custom_duty_inr: number;
  total_landed_value_inr: number;
  scenario_label: string;
  notes: string;
  created_at: string;
  created_by_user: string;
}

export const bcdCalcSnapshotKey = (entityCode: string): string =>
  `erp_${entityCode}_bcd_calc_snapshots`;
