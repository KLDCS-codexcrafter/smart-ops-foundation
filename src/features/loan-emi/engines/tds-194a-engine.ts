/**
 * @file     tds-194a-engine.ts
 * @purpose  Wraps computeTDS from tds-engine.ts for monthly accrual use.
 *           Given a Borrowing ledger + accrual amount, returns either:
 *             - { applicable: false } — no TDS, post 2-leg as before
 *             - { applicable: true, tdsAmount, tdsLedgerId, netAmount } — post 3-leg
 *
 *           Does NOT post vouchers itself — returns the line spec for
 *           accrual-engine to inject.
 * @sprint   T-H1.5-D-D4
 * @finding  CC-065
 */

import { computeTDS, type TDSComputeResult } from '@/lib/tds-engine';
import { resolveExpenseLedger } from '../lib/ledger-resolver';

export interface TDSLineSpec {
  applicable: boolean;
  tdsAmount: number;            // ₹ 2dp — 0 if not applicable
  netAmount: number;            // grossAmount - tdsAmount (what lender receives)
  tdsLedgerId: string | null;   // TDS Payable ledger ID; null if not applicable
  section: string;              // e.g. '194A'
  rate: number;                 // e.g. 10
  thresholdCrossed: boolean;
  deducteeType: 'individual' | 'company' | 'no_pan';
  narration: string;
}

export interface TDSBorrowingRow {
  id: string;
  name: string;
  tdsApplicable?: boolean;
  tdsSection?: string;
}

/**
 * Computes the TDS line for a single accrual.
 * Default deducteeType for banks/NBFCs = 'company'; future enhancement can
 * read a loan-level PAN-bearing field. 194A threshold ₹40,000/FY per deductee.
 */
export function computeTDSForAccrual(
  ledger: TDSBorrowingRow,
  grossInterestAmount: number,
  entityCode: string,
): TDSLineSpec {
  if (!ledger.tdsApplicable) {
    return {
      applicable: false, tdsAmount: 0, netAmount: grossInterestAmount,
      tdsLedgerId: null, section: '', rate: 0, thresholdCrossed: false,
      deducteeType: 'company', narration: '',
    };
  }

  const section = ledger.tdsSection ?? '194A';
  const deducteeType: 'individual' | 'company' | 'no_pan' = 'company';

  const result: TDSComputeResult = computeTDS(
    grossInterestAmount, section, deducteeType, ledger.id, entityCode,
  );

  if (!result.applicable) {
    return {
      applicable: false, tdsAmount: 0, netAmount: grossInterestAmount,
      tdsLedgerId: null, section, rate: result.rate,
      thresholdCrossed: result.thresholdCrossed,
      deducteeType, narration: '',
    };
  }

  // [JWT] POST /api/accounting/ledger-definitions — auto-create TDS Payable if missing
  const tdsLedgerId = resolveExpenseLedger('tds_payable');

  return {
    applicable: true,
    tdsAmount: result.tdsAmount,
    netAmount: result.netAmount,
    tdsLedgerId,
    section,
    rate: result.rate,
    thresholdCrossed: true,
    deducteeType,
    narration: `TDS @ ${result.rate}% u/s ${section} deducted on interest to ${ledger.name}`,
  };
}
