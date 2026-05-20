/**
 * @file        src/lib/duty-waterfall-engine.ts
 * @purpose     10-Row Duty Waterfall · consumes EX-2 CTH × Country × Date resolver
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 * @decisions   EX-5-Q6=a hardcoded matching TDL · EX-5-Q7=a 4 TDL Gap Chips inline
 */
import type { DutyWaterfallRow } from '@/types/duty-waterfall';
import type { TDLGapChip } from '@/types/ci-item-allocation';
import { resolveDutyStructure } from '@/lib/cth-resolver';

export function computeDutyWaterfall(
  entityCode: string,
  cifValueInr: number,
  cthCode: string,
  countryCode: string,
  effectiveDate: string,
  roundoffBeforeCustom: number = 0,
  roundoffBeforeNet: number = 0,
): { rows: DutyWaterfallRow[]; total_custom_duty_inr: number; total_landed_value_inr: number; gst_assessable_value_inr: number } {
  const ds = resolveDutyStructure(entityCode, cthCode, countryCode, effectiveDate);

  const customsBucket = ds?.buckets.find((b) => b.kind === 'customs');
  const otherBucket = ds?.buckets.find((b) => b.kind === 'other');
  const gstBucket = ds?.buckets.find((b) => b.kind === 'gst');

  const A_cif = cifValueInr;
  const B_landing = A_cif * 0.01;
  const assessable_1pct = A_cif + B_landing;

  const bcd_rate = customsBucket?.kind === 'customs' ? customsBucket.bcd_rate : 0;
  const C_bcd = assessable_1pct * (bcd_rate / 100);
  const bcd_assess_total = assessable_1pct + C_bcd;

  const D_sws = C_bcd * 0.10;
  const sws_total = bcd_assess_total + D_sws;

  const ad_rate = customsBucket?.kind === 'customs' ? (customsBucket.anti_dumping_rate ?? 0) : 0;
  const G_anti_dumping = ad_rate > 0 ? assessable_1pct * (ad_rate / 100) : 0;

  const sg_rate = customsBucket?.kind === 'customs' ? (customsBucket.safeguard_rate ?? 0) : 0;
  const H_safeguard = sg_rate > 0 ? assessable_1pct * (sg_rate / 100) : 0;

  const total_custom_duty_inr = C_bcd + D_sws + G_anti_dumping + H_safeguard + roundoffBeforeCustom;
  const gst_assessable_value_inr = A_cif + B_landing + C_bcd + D_sws;

  const igst_rate = gstBucket?.kind === 'gst' ? gstBucket.igst_rate : 0;
  const E_igst = gst_assessable_value_inr * (igst_rate / 100);

  const comp_cess_rate = otherBucket?.kind === 'other' ? otherBucket.comp_cess_rate : 0;
  const F_comp_cess = gst_assessable_value_inr * (comp_cess_rate / 100);

  const total_landed_value_inr = A_cif + B_landing + total_custom_duty_inr + E_igst + F_comp_cess + roundoffBeforeNet;

  const rows: DutyWaterfallRow[] = [
    { kind: 'A_cif_at_port', sl: 'A', description: 'CIF at Indian Port', rate_pct: null, rate_label: '', base_inr: null, amount_inr: A_cif, udf_chip: 'ImportDutyAmountCal · 4124', is_editable: false, is_subtotal: false },
    { kind: 'B_landing_handling', sl: 'B', description: '+ Landing/Handling Duty @ 1%', rate_pct: 1, rate_label: 'Landing @{rate}%', base_inr: A_cif, amount_inr: B_landing, udf_chip: 'LandedHandlingDuty · 4125', is_editable: false, is_subtotal: false },
    { kind: 'assessable_value_1pct', sl: '—', description: '= Import Duty Assessable Value (CIF+B)', rate_pct: null, rate_label: '', base_inr: null, amount_inr: assessable_1pct, udf_chip: 'AssessmentValue1Per · 4126', is_editable: false, is_subtotal: true },
    { kind: 'C_bcd', sl: 'C', description: `+ Basic Custom Duty @ ${bcd_rate}%`, rate_pct: bcd_rate, rate_label: `BCD @{rate}%`, base_inr: assessable_1pct, amount_inr: C_bcd, udf_chip: 'BCDAssessmentValue1 · 4127', is_editable: false, is_subtotal: false },
    { kind: 'bcd_assess_total', sl: '—', description: '= BCD Assessable Total', rate_pct: null, rate_label: '', base_inr: null, amount_inr: bcd_assess_total, udf_chip: 'BCDAssTotalValue · 4148', is_editable: false, is_subtotal: true },
    { kind: 'D_sws', sl: 'D', description: '+ Social Welfare Surcharge @ 10%', rate_pct: 10, rate_label: 'SWS @{rate}% on BCD', base_inr: C_bcd, amount_inr: D_sws, udf_chip: 'SocialWelFareSurChargeSWS · 4128', is_editable: false, is_subtotal: false },
    { kind: 'sws_total', sl: '—', description: '= SWS Total', rate_pct: null, rate_label: '', base_inr: null, amount_inr: sws_total, udf_chip: 'SWSTotalValue · 4149', is_editable: false, is_subtotal: true },
    { kind: 'G_anti_dumping', sl: 'G', description: `+ Anti-Dumping Duty @ ${ad_rate}%`, rate_pct: ad_rate, rate_label: `AD @{rate}%`, base_inr: assessable_1pct, amount_inr: G_anti_dumping, udf_chip: 'OtherDuty (CMPOtherDuty)', is_editable: false, is_subtotal: false },
    { kind: 'H_safeguard', sl: 'H', description: `+ Safeguard Duty @ ${sg_rate}%`, rate_pct: sg_rate, rate_label: `SG @{rate}%`, base_inr: assessable_1pct, amount_inr: H_safeguard, udf_chip: 'OtherDuty', is_editable: false, is_subtotal: false },
    { kind: 'roundoff_before_custom', sl: '—', description: 'Round Off (before Total Custom)', rate_pct: null, rate_label: '', base_inr: null, amount_inr: roundoffBeforeCustom, udf_chip: 'RoundoffBeforeCutomTotal · 4170', is_editable: true, is_subtotal: false },
    { kind: 'total_custom_duty', sl: '—', description: 'Total Custom Duty (C+D+G+H)', rate_pct: null, rate_label: '', base_inr: null, amount_inr: total_custom_duty_inr, udf_chip: 'TotalCustomvalue · 4132', is_editable: false, is_subtotal: true },
    { kind: 'gst_assessable_value', sl: '—', description: '= GST Assessable Value (A+B+C+D)', rate_pct: null, rate_label: '', base_inr: null, amount_inr: gst_assessable_value_inr, udf_chip: 'IMPGSTAssVal · 4133', is_editable: false, is_subtotal: true },
    { kind: 'E_igst', sl: 'E', description: `+ Integrated GST @ ${igst_rate}%`, rate_pct: igst_rate, rate_label: `IGST @{rate}%`, base_inr: gst_assessable_value_inr, amount_inr: E_igst, udf_chip: 'IntegratedGoodsServicesTax · 4129', is_editable: false, is_subtotal: false },
    { kind: 'F_comp_cess', sl: 'F', description: `+ Compensation Cess @ ${comp_cess_rate}%`, rate_pct: comp_cess_rate, rate_label: `CC @{rate}%`, base_inr: gst_assessable_value_inr, amount_inr: F_comp_cess, udf_chip: 'CICompensationCess · 4130', is_editable: false, is_subtotal: false },
    { kind: 'roundoff_before_net', sl: '—', description: 'Round Off (before Net)', rate_pct: null, rate_label: '', base_inr: null, amount_inr: roundoffBeforeNet, udf_chip: 'RoundoffBeforeNetTotal · 4171', is_editable: true, is_subtotal: false },
    { kind: 'total_landed_value', sl: '—', description: 'TOTAL LANDED VALUE', rate_pct: null, rate_label: '', base_inr: null, amount_inr: total_landed_value_inr, udf_chip: 'CIVCHTotalValue · 4694', is_editable: false, is_subtotal: true },
  ];

  return { rows, total_custom_duty_inr, total_landed_value_inr, gst_assessable_value_inr };
}

export const TDL_GAP_CHIPS_DEFAULT: TDLGapChip[] = [
  { id: 'tdl-gap-1', severity: 'high', label: '1% landing hard-coded', description: 'CBIC Valuation Rules 2007 vary by mode/route', crosslink_to_atlas: '/erp/eximx/saathi/tdl-gaps-atlas' },
  { id: 'tdl-gap-2', severity: 'critical', label: 'Scheme-exemption blind', description: 'EOU/SEZ/AA/EPCG schemes not honored in TDL · Operix surfaces here', crosslink_to_atlas: '/erp/eximx/saathi/tdl-gaps-atlas' },
  { id: 'tdl-gap-3', severity: 'high', label: 'Specific-rate cess', description: 'Tobacco/cars per litre/piece cess not value-based · TDL formula breaks', crosslink_to_atlas: '/erp/eximx/saathi/tdl-gaps-atlas' },
  { id: 'tdl-gap-4', severity: 'medium', label: 'No abatement field', description: 'Mega Power Projects partial exemption not modeled', crosslink_to_atlas: '/erp/eximx/saathi/tdl-gaps-atlas' },
];
