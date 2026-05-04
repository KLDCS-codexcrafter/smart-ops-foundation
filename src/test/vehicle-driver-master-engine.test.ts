/**
 * vehicle-driver-master-engine.test.ts — Sprint 4-pre-2 · Block C
 * 2 tests covering uniqueness validation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createVehicle, findByVehicleNo, listVehicles } from '@/lib/vehicle-master-engine';
import { createDriver, findByLicenseNo } from '@/lib/driver-master-engine';

const ENTITY = 'VMTEST';

beforeEach(() => {
  localStorage.clear();
});

describe('vehicle-master-engine', () => {
  it('createVehicle stores vehicle with uppercased vehicle_no · duplicate throws', () => {
    const v = createVehicle({
      vehicle_no: 'ka-01-ab-1234',
      vehicle_type: 'truck', make: 'Tata', model: '407', capacity_kg: 3000, fuel_type: 'diesel',
    }, ENTITY, 'u');
    expect(v.vehicle_no).toBe('KA-01-AB-1234');
    expect(v.status).toBe('active');
    expect(findByVehicleNo('KA-01-AB-1234', ENTITY)?.id).toBe(v.id);
    expect(findByVehicleNo('ka-01-ab-1234', ENTITY)?.id).toBe(v.id);
    expect(listVehicles(ENTITY).length).toBe(1);

    expect(() => createVehicle({
      vehicle_no: 'KA-01-AB-1234',
      vehicle_type: 'truck', make: 'X', model: 'Y', capacity_kg: 1000, fuel_type: 'diesel',
    }, ENTITY, 'u')).toThrow(/already exists/);
  });
});

describe('driver-master-engine', () => {
  it('createDriver stores driver · findByLicenseNo returns match · duplicate license throws', () => {
    const d = createDriver({
      driver_name: 'Rajesh Kumar', driver_phone: '+91-9876543210',
      driver_license_no: 'ka01abc001',
      license_class: 'HMV',
    }, ENTITY, 'u');
    expect(d.driver_license_no).toBe('KA01ABC001');
    expect(findByLicenseNo('KA01ABC001', ENTITY)?.id).toBe(d.id);

    expect(() => createDriver({
      driver_name: 'Other',
      driver_phone: '+91-9876543211',
      driver_license_no: 'KA01ABC001',
    }, ENTITY, 'u')).toThrow(/already exists/);
  });
});
