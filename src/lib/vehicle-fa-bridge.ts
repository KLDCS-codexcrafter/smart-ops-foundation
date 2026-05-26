/**
 * @file        src/lib/vehicle-fa-bridge.ts
 * @purpose     43rd SIBLING ⭐ · Vehicle ↔ Fixed Asset bridge with utilization + gate-pass cross-ref
 * @sprint      T-Phase-4.FAR-2 · MOAT-44 (vehicle component) · FAR-CAP-15
 * @disciplines FR-19 SIBLING · FR-26 entity-scoped storage · zero modification to gate-pass.ts or physical-asset-unit-bridge.ts
 * @[JWT]       localStorage-backed mock; replace with GET/POST /api/vehicle-fa/* at JWT cutover
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import type {
  VehicleFAAssetLink,
  VehicleUtilizationRecord,
  VehicleFAUtilizationSummary,
  VehicleUtilizationMetric,
} from '@/types/vehicle-fa';
import {
  VEHICLE_FA_LINK_KEY,
  VEHICLE_UTILIZATION_KEY,
} from '@/types/vehicle-fa';

// ── localStorage helpers ─────────────────────────────────────────────
const ls = <T>(k: string): T[] => {
  try {
    // [JWT] GET /api/vehicle-fa/storage/:key
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T[]) : [];
  } catch {
    return [];
  }
};

const ss = <T>(k: string, d: T[]): void => {
  // [JWT] POST /api/vehicle-fa/storage/:key
  try { localStorage.setItem(k, JSON.stringify(d)); } catch { /* ignore quota */ }
};

// ── 1 · linkVehicleToFA ──────────────────────────────────────────────
export function linkVehicleToFA(
  entityCode: string,
  vehicleId: string,
  assetUnitId: string,
  linkedBy: { id: string; name: string },
  metric: VehicleUtilizationMetric,
): VehicleFAAssetLink {
  const all = ls<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const link: VehicleFAAssetLink = {
    vehicle_id: vehicleId,
    asset_unit_record_id: assetUnitId,
    linked_at: new Date().toISOString(),
    linked_by: linkedBy,
    utilization_metric: metric,
    current_value: 0,
  };
  // Re-link replaces (idempotent semantics)
  const next = all.filter(l => l.vehicle_id !== vehicleId).concat(link);
  ss(VEHICLE_FA_LINK_KEY(entityCode), next);
  return link;
}

// ── 2 · unlinkVehicleFromFA ─────────────────────────────────────────
export function unlinkVehicleFromFA(entityCode: string, vehicleId: string): boolean {
  const all = ls<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const next = all.filter(l => l.vehicle_id !== vehicleId);
  if (next.length === all.length) return false;
  ss(VEHICLE_FA_LINK_KEY(entityCode), next);
  return true;
}

// ── 3 · recordVehicleUtilization ────────────────────────────────────
export function recordVehicleUtilization(
  entityCode: string,
  record: Omit<VehicleUtilizationRecord, 'id' | 'recorded_at'>,
): VehicleUtilizationRecord {
  const all = ls<VehicleUtilizationRecord>(VEHICLE_UTILIZATION_KEY(entityCode));
  const created: VehicleUtilizationRecord = {
    ...record,
    id: `vur-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recorded_at: new Date().toISOString(),
  };
  ss(VEHICLE_UTILIZATION_KEY(entityCode), [...all, created]);

  // Update current_value on the link (latest cumulative)
  const links = ls<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const nextLinks = links.map(l =>
    l.vehicle_id === record.vehicle_id
      ? { ...l, current_value: l.current_value + record.utilization_value }
      : l,
  );
  ss(VEHICLE_FA_LINK_KEY(entityCode), nextLinks);

  return created;
}

// ── 4 · computeVehicleAssetUtilization ──────────────────────────────
export function computeVehicleAssetUtilization(
  entityCode: string,
  vehicleId: string,
  periodStart: string,
  periodEnd: string,
): VehicleFAUtilizationSummary {
  const all = ls<VehicleUtilizationRecord>(VEHICLE_UTILIZATION_KEY(entityCode));
  const inRange = all.filter(
    r => r.vehicle_id === vehicleId && r.period_start >= periodStart && r.period_end <= periodEnd,
  );
  const total = inRange.reduce((acc, r) => acc + r.utilization_value, 0);
  const events = inRange.reduce((acc, r) => acc + r.gate_pass_event_count, 0);
  const last = inRange.length > 0
    ? inRange.map(r => r.recorded_at).sort().slice(-1)[0]
    : null;
  const links = ls<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const link = links.find(l => l.vehicle_id === vehicleId);
  return {
    vehicle_id: vehicleId,
    asset_unit_record_id: link?.asset_unit_record_id ?? '',
    total_utilization: total,
    per_period_average: inRange.length > 0 ? total / inRange.length : 0,
    gate_pass_events: events,
    last_recorded_at: last,
  };
}

// ── 5 · getVehicleRegistryWithFA ────────────────────────────────────
export interface VehicleRegistryRow {
  vehicleId: string;
  assetUnitRecord: AssetUnitRecord | null;
  lastUtilization: number;
  lastRecordedAt: string | null;
}

export function getVehicleRegistryWithFA(entityCode: string): VehicleRegistryRow[] {
  const links = ls<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const utilization = ls<VehicleUtilizationRecord>(VEHICLE_UTILIZATION_KEY(entityCode));
  const faUnits = ls<AssetUnitRecord>(faUnitsKey(entityCode));

  // Collect all vehicle IDs (linked + having utilization records)
  const vehicleIds = new Set<string>();
  links.forEach(l => vehicleIds.add(l.vehicle_id));
  utilization.forEach(u => vehicleIds.add(u.vehicle_id));

  return Array.from(vehicleIds).map(vehicleId => {
    const link = links.find(l => l.vehicle_id === vehicleId);
    const assetUnit = link
      ? faUnits.find(u => u.id === link.asset_unit_record_id) ?? null
      : null;
    const vehicleUtil = utilization
      .filter(u => u.vehicle_id === vehicleId)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
    const latest = vehicleUtil[vehicleUtil.length - 1];
    return {
      vehicleId,
      assetUnitRecord: assetUnit,
      lastUtilization: latest?.utilization_value ?? 0,
      lastRecordedAt: latest?.recorded_at ?? null,
    };
  });
}
