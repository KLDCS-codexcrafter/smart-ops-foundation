/**
 * @file     processing-fee-engine.ts
 * @purpose  One-shot posting for the upfront loan processing fee at
 *           disbursement. Produces:
 *             - 2-leg voucher (no GST): Dr Processing Fee Expense / Cr Lender
 *             - 3-leg voucher (with GST): Dr Processing Fee Expense
 *                                         / Dr Input IGST
 *                                         / Cr Lender (gross + GST)
 *
 *           Idempotent via accrualLog periodKey = 'processing-fee' — can only
 *           post ONCE per loan, by design.
 * @sprint   T-H1.5-D-D4
 * @finding  CC-065
 */

import type { Voucher } from '@/types/voucher';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import {
  resolveExpenseLedger,
  getLedgerName as resolveLedgerName,
  getLedgerCode as resolveLedgerCode,
} from '../lib/ledger-resolver';
import { findDuplicate, appendLogEntry, type AccrualLogEntry } from '../lib/accrual-log';
import { splitChargeWithGST, type GSTSplitLineSpec } from './gst-charge-engine';

const STORAGE_KEY = 'erp_group_ledger_definitions';

interface BorrowingRow {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  code: string;
  parentGroupCode: string;
  processingFee?: number;
  processingFeeGst?: number;
  gstOnChargesApplicable?: boolean;
  accrualLog?: AccrualLogEntry[];
}

interface RawLedger { id: string; ledgerType?: string }

export interface ProcessingFeePostResult {
  posted: boolean;
  voucherId: string | null;
  voucherNo: string | null;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  skipReason: string | null;
}

function readLedgers(): BorrowingRow[] {
  try {
    // [JWT] GET /api/accounting/ledger-definitions?type=borrowing
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all: RawLedger[] = JSON.parse(raw) as RawLedger[];
    return all.filter(l => l.ledgerType === 'borrowing') as unknown as BorrowingRow[];
  } catch {
    return [];
  }
}

function persistLedger(updated: BorrowingRow): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: RawLedger[] = raw ? (JSON.parse(raw) as RawLedger[]) : [];
    const next = all.map(l => l.id === updated.id ? (updated as unknown as RawLedger) : l);
    // [JWT] PUT /api/accounting/ledger-definitions
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Posts the one-time processing fee for a loan. Idempotent: subsequent calls
 * for the same loan return posted=false with skipReason referencing the
 * existing voucher.
 */
