/**
 * @file     tank-flow-inventory-engine.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS2 · ST8 · 36th SIBLING ⭐
 * @purpose  Volumetric + mass + density inventory engine · evaporation accounting.
 *           Q-LOCK-7 Option A · Hybrid CSV + IoT (IoT preferred when available).
 *           Moat 19 · Tank/Flow Volumetric Inventory.
 *           FR-19 SIBLING · FR-26 entity-scoped.
 * @[JWT]    Phase 2: POST /api/tank-flow/reading · POST /api/tank-flow/evaporation/reconcile
 */
import type {
  TankInventory,
  TankFlow,
  EvaporationRecord,
  MassBalance,
} from '@/types/tank-flow';
import {
  tankInventoryKey,
  tankFlowsKey,
  evaporationRecordsKey,
} from '@/types/tank-flow';
import { listTelemetryForMachine } from '@/lib/iot-machine-bridge';

const lsRead = <T>(key: string, def: T): T => {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : def; } catch { return def; }
};
const lsWrite = <T>(key: string, value: T): void => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
};

export interface RecordTankReadingInput {
  tank_id: string;
  item_id: string;
  volume_litres: number;
  density_kg_per_litre: number;
  capacity_litres: number;
  temperature_c: number;
  source: 'manual' | 'iot' | 'csv_upload';
  meter_id?: string;
}

export function recordTankReading(
  entityCode: string,
  input: RecordTankReadingInput,
): TankInventory {
  const reading: TankInventory = {
    tank_id: input.tank_id,
    item_id: input.item_id,
    current_volume_litres: input.volume_litres,
    current_mass_kg: input.volume_litres * input.density_kg_per_litre,
    current_density_kg_per_litre: input.density_kg_per_litre,
    capacity_litres: input.capacity_litres,
    fill_pct: input.capacity_litres > 0 ? (input.volume_litres / input.capacity_litres) * 100 : 0,
    temperature_c: input.temperature_c,
    reading_timestamp: new Date().toISOString(),
    source: input.source,
    meter_id: input.meter_id,
  };
  const all = lsRead<TankInventory[]>(tankInventoryKey(entityCode), []);
  all.unshift(reading);
  lsWrite(tankInventoryKey(entityCode), all.slice(0, 10000));
  return reading;
}

/**
 * Read latest known tank inventory.
 * Q-LOCK-7 Option A · IoT preferred when telemetry available.
 */
export function readTankInventory(
  entityCode: string,
  tankId: string,
  iotMachineId?: string,
): TankInventory | null {
  if (iotMachineId) {
    const telemetry = listTelemetryForMachine(entityCode, iotMachineId);
    const volReading = telemetry.find(t => t.payload.metric === 'tank_volume_litres');
    const tempReading = telemetry.find(t => t.payload.metric === 'temperature');
    if (volReading) {
      const all = lsRead<TankInventory[]>(tankInventoryKey(entityCode), []);
      const lastManual = all.find(r => r.tank_id === tankId);
      const density = lastManual?.current_density_kg_per_litre ?? 1.0;
      return {
        tank_id: tankId,
        item_id: lastManual?.item_id ?? 'unknown',
        current_volume_litres: volReading.payload.value,
        current_mass_kg: volReading.payload.value * density,
        current_density_kg_per_litre: density,
        capacity_litres: lastManual?.capacity_litres ?? 0,
        fill_pct: lastManual?.capacity_litres
          ? (volReading.payload.value / lastManual.capacity_litres) * 100
          : 0,
        temperature_c: tempReading?.payload.value ?? 25,
        reading_timestamp: volReading.ingested_at,
        source: 'iot',
      };
    }
  }
  const all = lsRead<TankInventory[]>(tankInventoryKey(entityCode), []);
  return all.find(r => r.tank_id === tankId) ?? null;
}

export interface RecordFlowInput {
  entity_id: string;
  from_tank_id: string | null;
  to_tank_id: string | null;
  volume_litres: number;
  mass_kg: number;
  flow_rate_lph: number;
  start_time: string;
  end_time: string;
  batch_id?: string;
  source: 'manual' | 'iot';
  notes?: string;
}

export function recordFlow(entityCode: string, input: RecordFlowInput): TankFlow {
  const flow: TankFlow = {
    id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: input.entity_id,
    from_tank_id: input.from_tank_id,
    to_tank_id: input.to_tank_id,
    volume_litres: input.volume_litres,
    mass_kg: input.mass_kg,
    flow_rate_lph: input.flow_rate_lph,
    start_time: input.start_time,
    end_time: input.end_time,
    batch_id: input.batch_id,
    source: input.source,
    notes: input.notes ?? '',
  };
  const all = lsRead<TankFlow[]>(tankFlowsKey(entityCode), []);
  all.unshift(flow);
  lsWrite(tankFlowsKey(entityCode), all.slice(0, 5000));
  return flow;
}

