/**
 * @file     iot-machine-bridge.ts
 * @sprint   T-Phase-3.PROD-3 · ST1 + ST4 · 36th SIBLING (Q-LOCK-3 Option A)
 * @purpose  Generic MQTT/REST gateway for machine telemetry · IoT capability #24.
 *           Feeds OEE engine + breakdown detection.
 *           Q-LOCK-1 Option A: generic pattern · NO vendor-specific adapters.
 *           Q-LOCK-4 Option A: ALERT-ONLY on breakdown · auto-reschedule deferred PROD-4.
 *           Q-LOCK-11 Option A: includes QR generation helper for customer tracking (full UI PROD-5).
 *           Q-LOCK-8 Option A: hybrid CSV + IoT energy meter (closes PROD-LEAK-14).
 *           FR-26 entity-scoped · FR-93 engine-side localStorage.
 */
import type { Machine, MachineStatus } from '@/types/machine';
import { machinesKey } from '@/types/machine';

const lsRead = <T>(key: string, def: T): T => {
  try {
    // [JWT] GET /api/iot/{key}
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
};
const lsWrite = <T>(key: string, value: T): void => {
  try {
    // [JWT] PUT /api/iot/{key}
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

/** Telemetry payload · accepts any MQTT/REST sensor format. */
export interface TelemetryPayload {
  timestamp: string;
  metric: string;
  value: number;
  unit?: string;
  threshold_breach?: 'low' | 'normal' | 'high' | 'critical';
}

/** Single telemetry record · stored per machine. */
export interface TelemetryRecord {
  id: string;
  entity_code: string;
  machine_id: string;
  source: 'mqtt' | 'rest' | 'manual' | 'simulated';
  payload: TelemetryPayload;
  ingested_at: string;
}

/** Breakdown event detected from telemetry pattern. */
export interface BreakdownEvent {
  id: string;
  machine_id: string;
  detected_at: string;
  severity: 'warning' | 'critical';
  metric: string;
  value: number;
  recommended_action: string;
  suggested_alternates: string[];
}

/** Machine health score 0-100 (100 = healthy · 0 = critical breakdown). */
export interface MachineHealth {
  machine_id: string;
  score: number;
  status: 'healthy' | 'degraded' | 'critical';
  last_telemetry_at: string | null;
  recent_breach_count: number;
}

export const telemetryKey = (entityCode: string): string =>
  `iot_telemetry_${entityCode}`;

export const breakdownEventsKey = (entityCode: string): string =>
  `iot_breakdown_events_${entityCode}`;

/**
 * Main ingestion entry · accepts payload from any MQTT/REST source.
 * Updates machine.iot_last_telemetry_at + detects breakdown patterns.
 */
export function ingestTelemetry(
  entityCode: string,
  machineId: string,
  payload: TelemetryPayload,
  source: 'mqtt' | 'rest' | 'manual' | 'simulated' = 'rest',
): TelemetryRecord {
  const record: TelemetryRecord = {
    id: `tel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_code: entityCode,
    machine_id: machineId,
    source,
    payload,
    ingested_at: new Date().toISOString(),
  };
  const all = lsRead<TelemetryRecord[]>(telemetryKey(entityCode), []);
  all.unshift(record);
  lsWrite(telemetryKey(entityCode), all.slice(0, 5000));

  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const machine = machines.find((m) => m.id === machineId);
  if (machine) {
    machine.iot_last_telemetry_at = record.ingested_at;
    lsWrite(machinesKey(entityCode), machines);
  }

  // Q-LOCK-4 Option A · detect + alert (no auto-reschedule)
  if (payload.threshold_breach === 'critical') {
    const events = detectBreakdownEvents(entityCode, machineId);
    if (events.length > 0) {
      triggerBreakdownAlert(entityCode, machineId, events[0]);
    }
  }

  return record;
}

/** Query telemetry for a machine within a time window. */
export function listTelemetryForMachine(
  entityCode: string,
  machineId: string,
  sinceISO?: string,
): TelemetryRecord[] {
  const all = lsRead<TelemetryRecord[]>(telemetryKey(entityCode), []);
  return all.filter((t) => {
    if (t.machine_id !== machineId) return false;
    if (sinceISO && t.ingested_at < sinceISO) return false;
    return true;
  });
}

/** Detect breakdown patterns from recent telemetry. */
export function detectBreakdownEvents(
  entityCode: string,
  machineId: string,
): BreakdownEvent[] {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const recent = listTelemetryForMachine(entityCode, machineId, since);
  const breaches = recent.filter((t) => t.payload.threshold_breach === 'critical');
  if (breaches.length === 0) return [];

  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const machine = machines.find((m) => m.id === machineId);
  if (!machine) return [];

  const alternates = machines
    .filter(
      (m) =>
        m.id !== machineId &&
        m.factory_id === machine.factory_id &&
        m.current_status === 'idle' &&
        m.capabilities.some((c) => machine.capabilities.includes(c)),
    )
    .map((m) => m.id)
    .slice(0, 3);

  const latest = breaches[0];
  const event: BreakdownEvent = {
    id: `bd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    machine_id: machineId,
    detected_at: latest.ingested_at,
    severity: 'critical',
    metric: latest.payload.metric,
    value: latest.payload.value,
    recommended_action: `Machine ${machine.code} (${machine.name}) showing critical ${latest.payload.metric} breach. Consider rerouting in-progress work.`,
    suggested_alternates: alternates,
  };

  return [event];
}

/**
 * Q-LOCK-4 Option A · ALERT-ONLY breakdown response.
 * Persists event for dashboard surfacing · does NOT auto-reschedule.
 */
export function triggerBreakdownAlert(
  entityCode: string,
  machineId: string,
  event: BreakdownEvent,
): void {
  const all = lsRead<BreakdownEvent[]>(breakdownEventsKey(entityCode), []);
  all.unshift(event);
  lsWrite(breakdownEventsKey(entityCode), all.slice(0, 200));

  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const machine = machines.find((m) => m.id === machineId);
  if (machine) {
    machine.current_status = 'breakdown' as MachineStatus;
    lsWrite(machinesKey(entityCode), machines);
  }
}

/** Compute health score 0-100 from recent telemetry (last 24h). */
export function getMachineHealth(
  entityCode: string,
  machineId: string,
): MachineHealth {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = listTelemetryForMachine(entityCode, machineId, since);
  if (recent.length === 0) {
    return {
      machine_id: machineId,
      score: 100,
      status: 'healthy',
      last_telemetry_at: null,
      recent_breach_count: 0,
    };
  }
  const breaches = recent.filter(
    (t) =>
      t.payload.threshold_breach === 'critical' ||
      t.payload.threshold_breach === 'high',
  );
  const breachRate = breaches.length / recent.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - breachRate * 100)));
  const status = score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical';
  return {
    machine_id: machineId,
    score,
    status,
    last_telemetry_at: recent[0].ingested_at,
    recent_breach_count: breaches.length,
  };
}

