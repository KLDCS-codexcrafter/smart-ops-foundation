/**
 * @file        src/lib/vehicle-fa-bridge.ts
 * @purpose     43rd SIBLING ⭐ · Vehicle ↔ Fixed Asset bridge with utilization tracking
 * @sprint      T-Phase-4.FAR-2 · Block 1 · Q-LOCK-5 A · MOAT-44 · FAR-CAP-15
 * @[JWT]       POST /api/fixed-assets/vehicle-link · POST /api/vehicles/utilization
 * @notes       FR-26 entity-scoped · reads gate-pass + vehicle-master read-only (no mutation)
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import { faUnitsKey } from '@/types/fixed-asset';
import type { VehicleMaster } from '@/types/vehicle-master';
import { vehicleMasterKey } from '@/types/vehicle-master';
import type {
  VehicleFAAssetLink, VehicleUtilizationRecord,
  VehicleFAUtilizationSummary, VehicleUtilizationMetric,
} from '@/types/vehicle-fa';
import { VEHICLE_FA_LINK_KEY, VEHICLE_UTILIZATION_KEY } from '@/types/vehicle-fa';

const lsRead = <T,>(key: string): T[] => {
  try {
    // [JWT] GET /api/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
};

const lsWrite = <T,>(key: string, data: T[]): void => {
  // [JWT] PUT /api/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
};

/** Link a vehicle to a fixed-asset unit record · idempotent (re-link replaces). */
export function linkVehicleToFA(
  entityCode: string,
  vehicleId: string,
  assetUnitId: string,
  linkedBy: { id: string; name: string },
  metric: VehicleUtilizationMetric,
): VehicleFAAssetLink {
  const key = VEHICLE_FA_LINK_KEY(entityCode);
  const existing = lsRead<VehicleFAAssetLink>(key).filter(l => l.vehicle_id !== vehicleId);
  const link: VehicleFAAssetLink = {
    vehicle_id: vehicleId,
    asset_unit_record_id: assetUnitId,
    linked_at: new Date().toISOString(),
    linked_by: linkedBy,
    utilization_metric: metric,
    current_value: 0,
  };
  lsWrite(key, [...existing, link]);
  return link;
}

/** Unlink a vehicle from FA · returns true if removed. */
export function unlinkVehicleFromFA(entityCode: string, vehicleId: string): boolean {
  const key = VEHICLE_FA_LINK_KEY(entityCode);
  const all = lsRead<VehicleFAAssetLink>(key);
  const remaining = all.filter(l => l.vehicle_id !== vehicleId);
  if (remaining.length === all.length) return false;
  lsWrite(key, remaining);
  return true;
}

/** Record a utilization observation for a linked vehicle. */
export function recordVehicleUtilization(
  entityCode: string,
  record: Omit<VehicleUtilizationRecord, 'id' | 'recorded_at'>,
): VehicleUtilizationRecord {
  const key = VEHICLE_UTILIZATION_KEY(entityCode);
  const all = lsRead<VehicleUtilizationRecord>(key);
  const created: VehicleUtilizationRecord = {
    ...record,
    id: `vu-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recorded_at: new Date().toISOString(),
  };
  lsWrite(key, [...all, created]);
  return created;
}

/** Aggregate utilization for a vehicle across a window. */
export function computeVehicleAssetUtilization(
  entityCode: string,
  vehicleId: string,
  periodStart: string,
  periodEnd: string,
): VehicleFAUtilizationSummary {
  const records = lsRead<VehicleUtilizationRecord>(VEHICLE_UTILIZATION_KEY(entityCode))
    .filter(r => r.vehicle_id === vehicleId
      && r.period_start >= periodStart && r.period_end <= periodEnd);
  const link = lsRead<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode))
    .find(l => l.vehicle_id === vehicleId);
  const total = records.reduce((s, r) => s + r.utilization_value, 0);
  const gatePass = records.reduce((s, r) => s + r.gate_pass_event_count, 0);
  const avg = records.length > 0 ? total / records.length : 0;
  const last = records.length > 0
    ? records.reduce((latest, r) => r.recorded_at > latest ? r.recorded_at : latest, records[0].recorded_at)
    : null;
  return {
    vehicle_id: vehicleId,
    asset_unit_record_id: link?.asset_unit_record_id ?? '',
    total_utilization: total,
    per_period_average: avg,
    gate_pass_events: gatePass,
    last_recorded_at: last,
  };
}

/** Registry view · joins vehicles with their linked FA record (null if unlinked). */
export function getVehicleRegistryWithFA(entityCode: string): Array<{
  vehicleId: string;
  vehicleNo: string;
  assetUnitRecord: AssetUnitRecord | null;
  lastUtilization: number;
  lastRecordedAt: string | null;
}> {
  const vehicles = lsRead<VehicleMaster>(vehicleMasterKey(entityCode))
    .filter(v => v.entity_id === entityCode);
  const links = lsRead<VehicleFAAssetLink>(VEHICLE_FA_LINK_KEY(entityCode));
  const faUnits = lsRead<AssetUnitRecord>(faUnitsKey(entityCode));
  const utilization = lsRead<VehicleUtilizationRecord>(VEHICLE_UTILIZATION_KEY(entityCode));
  return vehicles.map(v => {
    const link = links.find(l => l.vehicle_id === v.id);
    const asset = link ? faUnits.find(u => u.id === link.asset_unit_record_id) ?? null : null;
    const vehicleUtil = utilization.filter(u => u.vehicle_id === v.id);
    const last = vehicleUtil.length > 0
      ? vehicleUtil.reduce((acc, r) => r.recorded_at > acc.recorded_at ? r : acc, vehicleUtil[0])
      : null;
    return {
      vehicleId: v.id,
      vehicleNo: v.vehicle_no,
      assetUnitRecord: asset,
      lastUtilization: last?.utilization_value ?? 0,
      lastRecordedAt: last?.recorded_at ?? null,
    };
  });
}
