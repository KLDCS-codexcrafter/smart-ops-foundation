/**
 * @file        src/types/reconciliation-event.ts
 * @purpose     3-bucket reconciliation event · Moat #15 consumer · audit trail per MLGIT
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q3=a 3 buckets · EX-4-Q7=a array on record
 * @disciplines FR-30 · FR-50
 */

export type ReconciliationBucket = 'booked' | 'custom_revalued' | 'actual_landed';

export type ReconciliationEventType =
  | 'initial_booking'
  | 'customs_revaluation'
  | 'actual_landed_capture'
  | 'variance_explanation'
  | 'reversal';

export interface ReconciliationEvent {
  id: string;
  timestamp: string;
  user_id: string;
  event_type: ReconciliationEventType;
  bucket: ReconciliationBucket;
  amount_before_inr: number;
  amount_after_inr: number;
  variance_inr: number;
  variance_pct: number;
  justification: string;
  gazette_ref: string;
  reference_voucher_id: string | null;
  notes: string;
}

export function computeReconciliationVariance(
  amount_before: number,
  amount_after: number,
): { variance_inr: number; variance_pct: number; verdict: 'gain' | 'loss' | 'neutral' } {
  const variance_inr = amount_after - amount_before;
  if (amount_before === 0) return { variance_inr, variance_pct: 0, verdict: 'neutral' };
  const variance_pct = (variance_inr / amount_before) * 100;
  const verdict = variance_pct > 0.1 ? 'loss' : variance_pct < -0.1 ? 'gain' : 'neutral';
  return {
    variance_inr: Number(variance_inr.toFixed(2)),
    variance_pct: Number(variance_pct.toFixed(3)),
    verdict,
  };
}

export function filterEventsByBucket(
  events: ReconciliationEvent[],
  bucket: ReconciliationBucket,
): ReconciliationEvent[] {
  return events.filter((e) => e.bucket === bucket);
}

export function latestEventByBucket(
  events: ReconciliationEvent[],
  bucket: ReconciliationBucket,
): ReconciliationEvent | null {
  const filtered = filterEventsByBucket(events, bucket);
  if (filtered.length === 0) return null;
  return filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
}
