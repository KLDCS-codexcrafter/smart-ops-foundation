/**
 * commission-engine.ts — Commission lifecycle pure utility
 * Sprint 4. Sprint 6B: collection-bonus evaluation.
 * No React. No localStorage. All data passed as params.
 * [JWT] All storage handled by callers.
 */
import Decimal from 'decimal.js';
import type {
  CommissionEntry,
  CommissionPayment,
  CommissionCreditNoteRef,
} from '@/types/commission-register';
import type { TDSDeductionEntry } from '@/types/compliance';
import type { VoucherLedgerLine } from '@/types/voucher';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { getQuarter, getAssessmentYear } from '@/lib/finecore-engine';

export interface CommissionReceiptResult {
  updatedEntries: CommissionEntry[];
  newTDSEntries: TDSDeductionEntry[];
  paymentCount: number;
  totalCommissionRecorded: number;
  totalTDSDeducted: number;
  banner: string;
}

export interface CommissionReversalResult {
  updatedEntries: CommissionEntry[];
  reversalJVLines: VoucherLedgerLine[] | null; // null = commission not yet paid
  cancelledTDSIds: string[];
  amendTDSIds: string[];
  totalReversed: number;
  totalTDSReversed: number;
  requiresJV: boolean;
  banner: string;
}

export interface CommissionGLResult {
  expenseLines: VoucherLedgerLine[];
  netPayableToAgent: number;
  tdsPayableAmount: number;
}

// round2: Decimal-based 2dp half-up rounding (Z2a · prevents floating-point drift across commission lifecycle)
const round2 = (n: number) => new Decimal(n ?? 0).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/**
 * Function A — Auto-trigger commission allocation when a customer receipt is posted.
 * Allocates the receipt across pending/partial commission entries for that customer.
 * Computes catch-up TDS when YTD aggregate crosses 194H/194J thresholds.
 */
