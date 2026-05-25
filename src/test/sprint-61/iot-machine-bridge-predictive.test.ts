import { describe, it, expect, beforeEach } from 'vitest';
import {
  predictMachineFailure,
  computeTrendRegression,
  listMachineFailurePredictions,
  ingestTelemetry,
  telemetryKey,
} from '@/lib/iot-machine-bridge';
import { machinePredictionsKey } from '@/types/forecast';

describe('iot-machine-bridge · predictive layer · Sprint 61 PROD-4 PASS 2', () => {
  const ENT = 'TEST-PRED';
  const MACHINE_ID = 'MCH-001';

  beforeEach(() => {
    localStorage.removeItem(machinePredictionsKey(ENT));
    localStorage.removeItem(telemetryKey(ENT));
    localStorage.removeItem(telemetryKey('TEST-SPARSE'));
    localStorage.removeItem(machinePredictionsKey('TEST-SPARSE'));
    // Seed 10 telemetry records per parameter · rising temperature trend
    for (let i = 0; i < 10; i++) {
      const ts = new Date(Date.now() - (10 - i) * 3600 * 1000).toISOString();
      ingestTelemetry(ENT, MACHINE_ID, {
        timestamp: ts,
        metric: 'temperature',
        value: 60 + i * 2,
      });
      ingestTelemetry(ENT, MACHINE_ID, {
        timestamp: ts,
        metric: 'vibration',
        value: 0.5 + i * 0.05,
      });
    }
  });

  it('computeTrendRegression returns positive slope + high r_squared on rising temperature', () => {
    const result = computeTrendRegression(ENT, MACHINE_ID, 'temperature', 24);
    expect(result).not.toBeNull();
    expect(result!.slope).toBeGreaterThan(0);
    expect(result!.r_squared).toBeGreaterThan(0.5);
    expect(result!.sample_count).toBe(10);
  });

  it('computeTrendRegression returns null for non-existent parameter', () => {
    const result = computeTrendRegression(ENT, MACHINE_ID, 'nonexistent', 24);
    expect(result).toBeNull();
  });

  it('predictMachineFailure returns a valid prediction with confidence and horizon', () => {
    const prediction = predictMachineFailure(ENT, MACHINE_ID, 72);
    expect(prediction.id).toMatch(/^mfp-/);
    expect(prediction.machine_id).toBe(MACHINE_ID);
    expect(['low', 'medium', 'high']).toContain(prediction.confidence);
    expect(prediction.prediction_horizon_hours).toBe(72);
  });

  it('predictMachineFailure persists prediction · retrievable via listMachineFailurePredictions', () => {
    const prediction = predictMachineFailure(ENT, MACHINE_ID, 24);
    const all = listMachineFailurePredictions(ENT);
    expect(all.length).toBeGreaterThanOrEqual(1);
    expect(all.some((p) => p.id === prediction.id)).toBe(true);
  });

  it('listMachineFailurePredictions returns empty array when no predictions persisted', () => {
    localStorage.removeItem(machinePredictionsKey(ENT));
    expect(listMachineFailurePredictions(ENT)).toEqual([]);
  });

  it('predictMachineFailure with insufficient telemetry returns low-confidence prediction', () => {
    const prediction = predictMachineFailure('TEST-SPARSE', 'MCH-NEW', 24);
    expect(prediction).toBeDefined();
    expect(prediction.confidence).toBe('low');
    expect(prediction.contributing_parameters).toEqual([]);
  });
});
