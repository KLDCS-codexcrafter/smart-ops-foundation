/**
 * @file        src/lib/comply360-time-machine-engine.ts
 * @sibling     NEW @ Sprint 78a · Comply360 Main Arc 1.10 · Pass A · Q16
 * @realizes    Point-in-time reconstruction · "show the state of <entity> as
 *              of <date>" forensic replay. Wraps audit-trail-aggregator's
 *              entity-agnostic reconstructSnapshotAt with listing + diff helpers.
 * @reads-from  comply360-audit-trail-aggregator-engine (0-DIFF · same-sprint)
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 * [JWT] Phase 8: GET /api/comply360/time-machine/:entity/:type/:id?asOf=...
 */
import {
  reconstructSnapshotAt, verifyAggregatedChain,
} from './comply360-audit-trail-aggregator-engine';
import { readAuditTrail } from './audit-trail-engine';

export const READS_FROM = {
  engines: ['comply360-audit-trail-aggregator-engine'],
  storage_keys: [],
} as const;

export interface TimeMachineSnapshot {
  entity_code: string;
  entity_type: string;
  entity_id: string;
  as_of: string;
  reconstructed_state: unknown;
  chain_verified: boolean;
  entries_applied: number;
}

export async function replaySnapshot(
  entity_code: string,
  entity_type: string,
  entity_id: string,
  as_of: string,
): Promise<TimeMachineSnapshot> {
  const state = reconstructSnapshotAt(entity_code, entity_type, entity_id, as_of);
  const chain = await verifyAggregatedChain(entity_code);
  const entries_applied = readAuditTrail(entity_code).filter(
    (e) => e.entity_type === entity_type && e.record_id === entity_id && e.timestamp <= as_of,
  ).length;
  return {
    entity_code, entity_type, entity_id, as_of,
    reconstructed_state: state,
    chain_verified: chain.ok,
    entries_applied,
  };
}

export function listAvailableSnapshots(
  entity_code: string,
  entity_type: string,
): { entity_id: string; first_seen: string; last_modified: string }[] {
  const entries = readAuditTrail(entity_code).filter((e) => e.entity_type === entity_type);
  const map = new Map<string, { first_seen: string; last_modified: string }>();
  for (const e of entries) {
    const cur = map.get(e.record_id);
    if (!cur) {
      map.set(e.record_id, { first_seen: e.timestamp, last_modified: e.timestamp });
    } else {
      if (e.timestamp < cur.first_seen) cur.first_seen = e.timestamp;
      if (e.timestamp > cur.last_modified) cur.last_modified = e.timestamp;
    }
  }
  return Array.from(map.entries()).map(([entity_id, v]) => ({ entity_id, ...v }));
}

export function compareSnapshots(
  snap1: TimeMachineSnapshot,
  snap2: TimeMachineSnapshot,
): { diff_keys: string[]; from_state: unknown; to_state: unknown } {
  const a = (snap1.reconstructed_state ?? {}) as Record<string, unknown>;
  const b = (snap2.reconstructed_state ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const diff_keys: string[] = [];
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diff_keys.push(k);
  }
  return { diff_keys, from_state: snap1.reconstructed_state, to_state: snap2.reconstructed_state };
}
