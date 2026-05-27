/**
 * @file        src/lib/fa-audit-trail-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 53rd SIBLING
 * @flips       FAR-CAP-24 (FA audit trail viewer · CFR-11 e-sig) +
 *              FAR-CAP-19 (Revaluation reserve handler · absorbed via the
 *              'revaluation' event-type · per Q-LOCK-22 A + F-7
 *              spec-vs-empirical absorption)
 * @approach    Append-only audit trail · CFR-11 e-sig hook scaffolded
 *              (e-sig delegated to cfr-part-11-engine SIBLING at Phase 5)
 * [JWT] Phase 5: POST /api/fa/audit-trail · GET /api/fa/audit-trail/:asset_id
 */
import type { AssetUnitRecord } from '@/types/fixed-asset';

export interface AuditTrailEvent {
  event_id: string;
  asset_unit_record_id: string;
  event_type:
    | 'creation' | 'modification' | 'verification' | 'revaluation'
    | 'disposal' | 'custodian_change' | 'amc_renewal' | 'maintenance';
  timestamp: string;
  actor: string;
  payload_before?: Partial<AssetUnitRecord>;
  payload_after?: Partial<AssetUnitRecord>;
  e_sig_hash?: string;
  notes?: string;
}

export interface RevaluationEvent extends AuditTrailEvent {
  event_type: 'revaluation';
  old_book_value: number;
  new_book_value: number;
  revaluation_reserve_delta: number;
  method: 'fair_value' | 'replacement_cost' | 'index_based';
}

export const auditTrailKey = (entityCode: string, asset_id: string): string =>
  `erp_fa_audit_trail_${entityCode}_${asset_id}`;

function readTrail(entityCode: string, asset_id: string): AuditTrailEvent[] {
  try {
    const raw = localStorage.getItem(auditTrailKey(entityCode, asset_id));
    return raw ? (JSON.parse(raw) as AuditTrailEvent[]) : [];
  } catch {
    return [];
  }
}

function writeTrail(entityCode: string, asset_id: string, trail: AuditTrailEvent[]): void {
  try {
    localStorage.setItem(auditTrailKey(entityCode, asset_id), JSON.stringify(trail));
  } catch {
    // ignore
  }
}

function nextEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Append a new audit trail event (append-only · never modify existing).
 */
export function appendAuditEvent(
  entityCode: string,
  asset_id: string,
  event: Omit<AuditTrailEvent, 'event_id' | 'timestamp'>,
): AuditTrailEvent {
  const full: AuditTrailEvent = {
    ...event,
    event_id: nextEventId(),
    timestamp: new Date().toISOString(),
  };
  const trail = readTrail(entityCode, asset_id);
  trail.push(full);
  writeTrail(entityCode, asset_id, trail);
  return full;
}

/**
 * Read the full audit trail for an asset (chronological).
 */
export function getAuditTrail(entityCode: string, asset_id: string): AuditTrailEvent[] {
  return readTrail(entityCode, asset_id).sort((a, b) =>
    Date.parse(a.timestamp) - Date.parse(b.timestamp),
  );
}

/**
 * Record a revaluation event (handles FAR-CAP-19 absorption via event_type).
 */
export function recordRevaluation(
  entityCode: string,
  asset_id: string,
  revaluation: Omit<RevaluationEvent, 'event_id' | 'timestamp' | 'event_type'>,
): RevaluationEvent {
  const full: RevaluationEvent = {
    ...revaluation,
    event_id: nextEventId(),
    timestamp: new Date().toISOString(),
    event_type: 'revaluation',
  };
  const trail = readTrail(entityCode, asset_id);
  trail.push(full);
  writeTrail(entityCode, asset_id, trail);
  return full;
}

/**
 * Days since last audit event for an asset (used by CC FA Health Lane).
 */
export function daysSinceLastAudit(entityCode: string, asset_id: string): number {
  const trail = readTrail(entityCode, asset_id);
  if (trail.length === 0) return Number.POSITIVE_INFINITY;
  const last = trail.reduce((m, e) => Math.max(m, Date.parse(e.timestamp)), 0);
  return Math.max(0, Math.floor((Date.now() - last) / 86_400_000));
}