export function triggerCommissionOnReceipt(
  customerId: string,
  receiptAmount: number,
  receiptDate: string,
  receiptVoucherId: string,
  receiptVoucherNo: string,
  allEntries: CommissionEntry[],
  allTDSEntries: TDSDeductionEntry[],
  entityCode: string,
  samConfig?: SAMConfig,  // Sprint 6B — optional; no bonus if omitted
): CommissionReceiptResult {
  const eligible = allEntries.filter(e =>
    e.customer_id === customerId &&
    (e.status === 'pending' || e.status === 'partial'),
  );

  const totalOutstanding = eligible.reduce(
    (s, e) => s.plus(Decimal.max(0, new Decimal(e.net_invoice_amount ?? 0).minus(new Decimal(e.amount_received_to_date ?? 0)))),
    new Decimal(0),
  ).toNumber();

  if (totalOutstanding <= 0 || eligible.length === 0) {
    return {
      updatedEntries: allEntries,
      newTDSEntries: [],
      paymentCount: 0,
      totalCommissionRecorded: 0,
      totalTDSDeducted: 0,
      banner: '',
    };
  }

  const allocatable = Math.min(receiptAmount, totalOutstanding);
  const now = new Date().toISOString();
  const ay = getAssessmentYear(receiptDate);
  const quarter = getQuarter(receiptDate);

  // Mutable copies for YTD running totals
  const tdsRunning = [...allTDSEntries];
  const newTDSEntries: TDSDeductionEntry[] = [];
  const updated = [...allEntries];

  let paymentCount = 0;
  let totalCommission = 0;
  let totalTDS = 0;

  for (const entry of eligible) {
    const entryOutstanding = Math.max(0, entry.net_invoice_amount - entry.amount_received_to_date);
    if (entryOutstanding <= 0) continue;

    const share = round2((entryOutstanding / totalOutstanding) * allocatable);
    if (share <= 0) continue;

    const commissionOnReceipt = entry.net_invoice_amount > 0
      ? round2(entry.net_total_commission * (share / entry.net_invoice_amount))
      : 0;

    // Catch-up TDS
    let tdsAmount = 0;
    let tdsDeductionEntryId: string | null = null;

    if (entry.tds_applicable && entry.tds_section && commissionOnReceipt > 0) {
      const threshold = entry.tds_section === '194H' ? 15000 : 30000;
      const ytdGross = tdsRunning
        .filter(t =>
          t.party_id === entry.person_id &&
          t.tds_section === entry.tds_section &&
          t.assessment_year === ay &&
          t.status !== 'cancelled',
        )
        .reduce((s, t) => s + t.gross_amount, 0);

      if (ytdGross + commissionOnReceipt >= threshold) {
        // Scenario 8: deduct on FULL commission of THIS receipt
        tdsAmount = round2(commissionOnReceipt * entry.tds_rate / 100);
        const tdsEntry: TDSDeductionEntry = {
          id: `tds-comm-${Date.now()}-${entry.id}`,
          entity_id: entityCode,
          source_voucher_id: receiptVoucherId,
          source_voucher_no: receiptVoucherNo,
          source_voucher_type: 'Payment',
          party_id: entry.person_id,
          party_name: entry.person_name,
          party_pan: entry.person_pan ?? '',
          deductee_type: entry.deductee_type,
          tds_section: entry.tds_section,
          nature_of_payment: entry.tds_section === '194H'
            ? 'Commission or brokerage'
            : 'Fee for professional services',
          tds_rate: entry.tds_rate,
          gross_amount: commissionOnReceipt,
          advance_tds_already: 0,
          net_tds_amount: tdsAmount,
          date: receiptDate,
          quarter,
          assessment_year: ay,
          status: 'open',
          created_at: now,
        };
        newTDSEntries.push(tdsEntry);
        tdsRunning.push(tdsEntry);
        tdsDeductionEntryId = tdsEntry.id;
      }
    }

    const netCommissionPaid = round2(commissionOnReceipt - tdsAmount);

    // ── Sprint 6B — Collection bonus evaluation ───────────────────────
    let bonusEarned = false;
    let bonusAmount = 0;
    let receiptWithinWindow = false;
    const bonusWindowDays = samConfig?.collectionBonusWindowDays ?? 0;

    if (samConfig?.enableCollectionBonus && commissionOnReceipt > 0) {
      const personEligible =
        samConfig.collectionBonusAppliesTo === 'all_persons' ||
        entry.person_type === 'salesman';
      if (personEligible) {
        const invMs = new Date(entry.voucher_date).getTime();
        const recMs = new Date(receiptDate).getTime();
        const daysSince = Math.floor((recMs - invMs) / (1000 * 60 * 60 * 24));
        if (daysSince >= 0 && daysSince <= bonusWindowDays) {
          receiptWithinWindow = true;
          bonusEarned = true;
          bonusAmount = round2(commissionOnReceipt * samConfig.collectionBonusRate / 100);
        }
      }
    }

    const payment: CommissionPayment = {
      id: `cp-${Date.now()}-${entry.id}`,
      payment_date: receiptDate,
      receipt_voucher_id: receiptVoucherId,
      receipt_voucher_no: receiptVoucherNo,
      amount_received: share,
      commission_on_receipt: commissionOnReceipt,
      tds_rate: entry.tds_rate,
      tds_amount: tdsAmount,
      net_commission_paid: netCommissionPaid,
      tds_deduction_entry_id: tdsDeductionEntryId,
      created_at: now,
    };

    const idx = updated.findIndex(e => e.id === entry.id);
    if (idx < 0) continue;
    const prev = updated[idx];
    const newAmtReceived = round2(prev.amount_received_to_date + share);
    const newEarned = round2(prev.commission_earned_to_date + commissionOnReceipt);
    const newTDSDed = round2(prev.tds_deducted_to_date + tdsAmount);
    const newNetPaid = round2(prev.net_paid_to_date + netCommissionPaid);

    updated[idx] = {
      ...prev,
      payments: [...prev.payments, payment],
      amount_received_to_date: newAmtReceived,
      commission_earned_to_date: newEarned,
      tds_deducted_to_date: newTDSDed,
      net_paid_to_date: newNetPaid,
      catchup_tds_required: tdsAmount > 0 ? true : prev.catchup_tds_required,
      catchup_tds_amount: tdsAmount > 0
        ? round2(prev.catchup_tds_amount + tdsAmount)
        : prev.catchup_tds_amount,
      status: newAmtReceived >= prev.net_invoice_amount - 0.01 ? 'paid' : 'partial',
      // Sprint 6B — persist bonus fields (accumulate across multiple receipts)
      collection_bonus_earned: prev.collection_bonus_earned || bonusEarned,
      collection_bonus_window_days: bonusWindowDays || prev.collection_bonus_window_days,
      collection_bonus_amount: round2((prev.collection_bonus_amount ?? 0) + bonusAmount),
      receipt_within_window: prev.receipt_within_window || receiptWithinWindow,
      updated_at: now,
    };

    paymentCount += 1;
    totalCommission += commissionOnReceipt;
    totalTDS += tdsAmount;
  }

  const banner = paymentCount > 0
    ? `Recorded commission of ${inr(round2(totalCommission))} across ${paymentCount} `
      + `${paymentCount === 1 ? 'entry' : 'entries'}` +
      (totalTDS > 0 ? ` · TDS deducted ${inr(round2(totalTDS))}` : '')
    : '';

  return {
    updatedEntries: updated,
    newTDSEntries,
    paymentCount,
    totalCommissionRecorded: round2(totalCommission),
    totalTDSDeducted: round2(totalTDS),
    banner,
  };
}

