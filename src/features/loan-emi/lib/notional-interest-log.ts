/**
 * @file     notional-interest-log.ts
 * @purpose  Dedicated audit log for notional interest postings on aged
 *           advances. Separate from D2's accrualLog (which lives on
 *           BorrowingLedger) because advances belong to customer/vendor
 *           master, a different entity class.
 *
 *           Storage: erp_notional_interest_log_{entityCode}
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

export interface NotionalInterestLogEntry {
  id: string;
  entityCode: string;
  advanceId: string;
  advanceRefNo: string;
  partyType: 'vendor' | 'customer';
  partyId: string;
  partyName: string;
  periodKey: string;              // 'YYYY-MM' — idempotency key
  agedDaysAtPost: number;
  baseAmount: number;
  annualRatePercent: number;
  interestAmount: number;
  voucherId: string;
  voucherNo: string;
  postedAt: string;
  postedBy: string;
  reversedByVoucherId: string | null;
  narration: string;
}

const LOG_KEY = (entityCode: string) => `erp_notional_interest_log_${entityCode}`;

export function loadLog(entityCode: string): NotionalInterestLogEntry[] {
  // [JWT] GET /api/accounting/notional-interest-log?entityCode=...
  try {
    const raw = localStorage.getItem(LOG_KEY(entityCode));
    return raw ? (JSON.parse(raw) as NotionalInterestLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveLog(entityCode: string, log: NotionalInterestLogEntry[]): void {
  try {
    // [JWT] PATCH /api/accounting/notional-interest-log
    localStorage.setItem(LOG_KEY(entityCode), JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

/**
 * Idempotency check: returns the existing entry if a non-reversed match
 * exists for (advanceId, periodKey); otherwise null.
 */
export function findNotionalDuplicate(
  log: NotionalInterestLogEntry[],
  advanceId: string,
  periodKey: string,
): NotionalInterestLogEntry | null {
  return log.find(e =>
    e.advanceId === advanceId
    && e.periodKey === periodKey
    && e.reversedByVoucherId === null,
  ) ?? null;
}

export function appendNotionalLogEntry(
  log: NotionalInterestLogEntry[],
  entry: Omit<NotionalInterestLogEntry, 'id' | 'postedAt'>,
): NotionalInterestLogEntry[] {
  const next: NotionalInterestLogEntry = {
    ...entry,
    id: `notint-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    postedAt: new Date().toISOString(),
  };
  return [...log, next];
}
