/**
 * @file        src/types/ci-item-allocation.ts
 * @purpose     6-Part Item Allocation Drilldown · Part A through F · 50+ UDF chip fields matching TDL exactly
 * @who         Import operators · CHA · finance · audit · BoE preparers
 * @when        Phase 1.EX-5 · THE flagship EximX screen · per v3 mother-of-all-TDL
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q2=a separate type · EX-5-Q5=a Rule 10 visible · EX-5-Q6=a 10-row hardcoded waterfall
 * @disciplines FR-30 · FR-50 · FR-80 exhaustive switch on basis
 */
import type { CIFProRataBasis } from './cif-waterfall';
import type { DutyWaterfallRow } from './duty-waterfall';

export interface CIPartA_Valuation {
  import_valuation_method: 'CIF' | 'FOB' | 'C_AND_F' | 'EX_WORKS';
  custom_exchange_rate: number;
  customs_info_active: boolean;
  fta_preferential_banner_active: boolean;
  scheme_import_banner_active: boolean;
  scheme_notification_ref: string;
}

export interface CIPartB_CIFBody {
  qty: number;
  rate_forex: number;
  cost_forex: number;
  cost_base_inr: number;
  insurance_inr: number;
  freight_inr: number;
  exworks_inr: number;
  packing_inr: number;
  cif_total_inr: number;
  pro_rata_basis: CIFProRataBasis;
  specific_assignment_pct: number | null;
}

export interface CIPartC_Rule10 {
  cif_value_inr: number;
  actual_cif_value_inr: number;
  royalty_inr: number;
  license_fee_inr: number;
  svb_loading_pct: number;
  customs_revaluation_history: CICustomsRevaluationEntry[];
}

export interface CICustomsRevaluationEntry {
  id: string;
  timestamp: string;
  user_id: string;
  amount_before_inr: number;
  amount_after_inr: number;
  variance_inr: number;
  variance_pct: number;
  justification: string;
  gazette_ref: string;
  reference_mlgit_id: string | null;
}

export interface CIPartD_DutyWaterfall {
  rows: DutyWaterfallRow[];
  total_custom_duty_inr: number;
  gst_assessable_value_inr: number;
  total_landed_value_inr: number;
  tdl_gap_chips: TDLGapChip[];
}

export interface TDLGapChip {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  label: string;
  description: string;
  crosslink_to_atlas: string;
}

export interface CIPartE_DutySummary {
  total_applicable_duty_inr: number;
  duty_pct_on_cif: number;
  duty_pct_on_assessable: number;
}

export interface CIPartF_ExpenseBand {
  per_batch_insurance_inr: number;
  per_batch_freight_inr: number;
  per_batch_exworks_inr: number;
  per_batch_packing_inr: number;
  per_batch_cha_inr: number;
  per_batch_landing_inr: number;
  per_batch_total_expense_inr: number;
  applicable_costing_method: 'FIFO' | 'FEFO' | 'Weighted' | null;
}

export interface CIItemAllocation {
  part_a: CIPartA_Valuation;
  part_b: CIPartB_CIFBody;
  part_c: CIPartC_Rule10;
  part_d: CIPartD_DutyWaterfall;
  part_e: CIPartE_DutySummary;
  part_f: CIPartF_ExpenseBand;
}