/** List all machines sorted by health (worst first). */
export function listMachinesByHealth(
  entityCode: string,
  factoryId?: string,
): MachineHealth[] {
  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const filtered = factoryId
    ? machines.filter((m) => m.factory_id === factoryId)
    : machines;
  return filtered
    .map((m) => getMachineHealth(entityCode, m.id))
    .sort((a, b) => a.score - b.score);
}

/**
 * Q-LOCK-11 Option A · Customer QR tracking foundation.
 * Generates QR-data URL string for a PO · embedded in quotation/SO.
 * Full customer-facing UI deferred to PROD-5.
 */
export function generateCustomerTrackingQR(
  entityCode: string,
  poId: string,
): { qr_data: string; tracking_url: string } {
  const origin =
    typeof window !== 'undefined' && window.location
      ? window.location.origin
      : 'https://operix.app';
  const tracking_url = `${origin}/track/${entityCode}/${poId}`;
  return { qr_data: tracking_url, tracking_url };
}

// ════════════════════════════════════════════════════════════════════
// Sprint T-Phase-3.PROD-3 · ST4 · Q-LOCK-8 Option A · Hybrid CSV + IoT energy meter
// Closes PROD-LEAK-14 (Tooling cost untracked · proxied via energy) + OOB-PROD-9
// ════════════════════════════════════════════════════════════════════

export interface EnergyMeterReading {
  id: string;
  entity_code: string;
  machine_id: string;
  reading_at: string;
  kwh_consumed: number;
  tariff_per_kwh: number;
  source: 'csv_upload' | 'iot_meter' | 'manual';
}

export const energyReadingsKey = (entityCode: string): string =>
  `energy_meter_readings_${entityCode}`;

