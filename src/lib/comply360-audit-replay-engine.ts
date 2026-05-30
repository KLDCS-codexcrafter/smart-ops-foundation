/**
 * @file        src/lib/comply360-audit-replay-engine.ts
 * @sibling     NEW @ Sprint 80e · Comply360 Floor 2 Audit-Suite · Pass E · OOB-3 · DP-S80-20
 * @realizes    Per-voucher Audit Replay Mode · cinematic step-by-step timeline of
 *              every modification with diff highlights. Wraps S78a's
 *              reconstructSnapshotAt(...) entity-agnostic snapshot · adds replay
 *              session tracking + frame-by-frame diff generation.
 *              CATEGORY-DEFINING DIFFERENTIATOR · NO competitor has this.
 * @reads-from  comply360-time-machine-engine (S78a · 0-DIFF · CONSUMES reconstructSnapshotAt)
 *              comply360-audit-trail-aggregator-engine (S78a · 0-DIFF)
 *              audit-trail-engine (Phase 4 + S80d hardened · 0-DIFF)
 *              audit-trail-hash-chain (Phase 4 · 0-DIFF)
 * @sprint      Sprint 80e · T-Phase-5.B.2.1-PASS-E
 * [JWT] Phase 8: GET /api/comply360/audit-replay/:entity_type/:entity_id
 */
import { logAudit, readAuditTrail } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { reconstructSnapshotAt, registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

// ── READS_FROM canon (v1.22) ──────────────────────────────────────────
export const READS_FROM = {
  engines: [
    'comply360-time-machine-engine',
    'comply360-audit-trail-aggregator-engine',
    'audit-trail-engine',
    'audit-trail-hash-chain',
  ],
  storage_keys: ['erp_audit_replay_sessions'],
} as const;

const SESSIONS_KEY = 'erp_audit_replay_sessions';

function AUD(t: string): LogAuditEntityType {
  return t as unknown as LogAuditEntityType;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readSessions(): AuditReplaySession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as AuditReplaySession[]) : [];
  } catch {
    return [];
  }
}

function writeSessions(list: AuditReplaySession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
  } catch {
    /* quota — non-fatal */
  }
}

// ── Types ─────────────────────────────────────────────────────────────
export interface ReplayFrame {
  frame_id: string;
  timestamp: string;
  action: 'create' | 'update' | 'soft_delete' | 'undelete';
  actor: { id: string; name: string; role: string | null };
  changed_fields: string[];
  diff: Array<{ field: string; before: unknown; after: unknown }>;
  audit_trail_id: string;
  downstream_impact_count: number;
}

export interface AuditReplaySession {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_code: string;
  total_frames: number;
  created_at: string;
  first_frame_ts: string;
  last_frame_ts: string;
  frames: ReplayFrame[];
  initiated_by_bap: BAPAccountId;
}

// ── Diff helper ────────────────────────────────────────────────────────
function diffStates(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): { changed_fields: string[]; diff: ReplayFrame['diff'] } {
  const a = (before ?? {}) as Record<string, unknown>;
  const b = (after ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diff: ReplayFrame['diff'] = [];
  const changed_fields: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      changed_fields.push(k);
      diff.push({ field: k, before: a[k], after: b[k] });
    }
  }
  return { changed_fields, diff };
}

function mapAction(a: string): ReplayFrame['action'] {
  if (a === 'create') return 'create';
  if (a === 'cancel') return 'soft_delete';
  return 'update';
}

// ── Public API ─────────────────────────────────────────────────────────

/** Generate full replay session for a voucher · uses S78a reconstructSnapshotAt at each audit-trail timestamp */
export function generateReplay(opts: {
  entity_type: string;
  entity_id: string;
  entity_code: string;
  initiated_by_bap: BAPAccountId;
}): AuditReplaySession {
  const entries = readAuditTrail(opts.entity_code, {
    recordId: opts.entity_id,
  })
    .filter((e) => e.entity_type === opts.entity_type)
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const frames: ReplayFrame[] = [];
  let prevState: Record<string, unknown> | null = null;
  for (const e of entries) {
    const snapshot = reconstructSnapshotAt(
      opts.entity_code, opts.entity_type, opts.entity_id, e.timestamp,
    ) as Record<string, unknown> | null;
    const after = snapshot ?? (e.after_state as Record<string, unknown> | null);
    const { changed_fields, diff } = diffStates(prevState, after);
    frames.push({
      frame_id: uid('frame'),
      timestamp: e.timestamp,
      action: mapAction(e.action),
      actor: { id: e.user_id, name: e.user_name, role: e.user_role },
      changed_fields,
      diff,
      audit_trail_id: e.id,
      downstream_impact_count: computeDownstreamImpact(
        opts.entity_type, opts.entity_id, e.timestamp,
      ),
    });
    prevState = after;
  }

  const session: AuditReplaySession = {
    id: uid('replay'),
    entity_type: opts.entity_type,
    entity_id: opts.entity_id,
    entity_code: opts.entity_code,
    total_frames: frames.length,
    created_at: new Date().toISOString(),
    first_frame_ts: frames[0]?.timestamp ?? '',
    last_frame_ts: frames[frames.length - 1]?.timestamp ?? '',
    frames,
    initiated_by_bap: opts.initiated_by_bap,
  };

  logAudit({
    entityCode: opts.entity_code,
    action: 'create',
    entityType: AUD('audit_replay_session'),
    recordId: session.id,
    recordLabel: `Replay ${opts.entity_type}/${opts.entity_id} · ${frames.length} frames`,
    beforeState: null,
    afterState: { entity_type: session.entity_type, entity_id: session.entity_id, total_frames: session.total_frames },
    sourceModule: 'comply360-audit-replay-engine',
  });

  const all = readSessions();
  all.push(session);
  writeSessions(all);
  return session;
}

/** List historical replay sessions · optionally filter by entity */
export function listReplaySessions(opts?: { entity_type?: string; entity_id?: string }): AuditReplaySession[] {
  return readSessions().filter((s) => {
    if (opts?.entity_type && s.entity_type !== opts.entity_type) return false;
    if (opts?.entity_id && s.entity_id !== opts.entity_id) return false;
    return true;
  });
}

/** Get specific replay session by id */
export function getReplaySession(id: string): AuditReplaySession | null {
  return readSessions().find((s) => s.id === id) ?? null;
}

/**
 * Browser-side heuristic count of downstream records that reference this
 * entity in their audit-trail before_state / after_state. Phase 8 backend
 * will replace with true cross-card graph traversal.
 */
export function computeDownstreamImpact(
  entity_type: string,
  entity_id: string,
  as_of: string,
): number {
  // Walk every entity_code bucket we can see in localStorage to find references.
  let count = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('erp_audit_trail_')) continue;
      const entity_code = key.replace('erp_audit_trail_', '');
      const entries = readAuditTrail(entity_code, { to: as_of });
      for (const e of entries) {
        if (e.entity_type === entity_type && e.record_id === entity_id) continue;
        const blob = JSON.stringify(e.after_state ?? {}) + JSON.stringify(e.before_state ?? {});
        if (blob.includes(entity_id)) count++;
      }
    }
  } catch {
    /* SSR / locked storage */
  }
  return count;
}

// ── Entity-type registration (side-effect on import) ──────────────────
registerAuditEntityType({
  id: 'audit_replay_session',
  module: 'audit-trail',
  label: 'Audit Replay · Per-voucher cinematic timeline',
});