/**
 * Function B — Reverse commission when a Credit Note is posted.
 * If commission already paid (commission_expense_voucher_id set): build reversal JV lines.
 * TDS handling: cancel if challan not deposited, else flag for 26Q amendment.
 */
export function triggerCommissionReversal(
  creditNoteNo: string,
  creditNoteAmount: number,
  originalInvoiceNo: string,
  creditNoteDate: string,
  allEntries: CommissionEntry[],
  allTDSEntries: TDSDeductionEntry[],
): CommissionReversalResult {
  const targets = allEntries.filter(e =>
    e.voucher_no === originalInvoiceNo &&
    e.status !== 'cancelled' &&
    e.status !== 'reversed',
  );

  if (targets.length === 0) {
    return {
      updatedEntries: allEntries,
      reversalJVLines: null,
      cancelledTDSIds: [],
      amendTDSIds: [],
      totalReversed: 0,
      totalTDSReversed: 0,
      requiresJV: false,
      banner: '',
    };
  }

  const now = new Date().toISOString();
  const updated = [...allEntries];
  const cancelledTDSIds: string[] = [];
  const amendTDSIds: string[] = [];
  const reversalLinesAccum: VoucherLedgerLine[] = [];

  let totalReversed = 0;
  let totalTDSReversed = 0;
  let requiresJV = false;

  for (const entry of targets) {
    const cnRatio = Math.min(
      entry.net_invoice_amount > 0 ? creditNoteAmount / entry.net_invoice_amount : 1,
      1,
    );
    const commissionToReverse = round2(entry.net_total_commission * cnRatio);
    const tdsToReverse = round2(entry.tds_deducted_to_date * cnRatio);

    let tdsReversalEntryId: string | null = null;
    for (const payment of entry.payments) {
      if (!payment.tds_deduction_entry_id) continue;
      const tdsRec = allTDSEntries.find(t => t.id === payment.tds_deduction_entry_id);
      if (!tdsRec) continue;
      if (!tdsRec.challan_id) {
        if (!cancelledTDSIds.includes(tdsRec.id)) cancelledTDSIds.push(tdsRec.id);
        tdsReversalEntryId = tdsRec.id;
      } else {
        if (!amendTDSIds.includes(tdsRec.id)) amendTDSIds.push(tdsRec.id);
      }
    }

    const ref: CommissionCreditNoteRef = {
      credit_note_id: creditNoteNo,
      credit_note_no: creditNoteNo,
      credit_note_date: creditNoteDate,
      credit_note_amount: creditNoteAmount,
      commission_reversed: commissionToReverse,
      tds_reversal_entry_id: tdsReversalEntryId,
    };

    const idx = updated.findIndex(e => e.id === entry.id);
    if (idx < 0) continue;
    const prev = updated[idx];
    const newCNAmt = round2(prev.credit_note_amount + creditNoteAmount);
    const newNetInvoice = Math.max(0, round2(prev.net_invoice_amount - creditNoteAmount));
    const newNetCommission = Math.max(0, round2(prev.net_total_commission - commissionToReverse));
    const newEarned = Math.max(0, round2(prev.commission_earned_to_date - commissionToReverse));
    const newTDSDed = Math.max(0, round2(prev.tds_deducted_to_date - tdsToReverse));
    const newNetPaid = Math.max(0, round2(prev.net_paid_to_date - (commissionToReverse - tdsToReverse)));

    let newStatus: CommissionEntry['status'] = prev.status;
    if (newNetInvoice <= 0) newStatus = 'reversed';
    else if (prev.status === 'paid') newStatus = 'partial';

    updated[idx] = {
      ...prev,
      credit_note_amount: newCNAmt,
      credit_note_refs: [...prev.credit_note_refs, ref],
      net_invoice_amount: newNetInvoice,
      net_total_commission: newNetCommission,
      commission_earned_to_date: newEarned,
      tds_deducted_to_date: newTDSDed,
      net_paid_to_date: newNetPaid,
      status: newStatus,
      updated_at: now,
    };

    totalReversed += commissionToReverse;
    totalTDSReversed += tdsToReverse;

    // Build reversal JV lines only if commission was already booked to GL
    if (prev.commission_expense_voucher_id) {
      requiresJV = true;
      const expenseLedgerName = prev.commission_expense_ledger_name ?? 'Commission on Sales';
      const grossReversal = commissionToReverse;
      const netReversal = round2(commissionToReverse - tdsToReverse);

      // Dr Agent Ledger (gross reversal)
      reversalLinesAccum.push({
        id: `rl-${Date.now()}-${entry.id}-1`,
        ledger_id: '',
        ledger_code: '',
        ledger_name: prev.person_name,
        ledger_group_code: 'CRED',
        dr_amount: grossReversal,
        cr_amount: 0,
        narration: `CN reversal ${creditNoteNo} - ${prev.voucher_no}`,
      });
      // Cr Commission Expense (net reversal)
      reversalLinesAccum.push({
        id: `rl-${Date.now()}-${entry.id}-2`,
        ledger_id: prev.commission_expense_ledger_id ?? '',
        ledger_code: '',
        ledger_name: expenseLedgerName,
        ledger_group_code: 'IDEX',
        dr_amount: 0,
        cr_amount: netReversal,
        narration: `Reverse commission - ${prev.voucher_no}`,
      });
      // Cr TDS Payable (tds reversal if any)
      if (tdsToReverse > 0) {
        reversalLinesAccum.push({
          id: `rl-${Date.now()}-${entry.id}-3`,
          ledger_id: '',
          ledger_code: '',
          ledger_name: `TDS Payable - ${prev.tds_section ?? ''}`,
          ledger_group_code: 'CDUT',
          dr_amount: 0,
          cr_amount: tdsToReverse,
          narration: `Reverse TDS - ${prev.voucher_no}`,
        });
      }
    }
  }

  const tdsBanner = cancelledTDSIds.length > 0
    ? ` · ${cancelledTDSIds.length} TDS cancelled`
    : '';
  const amendBanner = amendTDSIds.length > 0
    ? ` · ${amendTDSIds.length} TDS flagged for 26Q amendment (challan deposited)`
    : '';
  const banner = `Reversed commission ${inr(round2(totalReversed))} on ${targets.length} `
    + `${targets.length === 1 ? 'entry' : 'entries'}${tdsBanner}${amendBanner}`;

  return {
    updatedEntries: updated,
    reversalJVLines: requiresJV && reversalLinesAccum.length > 0 ? reversalLinesAccum : null,
    cancelledTDSIds,
    amendTDSIds,
    totalReversed: round2(totalReversed),
    totalTDSReversed: round2(totalTDSReversed),
    requiresJV,
    banner,
  };
}

