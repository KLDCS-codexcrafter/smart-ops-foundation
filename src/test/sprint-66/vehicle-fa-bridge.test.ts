import { describe, it, expect, beforeEach } from 'vitest';
import {
  linkVehicleToFA, unlinkVehicleFromFA, recordVehicleUtilization,
  computeVehicleAssetUtilization, getVehicleRegistryWithFA,
} from '@/lib/vehicle-fa-bridge';

const E = 'TEST_E';
const USER = { id: 'U1', name: 'Tester' };

beforeEach(() => { localStorage.clear(); });

describe('vehicle-fa-bridge · Sprint 66 FAR-2 · 43rd SIBLING', () => {
  it('linkVehicleToFA persists link', () => {
    linkVehicleToFA(E, 'V-001', 'FA-001', USER, 'mileage');
    const rows = getVehicleRegistryWithFA(E);
    expect(rows.find(r => r.vehicleId === 'V-001')?.assetUnitRecord).toBeDefined();
  });
  it('unlinkVehicleFromFA removes link', () => {
    linkVehicleToFA(E, 'V-002', 'FA-002', USER, 'mileage');
    expect(unlinkVehicleFromFA(E, 'V-002')).toBe(true);
  });
  it('unlinkVehicleFromFA returns false when none', () => {
    expect(unlinkVehicleFromFA(E, 'V-MISS')).toBe(false);
  });
  it('recordVehicleUtilization stores a record', () => {
    linkVehicleToFA(E, 'V-003', 'FA-003', USER, 'mileage');
    const rec = recordVehicleUtilization(E, {
      vehicle_id: 'V-003',
      asset_unit_record_id: 'FA-003',
      period_start: '2026-01-01',
      period_end: '2026-01-31',
      utilization_value: 100,
      gate_pass_event_count: 2,
    });
    expect(rec.id).toMatch(/^vur-/);
  });
  it('computeVehicleAssetUtilization aggregates totals', () => {
    linkVehicleToFA(E, 'V-004', 'FA-004', USER, 'mileage');
    recordVehicleUtilization(E, {
      vehicle_id: 'V-004', asset_unit_record_id: 'FA-004',
      period_start: '2026-01-01', period_end: '2026-01-31',
      utilization_value: 50, gate_pass_event_count: 1,
    });
    const summary = computeVehicleAssetUtilization(E, 'V-004', '2026-01-01', '2026-12-31');
    expect(summary.total_utilization).toBe(50);
    expect(summary.gate_pass_events).toBe(1);
  });
  it('getVehicleRegistryWithFA returns an array', () => {
    expect(Array.isArray(getVehicleRegistryWithFA(E))).toBe(true);
  });
});
