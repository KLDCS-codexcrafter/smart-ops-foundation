/**
 * @file        src/lib/idea-1-time-travel-masters-engine.ts
 * @sibling     NEW @ Sprint 96 · Arc 0 Master Data Foundation · 💡 Idea 1
 * @realizes    Time-Travel Masters · effective-dated version chain on every
 *              master change. Reports can query historical state ("price list
 *              as of 2026-03-15"). NetSuite has partial; no SMB competitor has it.
 * @reads-from  master-replication-engine (MasterType import)
 * @sprint      Sprint 96 · T-Phase-6.A.0.1
 * [JWT] Phase 8: GET /api/master-versions · POST /api/master-versions/record
 */
import type { MasterType } from '@/lib/master-replication-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { registerAuditEntityType } from '@/lib/comply360-audit-trail-aggregator-engine';

export const READS_FROM = {
  engines: ['master-replication-engine'],
  storage_keys: ['erp_master_versions_<type>_<key>'],
} as const;

registerAuditEntityType({ id: 'master_version_change', module: 'mca-roc', label: 'Master Version Change' });

export interface MasterVersion {
  master_type: MasterType;
  master_key: string;
  version_no: number;
  predecessor_version?: number;
  effective_from_date: string;
  effective_to_date: string | null;
  snapshot: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}

const chainKey = (master_type: MasterType, master_key: string): string =>
  `erp_master_versions_${master_type}_${master_key}`;

function readChain(master_type: MasterType, master_key: string): MasterVersion[] {
  try {
    // [JWT] GET /api/master-versions?type=...&key=...
    const raw = localStorage.getItem(chainKey(master_type, master_key));
    return raw ? (JSON.parse(raw) as MasterVersion[]) : [];
  } catch { return []; }
}

function writeChain(master_type: MasterType, master_key: string, chain: MasterVersion[]): void {
  try {
    // [JWT] POST /api/master-versions
    localStorage.setItem(chainKey(master_type, master_key), JSON.stringify(chain));
  } catch { /* quota silent */ }
}

/** Returns ISO date string for (date - 1 day) using UTC arithmetic. */
function dayBefore(isoDate: string): string {
  // Accept either full ISO or YYYY-MM-DD. Normalise to YYYY-MM-DD.
  const ymd = isoDate.slice(0, 10);
  const [y, m, d] = ymd.split('-').map((p) => parseInt(p, 10));
  // Use UTC to avoid TZ skew (FR-31 · no raw float math; date arithmetic via ms).
  const utc = Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000;
  const prev = new Date(utc);
  const yy = prev.getUTCFullYear();
  const mm = String(prev.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(prev.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function recordMasterVersion(input: {
  master_type: MasterType;
  master_key: string;
  snapshot: Record<string, unknown>;
  effective_from_date: string;
  changed_by: string;
}): MasterVersion {
  const chain = readChain(input.master_type, input.master_key);
  const prev = chain.find((v) => v.effective_to_date === null);
  if (prev) {
    prev.effective_to_date = dayBefore(input.effective_from_date);
  }
  const version_no = (chain.length > 0 ? Math.max(...chain.map((v) => v.version_no)) : 0) + 1;
  const next: MasterVersion = {
    master_type: input.master_type,
    master_key: input.master_key,
    version_no,
    predecessor_version: prev?.version_no,
    effective_from_date: input.effective_from_date.slice(0, 10),
    effective_to_date: null,
    snapshot: input.snapshot,
    changed_by: input.changed_by,
    changed_at: new Date().toISOString(),
  };
  const updated = [...chain.filter((v) => v.version_no !== prev?.version_no), ...(prev ? [prev] : []), next]
    .sort((a, b) => a.version_no - b.version_no);
  writeChain(input.master_type, input.master_key, updated);

  logAudit({
    entityCode: input.changed_by || 'UNKNOWN',
    action: prev ? 'update' : 'create',
    entityType: 'master_version_change',
    recordId: `${input.master_type}_${input.master_key}_v${version_no}`,
    recordLabel: `Master version ${version_no} for ${input.master_type}/${input.master_key}`,
    beforeState: prev ? { version_no: prev.version_no, snapshot: prev.snapshot } : null,
    afterState: { version_no, snapshot: input.snapshot, effective_from: next.effective_from_date },
    sourceModule: 'idea-1-time-travel-masters-engine',
  });

  return next;
}

export function getMasterAsOf(input: {
  master_type: MasterType;
  master_key: string;
  as_of_date: string;
}): MasterVersion | null {
  const as_of = input.as_of_date.slice(0, 10);
  const chain = readChain(input.master_type, input.master_key);
  for (const v of chain) {
    if (v.effective_from_date <= as_of && (v.effective_to_date === null || v.effective_to_date >= as_of)) {
      return v;
    }
  }
  return null;
}

export function getVersionChain(input: {
  master_type: MasterType;
  master_key: string;
}): MasterVersion[] {
  return readChain(input.master_type, input.master_key)
    .slice()
    .sort((a, b) => a.version_no - b.version_no);
}

export function _clearVersionChainForTests(master_type: MasterType, master_key: string): void {
  try { localStorage.removeItem(chainKey(master_type, master_key)); } catch { /* ignore */ }
}
