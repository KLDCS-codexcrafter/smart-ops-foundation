/**
 * @file     bounce-engine.ts
 * @purpose  On-demand cheque bounce charge poster. Invoked when a user marks
 *           an EMI bounced via D1's EMIRowActionsMenu. Posts a flat
 *           `chequeBounceCharge` to Bank Charges:
 *             DR Bank Charges   /   CR <Lender>
 *
 *           Idempotency key: '{bouncedDate}#{emiNumber}#bounce'.
 * @sprint   T-H1.5-D-D2
 * @finding  CC-063
 */

import type { Voucher } from '@/types/voucher';
import { postVoucher, generateVoucherNo } from '@/lib/finecore-engine';
import type { EMIScheduleLiveRow } from '../lib/emi-lifecycle-engine';
import {
  resolveExpenseLedger,
  getLedgerName as resolveLedgerName,
  getLedgerCode as resolveLedgerCode,
} from '../lib/ledger-resolver';
import {
  findDuplicate,
  appendLogEntry,
  type AccrualLogEntry,
} from '../lib/accrual-log';
import { splitChargeWithGST } from './gst-charge-engine';

const STORAGE_KEY = 'erp_group_ledger_definitions';

interface BorrowingRow {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  code: string;
  parentGroupCode: string;
  chequeBounceCharge?: number;
  emiScheduleLive?: EMIScheduleLiveRow[];
  accrualLog?: AccrualLogEntry[];
  // ── T-H1.5-D-D4 — GST on charges flags (optional, set via LoanChargesMaster) ──
  gstOnChargesApplicable?: boolean;
  processingFeeGst?: number;
}

interface RawLedger { id: string; ledgerType?: string }

export interface BouncePostResult {
  posted: boolean;
  voucherId: string | null;
  voucherNo: string | null;
  amount: number;
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
 * Post a single cheque bounce charge for a specific (ledger, emi, date).
 * Returns posted=false with skipReason for: no ledger, zero charge,
 * or already-posted (idempotency hit).
 */
export function postBounceCharge(
  ledgerId: string,
  emiNumber: number,
  bouncedDate: string,
  entityCode: string,
): BouncePostResult {
  const ledger = readLedgers().find(l => l.id === ledgerId);
  if (!ledger) {
    return {
      posted: false, voucherId: null, voucherNo: null, amount: 0,
      skipReason: 'Borrowing ledger not found',
    };
  }
  const charge = ledger.chequeBounceCharge ?? 0;
  if (charge <= 0) {
    return {
      posted: false, voucherId: null, voucherNo: null, amount: 0,
      skipReason: 'Bounce charge is ₹0 — nothing to post',
    };
  }

  const periodKey = `${bouncedDate}#${emiNumber}#bounce`;
  const dup = findDuplicate(ledger.accrualLog, ledger.id, 'bounce_charge', periodKey);
  if (dup) {
    return {
      posted: false, voucherId: dup.voucherId, voucherNo: dup.voucherNo, amount: dup.amount,
      skipReason: `Already posted: voucher ${dup.voucherNo}`,
    };
  }

  const bankLedgerId = resolveExpenseLedger('bank_charges');
  const bankName = resolveLedgerName(bankLedgerId) || 'Bank Charges & Commission';
  const bankCode = resolveLedgerCode(bankLedgerId) || 'BKCHG';

  try {
    const voucherId = `v-bnc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const voucherNo = generateVoucherNo('JV-BNC', entityCode);
    const nowIso = new Date().toISOString();
    const narration = `Being Cheque Default Charged — EMI #${emiNumber}`;

    const voucher: Voucher = {
      id: voucherId,
      voucher_no: voucherNo,
      voucher_type_id: 'vt-journal',
      voucher_type_name: 'Journal Voucher',
      base_voucher_type: 'Journal',
      entity_id: entityCode,
      date: bouncedDate,
      effective_date: bouncedDate,
      party_id: ledger.id,
      party_name: ledger.name,
      ledger_lines: [
        {
          id: `ll-${Date.now()}-a`,
          ledger_id: bankLedgerId,
          ledger_code: bankCode,
          ledger_name: bankName,
          ledger_group_code: 'E-FC',
          dr_amount: charge,
          cr_amount: 0,
          narration: `Cheque bounce charge — ${ledger.name} — EMI #${emiNumber}`,
        },
        {
          id: `ll-${Date.now()}-b`,
          ledger_id: ledger.id,
          ledger_code: ledger.code,
          ledger_name: ledger.name,
          ledger_group_code: ledger.parentGroupCode,
          dr_amount: 0,
          cr_amount: charge,
          narration: `Cheque bounce charge — EMI #${emiNumber}`,
        },
      ],
      gross_amount: charge,
      total_discount: 0,
      total_taxable: 0,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_cess: 0,
      total_tax: 0,
      round_off: 0,
      net_amount: charge,
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

    const newLog = appendLogEntry(ledger.accrualLog, {
      ledgerId: ledger.id,
      action: 'bounce_charge',
      periodKey,
      emiNumber,
      amount: charge,
      voucherId,
      voucherNo,
      postedBy: 'current-user',
      reversedByVoucherId: null,
      narration,
    });
    persistLedger({ ...ledger, accrualLog: newLog });

    return { posted: true, voucherId, voucherNo, amount: charge, skipReason: null };
  } catch (err) {
    return {
      posted: false, voucherId: null, voucherNo: null, amount: 0,
      skipReason: err instanceof Error ? err.message : 'Posting failed',
    };
  }
}
