/**
 * @file     advance-aging.ts
 * @purpose  Pure aging calculator for AdvanceEntry[]. Given a list of advances
 *           and a reference date, returns aged buckets (0-30d / 31-60d /
 *           61-90d / 91-180d / 180+d) with counts and amounts.
 *
 *           Read-only — does not mutate advances.
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import type { AdvanceEntry } from '@/types/compliance';

export type AgeBucket = '0-30d' | '31-60d' | '61-90d' | '91-180d' | '180+d';

export interface AgedAdvance {
  advance: AdvanceEntry;
  daysOld: number;
  bucket: AgeBucket;
  bucketOrder: number;
}

export interface AgingBucketSummary {
  bucket: AgeBucket;
  count: number;
  totalAmount: number;
}

export interface AgingReport {
  totalOpenCount: number;
  totalOpenAmount: number;
  byBucket: AgingBucketSummary[];
  aged: AgedAdvance[];
}

const BUCKET_ORDER: Record<AgeBucket, number> = {
  '0-30d': 0,
  '31-60d': 1,
  '61-90d': 2,
  '91-180d': 3,
  '180+d': 4,
};

const BUCKET_KEYS: AgeBucket[] = ['0-30d', '31-60d', '61-90d', '91-180d', '180+d'];

function bucketOf(daysOld: number): AgeBucket {
  if (daysOld <= 30) return '0-30d';
  if (daysOld <= 60) return '31-60d';
  if (daysOld <= 90) return '61-90d';
  if (daysOld <= 180) return '91-180d';
  return '180+d';
}

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/**
 * Compute aging report from a list of advances + a reference date.
 * Only includes advances with status 'open' or 'partial' (cancelled/adjusted excluded).
 */
export function computeAgingReport(
  advances: AdvanceEntry[],
  asOfDate: string,
): AgingReport {
  const open = advances.filter(
    a => a.status === 'open' || a.status === 'partial',
  );

  const aged: AgedAdvance[] = open.map(a => {
    const daysOld = daysBetween(a.date, asOfDate);
    const bucket = bucketOf(daysOld);
    return { advance: a, daysOld, bucket, bucketOrder: BUCKET_ORDER[bucket] };
  });

  // Oldest first for display
  aged.sort((a, b) => b.daysOld - a.daysOld);

  const bucketMap = new Map<AgeBucket, AgingBucketSummary>();
  for (const k of BUCKET_KEYS) {
    bucketMap.set(k, { bucket: k, count: 0, totalAmount: 0 });
  }
  for (const aa of aged) {
    const s = bucketMap.get(aa.bucket);
    if (!s) continue;
    s.count += 1;
    s.totalAmount += aa.advance.balance_amount;
  }
  for (const s of bucketMap.values()) {
    s.totalAmount = Math.round(s.totalAmount * 100) / 100;
  }

  const totalOpenAmount = aged.reduce(
    (sum, a) => sum + a.advance.balance_amount,
    0,
  );

  return {
    totalOpenCount: aged.length,
    totalOpenAmount: Math.round(totalOpenAmount * 100) / 100,
    byBucket: BUCKET_KEYS.map(k => bucketMap.get(k) as AgingBucketSummary),
    aged,
  };
}
