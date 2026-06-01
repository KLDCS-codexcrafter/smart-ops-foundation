/**
 * @file        src/lib/idea-9-sleeping-master-detector-engine.ts
 * @sibling     NEW @ Sprint 101 · 🏁 Arc 0 Capstone · 💡 Idea 9
 * @realizes    Flags master records that have not been referenced in any voucher
 *              or transaction within configurable thresholds (active < dormant <
 *              sleeping). Greenfield · derives last_used_at by walking the
 *              localStorage voucher stores (read-only · no domain mutation).
 * @reads-from  voucher localStorage (read-only walk) · master-replication-engine (MasterType)
 * @audit       Shares `master_lifecycle_event` (module 'mca-roc') with idea-10/idea-12.
 *              Action discriminator: 'sleeping_flagged'.
 * @sprint      T-Phase-6.A.0.6 · Block 2
 * [JWT] Phase 8: GET /api/master-lifecycle/sleeping?entityCode=:entityCode
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';
import type { MasterType } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['master-replication-engine'],
  storage_keys: [
    'erp_vouchers_*',
    'erp_material_indents_*',
    'erp_<entity>_master_*',
    'erp_master_lifecycle_reviewed',
  ],
} as const;

registerAuditEntityType({
  id: 'master_lifecycle_event',
  module: 'mca-roc',
  label: 'Master Lifecycle Event (sleeping / cross-entity-reorder / compliance-block)',
});

export const DEFAULT_DORMANT_DAYS = 90;
export const DEFAULT_SLEEPING_DAYS = 180;

export type SleepingMasterFlag = 'active' | 'dormant' | 'sleeping';

export interface SleepingMaster {
  master_type: MasterType;
  master_key: string;
  entity_code: string;
  last_used_at: string | null;
  days_dormant: number;
  flag: SleepingMasterFlag;
}

const REVIEW_KEY = 'erp_master_lifecycle_reviewed';

interface ReviewedEntry { key: string; at: string }

function readReviewed(): ReviewedEntry[] {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    return raw ? (JSON.parse(raw) as ReviewedEntry[]) : [];
  } catch {
    return [];
  }
}

function writeReviewed(rows: ReviewedEntry[]): void {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(rows));
  } catch { /* quota silent */ }
}

function reviewKey(master_type: MasterType, master_key: string, entity_code: string): string {
  return `${master_type}|${master_key}|${entity_code}`;
}

function listMasterKeysForEntity(entity_code: string, master_type: MasterType): string[] {
  const prefix = `erp_${entity_code}_master_${master_type}`;
  try {
    const raw = localStorage.getItem(prefix);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((r) => {
        const id = r['id'] ?? r['key'] ?? r['code'] ?? r['name'];
        return typeof id === 'string' ? id : null;
      })
      .filter((v): v is string => Boolean(v));
  } catch {
    return [];
  }
}

/**
 * Walk all voucher-shaped localStorage stores for `entity_code` and return a
 * map of master_key → latest ISO timestamp the key appeared in any voucher.
 * Pure read · no writes · safe under SSR (guarded).
 */
function buildLastUsedIndex(entity_code: string): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof localStorage === 'undefined') return out;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (!k.endsWith(`_${entity_code}`) && !k.includes(`_${entity_code}_`)) continue;
    if (!/voucher|indent|grn|invoice|order|transaction/i.test(k)) continue;
    let arr: unknown;
    try { arr = JSON.parse(localStorage.getItem(k) ?? '[]'); } catch { continue; }
    if (!Array.isArray(arr)) continue;
    for (const row of arr as Array<Record<string, unknown>>) {
      const stamp = (row['date'] as string)
        ?? (row['voucher_date'] as string)
        ?? (row['created_at'] as string)
        ?? (row['updated_at'] as string)
        ?? null;
      if (!stamp || typeof stamp !== 'string') continue;
      for (const v of Object.values(row)) {
        if (typeof v === 'string' && v.length > 0 && v.length < 80) {
          const prev = out.get(v);
          if (!prev || prev < stamp) out.set(v, stamp);
        }
      }
    }
  }
  return out;
}

function daysBetween(iso: string | null, now: number): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((now - t) / (1000 * 60 * 60 * 24));
}

export function detectSleepingMasters(input: {
  entity_code: string;
  master_types?: MasterType[];
  dormant_days?: number;
  sleeping_days?: number;
  now?: number;
}): SleepingMaster[] {
  const dormantDays = input.dormant_days ?? DEFAULT_DORMANT_DAYS;
  const sleepingDays = input.sleeping_days ?? DEFAULT_SLEEPING_DAYS;
  const now = input.now ?? Date.now();
  const types: MasterType[] = input.master_types ?? [
    'item', 'customer', 'vendor', 'ledger',
    'stock_group', 'stock_category', 'voucher_type', 'unit',
  ];
  const idx = buildLastUsedIndex(input.entity_code);
  const reviewed = new Set(readReviewed().map((r) => r.key));
  const out: SleepingMaster[] = [];
  for (const mt of types) {
    const keys = listMasterKeysForEntity(input.entity_code, mt);
    for (const key of keys) {
      const last = idx.get(key) ?? null;
      const days = daysBetween(last, now);
      let flag: SleepingMasterFlag = 'active';
      if (days >= sleepingDays) flag = 'sleeping';
      else if (days >= dormantDays) flag = 'dormant';
      const rk = reviewKey(mt, key, input.entity_code);
      if (reviewed.has(rk) && flag !== 'active') flag = 'active';
      const entry: SleepingMaster = {
        master_type: mt,
        master_key: key,
        entity_code: input.entity_code,
        last_used_at: last,
        days_dormant: days === Number.POSITIVE_INFINITY ? -1 : days,
        flag,
      };
      out.push(entry);
      if (flag === 'sleeping') {
        logAudit({
          entityCode: input.entity_code,
          action: 'create',
          entityType: 'master_lifecycle_event',
          recordId: rk,
          recordLabel: `Sleeping ${mt} ${key} (${entry.days_dormant}d dormant)`,
          beforeState: null,
          afterState: { action: 'sleeping_flagged', ...entry },
          reason: 'sleeping_flagged',
          sourceModule: 'mca-roc',
        });
      }
    }
  }
  return out;
}

export function markReviewed(
  master_type: MasterType,
  master_key: string,
  entity_code: string,
): void {
  const rows = readReviewed();
  const k = reviewKey(master_type, master_key, entity_code);
  if (rows.some((r) => r.key === k)) return;
  rows.push({ key: k, at: new Date().toISOString() });
  writeReviewed(rows);
}

export function clearReviewed(): void {
  writeReviewed([]);
}
