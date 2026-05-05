/**
 * @file        qa-pending-inspection-alerts.ts — OOB-59
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block F · D-340 (Q3=a)
 * @extended    T-Phase-1.2.6f-d-2-card5-5-pre-3 · Block C · D-344
 *              3-tier severity (warning/critical/escalated) + per-authority threshold table.
 *              BACKWARD COMPATIBLE: default getPendingInspectionAlerts(entityCode, 24)
 *              behaves identically to 5-pre-2 (single-tier filter at thresholdHours).
 * @purpose     Surface inspections older than threshold (default 24h) blocking 4-way Match.
 *              THIN WRAPPER · delegates to qa-inspection-engine.listPendingQa.
 *              Mirrors gate-dwell-alerts D-314 OOB precedent · NO new storage.
 * @[JWT]       GET /api/qa/pending-alerts
 */
import { listPendingQa } from '@/lib/qa-inspection-engine';
import type { QaInspectionStatus, QaInspectionAuthority } from '@/types/qa-inspection';

export type QaAlertSeverity = 'warning' | 'critical' | 'escalated';

export interface QaPendingAlert {
  qa_id: string;
  qa_no: string;
  bill_no: string;
  inspector_user_id: string;
  inspection_date: string;
  status: QaInspectionStatus;
  vendor_name: string | null;
  age_hours: number;
  // 5-pre-3 · D-344 additions
  authority: QaInspectionAuthority;
  severity: QaAlertSeverity;
}

export const DEFAULT_PENDING_THRESHOLD_HOURS = 24;

/**
 * 5-pre-3 · D-344 · per-authority 3-tier severity thresholds (hours).
 * External lab gets longest TAT (multi-day round trip); customer-witnessed needs
 * scheduling slack; vendor-self-certified mirrors internal pace.
 * User-facing override (Block A pendingAlertThresholdHours) scales the warning tier;
 * critical = 2x · escalated = 3x of effective warning per authority.
 */
export interface AuthorityThresholds {
  warning: number;
  critical: number;
  escalated: number;
}

export const PER_AUTHORITY_THRESHOLDS: Record<QaInspectionAuthority, AuthorityThresholds> = {
  internal:                { warning: 24,  critical: 48,  escalated: 72  },
  external_lab:            { warning: 168, critical: 240, escalated: 336 },
  customer_witnessed:      { warning: 48,  critical: 96,  escalated: 144 },
  vendor_self_certified:   { warning: 24,  critical: 48,  escalated: 72  },
};

function classifySeverity(
  ageHours: number,
  authority: QaInspectionAuthority,
  warningOverride: number,
): QaAlertSeverity | null {
  const base = PER_AUTHORITY_THRESHOLDS[authority] ?? PER_AUTHORITY_THRESHOLDS.internal;
  // Scale tiers around the user-facing warning override; preserve 1×/2×/3× ratio.
  const scale = warningOverride / PER_AUTHORITY_THRESHOLDS.internal.warning;
  const warn = Math.max(1, Math.round(base.warning * scale));
  const crit = Math.max(warn + 1, Math.round(base.critical * scale));
  const esc  = Math.max(crit + 1, Math.round(base.escalated * scale));
  if (ageHours >= esc)  return 'escalated';
  if (ageHours >= crit) return 'critical';
  if (ageHours >= warn) return 'warning';
  return null;
}

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
    const authority: QaInspectionAuthority = q.inspection_authority ?? 'internal';
    const severity = classifySeverity(ageH, authority, thresholdHours) ?? 'warning';
    out.push({
      qa_id: q.id,
      qa_no: q.qa_no,
      bill_no: q.bill_no,
      inspector_user_id: q.inspector_user_id,
      inspection_date: q.inspection_date,
      status: q.status,
      vendor_name: q.vendor_name ?? null,
      age_hours: ageH,
      authority,
      severity,
    });
  }
  return out.sort((a, b) => b.age_hours - a.age_hours);
}
