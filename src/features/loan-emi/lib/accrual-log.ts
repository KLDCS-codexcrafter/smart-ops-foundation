/**
 * @file     accrual-log.ts
 * @purpose  Append-only audit log of every D2 engine action on a Borrowing
 *           ledger. Stored as accrualLog?: AccrualLogEntry[] on the ledger.
 *           Idempotency guards every posting via findDuplicate().
 * @sprint   T-H1.5-D-D2
 * @finding  CC-063
 */

export type AccrualAction =
  | 'monthly_interest'   // Interest Expense Dr / Lender Cr
  | 'penal_daily'        // Penal Interest Expense Dr / Lender Cr
  | 'bounce_charge';     // Bank Charges Dr / Lender Cr

export interface AccrualLogEntry {
  id: string;
  ledgerId: string;
  action: AccrualAction;
  /**
   * Idempotency key:
   * - 'YYYY-MM' for monthly_interest
   * - 'YYYY-MM-DD#{emiNumber}' for penal_daily
   * - '{bouncedDate}#{emiNumber}#bounce' for bounce_charge
   */
  periodKey: string;
  emiNumber: number | null;
  amount: number;
  voucherId: string;
  voucherNo: string;
  postedAt: string;
  postedBy: string;
  /** If user later cancels the voucher manually, future tooling sets this. D2 leaves null. */
  reversedByVoucherId: string | null;
  narration: string;
}

/**
 * Idempotency check. Returns the existing log entry if a non-reversed match
 * exists for (ledgerId, action, periodKey); otherwise null.
 */
export function findDuplicate(
  log: AccrualLogEntry[] | undefined,
  ledgerId: string,
  action: AccrualAction,
  periodKey: string,
): AccrualLogEntry | null {
  if (!log || log.length === 0) return null;
  return log.find(e =>
    e.ledgerId === ledgerId
    && e.action === action
    && e.periodKey === periodKey
    && e.reversedByVoucherId === null,
  ) ?? null;
}

export function appendLogEntry(
  log: AccrualLogEntry[] | undefined,
  entry: Omit<AccrualLogEntry, 'id' | 'postedAt'>,
): AccrualLogEntry[] {
  const next: AccrualLogEntry = {
    ...entry,
    id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postedAt: new Date().toISOString(),
  };
  return [...(log ?? []), next];
}
