/**
 * @file        src/lib/comply360-audit-retention-engine.ts
 * @sibling     NEW @ Sprint 80d · Comply360 Floor 2 Audit-Suite · Pass D · DP-S80-26 · OOB-15
 * @realizes    MCA Rule 11(g)(c) 8-Year Retention + Cold-Storage Export workflow.
 *              Section 128(5) Companies Act 2013 compliance.
 * @reads-from  audit-trail-engine (Phase 4 + S80d hardened · 0-DIFF)
 *              audit-trail-hash-chain (Phase 4 · 0-DIFF)
 *              comply360-audit-trail-aggregator-engine (S78a · 0-DIFF)
 *              comply360-audit-framework-engine (S80a · 0-DIFF)
 * @sprint      Sprint 80d · T-Phase-5.B.2.1-PASS-D
 * [JWT] Phase 8: POST /api/comply360/audit-retention/export
 */
import { logAudit, readAuditTrail } from './audit-trail-engine';
import { readChainForEntity } from './audit-trail-hash-chain';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'audit-trail-hash-chain',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: [
    'erp_audit_retention_exports',
    'erp_audit_retention_warnings',
  ],
} as const;

const EXPORTS_KEY = 'erp_audit_retention_exports';
const WARNINGS_KEY = 'erp_audit_retention_warnings';

export interface ColdStorageExportInput {
  entity_code: string;
  fy: string;
  triggered_by_bap: BAPAccountId;
}

export interface ColdStorageExportRecord {
  id: string;
  entity_code: string;
  fy: string;
  exported_at: string;
  retention_until: string;
  entries_count: number;
  chain_head_hash: string | null;
  blob_size_bytes: number;
  triggered_by_bap: BAPAccountId;
}

export interface RetentionWarning {
  id: string;
  entity_code: string;
  oldest_entry_date: string;
  retention_boundary_date: string;
  days_until_boundary: number;
  recommended_action: 'export_to_cold_storage' | 'archive_safely' | 'verify_retention';
  acknowledged: boolean;
  acknowledged_at: string | null;
}

function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('[audit-retention] persistence failed', e);
  }
}

export function exportToColdStorage(
  input: ColdStorageExportInput,
): { record: ColdStorageExportRecord; blob: Blob } {
  const entries = readAuditTrail(input.entity_code);
  const chain = readChainForEntity(input.entity_code);
  const chain_head_hash = chain.length > 0 ? (chain[chain.length - 1].chain_hash ?? null) : null;
  const exported_at = new Date().toISOString();
  const payload = {
    schema_version: '1.0',
    entity_code: input.entity_code,
    fy: input.fy,
    exported_at,
    retention_until: addYears(exported_at, 8),
    audit_trail_entries: entries,
    chain_head_hash,
  };
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const record: ColdStorageExportRecord = {
    id: `csexp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    entity_code: input.entity_code,
    fy: input.fy,
    exported_at,
    retention_until: addYears(exported_at, 8),
    entries_count: entries.length,
    chain_head_hash,
    blob_size_bytes: blob.size,
    triggered_by_bap: input.triggered_by_bap,
  };
  const list = readList<ColdStorageExportRecord>(EXPORTS_KEY);
  list.push(record);
  writeList(EXPORTS_KEY, list.slice(-200));
  try {
    logAudit({
      entityCode: input.entity_code,
      action: 'create',
      entityType: 'audit_retention_export',
      recordId: record.id,
      recordLabel: `Cold-Storage Export · ${input.fy} · ${entries.length} entries`,
      beforeState: null,
      afterState: { entries_count: entries.length, retention_until: record.retention_until },
      sourceModule: 'comply360-audit-retention-engine',
    });
  } catch (e) {
    console.warn('[audit-retention] audit log failed', e);
  }
  return { record, blob };
}

export function scanRetentionWarnings(entity_code: string): RetentionWarning[] {
  const entries = readAuditTrail(entity_code);
  if (entries.length === 0) return [];
  // Entries are returned descending by timestamp
  const oldest = entries[entries.length - 1];
  const boundary = addYears(oldest.timestamp, 8);
  const days = Math.floor(
    (new Date(boundary).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (days > 90) return [];
  const warning: RetentionWarning = {
    id: `rwarn_${entity_code}_${oldest.timestamp}`,
    entity_code,
    oldest_entry_date: oldest.timestamp,
    retention_boundary_date: boundary,
    days_until_boundary: days,
    recommended_action: days <= 0 ? 'archive_safely' : 'export_to_cold_storage',
    acknowledged: false,
    acknowledged_at: null,
  };
  const list = readList<RetentionWarning>(WARNINGS_KEY);
  if (!list.find((w) => w.id === warning.id)) {
    list.push(warning);
    writeList(WARNINGS_KEY, list);
  }
  return list.filter((w) => w.entity_code === entity_code);
}

export function acknowledgeWarning(
  warning_id: string,
  by_bap: BAPAccountId,
): RetentionWarning {
  const list = readList<RetentionWarning>(WARNINGS_KEY);
  const idx = list.findIndex((w) => w.id === warning_id);
  if (idx === -1) throw new Error(`Warning ${warning_id} not found`);
  list[idx] = {
    ...list[idx],
    acknowledged: true,
    acknowledged_at: new Date().toISOString(),
  };
  writeList(WARNINGS_KEY, list);
  try {
    logAudit({
      entityCode: list[idx].entity_code,
      action: 'approve',
      entityType: 'audit_retention_warning_ack',
      recordId: warning_id,
      recordLabel: `Retention warning ack · ${by_bap}`,
      beforeState: null,
      afterState: { acknowledged_by: by_bap },
      sourceModule: 'comply360-audit-retention-engine',
    });
  } catch (e) {
    console.warn('[audit-retention] audit log failed', e);
  }
  return list[idx];
}

export function listColdStorageExports(
  entity_code: string,
  opts?: { fy?: string },
): ColdStorageExportRecord[] {
  return readList<ColdStorageExportRecord>(EXPORTS_KEY).filter(
    (r) => r.entity_code === entity_code && (!opts?.fy || r.fy === opts.fy),
  );
}

export function getRetentionStatus(entity_code: string): {
  total_entries: number;
  oldest_entry_date: string | null;
  newest_entry_date: string | null;
  exports_performed: number;
  warnings_pending: number;
  retention_compliant: boolean;
} {
  const entries = readAuditTrail(entity_code);
  const exports = listColdStorageExports(entity_code);
  const warnings = readList<RetentionWarning>(WARNINGS_KEY).filter(
    (w) => w.entity_code === entity_code && !w.acknowledged,
  );
  return {
    total_entries: entries.length,
    oldest_entry_date: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
    newest_entry_date: entries.length > 0 ? entries[0].timestamp : null,
    exports_performed: exports.length,
    warnings_pending: warnings.length,
    retention_compliant: warnings.length === 0,
  };
}
