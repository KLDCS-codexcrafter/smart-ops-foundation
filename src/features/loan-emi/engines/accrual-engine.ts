/**
 * @file     accrual-engine.ts
 * @purpose  Monthly Interest Accrual engine. On the EMI billing day of each
 *           month, walks all active Borrowing ledgers and posts:
 *             DR Interest Expense   /   CR <Lender>
 *           for that month's interestPortion. Pure consumer of FineCore's
 *           postVoucher() — does not modify finecore-engine.ts.
 *
 *           Idempotency key: 'YYYY-MM' per (ledger, action='monthly_interest').
 *           Running twice for the same month is a no-op.
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
import { computeTDSForAccrual } from './tds-194a-engine';

const STORAGE_KEY = 'erp_group_ledger_definitions';

/** Minimal Borrowing-shaped ledger row read from storage by the engine. */
interface BorrowingRow {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  code: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityShortCode: string | null;
  status: 'active' | 'suspended';
  emiScheduleLive?: EMIScheduleLiveRow[];
  accrualLog?: AccrualLogEntry[];
  // ── T-H1.5-D-D4 — TDS 194A flags (optional, set via LoanChargesMaster) ──
  tdsApplicable?: boolean;
  tdsSection?: string;
}

interface RawLedger {
  id: string;
  ledgerType?: string;
  status?: string;
}

export interface AccrualPlanItem {
  ledgerId: string;
  ledgerName: string;
  emiNumber: number;
  periodKey: string;            // 'YYYY-MM'
  dueDate: string;              // ISO yyyy-mm-dd
  interestAmount: number;
  alreadyAccrued: boolean;
  skipReason: string | null;
}

export interface AccrualRunResult {
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

function periodKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Returns the EMI row whose dueDate falls in the same calendar month as asOfDate
 *  AND whose dueDate <= asOfDate AND status is not already 'paid'. */
function pickAccrualEmi(
  schedule: EMIScheduleLiveRow[],
  asOfDate: string,
): EMIScheduleLiveRow | null {
  const periodKey = periodKeyOf(asOfDate);
  const candidates = schedule.filter(r =>
    periodKeyOf(r.dueDate) === periodKey
    && r.dueDate <= asOfDate
    && r.status !== 'paid'
    && r.interestPortion > 0,
  );
  return candidates[0] ?? null;
}

/**
 * Plan (dry-run). Returns one item per (ledger, EMI) eligible for monthly
 * interest accrual on or before asOfDate. Items already in the log are
 * marked alreadyAccrued=true.
 */
export function planMonthlyAccrual(asOfDate: string, ledgerIdFilter?: string): AccrualPlanItem[] {
  const ledgers = readLedgers().filter(l =>
    l.status === 'active'
    && (ledgerIdFilter ? l.id === ledgerIdFilter : true),
  );
  const plan: AccrualPlanItem[] = [];
  for (const ledger of ledgers) {
    const schedule = ledger.emiScheduleLive ?? [];
    if (schedule.length === 0) continue;
    const emi = pickAccrualEmi(schedule, asOfDate);
    if (!emi) continue;
    const periodKey = periodKeyOf(emi.dueDate);
    const dup = findDuplicate(ledger.accrualLog, ledger.id, 'monthly_interest', periodKey);
    plan.push({
      ledgerId: ledger.id,
      ledgerName: ledger.name,
      emiNumber: emi.emiNumber,
      periodKey,
      dueDate: emi.dueDate,
      interestAmount: emi.interestPortion,
      alreadyAccrued: dup !== null,
      skipReason: dup ? `Already accrued: voucher ${dup.voucherNo}` : null,
    });
  }
  return plan;
}

/**
 * Commit the monthly accrual run. Idempotent — items previously logged
 * are skipped. Returns counts + any per-ledger errors. All postings emit
 * standard FineCore Journal vouchers via postVoucher().
 */
export function commitMonthlyAccrual(asOfDate: string, entityCode: string): AccrualRunResult {
  const result: AccrualRunResult = { posted: 0, skipped: 0, errors: [] };
  const intExpId = resolveExpenseLedger('interest_expense');
  const intExpName = resolveLedgerName(intExpId) || 'Interest Expense';
  const intExpCode = resolveLedgerCode(intExpId) || 'INTEXP';

  const ledgers = readLedgers().filter(l => l.status === 'active');
  const updated: BorrowingRow[] = [...ledgers];

  for (let i = 0; i < updated.length; i++) {
    const ledger = updated[i];
    const schedule = ledger.emiScheduleLive ?? [];
    const emi = pickAccrualEmi(schedule, asOfDate);
    if (!emi) continue;

    const periodKey = periodKeyOf(emi.dueDate);
    if (findDuplicate(ledger.accrualLog, ledger.id, 'monthly_interest', periodKey)) {
      result.skipped += 1;
      continue;
    }

    try {
      const voucherId = `v-accr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const voucherNo = generateVoucherNo('JV-ACCR', entityCode);
      const nowIso = new Date().toISOString();
      const narration = `Being Interest Billing for ${ledger.name} — ${periodKey}`;

      const voucher: Voucher = {
        id: voucherId,
        voucher_no: voucherNo,
        voucher_type_id: 'vt-journal',
        voucher_type_name: 'Journal Voucher',
        base_voucher_type: 'Journal',
        entity_id: entityCode,
        date: emi.dueDate,
        effective_date: emi.dueDate,
        party_id: ledger.id,
        party_name: ledger.name,
        ledger_lines: [
          {
            id: `ll-${Date.now()}-a`,
            ledger_id: intExpId,
            ledger_code: intExpCode,
            ledger_name: intExpName,
            ledger_group_code: 'E-FC',
            dr_amount: emi.interestPortion,
            cr_amount: 0,
            narration: `Interest accrual for ${ledger.name} — EMI #${emi.emiNumber} — ${periodKey}`,
          },
          {
            id: `ll-${Date.now()}-b`,
            ledger_id: ledger.id,
            ledger_code: ledger.code,
            ledger_name: ledger.name,
            ledger_group_code: ledger.parentGroupCode,
            dr_amount: 0,
            cr_amount: emi.interestPortion,
            narration: `Interest accrual — EMI #${emi.emiNumber}`,
          },
        ],
        gross_amount: emi.interestPortion,
        total_discount: 0,
        total_taxable: 0,
        total_cgst: 0,
        total_sgst: 0,
        total_igst: 0,
        total_cess: 0,
        total_tax: 0,
        round_off: 0,
        net_amount: emi.interestPortion,
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
        action: 'monthly_interest',
        periodKey,
        emiNumber: emi.emiNumber,
        amount: emi.interestPortion,
        voucherId,
        voucherNo,
        postedBy: 'current-user',
        reversedByVoucherId: null,
        narration,
      });
      updated[i] = { ...ledger, accrualLog: newLog };
      result.posted += 1;
    } catch (err) {
      result.errors.push({
        ledgerId: ledger.id,
        message: err instanceof Error ? err.message : 'Unknown posting error',
      });
    }
  }

  if (result.posted > 0) {
    persistLedgers(updated);
  }
  return result;
}
