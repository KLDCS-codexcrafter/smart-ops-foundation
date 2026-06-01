/**
 * @file        src/lib/idea-4-smart-master-sync-engine.ts
 * @sibling     NEW @ Sprint 96 · Arc 0 Master Data Foundation · 💡 Idea 4
 * @realizes    Smart Master Sync · usage-aware replication. Keep new entities
 *              lean by replicating only *relevant* masters. UNIQUE to Operix.
 * @reads-from  master-replication-engine (MasterType import + sync_run audit reuse)
 * @sprint      Sprint 96 · T-Phase-6.A.0.1
 * [JWT] Phase 8: POST /api/smart-sync/evaluate
 *
 * NOTE: idea-4 does NOT write masters or own new audit entity types. Its sync
 * run is logged by master-replication-engine as the existing 'master_sync_run'
 * type (Q-LOCK S96-3 · no new audit type · no §P claim).
 */
import type { MasterType } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['master-replication-engine'],
  storage_keys: [],
} as const;

export interface SyncThreshold {
  master_type: MasterType;
  rule: 'used_within_months' | 'has_active_balance' | 'always' | 'never';
  months?: number;
}

export interface SyncDecision {
  master_type: MasterType;
  master_key: string;
  decision: 'replicate' | 'skip';
  reason: 'recently_used' | 'active_credit' | 'dormant' | 'threshold_always' | 'threshold_never';
}

export const DEFAULT_SYNC_THRESHOLDS: SyncThreshold[] = [
  { master_type: 'item',            rule: 'used_within_months', months: 6 },
  { master_type: 'customer',        rule: 'has_active_balance' },
  { master_type: 'vendor',          rule: 'has_active_balance' },
  { master_type: 'ledger',          rule: 'always' },
  { master_type: 'stock_group',     rule: 'always' },
  { master_type: 'stock_category',  rule: 'always' },
  { master_type: 'voucher_type',    rule: 'always' },
  { master_type: 'unit',            rule: 'always' },
];

function resolveThreshold(
  master_type: MasterType,
  overrides?: SyncThreshold[],
): SyncThreshold {
  const fromOverride = overrides?.find((t) => t.master_type === master_type);
  if (fromOverride) return fromOverride;
  const def = DEFAULT_SYNC_THRESHOLDS.find((t) => t.master_type === master_type);
  return def ?? { master_type, rule: 'always' };
}

function monthsBetween(fromIso: string, nowMs: number): number {
  const from = new Date(fromIso).getTime();
  if (Number.isNaN(from)) return Number.POSITIVE_INFINITY;
  const diffMs = nowMs - from;
  return diffMs / (1000 * 60 * 60 * 24 * 30.4375);
}

export function evaluateSmartSync(input: {
  new_entity_code: string;
  candidates: { master_type: MasterType; master_key: string; last_used?: string; active_balance?: boolean }[];
  thresholds?: SyncThreshold[];
}): SyncDecision[] {
  void input.new_entity_code; // reserved for future per-entity overrides
  const nowMs = Date.now();
  const out: SyncDecision[] = [];
  for (const c of input.candidates) {
    const t = resolveThreshold(c.master_type, input.thresholds);
    switch (t.rule) {
      case 'always':
        out.push({ master_type: c.master_type, master_key: c.master_key, decision: 'replicate', reason: 'threshold_always' });
        break;
      case 'never':
        out.push({ master_type: c.master_type, master_key: c.master_key, decision: 'skip', reason: 'threshold_never' });
        break;
      case 'used_within_months': {
        const window = t.months ?? 6;
        const recent = c.last_used != null && monthsBetween(c.last_used, nowMs) <= window;
        out.push(recent
          ? { master_type: c.master_type, master_key: c.master_key, decision: 'replicate', reason: 'recently_used' }
          : { master_type: c.master_type, master_key: c.master_key, decision: 'skip',      reason: 'dormant' });
        break;
      }
      case 'has_active_balance':
        out.push(c.active_balance === true
          ? { master_type: c.master_type, master_key: c.master_key, decision: 'replicate', reason: 'active_credit' }
          : { master_type: c.master_type, master_key: c.master_key, decision: 'skip',      reason: 'dormant' });
        break;
    }
  }
  return out;
}
