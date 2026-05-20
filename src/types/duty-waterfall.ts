/**
 * @file        src/types/duty-waterfall.ts
 * @purpose     10-Row Duty Waterfall output type · all 16 UDF chips from TDL (EX-5-Q6=a)
 * @when        Phase 1.EX-5 · consumed by Part D
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */

export type DutyWaterfallRowKind =
  | 'A_cif_at_port'
  | 'B_landing_handling'
  | 'assessable_value_1pct'
  | 'C_bcd'
  | 'bcd_assess_total'
  | 'D_sws'
  | 'sws_total'
  | 'roundoff_before_custom'
  | 'total_custom_duty'
  | 'gst_assessable_value'
  | 'E_igst'
  | 'F_comp_cess'
  | 'G_anti_dumping'
  | 'H_safeguard'
  | 'roundoff_before_net'
  | 'total_landed_value';

export interface DutyWaterfallRow {
  kind: DutyWaterfallRowKind;
  sl: string;
  description: string;
  rate_pct: number | null;
  rate_label: string;
  base_inr: number | null;
  amount_inr: number;
  udf_chip: string;
  is_editable: boolean;
  is_subtotal: boolean;
}
