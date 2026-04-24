/**
 * @file     emi-lifecycle-engine.ts
 * @purpose  State machine + enrichment helpers for EMI schedule rows.
 *           Validates legal status transitions. Computes 'due' status from today.
 *           Migrates S6.5b's EMIScheduleRow to D1's EMIScheduleLiveRow on first read.
 * @sprint   T-H1.5-D-D1
 * @finding  CC-062
 */

import type { EMIScheduleRow } from '@/features/ledger-master/lib/emi-schedule-builder';

export type EMIStatus =
  | 'scheduled'   // future EMI, dueDate > today
  | 'due'         // today >= dueDate, still pending (COMPUTED, not stored)
  | 'paid'        // full EMI received
  | 'partial'     // partial payment, balance still pending
  | 'overdue'     // dueDate passed > 1 day, still not paid (stored)
  | 'bounced';    // cheque bounced

export interface EMIScheduleLiveRow {
  emiNumber: number;
  dueDate: string;               // ISO yyyy-mm-dd
  principalPortion: number;      // ₹ 2dp
  interestPortion: number;       // ₹ 2dp
  totalEMI: number;              // principalPortion + interestPortion
  openingBalance: number;        // outstanding before this EMI
  closingBalance: number;        // outstanding after principalPortion
  status: EMIStatus;
  paymentVoucherId: string | null;   // link to Payment voucher (D2/D3)
  paidDate: string | null;
  paidAmount: number;            // supports partial payments
  penalAccrued: number;          // D2 writes; D1 stores 0
  bouncedDate: string | null;
  bouncedCount: number;          // repeat bounces on same EMI
  notes: string;
}

/** Valid state transitions. Illegal transitions throw. */
const VALID_TRANSITIONS: Record<EMIStatus, EMIStatus[]> = {
  scheduled: ['due', 'paid', 'partial', 'bounced'],
  due:       ['paid', 'partial', 'overdue', 'bounced'],
  partial:   ['paid', 'overdue', 'bounced'],
  overdue:   ['paid', 'partial', 'bounced'],
  paid:      [],                               // terminal
  bounced:   ['paid', 'partial', 'scheduled'], // can re-present cheque
};

export function canTransition(from: EMIStatus, to: EMIStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionEMI(
  row: EMIScheduleLiveRow,
  to: EMIStatus,
  patch: Partial<EMIScheduleLiveRow> = {},
): EMIScheduleLiveRow {
  if (!canTransition(row.status, to)) {
    throw new Error(`Illegal EMI transition: ${row.status} → ${to} for EMI #${row.emiNumber}`);
  }
  return { ...row, ...patch, status: to };
}

/**
 * Compute display status from stored status + today's date.
 * A row stored as 'scheduled' with dueDate <= today is DISPLAYED as 'due'.
 * Overdue promotion (due → overdue after 1 day) stays stored — user must explicitly transition.
 */
export function enrichRow(row: EMIScheduleLiveRow, today: string): EMIScheduleLiveRow {
  if (row.status === 'scheduled' && today >= row.dueDate) {
    return { ...row, status: 'due' };
  }
  return row;
}

/**
 * Backward-compat migrator: S6.5b EMIScheduleRow → D1 EMIScheduleLiveRow.
 * Called silently on first Panel mount for loans still in S6.5b format.
 * Does NOT destroy the original emiScheduleCached — caller keeps both.
 */
export function upgradeSchedule(cached: EMIScheduleRow[]): EMIScheduleLiveRow[] {
  return cached.map(r => ({
    emiNumber: r.emiNumber,
    dueDate: r.dueDate,
    principalPortion: r.principal,
    interestPortion: r.interest,
    totalEMI: Math.round((r.principal + r.interest) * 100) / 100,
    openingBalance: Math.round((r.runningBalance + r.principal) * 100) / 100,
    closingBalance: r.runningBalance,
    status: 'scheduled' as EMIStatus,
    paymentVoucherId: null,
    paidDate: null,
    paidAmount: 0,
    penalAccrued: 0,
    bouncedDate: null,
    bouncedCount: 0,
    notes: '',
  }));
}
