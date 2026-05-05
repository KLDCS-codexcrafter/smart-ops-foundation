/**
 * @file        qa-pending-inspection-alerts.ts — OOB-59
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block F · D-340 (Q3=a)
 * @purpose     Surface inspections older than threshold (default 24h) blocking 4-way Match.
 *              THIN WRAPPER · delegates to qa-inspection-engine.listPendingQa.
 *              Mirrors gate-dwell-alerts D-314 OOB precedent · NO new storage.
 * @[JWT]       GET /api/qa/pending-alerts
 */
import { listPendingQa } from '@/lib/qa-inspection-engine';
import type { QaInspectionStatus } from '@/types/qa-inspection';

export interface QaPendingAlert {
  qa_id: string;
  qa_no: string;
  bill_no: string;
  inspector_user_id: string;
  inspection_date: string;
  status: QaInspectionStatus;
  vendor_name: string | null;
  age_hours: number;
}

export const DEFAULT_PENDING_THRESHOLD_HOURS = 24;

export function getPendingInspectionAlerts(
  entityCode: string,
  thresholdHours: number = DEFAULT_PENDING_THRESHOLD_HOURS,
  now: number = Date.now(),
): QaPendingAlert[] {
  // [JWT] GET /api/qa/pending-alerts
  const out: QaPendingAlert[] = [];
  for (const q of listPendingQa(entityCode)) {
    const ts = new Date(q.inspection_date || q.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    const ageH = Math.floor((now - ts) / 3600000);
    if (ageH < thresholdHours) continue;
    out.push({
      qa_id: q.id,
      qa_no: q.qa_no,
      bill_no: q.bill_no,
      inspector_user_id: q.inspector_user_id,
      inspection_date: q.inspection_date,
      status: q.status,
      vendor_name: q.vendor_name ?? null,
      age_hours: ageH,
    });
  }
  return out.sort((a, b) => b.age_hours - a.age_hours);
}
