/**
 * @file     ReconciliationPanel.helpers.ts
 * @purpose  Pure recon-match helpers extracted from ReconciliationPanel.tsx so
 *           the .tsx file only exports components (react-refresh/only-export-components).
 * @sprint   T-Phase-1.1.1a-pre · lint hygiene close
 * @iso      Maintainability (HIGH+ component-only export surface restored)
 * @whom     ReconciliationPanel.tsx · SmokeTestRunner.tsx (recon smoke checks)
 * @depends  voucher · register-config types
 *
 * NOTE: Logic IDENTICAL to the prior in-file definition · zero behaviour change.
 */
import type { Voucher } from '@/types/voucher';
import type { RegisterTypeCode } from '@/types/register-config';

/** Match status badges shown per source row + per matched-target row. */
export type ReconMatchStatus = 'matched' | 'partial' | 'unmatched';

export interface MatchResult {
  status: ReconMatchStatus;
  /** Target vouchers that satisfied the match rule for this source. */
  targets: Voucher[];
  /** Sum of target amounts (for amount-based pairs: sales↔receipt / purchase↔payment). */
  targetSumPaise: number;
}

/**
 * Compute match status for a single source voucher against a candidate target list.
 * Pure function · O(target count) · used by ReconciliationPanel and recon-N smoke checks.
 */
export function computeReconMatch(
  source: Voucher,
  targets: Voucher[],
  sourceRegister: RegisterTypeCode,
  targetRegister: RegisterTypeCode,
): MatchResult {
  // Sales↔Receipt and Purchase↔Payment: amount-based bill-reference matching.
  if (
    (sourceRegister === 'sales_register' && targetRegister === 'receipt_register') ||
    (sourceRegister === 'purchase_register' && targetRegister === 'payment_register')
  ) {
    const sourceVno = source.voucher_no;
    const matched = targets.filter(t =>
      (t.bill_references ?? []).some(b => b.voucher_no === sourceVno)
    );
    const targetSum = matched.reduce((acc, t) => {
      const portion = (t.bill_references ?? [])
        .filter(b => b.voucher_no === sourceVno)
        .reduce((s, b) => s + (b.amount || 0), 0);
      return acc + portion;
    }, 0);
    const expected = source.net_amount;
    let status: ReconMatchStatus = 'unmatched';
    if (targetSum > 0 && targetSum + 0.005 >= expected) status = 'matched';
    else if (targetSum > 0) status = 'partial';
    return { status, targets: matched, targetSumPaise: targetSum };
  }

  // DeliveryNote↔Sales — match where target.so_ref === source.voucher_no.
  if (sourceRegister === 'delivery_note_register' && targetRegister === 'sales_register') {
    const matched = targets.filter(t => t.so_ref && t.so_ref === source.voucher_no);
    return {
      status: matched.length > 0 ? 'matched' : 'unmatched',
      targets: matched,
      targetSumPaise: matched.reduce((s, t) => s + t.net_amount, 0),
    };
  }

  // ReceiptNote↔Purchase — match where target.po_ref or target.vendor_bill_no === source.voucher_no.
  if (sourceRegister === 'receipt_note_register' && targetRegister === 'purchase_register') {
    const matched = targets.filter(t =>
      (t.po_ref && t.po_ref === source.voucher_no) ||
      (t.vendor_bill_no && t.vendor_bill_no === source.voucher_no)
    );
    return {
      status: matched.length > 0 ? 'matched' : 'unmatched',
      targets: matched,
      targetSumPaise: matched.reduce((s, t) => s + t.net_amount, 0),
    };
  }

  // No declared rule for this pair — render as unmatched.
  return { status: 'unmatched', targets: [], targetSumPaise: 0 };
}
