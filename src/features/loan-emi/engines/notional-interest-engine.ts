/**
 * @file     notional-interest-engine.ts
 * @purpose  Monthly walker that imputes notional interest income on aged
 *           open advances. For every (open|partial) advance aged ≥ 60 days,
 *           computes balance × 9% / 12 and posts a Journal Voucher:
 *
 *             Dr Interest Receivable on Advances   (STLA)
 *             Cr Notional Interest Income          (INTINC)
 *
 *           Idempotency: periodKey = 'YYYY-MM' per advance. Running twice
 *           in the same calendar month is a no-op (skipReason set).
 *
 *           Pure consumer of FineCore's postVoucher() — does NOT modify
 *           finecore-engine.ts. Closes leak L6.
 *
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import type { Voucher } from '@/types/voucher';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import {
  resolveExpenseLedger,
  getLedgerName as resolveLedgerName,
  getLedgerCode as resolveLedgerCode,
  getLedgerGroupCode as resolveLedgerGroupCode,
} from '../lib/ledger-resolver';
import { computeAgingReport } from '../lib/advance-aging';
import {
  loadLog,
  saveLog,
  findNotionalDuplicate,
  appendNotionalLogEntry,
} from '../lib/notional-interest-log';

/** Aging threshold (days). Advances younger than this are skipped silently. */
const AGING_THRESHOLD_DAYS = 60;
/** Annual rate (% per annum) used for the imputation. */
const ANNUAL_RATE_PERCENT = 9;

export interface NotionalPlanItem {
  advanceId: string;
  advanceRefNo: string;
  partyType: 'vendor' | 'customer';
  partyId: string;
  partyName: string;
  balanceAmount: number;
  daysOld: number;
  periodKey: string;            // 'YYYY-MM'
  interestAmount: number;       // balance × 9% / 12
  alreadyPosted: boolean;
  skipReason: string | null;
}

export interface NotionalRunResult {
  posted: number;
  skipped: number;
  errors: Array<{ advanceId: string; message: string }>;
}

function readAdvances(entityCode: string): AdvanceEntry[] {
  try {
    // [JWT] GET /api/compliance/advances?entityCode=...
    const raw = localStorage.getItem(advancesKey(entityCode));
    return raw ? (JSON.parse(raw) as AdvanceEntry[]) : [];
  } catch {
    return [];
  }
}

function periodKeyFor(asOfDate: string): string {
  // YYYY-MM derived from the run's reference date
  return asOfDate.slice(0, 7);
}

function monthlyInterestFor(balance: number): number {
  return Math.round(((balance * (ANNUAL_RATE_PERCENT / 100)) / 12) * 100) / 100;
}

/**
 * Builds the plan WITHOUT posting. Skips: balance≤0, age<60d, or already
 * posted this month. Each item carries its own `alreadyPosted` flag and
 * `skipReason` for UI surfacing.
 */
export function planMonthlyNotional(
  asOfDate: string,
  entityCode: string,
): NotionalPlanItem[] {
  const advances = readAdvances(entityCode);
  const aging = computeAgingReport(advances, asOfDate);
  const log = loadLog(entityCode);
  const periodKey = periodKeyFor(asOfDate);

  const plan: NotionalPlanItem[] = [];
  for (const aa of aging.aged) {
    if (aa.daysOld < AGING_THRESHOLD_DAYS) continue;
    if (aa.advance.balance_amount <= 0) continue;

    const interestAmount = monthlyInterestFor(aa.advance.balance_amount);
    const dup = findNotionalDuplicate(log, aa.advance.id, periodKey);

    plan.push({
      advanceId: aa.advance.id,
      advanceRefNo: aa.advance.advance_ref_no,
      partyType: aa.advance.party_type,
      partyId: aa.advance.party_id,
      partyName: aa.advance.party_name,
      balanceAmount: aa.advance.balance_amount,
      daysOld: aa.daysOld,
      periodKey,
      interestAmount,
      alreadyPosted: dup !== null,
      skipReason: dup ? `Already posted: voucher ${dup.voucherNo}` : null,
    });
  }
  return plan;
}

/**
 * Posts the monthly notional interest journal vouchers for the plan items
 * that are not already posted. Returns a summary count.
 */
