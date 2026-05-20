/**
 * @file        src/types/rate-ladder.ts
 * @purpose     Voucher-level rate ladder · audit trail of every rate event in a transaction lifecycle
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q4=a array on transaction
 * @disciplines FR-30 · FR-50 · FR-80
 */

export type VoucherStage =
  | 'po_booking'
  | 'po_revision'
  | 'boe_filing'
  | 'grn_actual'
  | 'tt_payment'
  | 'realisation'
  | 'month_end_reval'
  | 'fy_close';

export type LadderRateType =
  | 'buying_rate'
  | 'customs_valuation_rate'
  | 'selling_rate'
  | 'tt_actual_rate'
  | 'rbi_reference_rate'
  | 'last_voucher_rate';

export interface VoucherRateEntry {
  id: string;
  timestamp: string;
  voucher_stage: VoucherStage;
  rate_type: LadderRateType;
  rate_value: number;
  currency_code: string;
  source: 'ForexRate-master' | 'manual-override' | 'bank-statement' | 'rbi-feed';
  reference_voucher_id: string | null;
  notes: string;
}

export function latestRateByType(
  ladder: VoucherRateEntry[],
  rateType: LadderRateType,
): VoucherRateEntry | null {
  const matches = ladder.filter((e) => e.rate_type === rateType);
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}