export function ingestEnergyReading(
  entityCode: string,
  machineId: string,
  kwh: number,
  tariff: number,
  source: 'csv_upload' | 'iot_meter' | 'manual',
): EnergyMeterReading {
  const reading: EnergyMeterReading = {
    id: `eng-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_code: entityCode,
    machine_id: machineId,
    reading_at: new Date().toISOString(),
    kwh_consumed: kwh,
    tariff_per_kwh: tariff,
    source,
  };
  const all = lsRead<EnergyMeterReading[]>(energyReadingsKey(entityCode), []);
  all.unshift(reading);
  lsWrite(energyReadingsKey(entityCode), all.slice(0, 10000));
  return reading;
}

export interface POEnergyCost {
  po_id: string;
  total_kwh: number;
  total_cost: number;
  per_unit_cost: number;
  energy_intensity_rating: 'low' | 'medium' | 'high';
  reading_count: number;
}

/**
 * Compute energy cost for a PO based on associated machine readings.
 * Per-unit cost = total cost / planned_qty (paise/unit logic preserved in caller).
 * Intensity rating: low <₹100/unit · medium ₹100-500 · high >₹500.
 */
export function computeEnergyCostForPO(
  entityCode: string,
  poId: string,
  machineIds: string[],
  plannedQty: number,
  startDate: string,
  endDate: string,
): POEnergyCost {
  const allReadings = lsRead<EnergyMeterReading[]>(energyReadingsKey(entityCode), []);
  const relevant = allReadings.filter(
    (r) =>
      machineIds.includes(r.machine_id) &&
      r.reading_at >= startDate &&
      r.reading_at <= endDate,
  );

  const total_kwh = relevant.reduce((sum, r) => sum + r.kwh_consumed, 0);
  const total_cost = relevant.reduce(
    (sum, r) => sum + r.kwh_consumed * r.tariff_per_kwh,
    0,
  );
  const per_unit_cost = plannedQty > 0 ? total_cost / plannedQty : 0;
  const energy_intensity_rating: 'low' | 'medium' | 'high' =
    per_unit_cost < 100 ? 'low' : per_unit_cost <= 500 ? 'medium' : 'high';

  return {
    po_id: poId,
    total_kwh,
    total_cost,
    per_unit_cost,
    energy_intensity_rating,
    reading_count: relevant.length,
  };
}

/**
 * Bulk CSV import helper. CSV format: machine_code,reading_at,kwh,tariff
 */
export function importEnergyReadingsCSV(
  entityCode: string,
  csvContent: string,
): { imported: number; errors: string[] } {
  const lines = csvContent.split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const machines = lsRead<Machine[]>(machinesKey(entityCode), []);
  const errors: string[] = [];
  let imported = 0;

  if (lines.length === 0) return { imported, errors };
  const dataLines = lines[0].toLowerCase().includes('machine_code')
    ? lines.slice(1)
    : lines;

  for (const line of dataLines) {
    const parts = line.split(',').map((p) => p.trim());
    if (parts.length < 4) {
      errors.push(`Skipped (missing columns): ${line}`);
      continue;
    }
    const [code, , kwhStr, tariffStr] = parts;
    const machine = machines.find((m) => m.code === code);
    if (!machine) {
      errors.push(`Machine code not found: ${code}`);
      continue;
    }
    const kwh = parseFloat(kwhStr);
    const tariff = parseFloat(tariffStr);
    if (isNaN(kwh) || isNaN(tariff)) {
      errors.push(`Invalid numbers in line: ${line}`);
      continue;
    }
    ingestEnergyReading(entityCode, machine.id, kwh, tariff, 'csv_upload');
    imported++;
  }

  return { imported, errors };
}

// ============================================================================
// SPRINT 61 PROD-4 · PASS 2 · ST5 · PREDICTIVE LAYER · Q-LOCK-6 Option A · ADDITIVE
// Existing 15 exports remain 0-DIFF · this section ADDS:
//   - 1 type alias:    PredictionConfidence
//   - 2 interfaces:    MachineFailurePrediction · TrendRegressionResult
//   - 3 functions:     computeTrendRegression · predictMachineFailure · listMachineFailurePredictions
// ============================================================================

import { machinePredictionsKey as forecastMachinePredictionsKey } from '@/types/forecast';

export type PredictionConfidence = 'low' | 'medium' | 'high';

export interface MachineFailurePrediction {
  id: string;
  machine_id: string;
  entity_code: string;
  predicted_failure_at: string;
  prediction_horizon_hours: number;
  confidence: PredictionConfidence;
  contributing_parameters: {
    parameter: string;
    trend_slope: number;
    severity: 'normal' | 'warning' | 'critical';
  }[];
  generated_at: string;
  generated_by: string;
}

export interface TrendRegressionResult {
  parameter: string;
  machine_id: string;
  window_hours: number;
  slope: number;
  intercept: number;
  r_squared: number;
  current_value: number;
  projected_value_24h: number;
  projected_value_72h: number;
  sample_count: number;
}

/**
 * Compute trend regression on a machine's telemetry parameter (metric) over a window.
 * Uses simple linear regression (least squares) on the time series.
 * Returns NULL if insufficient data (< 5 samples).
 *
 * Adapted to actual TelemetryRecord shape (per-record metric/value · NOT a values map).
 */
export function computeTrendRegression(
  entityCode: string,
  machineId: string,
  parameter: string,
  windowHours: number,
): TrendRegressionResult | null {
  const telemetry = listTelemetryForMachine(entityCode, machineId);
  const cutoffMs = Date.now() - windowHours * 3600 * 1000;
  const filtered = telemetry.filter(
    (t) =>
      t.payload.metric === parameter &&
      new Date(t.payload.timestamp).getTime() >= cutoffMs,
  );

  if (filtered.length < 5) return null;

  const timestamps = filtered.map((t) => new Date(t.payload.timestamp).getTime());
  const windowStartMs = Math.min(...timestamps);

  const points: { x: number; y: number }[] = [];
  for (const t of filtered) {
    const val = t.payload.value;
    if (typeof val !== 'number' || Number.isNaN(val)) continue;
    const xHours = (new Date(t.payload.timestamp).getTime() - windowStartMs) / (3600 * 1000);
    points.push({ x: xHours, y: val });
  }

  if (points.length < 5) return null;

  const n = points.length;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  const ssRes = points.reduce((s, p) => {
    const pred = slope * p.x + intercept;
    return s + Math.pow(p.y - pred, 2);
  }, 0);
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  const lastX = Math.max(...points.map((p) => p.x));
  const currentValue = points[points.length - 1].y;
  const projected24h = slope * (lastX + 24) + intercept;
  const projected72h = slope * (lastX + 72) + intercept;

  return {
    parameter,
    machine_id: machineId,
    window_hours: windowHours,
    slope,
    intercept,
    r_squared: Math.round(rSquared * 1000) / 1000,
    current_value: currentValue,
    projected_value_24h: Math.round(projected24h * 100) / 100,
    projected_value_72h: Math.round(projected72h * 100) / 100,
    sample_count: n,
  };
}

/**
 * Predict machine failure within a horizon window.
 * Confidence = high if 2+ critical parameters · medium if 1 critical or 2+ warning · low otherwise.
 */
export function predictMachineFailure(
  entityCode: string,
  machineId: string,
  horizonHours: number,
): MachineFailurePrediction {
  const parametersToCheck = ['temperature', 'vibration', 'pressure', 'current_draw'];
  const windowHours = Math.max(72, horizonHours);

  const contributing: MachineFailurePrediction['contributing_parameters'] = [];
  for (const param of parametersToCheck) {
    const trend = computeTrendRegression(entityCode, machineId, param, windowHours);
    if (!trend) continue;
    const severity: 'normal' | 'warning' | 'critical' =
      Math.abs(trend.slope) > 0.5 && trend.r_squared > 0.6
        ? 'critical'
        : Math.abs(trend.slope) > 0.2 && trend.r_squared > 0.4
          ? 'warning'
          : 'normal';
    if (severity !== 'normal') {
      contributing.push({ parameter: param, trend_slope: trend.slope, severity });
    }
  }

  const criticalCount = contributing.filter((c) => c.severity === 'critical').length;
  const warningCount = contributing.filter((c) => c.severity === 'warning').length;

  let confidence: PredictionConfidence;
  let predictedFailureAt: string;
  if (criticalCount >= 2) {
    confidence = 'high';
    predictedFailureAt = new Date(Date.now() + horizonHours * 3600 * 1000 * 0.3).toISOString();
  } else if (criticalCount >= 1 || warningCount >= 2) {
    confidence = 'medium';
    predictedFailureAt = new Date(Date.now() + horizonHours * 3600 * 1000 * 0.6).toISOString();
  } else {
    confidence = 'low';
    predictedFailureAt = new Date(Date.now() + horizonHours * 3600 * 1000).toISOString();
  }

  const prediction: MachineFailurePrediction = {
    id: `mfp-${entityCode}-${machineId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    machine_id: machineId,
    entity_code: entityCode,
    predicted_failure_at: predictedFailureAt,
    prediction_horizon_hours: horizonHours,
    confidence,
    contributing_parameters: contributing,
    generated_at: new Date().toISOString(),
    generated_by: 'system',
  };

  try {
    // [JWT] POST /api/forecast/machine-predictions
    const key = forecastMachinePredictionsKey(entityCode);
    const existing: MachineFailurePrediction[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    existing.push(prediction);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {
    /* silent · localStorage quota or SSR safety */
  }

  return prediction;
}

/**
 * List all persisted machine failure predictions for an entity · most recent first.
 */
export function listMachineFailurePredictions(entityCode: string): MachineFailurePrediction[] {
  try {
    // [JWT] GET /api/forecast/machine-predictions
    const key = forecastMachinePredictionsKey(entityCode);
    const raw = localStorage.getItem(key);
    const all: MachineFailurePrediction[] = raw ? JSON.parse(raw) : [];
    return [...all].sort((a, b) => b.generated_at.localeCompare(a.generated_at));
  } catch {
    return [];
  }
}

