import { describe, it, expect, beforeEach } from 'vitest';
import {
  linkVehicleToFA, unlinkVehicleFromFA, recordVehicleUtilization,
  computeVehicleAssetUtilization, getVehicleRegistryWithFA,
} from '@/lib/vehicle-fa-bridge';

const E = 'TEST_E';

beforeEach(() => { localStorage.clear(); });

describe('vehicle-fa-bridge · Sprint 66 FAR-2 · 43rd SIBLING', () => {
  it('linkVehicleToFA persists link', () => {
    linkVehicleToFA(E, 'V-001', 'FA-001', { id: 'U1', name: 'A' }, 'mileage');
    const rows = getVehicleRegistryWithFA(E);
    expect(rows.find(r => r.vehicle_id === 'V-001')?.linked_asset_id).toBe('FA-001');
  });
  it('unlinkVehicleFromFA removes link', () => {
    linkVehicleToFA(E, 'V-002', 'FA-002', { id: 'U1', name: 'A' }, 'mileage');
    expect(unlinkVehicleFromFA(E, 'V-002')).toBe(true);
  });
  it('recordVehicleUtilization stores reading', () => {
    recordVehicleUtilization(E, {
      vehicle_id: 'V-003', metric: 'mileage', value: 100, recorded_at: new Date().toISOString(),
      recorded_by: { id: 'U', name: 'A' },
    });
    const u = computeVehicleAssetUtilization(E, 'V-003');
    expect(u.lastValue).toBe(100);
  });
  it('computeVehicleAssetUtilization returns zero for missing', () => {
    const u = computeVehicleAssetUtilization(E, 'V-MISS');
    expect(u.lastValue).toBe(0);
  });
  it('getVehicleRegistryWithFA returns array', () => {
    expect(Array.isArray(getVehicleRegistryWithFA(E))).toBe(true);
  });
  it('linkVehicleToFA is idempotent on re-link', () => {
    linkVehicleToFA(E, 'V-004', 'FA-A', { id: 'U', name: 'A' }, 'mileage');
    linkVehicleToFA(E, 'V-004', 'FA-B', { id: 'U', name: 'A' }, 'mileage');
    const rows = getVehicleRegistryWithFA(E);
    expect(rows.find(r => r.vehicle_id === 'V-004')?.linked_asset_id).toBe('FA-B');
  });
});
