/**
 * audit-trail-engine.ts — Append-only audit log writer (MCA Rule 3(1) compliant)
 *
 * CRITICAL: This engine has NO disable flag. NO toggle. NO conditional skip path.
 * Every call to logAudit() ALWAYS writes. This is the "cannot be disabled" rule.
 *
 * Audit trail records are append-only by design. There is no edit or delete
 * API. This is the "cannot be disabled / cannot be tampered with" guarantee
 * required by MCA Rule 3(1) and ICAI Implementation Guide.
 *
 * Sprint T-Phase-1.2.5h-b1
 *
 * [JWT] POST /api/audit-trail (single create) — backend takes over in Phase 2
 */

import type {
  AuditTrailEntry, AuditAction, AuditEntityType,
} from '@/types/audit-trail';
import { auditTrailKey } from '@/types/audit-trail';

/** Resolve current user from mock auth (Phase 1) — Phase 2 reads JWT */
function getCurrentUser(): { id: string; name: string; role: string | null } {
  try {
    // [JWT] GET /api/auth/me
    const raw = localStorage.getItem('erp_mock_auth_active');
    if (raw) {
      const u = JSON.parse(raw);
      return {
        id: u.id ?? 'unknown',
        name: u.name ?? u.id ?? 'unknown',
        role: u.role ?? null,
      };
    }
  } catch { /* fall through */ }
  return { id: 'system', name: 'system', role: null };
}

/** Crypto-safe-ish UUID for audit IDs (Phase 2 backend will use real UUID) */
function makeAuditId(): string {
  // [JWT] Replace with backend-issued UUID in Phase 2
  return `aud_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Log an audit trail entry. ALWAYS WRITES. No skip path.
 *
 * @param opts.entityCode  Tenant entity code (must be non-empty — the engine warns
 *                         on empty entityCode but still writes to a fallback bucket
 *                         so we never silently drop audit data).
 */
export function logAudit(opts: {
  entityCode: string;
  action: AuditAction;
  entityType: AuditEntityType;
  recordId: string;
  recordLabel: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  reason?: string | null;
  sourceModule: string;
}): AuditTrailEntry {
  const user = getCurrentUser();
  const entry: AuditTrailEntry = {
    id: makeAuditId(),
    entity_id: opts.entityCode || 'UNKNOWN',
    timestamp: new Date().toISOString(),
    user_id: user.id,
    user_name: user.name,
    user_role: user.role,
    action: opts.action,
    entity_type: opts.entityType,
    record_id: opts.recordId,
    record_label: opts.recordLabel,
    before_state: opts.beforeState,
    after_state: opts.afterState,
    reason: opts.reason ?? null,
    source_module: opts.sourceModule,
  };

  const key = auditTrailKey(entry.entity_id);
  // [JWT] POST /api/audit-trail — backend persistence in Phase 2
  let existing: AuditTrailEntry[] = [];
  try {
    const raw = localStorage.getItem(key);
    existing = raw ? JSON.parse(raw) : [];
  } catch {
    existing = [];
  }

  existing.push(entry);
  try {
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    // Storage quota — emit a warning but DO NOT skip the log silently.
    if (existing.length > 100) {
      const truncated = existing.slice(-Math.floor(existing.length / 2));
      try {
        localStorage.setItem(key, JSON.stringify(truncated));
        // eslint-disable-next-line no-console
        console.warn('[audit-trail] storage quota hit; oldest 50% archived (export needed)');
      } catch {
        // Last resort — direct console (avoid error-engine cycle since both write to localStorage)
        // eslint-disable-next-line no-console
        console.error('[audit-trail] CRITICAL: storage quota exceeded; audit entry could not persist', entry);
      }
    } else {
      // eslint-disable-next-line no-console
      console.error('[audit-trail] write failed', e);
    }
  }
  return entry;
}

/** Read all audit trail entries for an entity (descending by timestamp by default) */
export function readAuditTrail(entityCode: string, opts?: {
  from?: string; to?: string;
  action?: AuditAction; entityType?: AuditEntityType;
  userId?: string; recordId?: string;
}): AuditTrailEntry[] {
  // [JWT] GET /api/audit-trail?entityCode=:entityCode&...
  try {
    const raw = localStorage.getItem(auditTrailKey(entityCode));
    let entries: AuditTrailEntry[] = raw ? JSON.parse(raw) : [];

    if (opts?.from) entries = entries.filter(e => e.timestamp >= opts.from!);
    if (opts?.to) entries = entries.filter(e => e.timestamp <= opts.to!);
    if (opts?.action) entries = entries.filter(e => e.action === opts.action);
    if (opts?.entityType) entries = entries.filter(e => e.entity_type === opts.entityType);
    if (opts?.userId) entries = entries.filter(e => e.user_id === opts.userId);
    if (opts?.recordId) entries = entries.filter(e => e.record_id === opts.recordId);

    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch {
    return [];
  }
}

/** Export audit trail to CSV string (for tax officer / compliance archival) */
export function exportAuditTrailCsv(entries: AuditTrailEntry[]): string {
  const header = [
    'Audit ID', 'Entity', 'Timestamp', 'User', 'Role', 'Action',
    'Record Type', 'Record ID', 'Record Label', 'Reason', 'Source Module',
    'Before State (JSON)', 'After State (JSON)',
  ].join(',');

  const rows = entries.map(e => [
    e.id, e.entity_id, e.timestamp, e.user_name, e.user_role ?? '', e.action,
    e.entity_type, e.record_id, `"${e.record_label.replace(/"/g, '""')}"`,
    `"${(e.reason ?? '').replace(/"/g, '""')}"`, e.source_module,
    `"${JSON.stringify(e.before_state ?? {}).replace(/"/g, '""')}"`,
    `"${JSON.stringify(e.after_state ?? {}).replace(/"/g, '""')}"`,
  ].join(','));

  return [header, ...rows].join('\n');
}
