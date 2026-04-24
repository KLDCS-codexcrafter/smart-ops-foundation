/**
 * @file     penal-engine.ts
 * @purpose  Daily Penal Interest engine. Walks all active Borrowing ledgers
 *           and for each EMI that is overdue (or due) AND has penalRate > 0,
 *           posts:
 *             DR Penal Interest Expense   /   CR <Lender>
 *           for that day's penal amount = outstandingBalance × (penalRate/100).
 *
 *           Idempotency key: 'YYYY-MM-DD#{emiNumber}' — at most one penal
 *           posting per EMI per calendar day.
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

const STORAGE_KEY = 'erp_group_ledger_definitions';

interface BorrowingRow {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  code: string;
  parentGroupCode: string;
  status: 'active' | 'suspended';
  penalInterestRate?: number;
  emiScheduleLive?: EMIScheduleLiveRow[];
  accrualLog?: AccrualLogEntry[];
}

interface RawLedger { id: string; ledgerType?: string }

export interface PenalPlanItem {
  ledgerId: string;
  ledgerName: string;
  emiNumber: number;
  dueDate: string;
  daysOverdue: number;
  penalRate: number;            // percent per day
  outstandingBalance: number;
  penalAmount: number;
  periodKey: string;            // 'YYYY-MM-DD#{emiNumber}'
  alreadyPosted: boolean;
  skipReason: string | null;
}

export interface PenalRunResult {
  posted: number;
  skipped: number;
  errors: Array<{ ledgerId: string; message: string }>;
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

function persistLedgers(updated: BorrowingRow[]): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: RawLedger[] = raw ? (JSON.parse(raw) as RawLedger[]) : [];
    const others = all.filter(l => l.ledgerType !== 'borrowing');
    // [JWT] PUT /api/accounting/ledger-definitions
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...updated]));
  } catch {
    /* ignore */
  }
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 86_400_000));
}

function isOverdueForPenal(row: EMIScheduleLiveRow, asOfDate: string): boolean {
  // Penal accrues once dueDate has passed AND row is not paid.
  if (row.status === 'paid') return false;
  return asOfDate > row.dueDate;
}

function outstandingOf(row: EMIScheduleLiveRow): number {
  // Outstanding = totalEMI − paidAmount (supports partial payments).
  return Math.max(0, Math.round((row.totalEMI - row.paidAmount) * 100) / 100);
}

export function planDailyPenal(asOfDate: string, ledgerIdFilter?: string): PenalPlanItem[] {
  const ledgers = readLedgers().filter(l =>
    l.status === 'active'
    && (l.penalInterestRate ?? 0) > 0
    && (ledgerIdFilter ? l.id === ledgerIdFilter : true),
  );
  const plan: PenalPlanItem[] = [];
  for (const ledger of ledgers) {
    const schedule = ledger.emiScheduleLive ?? [];
    const rate = ledger.penalInterestRate ?? 0;
    for (const row of schedule) {
      if (!isOverdueForPenal(row, asOfDate)) continue;
      const outstanding = outstandingOf(row);
      if (outstanding <= 0) continue;
      const penalAmount = Math.round(outstanding * rate) / 100;
      if (penalAmount <= 0) continue;
      const periodKey = `${asOfDate}#${row.emiNumber}`;
      const dup = findDuplicate(ledger.accrualLog, ledger.id, 'penal_daily', periodKey);
      plan.push({
        ledgerId: ledger.id,
        ledgerName: ledger.name,
        emiNumber: row.emiNumber,
        dueDate: row.dueDate,
        daysOverdue: daysBetween(row.dueDate, asOfDate),
        penalRate: rate,
        outstandingBalance: outstanding,
        penalAmount,
        periodKey,
        alreadyPosted: dup !== null,
        skipReason: dup ? `Already posted: ${dup.voucherNo}` : null,
      });
    }
  }
  return plan;
}