export function listFlowsForTank(entityCode: string, tankId: string): TankFlow[] {
  return lsRead<TankFlow[]>(tankFlowsKey(entityCode), [])
    .filter(f => f.from_tank_id === tankId || f.to_tank_id === tankId);
}

export function listFlowsForBatch(entityCode: string, batchId: string): TankFlow[] {
  return lsRead<TankFlow[]>(tankFlowsKey(entityCode), [])
    .filter(f => f.batch_id === batchId);
}

export interface ReconcileEvaporationInput {
  tank_id: string;
  period_start: string;
  period_end: string;
  expected_loss_pct: number;
}

export function reconcileEvaporation(
  entityCode: string,
  input: ReconcileEvaporationInput,
): EvaporationRecord {
  const allReadings = lsRead<TankInventory[]>(tankInventoryKey(entityCode), []);
  const tankReadings = allReadings.filter(r =>
    r.tank_id === input.tank_id &&
    r.reading_timestamp >= input.period_start &&
    r.reading_timestamp <= input.period_end,
  );
  if (tankReadings.length < 2) {
    throw new Error(`Need at least 2 readings to reconcile evaporation. Found: ${tankReadings.length}`);
  }
  const start = tankReadings[tankReadings.length - 1];
  const end = tankReadings[0];
  const allFlows = lsRead<TankFlow[]>(tankFlowsKey(entityCode), []);
  const totalInflow = allFlows
    .filter(f => f.to_tank_id === input.tank_id && f.end_time >= input.period_start && f.end_time <= input.period_end)
    .reduce((s, f) => s + f.volume_litres, 0);
  const totalOutflow = allFlows
    .filter(f => f.from_tank_id === input.tank_id && f.end_time >= input.period_start && f.end_time <= input.period_end)
    .reduce((s, f) => s + f.volume_litres, 0);

  const expected_end = start.current_volume_litres + totalInflow - totalOutflow;
  const actual_loss_litres = Math.max(0, expected_end - end.current_volume_litres);
  const expected_loss_litres = (input.expected_loss_pct / 100) * start.current_volume_litres;
  const variance_litres = actual_loss_litres - expected_loss_litres;

  const accounting_treatment: 'standard_loss' | 'abnormal_loss' =
    Math.abs(variance_litres) <= expected_loss_litres * 0.2
      ? 'standard_loss'
      : 'abnormal_loss';

  const record: EvaporationRecord = {
    id: `evap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tank_id: input.tank_id,
    period_start: input.period_start,
    period_end: input.period_end,
    expected_loss_pct: input.expected_loss_pct,
    actual_loss_litres,
    variance_litres,
    accounting_treatment,
    recorded_at: new Date().toISOString(),
  };
  const all = lsRead<EvaporationRecord[]>(evaporationRecordsKey(entityCode), []);
  all.unshift(record);
  lsWrite(evaporationRecordsKey(entityCode), all.slice(0, 1000));
  return record;
}

export function computeMassBalance(
  entityCode: string,
  batchId: string,
  tolerancePct: number = 2,
): MassBalance {
  const flows = listFlowsForBatch(entityCode, batchId);
  const total_inflow_kg = flows
    .filter(f => f.to_tank_id !== null)
    .reduce((s, f) => s + f.mass_kg, 0);
  const total_outflow_kg = flows
    .filter(f => f.from_tank_id !== null && f.to_tank_id === null)
    .reduce((s, f) => s + f.mass_kg, 0);
  const retained_kg = total_inflow_kg - total_outflow_kg;
  const loss_kg = Math.max(0, retained_kg);
  const loss_pct = total_inflow_kg > 0 ? (loss_kg / total_inflow_kg) * 100 : 0;
  return {
    batch_id: batchId,
    total_inflow_kg,
    total_outflow_kg,
    retained_kg,
    loss_kg,
    loss_pct,
    within_tolerance: loss_pct <= tolerancePct,
    tolerance_pct: tolerancePct,
    computed_at: new Date().toISOString(),
  };
}

export function listTankInventory(entityCode: string): TankInventory[] {
  return lsRead<TankInventory[]>(tankInventoryKey(entityCode), []);
}

export function listEvaporationRecords(entityCode: string): EvaporationRecord[] {
  return lsRead<EvaporationRecord[]>(evaporationRecordsKey(entityCode), []);
}
