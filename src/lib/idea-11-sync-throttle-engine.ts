/**
 * @file        src/lib/idea-11-sync-throttle-engine.ts
 * @sibling     NEW @ Sprint 98 · Arc 0 Master Data Foundation · 💡 Idea 11
 * @realizes    Sync Throttle · rate-limit master_sync_run bursts so a noisy
 *              bulk-import doesn't flood the audit log or hammer downstream
 *              listeners. Token-bucket per (entity_code, master_type) with
 *              persistent state and explain-trace decisions.
 * @reads-from  audit-trail-engine (USE-SITE) · master-replication-engine (types only)
 * @sprint      Sprint 98 · T-Phase-6.A.0.3
 * @audit       Reuses 'master_sync_run' · no new audit type.
 * [JWT] Phase 8: POST /api/master-sync/throttle · GET /api/master-sync/buckets
 */
import type { MasterType } from '@/lib/master-replication-engine';
import { logAudit } from '@/lib/audit-trail-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'master-replication-engine'],
  storage_keys: ['erp_sync_throttle_bucket_<entity>_<type>'],
} as const;

export interface ThrottlePolicy {
  capacity: number;        // max tokens
  refill_per_minute: number;
}

export interface ThrottleDecision {
  allowed: boolean;
  remaining_tokens: number;
  retry_after_ms: number;
  reason: string;
  bucket_id: string;
}

export interface BucketState {
  bucket_id: string;
  entity_code: string;
  master_type: MasterType;
  tokens: number;
  last_refill_at: string;
  policy: ThrottlePolicy;
}

export const DEFAULT_POLICY: ThrottlePolicy = {
  capacity: 30,
  refill_per_minute: 10,
};

const bucketKey = (entity_code: string, master_type: MasterType): string =>
  `erp_sync_throttle_bucket_${entity_code}_${master_type}`;

function read(entity_code: string, master_type: MasterType): BucketState | null {
  try {
    // [JWT] GET /api/master-sync/buckets/:entity/:type
    const raw = localStorage.getItem(bucketKey(entity_code, master_type));
    return raw ? (JSON.parse(raw) as BucketState) : null;
  } catch { return null; }
}

function write(state: BucketState): void {
  try {
    // [JWT] POST /api/master-sync/buckets
    localStorage.setItem(bucketKey(state.entity_code, state.master_type), JSON.stringify(state));
  } catch { /* quota silent */ }
}

function refill(state: BucketState, nowMs: number): BucketState {
  const lastMs = Date.parse(state.last_refill_at);
  if (!Number.isFinite(lastMs) || nowMs <= lastMs) return state;
  const minutes = (nowMs - lastMs) / 60_000;
  const added = Math.floor(minutes * state.policy.refill_per_minute);
  if (added <= 0) return state;
  return {
    ...state,
    tokens: Math.min(state.policy.capacity, state.tokens + added),
    last_refill_at: new Date(nowMs).toISOString(),
  };
}

/**
 * Request a token for a sync action. Returns decision + remaining tokens.
 * Persists bucket state. When denied, retry_after_ms is the time until
 * the next token refills.
 */
export function requestSyncToken(input: {
  entity_code: string;
  master_type: MasterType;
  policy?: ThrottlePolicy;
  now_ms?: number;
}): ThrottleDecision {
  const policy = input.policy ?? DEFAULT_POLICY;
  const nowMs = input.now_ms ?? Date.now();
  const key = bucketKey(input.entity_code, input.master_type);

  let state = read(input.entity_code, input.master_type);
  if (!state) {
    state = {
      bucket_id: key,
      entity_code: input.entity_code,
      master_type: input.master_type,
      tokens: policy.capacity,
      last_refill_at: new Date(nowMs).toISOString(),
      policy,
    };
  } else {
    state = refill({ ...state, policy }, nowMs);
  }

  if (state.tokens <= 0) {
    const msPerToken = 60_000 / Math.max(1, policy.refill_per_minute);
    write(state);
    return {
      allowed: false,
      remaining_tokens: 0,
      retry_after_ms: Math.ceil(msPerToken),
      reason: `Throttled · bucket empty (cap=${policy.capacity}/refill=${policy.refill_per_minute}pm)`,
      bucket_id: state.bucket_id,
    };
  }

  state.tokens -= 1;
  write(state);
  return {
    allowed: true,
    remaining_tokens: state.tokens,
    retry_after_ms: 0,
    reason: 'Token granted',
    bucket_id: state.bucket_id,
  };
}

/**
 * Throttled wrapper for a sync run · logs the master_sync_run audit entry
 * with the decision so the audit trail records both allowed + throttled runs.
 */
export function recordThrottledSyncRun(input: {
  entity_code: string;
  master_type: MasterType;
  run_id: string;
  payload_summary: string;
  policy?: ThrottlePolicy;
}): ThrottleDecision {
  const decision = requestSyncToken({
    entity_code: input.entity_code,
    master_type: input.master_type,
    policy: input.policy,
  });
  logAudit({
    entityCode: input.entity_code,
    action: 'create',
    entityType: 'master_sync_run',
    recordId: input.run_id,
    recordLabel: `Sync ${input.master_type} · ${decision.allowed ? 'allowed' : 'throttled'} · ${input.payload_summary}`,
    beforeState: null,
    afterState: { decision, payload_summary: input.payload_summary },
    sourceModule: 'idea-11-sync-throttle-engine',
  });
  return decision;
}

export function getBucketState(entity_code: string, master_type: MasterType): BucketState | null {
  return read(entity_code, master_type);
}

export function _clearThrottleBucketForTests(entity_code: string, master_type: MasterType): void {
  try { localStorage.removeItem(bucketKey(entity_code, master_type)); } catch { /* ignore */ }
}
