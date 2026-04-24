/**
 * @file     duplicate-detector.ts
 * @purpose  Pattern-matches a proposed Payment voucher against existing
 *           Payment vouchers in the journal store. Returns candidate
 *           duplicates based on (party_id, amount±₹0.50, date±3d).
 *           Used as pre-post warning in Payment.tsx.
 *
 *           Scope: detects across ALL Payment vouchers (not just loans) —
 *           benefits double-payment prevention generally, not just EMIs.
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */

export interface DuplicateHit {
  voucherId: string;
  voucherNo: string;
  date: string;                  // ISO yyyy-mm-dd
  amount: number;
  partyName: string;
  narration: string;
  daysDiff: number;              // negative = older, positive = newer
  amountDiff: number;            // rupees difference
}

export interface DuplicateDetectorInput {
  partyId: string;
  amount: number;
  date: string;                  // ISO yyyy-mm-dd
  entityCode: string;
  /** Excludes this voucher ID from scan — used when editing an existing voucher */
  excludeVoucherId?: string;
}

interface JournalEntryShape {
  id: string;
  voucher_id: string;
  voucher_no: string;
  base_voucher_type: string;
  date: string;
  party_id?: string;
  dr_amount: number;
  cr_amount: number;
  narration?: string;
  is_cancelled?: boolean;
  ledger_name?: string;
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.round((a - b) / 86_400_000);
}

/**
 * Returns array of candidate duplicates. Empty array if no matches.
 * Always returns an array (never null) — callers can safely chain .length check.
 */
export function detectDuplicatePayments(input: DuplicateDetectorInput): DuplicateHit[] {
  if (!input.partyId || input.amount <= 0) return [];

  const AMOUNT_TOLERANCE = 0.50;
  const DAYS_WINDOW = 3;

  try {
    // [JWT] GET /api/accounting/journal-entries?entityCode=...&type=Payment
    const raw = localStorage.getItem(`erp_journal_${input.entityCode}`);
    if (!raw) return [];
    const entries = JSON.parse(raw) as JournalEntryShape[];

    // Pair lines by voucher_id — Payment vouchers have 2+ lines; we care about
    // the line where the party_id matches (party debit side).
    const byVoucher = new Map<string, JournalEntryShape[]>();
    for (const e of entries) {
      if (e.base_voucher_type !== 'Payment') continue;
      if (e.is_cancelled) continue;
      if (input.excludeVoucherId && e.voucher_id === input.excludeVoucherId) continue;
      const bucket = byVoucher.get(e.voucher_id) ?? [];
      bucket.push(e);
      byVoucher.set(e.voucher_id, bucket);
    }

    const hits: DuplicateHit[] = [];
    for (const lines of byVoucher.values()) {
      const partyLine = lines.find(l => l.party_id === input.partyId);
      if (!partyLine) continue;
      const amt = Math.max(partyLine.dr_amount, partyLine.cr_amount);
      const amtDiff = Math.abs(amt - input.amount);
      if (amtDiff > AMOUNT_TOLERANCE) continue;
      const daysDiff = daysBetween(partyLine.date, input.date);
      if (Math.abs(daysDiff) > DAYS_WINDOW) continue;
      hits.push({
        voucherId: partyLine.voucher_id,
        voucherNo: partyLine.voucher_no,
        date: partyLine.date,
        amount: amt,
        partyName: partyLine.ledger_name ?? '',
        narration: partyLine.narration ?? '',
        daysDiff,
        amountDiff: amtDiff,
      });
    }
    // Sort by date descending (most recent first)
    return hits.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
}