export function commitMonthlyNotional(
  asOfDate: string,
  entityCode: string,
): NotionalRunResult {
  const plan = planMonthlyNotional(asOfDate, entityCode);
  const result: NotionalRunResult = { posted: 0, skipped: 0, errors: [] };
  if (plan.length === 0) return result;

  const intRcvId = resolveExpenseLedger('interest_receivable_advances');
  const intRcvName = resolveLedgerName(intRcvId) || 'Interest Receivable on Advances';
  const intRcvCode = resolveLedgerCode(intRcvId) || 'INTRCV';
  const intRcvGroup = resolveLedgerGroupCode(intRcvId) || 'STLA';

  const incId = resolveExpenseLedger('notional_interest_income');
  const incName = resolveLedgerName(incId) || 'Notional Interest Income';
  const incCode = resolveLedgerCode(incId) || 'NOTINT';
  const incGroup = resolveLedgerGroupCode(incId) || 'INTINC';

  let log = loadLog(entityCode);

  for (const item of plan) {
    if (item.alreadyPosted || item.interestAmount <= 0) {
      result.skipped += 1;
      continue;
    }
    try {
      const nowIso = new Date().toISOString();
      const today = asOfDate;
      const voucherId = `v-notint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const voucherNo = generateVoucherNo('JV-NOT', entityCode);
      const narration = `Being notional interest on ${item.advanceRefNo} — aged ${item.daysOld}d — ${item.periodKey}`;

      const voucher: Voucher = {
        id: voucherId,
        voucher_no: voucherNo,
        voucher_type_id: 'vt-journal',
        voucher_type_name: 'Journal Voucher',
        base_voucher_type: 'Journal',
        entity_id: entityCode,
        date: today,
        effective_date: today,
        party_id: item.partyId,
        party_name: item.partyName,
        ledger_lines: [
          {
            id: `ll-${Date.now()}-a`,
            ledger_id: intRcvId,
            ledger_code: intRcvCode,
            ledger_name: intRcvName,
            ledger_group_code: intRcvGroup,
            dr_amount: item.interestAmount,
            cr_amount: 0,
            narration: `Notional interest on ${item.advanceRefNo} — ${item.periodKey}`,
          },
          {
            id: `ll-${Date.now()}-b`,
            ledger_id: incId,
            ledger_code: incCode,
            ledger_name: incName,
            ledger_group_code: incGroup,
            dr_amount: 0,
            cr_amount: item.interestAmount,
            narration: `Notional interest earned from ${item.partyName}`,
          },
        ],
        gross_amount: item.interestAmount,
        total_discount: 0,
        total_taxable: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: item.interestAmount,
        tds_applicable: false,
        narration,
        terms_conditions: '',
        payment_enforcement: '',
        payment_instrument: '',
        status: 'posted',
        created_by: 'current-user',
        created_at: nowIso,
        updated_at: nowIso,
        posted_at: nowIso,
      };

      // [JWT] POST /api/accounting/vouchers/post
      postVoucher(voucher, entityCode);

      log = appendNotionalLogEntry(log, {
        entityCode,
        advanceId: item.advanceId,
        advanceRefNo: item.advanceRefNo,
        partyType: item.partyType,
        partyId: item.partyId,
        partyName: item.partyName,
        periodKey: item.periodKey,
        agedDaysAtPost: item.daysOld,
        baseAmount: item.balanceAmount,
        annualRatePercent: ANNUAL_RATE_PERCENT,
        interestAmount: item.interestAmount,
        voucherId,
        voucherNo,
        postedBy: 'current-user',
        reversedByVoucherId: null,
        narration,
      });
      result.posted += 1;
    } catch (err) {
      result.errors.push({
        advanceId: item.advanceId,
        message: err instanceof Error ? err.message : 'Posting failed',
      });
    }
  }

  saveLog(entityCode, log);
  return result;
}

/** Exposed constants for UI and smoke checks. */
export const NOTIONAL_AGING_THRESHOLD_DAYS = AGING_THRESHOLD_DAYS;
export const NOTIONAL_ANNUAL_RATE_PERCENT = ANNUAL_RATE_PERCENT;
