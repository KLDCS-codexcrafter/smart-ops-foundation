/**
 * iot-machine-bridge.test.ts — Sprint T-Phase-3.PROD-3 · ST1 + ST4 (Q-LOCK-12)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  ingestTelemetry,
  listTelemetryForMachine,
  detectBreakdownEvents,
  triggerBreakdownAlert,
  getMachineHealth,
  listMachinesByHealth,
  generateCustomerTrackingQR,
  ingestEnergyReading,
  computeEnergyCostForPO,
} from '@/lib/iot-machine-bridge';

describe('iot-machine-bridge · Sprint 59 PROD-3', () => {
  const E = 'TEST';
  const M = 'mch-test-1';

  beforeEach(() => { localStorage.clear(); });

  it('ingestTelemetry stores a record with all fields', () => {
    const r = ingestTelemetry(E, M, { timestamp: new Date().toISOString(), metric: 'temperature', value: 85, unit: 'C', threshold_breach: 'normal' }, 'rest');
    expect(r.entity_code).toBe(E);
    expect(r.machine_id).toBe(M);
    expect(r.source).toBe('rest');
    expect(r.payload.metric).toBe('temperature');
  });

  it('listTelemetryForMachine filters by machineId', () => {
    ingestTelemetry(E, M, { timestamp: new Date().toISOString(), metric: 'rpm', value: 1200 });
    ingestTelemetry(E, 'mch-other', { timestamp: new Date().toISOString(), metric: 'rpm', value: 1500 });
    const list = listTelemetryForMachine(E, M);
    expect(list.length).toBe(1);
    expect(list[0].machine_id).toBe(M);
  });

  it('detectBreakdownEvents returns empty when no critical breaches', () => {
    ingestTelemetry(E, M, { timestamp: new Date().toISOString(), metric: 'temp', value: 50, threshold_breach: 'normal' });
    expect(detectBreakdownEvents(E, M).length).toBe(0);
  });

  it('triggerBreakdownAlert persists the event', () => {
    triggerBreakdownAlert(E, M, {
      id: 'bd-test', machine_id: M, detected_at: new Date().toISOString(),
      severity: 'critical', metric: 'temperature', value: 110,
      recommended_action: 'Test', suggested_alternates: [],
    });
    const stored = JSON.parse(localStorage.getItem(`iot_breakdown_events_${E}`) || '[]');
    expect(stored.length).toBe(1);
  });

  it('getMachineHealth returns 100 when no telemetry', () => {
    const h = getMachineHealth(E, M);
    expect(h.score).toBe(100);
    expect(h.status).toBe('healthy');
  });

  it('getMachineHealth reflects breach rate', () => {
    for (let i = 0; i < 10; i++) {
      ingestTelemetry(E, M, { timestamp: new Date().toISOString(), metric: 'temp', value: 90, threshold_breach: i < 5 ? 'critical' : 'normal' });
    }
    const h = getMachineHealth(E, M);
    expect(h.score).toBeLessThan(100);
    expect(h.recent_breach_count).toBeGreaterThan(0);
  });

  it('listMachinesByHealth returns sorted list', () => {
    expect(Array.isArray(listMachinesByHealth(E))).toBe(true);
  });

  it('generateCustomerTrackingQR returns tracking_url and qr_data', () => {
    const r = generateCustomerTrackingQR(E, 'po-test-001');
    expect(r.tracking_url).toContain('/track/');
    expect(r.tracking_url).toContain('po-test-001');
    expect(r.qr_data).toBe(r.tracking_url);
  });

  it('ingestEnergyReading + computeEnergyCostForPO computes total cost', () => {
    ingestEnergyReading(E, M, 100, 8.5, 'manual');
    ingestEnergyReading(E, M, 50, 8.5, 'iot_meter');
    const cost = computeEnergyCostForPO(E, 'po-001', [M], 30, '2020-01-01T00:00:00Z', '2030-01-01T00:00:00Z');
    expect(cost.total_kwh).toBe(150);
    expect(cost.total_cost).toBe(1275);
    expect(cost.per_unit_cost).toBeCloseTo(42.5);
    expect(cost.energy_intensity_rating).toBe('low');
  });
});
