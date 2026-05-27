/**
 * @file        src/lib/rfid-asset-bridge.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 50th SIBLING
 * @realizes    MOAT-49 · IoT/RFID Bidirectional FA Bridge (RFID side)
 * @approach    Q-LOCK-5 A · UI/state-only with stub · localStorage RFID registry
 * @reads-from  physical-asset-unit-bridge.ts (PRESERVE LIST · do NOT modify)
 * [JWT] Phase 5: POST /api/rfid/link · POST /api/rfid/unlink · GET /api/rfid/registry
 */
import type { IoTSignal } from '@/types/fixed-asset';
import { findPhysicalAssetUnit } from './physical-asset-unit-bridge';

export const rfidRegistryKey = (entityCode: string): string =>
  `erp_rfid_registry_${entityCode}`;

export interface RFIDLinkRecord {
  rfid_tag_id: string;
  asset_unit_record_id: string;
  linked_at: string;
  last_seen_at?: string;
  last_seen_location?: string;
}

function readRegistry(entityCode: string): RFIDLinkRecord[] {
  try {
    const raw = localStorage.getItem(rfidRegistryKey(entityCode));
    return raw ? (JSON.parse(raw) as RFIDLinkRecord[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(entityCode: string, records: RFIDLinkRecord[]): void {
  try {
    localStorage.setItem(rfidRegistryKey(entityCode), JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Link an RFID tag to an asset · persists to localStorage registry.
 */
export function linkRFIDTag(
  entityCode: string,
  asset_id: string,
  rfid_tag_id: string,
): RFIDLinkRecord {
  const unit = findPhysicalAssetUnit(entityCode, { asset_unit_record_id: asset_id });
  const registry = readRegistry(entityCode);
  // Replace any existing link for this tag
  const filtered = registry.filter((r) => r.rfid_tag_id !== rfid_tag_id);
  const record: RFIDLinkRecord = {
    rfid_tag_id,
    asset_unit_record_id: unit?.asset_unit_record_id ?? asset_id,
    linked_at: new Date().toISOString(),
  };
  filtered.push(record);
  writeRegistry(entityCode, filtered);
  return record;
}

/**
 * Unlink an RFID tag from any asset.
 */
export function unlinkRFIDTag(entityCode: string, rfid_tag_id: string): void {
  const registry = readRegistry(entityCode);
  const filtered = registry.filter((r) => r.rfid_tag_id !== rfid_tag_id);
  if (filtered.length !== registry.length) writeRegistry(entityCode, filtered);
}

/**
 * Detect custodian drift from RFID location signals over a window.
 */
export function detectCustodianDrift(
  entityCode: string,
  asset_id: string,
  location_signals: IoTSignal[],
): { is_drift: boolean; drift_distance_estimate_m?: number; recommendation: string } {
  const locs = location_signals.filter((s) => s.sensor_type === 'location' || s.sensor_type === 'rfid_proximity');
  if (locs.length < 2) {
    return { is_drift: false, recommendation: `Insufficient location samples for ${asset_id}.` };
  }
  const unique = new Set(locs.map((s) => s.unit));
  const is_drift = unique.size >= 3;
  const drift_distance_estimate_m = is_drift ? Math.round(unique.size * 25) : undefined;
  const recommendation = is_drift
    ? `Asset ${asset_id} seen at ${unique.size} distinct RFID readers · investigate custodian assignment.`
    : `Asset ${asset_id} location stable.`;
  return { is_drift, drift_distance_estimate_m, recommendation };
}

export function findAssetByRFIDTag(
  entityCode: string,
  rfid_tag_id: string,
): RFIDLinkRecord | null {
  return readRegistry(entityCode).find((r) => r.rfid_tag_id === rfid_tag_id) ?? null;
}

export function listRFIDTaggedAssets(entityCode: string): RFIDLinkRecord[] {
  return readRegistry(entityCode);
}
