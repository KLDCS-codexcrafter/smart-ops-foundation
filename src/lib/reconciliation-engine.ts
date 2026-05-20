/**
 * @file        src/lib/reconciliation-engine.ts
 * @purpose     3-bucket reconciliation engine · capture events + compute deltas · Moat #15 consumer
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 * @decisions   EX-4-Q3=a 3 buckets · EX-4-Q7=a array on record
 * @disciplines FR-30 · FR-50
 */
import type { MultiLegGoodsInTransit } from '@/types/multi-leg-git';
import type { ReconciliationEvent, ReconciliationBucket, ReconciliationEventType } from '@/types/reconciliation-event';
import { computeReconciliationVariance, latestEventByBucket } from '@/types/reconciliation-event';
import { loadMultiLegGITs, saveMultiLegGITs } from '@/lib/multi-leg-git-engine';

export function captureReconciliationEvent(
  entityCode: string,
  mlgitId: string,
  userId: string,
  eventType: ReconciliationEventType,
  bucket: ReconciliationBucket,
  amountBefore: number,
  amountAfter: number,
  justification: string,
  gazetteRef: string,
  referenceVoucherId: string | null,
): MultiLegGoodsInTransit {
  const all = loadMultiLegGITs(entityCode);
  const mlgit = all.find((m) => m.id === mlgitId);
  if (!mlgit) throw new Error(`MultiLegGIT not found: ${mlgitId}`);

  const { variance_inr, variance_pct } = computeReconciliationVariance(amountBefore, amountAfter);
  const event: ReconciliationEvent = {
    id: `re-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_id: userId,
    event_type: eventType,
    bucket,
    amount_before_inr: amountBefore,
    amount_after_inr: amountAfter,
    variance_inr,
    variance_pct,
    justification,
    gazette_ref: gazetteRef,
    reference_voucher_id: referenceVoucherId,
    notes: '',
  };

  const updated: MultiLegGoodsInTransit = {
    ...mlgit,
    reconciliation_events: [...mlgit.reconciliation_events, event],
    booked_total_inr: bucket === 'booked' ? amountAfter : mlgit.booked_total_inr,
    custom_revalued_total_inr: bucket === 'custom_revalued' ? amountAfter : mlgit.custom_revalued_total_inr,
    actual_landed_total_inr: bucket === 'actual_landed' ? amountAfter : mlgit.actual_landed_total_inr,
    updated_at: new Date().toISOString(),
  };
  saveMultiLegGITs(entityCode, all.map((m) => (m.id === mlgitId ? updated : m)));
  return updated;
}

export interface ReconciliationSummary {
  booked: number;
  custom_revalued: number;
  actual_landed: number;
  variance_booked_to_custom_inr: number;
  variance_booked_to_custom_pct: number;
  variance_custom_to_actual_inr: number;
  variance_custom_to_actual_pct: number;
}

export function summarizeMLGITReconciliation(mlgit: MultiLegGoodsInTransit): ReconciliationSummary {
  const booked = mlgit.booked_total_inr;
  const custom_revalued = mlgit.custom_revalued_total_inr;
  const actual_landed = mlgit.actual_landed_total_inr;
  const v1 = computeReconciliationVariance(booked, custom_revalued);
  const v2 = computeReconciliationVariance(custom_revalued, actual_landed);
  return {
    booked, custom_revalued, actual_landed,
    variance_booked_to_custom_inr: v1.variance_inr,
    variance_booked_to_custom_pct: v1.variance_pct,
    variance_custom_to_actual_inr: v2.variance_inr,
    variance_custom_to_actual_pct: v2.variance_pct,
  };
}

export { latestEventByBucket };
