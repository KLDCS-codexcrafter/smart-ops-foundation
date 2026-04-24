/**
 * @file     gst-charge-engine.ts
 * @purpose  Flat-rate GST splitter for loan charges (processing fee, bounce
 *           charge, foreclosure). NOT a replacement for gst-engine's
 *           item-based waterfall — this handles the simpler case of a
 *           single-line service charge with a fixed GST rate from the loan's
 *           Charges Master.
 *
 *           Interstate heuristic: BorrowingLedger has no lenderStateCode
 *           field, so D4 defaults to IGST. Can be refined later by adding
 *           lenderGstin to the ledger master.
 * @sprint   T-H1.5-D-D4
 * @finding  CC-065
 */

import { resolveExpenseLedger } from '../lib/ledger-resolver';

export interface GSTSplitLineSpec {
  applicable: boolean;
  baseAmount: number;           // charge before GST
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalWithTax: number;         // base + taxes
  /** Mode: 'intrastate' = CGST+SGST · 'interstate' = IGST · 'none' = no GST */
  mode: 'intrastate' | 'interstate' | 'none';
  inputCgstLedgerId: string | null;
  inputSgstLedgerId: string | null;
  inputIgstLedgerId: string | null;
  rateApplied: number;          // % rate used (for narration)
}

export interface GSTBorrowingRow {
  id: string;
  name: string;
  gstOnChargesApplicable?: boolean;
  processingFeeGst?: number;    // rate % (default 18)
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function splitChargeWithGST(
  ledger: GSTBorrowingRow,
  baseChargeAmount: number,
): GSTSplitLineSpec {
  if (!ledger.gstOnChargesApplicable || baseChargeAmount <= 0) {
    return {
      applicable: false,
      baseAmount: baseChargeAmount,
      cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
      totalWithTax: baseChargeAmount,
      mode: 'none',
      inputCgstLedgerId: null, inputSgstLedgerId: null, inputIgstLedgerId: null,
      rateApplied: 0,
    };
  }

  const gstRate = ledger.processingFeeGst ?? 18;
  // D4 simplification: default to IGST (interstate) since BorrowingLedger
  // doesn't capture lenderStateCode. Accountant can reclassify post-posting
  // if needed. Refinement = future sprint.
  const igstAmount = round2(baseChargeAmount * (gstRate / 100));

  return {
    applicable: true,
    baseAmount: baseChargeAmount,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount,
    totalWithTax: round2(baseChargeAmount + igstAmount),
    mode: 'interstate',
    inputCgstLedgerId: null,
    inputSgstLedgerId: null,
    // [JWT] POST /api/accounting/ledger-definitions — auto-create Input IGST if missing
    inputIgstLedgerId: resolveExpenseLedger('input_igst'),
    rateApplied: gstRate,
  };
}
