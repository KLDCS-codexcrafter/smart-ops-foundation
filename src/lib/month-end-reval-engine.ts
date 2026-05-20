/**
 * @file        src/lib/month-end-reval-engine.ts
 * @purpose     Month-End Reval engine · consumes EX-7c seeds · uses voucher-runtime-engine (D-NEW-FG)
 * @sprint      T-Phase-1.EX-8-TT-Hedge-MonthEnd-DayBook-VoucherRuntime
 * @decisions   EX-8-Q4=a FULL engine · consumes EX-7c month_end_reval seed fields
 *              (month_end_reval_amount_inr · month_end_reval_variance_inr · month_end_reval_last_run)
 */
import type { ExportRealisation } from '@/types/export-realisation';
import { loadRealisations, saveRealisations } from '@/lib/export-realisation-engine';
import { postRuntimeVoucher } from '@/lib/voucher-runtime-engine';

export interface MonthEndRevalRun {
  run_id: string;
  period: string;
  run_at: string;
  current_month_end_rate: Record<string, number>;
  realisations_revalued: number;
  total_variance_inr: number;
  vouchers_posted: string[];
}

/** Run month-end revaluation · consumes EX-7c Realisation seed fields */
export function runMonthEndReval(
  entityCode: string,
  period: string,
  currentRates: Record<string, number>,
): MonthEndRevalRun {
  const runId = `mer-${period}-${Date.now()}`;
  const realisations = loadRealisations(entityCode);
  const updated: ExportRealisation[] = [];
  const vouchersPosted: string[] = [];
  let totalVarianceInr = 0;
  let revaluedCount = 0;

  for (const r of realisations) {
    if (r.status === 'fully_realised') { updated.push(r); continue; }

    const currentRate = currentRates[r.currency_code];
    if (!currentRate) { updated.push(r); continue; }

    const revalAmountInr = Math.round(r.outstanding_foreign * currentRate);
    const previousReval = r.month_end_reval_amount_inr;
    const variance = revalAmountInr - (previousReval > 0 ? previousReval : r.outstanding_inr);
    totalVarianceInr += variance;
    revaluedCount += 1;

    // Post voucher via runtime engine (D-NEW-FG)
    const voucherResult = postRuntimeVoucher({
      source_kind: 'month_end_reval',
      source_ref_id: r.id,
      amount_inr: variance,
      ledger_name: variance >= 0 ? 'Forex Gain · Month-End Reval' : 'Forex Loss · Month-End Reval',
      entity_id: entityCode,
      notes: `Month-End Reval ${period} · Realisation ${r.realisation_no}`,
    });
    vouchersPosted.push(voucherResult.posted_voucher_id);

    updated.push({
      ...r,
      month_end_reval_amount_inr: revalAmountInr,
      month_end_reval_variance_inr: variance,
      month_end_reval_last_run: new Date().toISOString(),
    });
  }

  saveRealisations(entityCode, updated);

  return {
    run_id: runId, period, run_at: new Date().toISOString(),
    current_month_end_rate: currentRates,
    realisations_revalued: revaluedCount,
    total_variance_inr: totalVarianceInr,
    vouchers_posted: vouchersPosted,
  };
}

export function getLastRevalRun(entityCode: string): { period: string; run_at: string } | null {
  const rs = loadRealisations(entityCode);
  const withRuns = rs.filter((r) => r.month_end_reval_last_run !== null);
  if (withRuns.length === 0) return null;
  const sorted = [...withRuns].sort((a, b) => (b.month_end_reval_last_run ?? '').localeCompare(a.month_end_reval_last_run ?? ''));
  const lastRun = sorted[0].month_end_reval_last_run ?? '';
  return { period: lastRun.slice(0, 7), run_at: lastRun };
}
