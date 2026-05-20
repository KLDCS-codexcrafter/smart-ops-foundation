/**
 * @file        src/types/cif-waterfall.ts
 * @purpose     CIF Pro-Rata Engine input/output types · 6 pro-rata bases (founder caveat resolution)
 * @when        Phase 1.EX-5 · Moat #9 Multi-Basis Pro-Rata ANCHOR
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q3=b-expanded 6 bases · founder caveat May 19
 */

export type CIFProRataBasis =
  | 'value'
  | 'weight'
  | 'volume'
  | 'quantity'
  | 'equal'
  | 'specific_assignment';

export const CIF_PRO_RATA_DESCRIPTIONS: Record<CIFProRataBasis, string> = {
  value: 'FOB-value pro-rata · TDL default · WTO Article 8 baseline · best for mixed-value cargo',
  weight: 'Gross-weight pro-rata · matches CHA freight bills · best for heavy cargo (steel · chemicals)',
  volume: 'CBM pro-rata · matches LCL/container freight · best for bulky low-density cargo',
  quantity: 'Per-NOS pro-rata · best for per-piece cargo (electronics · pharma) · per-unit freight rates',
  equal: '1/N per line · simple split · best for diverse mixed cargo where other bases do not fit',
  specific_assignment: 'Operator manual · best for Rule 10 specific assists (royalty/license tied to specific line)',
};

export interface CIFWaterfallInputLine {
  line_id: string;
  qty: number;
  rate_forex: number;
  cost_forex: number;
  fob_value_inr: number;
  gross_weight_kgs: number;
  volume_cbm: number;
  specific_assignment_pct: number | null;
}

export interface CIFWaterfallVoucherTotals {
  voucher_insurance_inr: number;
  voucher_freight_inr: number;
  voucher_exworks_inr: number;
  voucher_packing_inr: number;
}

export interface CIFWaterfallRow {
  line_id: string;
  qty: number;
  rate_forex: number;
  cost_forex: number;
  cost_base_inr: number;
  insurance_inr: number;
  freight_inr: number;
  exworks_inr: number;
  packing_inr: number;
  cif_total_inr: number;
  basis: CIFProRataBasis;
  allocation_ratio: number;
}
