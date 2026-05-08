/**
 * @file        bill-passing-tax-derivation.ts
 * @purpose     Derive GST · TDS · RCM breakdowns from a Bill Passing record.
 *              Pure compute · no IO · safe to call from UI panels and engine.
 * @who         Procurement / FinCore
 * @when        Sprint T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration · Block D
 * @sprint      T-Phase-1.A.3.b-Procure360-Bill-Passing-Integration
 * @iso         25010 · Maintainability · Reliability (deterministic · pure)
 * @decisions   D-NEW-AI (cached tax derivation · paise-precise · single source for header chips · FCPI bridge · reports)
 * @reuses      decimal-helpers · @/types/bill-passing
 * @[JWT]       n/a (pure compute · no network)
 */

import type { BillPassingRecord, BillPassingLine } from '@/types/bill-passing';
import { dMul, dAdd, dSum, round2 } from './decimal-helpers';

export interface GstBreakdown {
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  total_gst: number;
}

export interface TdsBreakdown {
  applicable: boolean;
  section: string;
  rate_pct: number;
  base_amount: number;
  tds_amount: number;
}

export interface RcmBreakdown {
  applicable: boolean;
  reason: string;
  reverse_charge_amount: number;
}

export interface BillPassingTaxBreakdown {
  gst: GstBreakdown;
  tds: TdsBreakdown;
  rcm: RcmBreakdown;
}

/**
 * Heuristic intra-state vs inter-state: if no place-of-supply data, default to intra-state
 * (CGST + SGST split). Caller may post-process for IGST when supply state differs.
 */
export function deriveGst(lines: BillPassingLine[], interState = false): GstBreakdown {
  const taxable_value = round2(dSum(lines, (l: BillPassingLine) => l.invoice_value));
  const total_gst = round2(dSum(lines, (l: BillPassingLine) => l.invoice_tax_value));
  if (interState) {
    return { taxable_value, cgst: 0, sgst: 0, igst: total_gst, total_gst };
  }
  const half = round2(total_gst / 2);
  return { taxable_value, cgst: half, sgst: round2(total_gst - half), igst: 0, total_gst };
}

export function deriveTds(
  bill: BillPassingRecord,
  section: string | null,
  ratePct: number,
): TdsBreakdown {
  if (!section || ratePct <= 0) {
    return { applicable: false, section: '', rate_pct: 0, base_amount: 0, tds_amount: 0 };
  }
  const base_amount = round2(dSum(bill.lines, (l: BillPassingLine) => l.invoice_value));
  const tds_amount = round2(dMul(base_amount, ratePct) / 100);
  return { applicable: true, section, rate_pct: ratePct, base_amount, tds_amount };
}

export function deriveRcm(
  bill: BillPassingRecord,
  rcm = false,
  reason = '',
): RcmBreakdown {
  if (!rcm) {
    return { applicable: false, reason: '', reverse_charge_amount: 0 };
  }
  const reverse_charge_amount = round2(
    dSum(bill.lines, (l: BillPassingLine) => l.invoice_tax_value),
  );
  return { applicable: true, reason, reverse_charge_amount };
}

export function deriveTaxBreakdown(
  bill: BillPassingRecord,
  opts: {
    interState?: boolean;
    tdsSection?: string | null;
    tdsRatePct?: number;
    rcm?: boolean;
    rcmReason?: string;
  } = {},
): BillPassingTaxBreakdown {
  const gst = deriveGst(bill.lines, opts.interState ?? false);
  const tds = deriveTds(bill, opts.tdsSection ?? null, opts.tdsRatePct ?? 0);
  const rcm = deriveRcm(bill, opts.rcm ?? false, opts.rcmReason ?? '');
  return { gst, tds, rcm };
}

/** Final payable: taxable + GST − TDS (RCM does not reduce vendor payable). */
export function computeNetPayable(breakdown: BillPassingTaxBreakdown): number {
  const gross = dAdd(breakdown.gst.taxable_value, breakdown.gst.total_gst);
  return round2(gross - breakdown.tds.tds_amount);
}
