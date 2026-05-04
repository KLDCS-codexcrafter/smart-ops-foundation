/**
 * @file        driver-master-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card4-4-pre-2 · Block C · D-307
 * @purpose     Driver Master CRUD with license_no uniqueness validation.
 *              [JWT] erp_driver_master_<entityCode>
 */

import type { DriverMaster } from '@/types/driver-master';
import { driverMasterKey } from '@/types/driver-master';

export type CreateDriverInput = Omit<
  DriverMaster,
  'id' | 'entity_id' | 'status' | 'created_at' | 'created_by_user_id' | 'updated_at'
>;

export function createDriver(
  input: CreateDriverInput,
  entityCode: string,
  byUserId: string,
): DriverMaster {
  const list = read(entityCode);
  const normLic = input.driver_license_no.trim().toUpperCase();
  if (list.some((d) => d.driver_license_no.toUpperCase() === normLic)) {
    throw new Error(`License ${normLic} already exists`);
  }
  const now = new Date().toISOString();
  const d: DriverMaster = {
    ...input,
    id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `dm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    entity_id: entityCode,
    driver_license_no: normLic,
    status: 'active',
    created_at: now,
    created_by_user_id: byUserId,
    updated_at: now,
  };
  list.push(d);
  write(entityCode, list);
  return d;
}

export function updateDriver(
  id: string,
  partial: Partial<DriverMaster>,
  entityCode: string,
): DriverMaster | null {
  const list = read(entityCode);
  const idx = list.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...partial, updated_at: new Date().toISOString() };
  write(entityCode, list);
  return list[idx];
}

export function listDrivers(entityCode: string): DriverMaster[] {
  return read(entityCode).slice().sort((a, b) => a.driver_name.localeCompare(b.driver_name));
}

export function findByLicenseNo(licenseNo: string, entityCode: string): DriverMaster | null {
  const norm = licenseNo.trim().toUpperCase();
  return read(entityCode).find((d) => d.driver_license_no.toUpperCase() === norm) ?? null;
}

export function getDriver(id: string, entityCode: string): DriverMaster | null {
  return read(entityCode).find((d) => d.id === id) ?? null;
}

function read(e: string): DriverMaster[] {
  // [JWT] GET /api/driver-master?entityCode=...
  try {
    const raw = localStorage.getItem(driverMasterKey(e));
    return raw ? (JSON.parse(raw) as DriverMaster[]) : [];
  } catch { return []; }
}

function write(e: string, list: DriverMaster[]): void {
  // [JWT] POST /api/driver-master
  localStorage.setItem(driverMasterKey(e), JSON.stringify(list));
}
