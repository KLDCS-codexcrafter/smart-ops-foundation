import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordTankReading,
  readTankInventory,
  recordFlow,
  computeMassBalance,
} from '@/lib/tank-flow-inventory-engine';

describe('tank-flow-inventory-engine · Sprint 60 PROD-3.5 ST8', () => {
  const E = 'TEST';

  beforeEach(() => { localStorage.clear(); });

  it('recordTankReading stores reading with computed mass and fill_pct', () => {
    const r = recordTankReading(E, {
      tank_id: 'T-1', item_id: 'I-1', volume_litres: 500, density_kg_per_litre: 1.2,
      capacity_litres: 1000, temperature_c: 25, source: 'manual',
    });
    expect(r.current_mass_kg).toBe(600);
    expect(r.fill_pct).toBe(50);
  });

  it('readTankInventory returns most recent reading (fallback when no IoT)', () => {
    recordTankReading(E, {
      tank_id: 'T-2', item_id: 'I-1', volume_litres: 300, density_kg_per_litre: 1.0,
      capacity_litres: 1000, temperature_c: 25, source: 'manual',
    });
    const r = readTankInventory(E, 'T-2');
    expect(r).not.toBeNull();
    expect(r!.current_volume_litres).toBe(300);
  });

  it('recordFlow persists pipe transfer between tanks', () => {
    const f = recordFlow(E, {
      entity_id: E, from_tank_id: 'T-1', to_tank_id: 'T-2',
      volume_litres: 100, mass_kg: 120, flow_rate_lph: 60,
      start_time: '2026-01-01T10:00:00Z', end_time: '2026-01-01T11:40:00Z',
      source: 'manual',
    });
    expect(f.volume_litres).toBe(100);
    expect(f.mass_kg).toBe(120);
  });

  it('computeMassBalance returns balance struct', () => {
    const balance = computeMassBalance(E, 'batch-1', 2);
    expect(balance.batch_id).toBe('batch-1');
    expect(balance.tolerance_pct).toBe(2);
    expect(typeof balance.within_tolerance).toBe('boolean');
  });
});