export function commitDailyPenal(asOfDate: string, entityCode: string): PenalRunResult {
  const result: PenalRunResult = { posted: 0, skipped: 0, errors: [] };
  const penalLedgerId = resolveExpenseLedger('penal_interest_expense');
  const penalName = resolveLedgerName(penalLedgerId) || 'Penal Interest Expense';
  const penalCode = resolveLedgerCode(penalLedgerId) || 'PENINT';

  const ledgers = readLedgers().filter(l =>
    l.status === 'active' && (l.penalInterestRate ?? 0) > 0,
  );
  const updated: BorrowingRow[] = [...ledgers];

  for (let i = 0; i < updated.length; i++) {
    const ledger = updated[i];
    const schedule = ledger.emiScheduleLive ?? [];
    const rate = ledger.penalInterestRate ?? 0;
    let mutatedSchedule: EMIScheduleLiveRow[] = schedule;
    let log: AccrualLogEntry[] | undefined = ledger.accrualLog;
    let touched = false;

    for (const row of schedule) {
      if (!isOverdueForPenal(row, asOfDate)) continue;
      const outstanding = outstandingOf(row);
      if (outstanding <= 0) continue;
      const penalAmount = Math.round(outstanding * rate) / 100;
      if (penalAmount <= 0) continue;
      const periodKey = `${asOfDate}#${row.emiNumber}`;
      if (findDuplicate(log, ledger.id, 'penal_daily', periodKey)) {
        result.skipped += 1;
        continue;
      }

      try {
        const voucherId = `v-pnl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const voucherNo = generateVoucherNo('JV-PNL', entityCode);
        const nowIso = new Date().toISOString();
        const daysOverdue = daysBetween(row.dueDate, asOfDate);
        const narration = `Being Penal Charged — EMI #${row.emiNumber} — ${daysOverdue}d overdue`;

        const voucher: Voucher = {
          id: voucherId,
          voucher_no: voucherNo,
          voucher_type_id: 'vt-journal',
          voucher_type_name: 'Journal Voucher',
          base_voucher_type: 'Journal',
          entity_id: entityCode,
          date: asOfDate,
          effective_date: asOfDate,
          party_id: ledger.id,
          party_name: ledger.name,
          ledger_lines: [
            {
              id: `ll-${Date.now()}-a`,
              ledger_id: penalLedgerId,
              ledger_code: penalCode,
              ledger_name: penalName,
              ledger_group_code: 'E-FC',
              dr_amount: penalAmount,
              cr_amount: 0,
              narration: `Penal interest — ${ledger.name} — EMI #${row.emiNumber}`,
            },
            {
              id: `ll-${Date.now()}-b`,
              ledger_id: ledger.id,
              ledger_code: ledger.code,
              ledger_name: ledger.name,
              ledger_group_code: ledger.parentGroupCode,
              dr_amount: 0,
              cr_amount: penalAmount,
              narration: `Penal interest — EMI #${row.emiNumber}`,
            },
          ],
          gross_amount: penalAmount,
          total_discount: 0,
          total_taxable: 0,
          total_cgst: 0,
          total_sgst: 0,
          total_igst: 0,
          total_cess: 0,
          total_tax: 0,
          round_off: 0,
          net_amount: penalAmount,
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

        log = appendLogEntry(log, {
          ledgerId: ledger.id,
          action: 'penal_daily',
          periodKey,
          emiNumber: row.emiNumber,
          amount: penalAmount,
          voucherId,
          voucherNo,
          postedBy: 'current-user',
          reversedByVoucherId: null,
          narration,
        });
        mutatedSchedule = mutatedSchedule.map(r =>
          r.emiNumber === row.emiNumber
            ? { ...r, penalAccrued: Math.round((r.penalAccrued + penalAmount) * 100) / 100 }
            : r,
        );
        touched = true;
        result.posted += 1;
      } catch (err) {
        result.errors.push({
          ledgerId: ledger.id,
          message: err instanceof Error ? err.message : 'Unknown posting error',
        });
      }
    }

    if (touched) {
      updated[i] = { ...ledger, emiScheduleLive: mutatedSchedule, accrualLog: log };
    }
  }

  if (result.posted > 0) {
    persistLedgers(updated);
  }
  return result;
}