/**
 * Function C — Compute GL voucher lines for a commission entry (Post GL Voucher action).
 * Option B: person ledger override → config fallback → error.
 */
export function computeCommissionGL(
  entry: CommissionEntry,
  configLedgerId: string,
  configLedgerName: string,
): CommissionGLResult | { error: string } {
  const expenseLedgerId =
    entry.commission_expense_ledger_id?.trim() ||
    configLedgerId?.trim() || '';
  const expenseLedgerName =
    entry.commission_expense_ledger_name?.trim() ||
    configLedgerName?.trim() || '';

  if (!expenseLedgerId && !expenseLedgerName) {
    return {
      error:
        'No commission expense ledger configured. Set on SAM Person or in Comply360 SAM config.',
    };
  }

  const grossCommission = round2(entry.commission_earned_to_date);
  const tdsAmount = round2(entry.tds_deducted_to_date);
  const netPayableToAgent = round2(grossCommission - tdsAmount - entry.net_paid_to_date);

  if (grossCommission <= 0) {
    return { error: 'No commission earned yet — log a receipt first.' };
  }

  const lines: VoucherLedgerLine[] = [];
  // Dr Commission Expense (gross)
  lines.push({
    id: `gl-${Date.now()}-1`,
    ledger_id: expenseLedgerId,
    ledger_code: '',
    ledger_name: expenseLedgerName,
    ledger_group_code: 'IDEX',
    dr_amount: grossCommission,
    cr_amount: 0,
    narration: `Commission ${entry.person_name} - ${entry.voucher_no}`,
  });
  // Cr TDS Payable (if any)
  if (tdsAmount > 0) {
    lines.push({
      id: `gl-${Date.now()}-2`,
      ledger_id: '',
      ledger_code: '',
      ledger_name: `TDS Payable - ${entry.tds_section ?? ''}`,
      ledger_group_code: 'CDUT',
      dr_amount: 0,
      cr_amount: tdsAmount,
      narration: `TDS on commission - ${entry.voucher_no}`,
    });
  }
  // Cr Agent Ledger (net payable)
  lines.push({
    id: `gl-${Date.now()}-3`,
    ledger_id: '',
    ledger_code: '',
    ledger_name: entry.person_name,
    ledger_group_code: 'CRED',
    dr_amount: 0,
    cr_amount: round2(grossCommission - tdsAmount),
    narration: `Commission payable - ${entry.voucher_no}`,
  });

  return {
    expenseLines: lines,
    netPayableToAgent: Math.max(0, netPayableToAgent),
    tdsPayableAmount: tdsAmount,
  };
}

/**
 * Returns true if a CommissionEntry already exists for the given voucher number.
 * Prevents double-booking when commission is enabled on both DN and Sales Invoice.
 * @param voucherRef  The voucher_no to check (DN number or SI number)
 * @param allEntries  Full erp_commission_register array
 */
export function isCommissionAlreadyBooked(
  voucherRef: string,
  allEntries: CommissionEntry[],
): boolean {
  return allEntries.some(
    e => e.voucher_no === voucherRef && e.status !== 'cancelled',
  );
}