export function postProcessingFee(
  ledgerId: string,
  entityCode: string,
): ProcessingFeePostResult {
  const ledger = readLedgers().find(l => l.id === ledgerId);
  if (!ledger) {
    return {
      posted: false, voucherId: null, voucherNo: null,
      baseAmount: 0, gstAmount: 0, totalAmount: 0,
      skipReason: 'Borrowing ledger not found',
    };
  }
  const baseFee = ledger.processingFee ?? 0;
  if (baseFee <= 0) {
    return {
      posted: false, voucherId: null, voucherNo: null,
      baseAmount: 0, gstAmount: 0, totalAmount: 0,
      skipReason: 'Processing fee is ₹0 — nothing to post',
    };
  }

  const periodKey = 'processing-fee';
  const dup = findDuplicate(ledger.accrualLog, ledger.id, 'processing_fee', periodKey);
  if (dup) {
    return {
      posted: false, voucherId: dup.voucherId, voucherNo: dup.voucherNo,
      baseAmount: baseFee, gstAmount: 0, totalAmount: dup.amount,
      skipReason: `Already posted: voucher ${dup.voucherNo}`,
    };
  }

  const gstSpec: GSTSplitLineSpec = splitChargeWithGST(ledger, baseFee);

  const pfeLedgerId = resolveExpenseLedger('processing_fee_expense');
  const pfeName = resolveLedgerName(pfeLedgerId) || 'Loan Processing Fees';
  const pfeCode = resolveLedgerCode(pfeLedgerId) || 'LPF';

  try {
    const voucherId = `v-pf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const voucherNo = generateVoucherNo('JV-PF', entityCode);
    const nowIso = new Date().toISOString();
    const today = nowIso.slice(0, 10);
    const narration = gstSpec.applicable
      ? `Being Loan Processing Fee for ${ledger.name} (incl. GST @ ${gstSpec.rateApplied}%)`
      : `Being Loan Processing Fee for ${ledger.name}`;

    const ledger_lines = [
      {
        id: `ll-${Date.now()}-a`,
        ledger_id: pfeLedgerId,
        ledger_code: pfeCode,
        ledger_name: pfeName,
        ledger_group_code: 'E-FC',
        dr_amount: baseFee,
        cr_amount: 0,
        narration: `Processing fee — ${ledger.name}`,
      },
    ];

    if (gstSpec.applicable && gstSpec.inputIgstLedgerId) {
      ledger_lines.push({
        id: `ll-${Date.now()}-b`,
        ledger_id: gstSpec.inputIgstLedgerId,
        ledger_code: 'IIGST',
        ledger_name: 'Input IGST',
        ledger_group_code: 'ADTAX',
        dr_amount: gstSpec.igstAmount,
        cr_amount: 0,
        narration: `Input IGST @ ${gstSpec.rateApplied}% on processing fee`,
      });
    }

    ledger_lines.push({
      id: `ll-${Date.now()}-z`,
      ledger_id: ledger.id,
      ledger_code: ledger.code,
      ledger_name: ledger.name,
      ledger_group_code: ledger.parentGroupCode,
      dr_amount: 0,
      cr_amount: gstSpec.totalWithTax,
      narration: gstSpec.applicable
        ? `Processing fee (incl GST) charged by ${ledger.name}`
        : `Processing fee charged by ${ledger.name}`,
    });

    const voucher: Voucher = {
      id: voucherId,
      voucher_no: voucherNo,
      voucher_type_id: 'vt-journal',
      voucher_type_name: 'Journal Voucher',
      base_voucher_type: 'Journal',
      entity_id: entityCode,
      date: today,
      effective_date: today,
      party_id: ledger.id,
      party_name: ledger.name,
      ledger_lines,
      gross_amount: gstSpec.totalWithTax,
      total_discount: 0,
      total_taxable: gstSpec.applicable ? gstSpec.baseAmount : 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: gstSpec.igstAmount,
      total_cess: 0,
      total_tax: gstSpec.igstAmount,
      round_off: 0,
      net_amount: gstSpec.totalWithTax,
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

    let nextLog = appendLogEntry(ledger.accrualLog, {
      ledgerId: ledger.id,
      action: 'processing_fee',
      periodKey,
      emiNumber: null,
      amount: gstSpec.totalWithTax,
      voucherId,
      voucherNo,
      postedBy: 'current-user',
      reversedByVoucherId: null,
      narration,
    });

    if (gstSpec.applicable) {
      nextLog = appendLogEntry(nextLog, {
        ledgerId: ledger.id,
        action: 'gst_on_charge',
        periodKey: 'processing-fee#gst',
        emiNumber: null,
        amount: gstSpec.igstAmount,
        voucherId,
        voucherNo,
        postedBy: 'current-user',
        reversedByVoucherId: null,
        narration: `IGST ₹${gstSpec.igstAmount.toFixed(2)} on processing fee — ${ledger.name}`,
      });
    }

    persistLedger({ ...ledger, accrualLog: nextLog });

    return {
      posted: true,
      voucherId,
      voucherNo,
      baseAmount: baseFee,
      gstAmount: gstSpec.igstAmount,
      totalAmount: gstSpec.totalWithTax,
      skipReason: null,
    };
  } catch (err) {
    return {
      posted: false, voucherId: null, voucherNo: null,
      baseAmount: baseFee, gstAmount: 0, totalAmount: 0,
      skipReason: err instanceof Error ? err.message : 'Posting failed',
    };
  }
}
