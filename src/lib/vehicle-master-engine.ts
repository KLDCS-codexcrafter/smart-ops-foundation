/**
 * @file        vehicle-master-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block C · D-307
 * @purpose     Vehicle Master CRUD with vehicle_no uniqueness validation.
 *              [JWT] erp_vehicle_master_<entityCode>
 */

import type { VehicleMaster } from '@/types/vehicle-master';
import { vehicleMasterKey } from '@/types/vehicle-master';

export type CreateVehicleInput = Omit<
  VehicleMaster,
  'id' | 'entity_id' | 'status' | 'created_at' | 'created_by_user_id' | 'updated_at'
>;

export function createVehicle(
  input: CreateVehicleInput,
  entityCode: string,
  byUserId: string,
): VehicleMaster {
  const list = read(entityCode);
  const normNo = input.vehicle_no.trim().toUpperCase();
  if (list.some((v) => v.vehicle_no.toUpperCase() === normNo)) {
    throw new Error(`Vehicle ${normNo} already exists`);
  }
  const now = new Date().toISOString();
  const v: VehicleMaster = {
    ...input,
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `vm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    entity_id: entityCode,
    vehicle_no: normNo,
    status: 'active',
    created_at: now,
    created_by_user_id: byUserId,
    updated_at: now,
  };
  list.push(v);
  write(entityCode, list);
  return v;
}

export function updateVehicle(
  id: string,
  partial: Partial<VehicleMaster>,
  entityCode: string,
): VehicleMaster | null {
  const list = read(entityCode);
  const idx = list.findIndex((v) => v.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...partial, updated_at: new Date().toISOString() };
  write(entityCode, list);
  return list[idx];
}

export function listVehicles(entityCode: string): VehicleMaster[] {
  return read(entityCode).slice().sort((a, b) => a.vehicle_no.localeCompare(b.vehicle_no));
}

export function findByVehicleNo(vehicleNo: string, entityCode: string): VehicleMaster | null {
  const norm = vehicleNo.trim().toUpperCase();
  return read(entityCode).find((v) => v.vehicle_no.toUpperCase() === norm) ?? null;
}

export function getVehicle(id: string, entityCode: string): VehicleMaster | null {
  return read(entityCode).find((v) => v.id === id) ?? null;
}

function read(e: string): VehicleMaster[] {
  // [JWT] GET /api/vehicle-master?entityCode=...
  try {
    const raw = localStorage.getItem(vehicleMasterKey(e));
    return raw ? (JSON.parse(raw) as VehicleMaster[]) : [];
  } catch { return []; }
}

function write(e: string, list: VehicleMaster[]): void {
  // [JWT] POST /api/vehicle-master
  localStorage.setItem(vehicleMasterKey(e), JSON.stringify(list));
}
