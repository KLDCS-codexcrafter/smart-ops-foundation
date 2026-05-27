/**
 * Sprint 68 FAR-4 · Block 16 · predictive-maintenance-fa-engine smoke tests
 */
import { describe, it, expect } from 'vitest';
import {
  forecastNextFailure,
  computePMSignal,
  listHighRiskAssets,
  type MaintenanceHistoryRecord,
} from '@/lib/predictive-maintenance-fa-engine';

const HISTORY: MaintenanceHistoryRecord[] = [
  { asset_unit_record_id: 'a1', event_date: '2025-01-15', event_type: 'breakdown', cost: 12000 },
  { asset_unit_record_id: 'a1', event_date: '2025-04-15', event_type: 'corrective', cost: 18000 },
  { asset_unit_record_id: 'a1', event_date: '2025-08-15', event_type: 'breakdown', cost: 22000 },
  { asset_unit_record_id: 'a1', event_date: '2025-12-15', event_type: 'corrective', cost: 30000 },
];

describe('predictive-maintenance-fa-engine · forecast + signal', () => {
  it('forecastNextFailure returns a date when 2+ failures present', () => {
    const r = forecastNextFailure(HISTORY);
    expect(r).not.toBeNull();
    expect(r?.next_predicted_failure_date).toBeDefined();
    expect(r?.based_on_history_count).toBeGreaterThanOrEqual(2);
  });

  it('forecastNextFailure returns null on insufficient history', () => {
    expect(forecastNextFailure([])).toBeNull();
    expect(forecastNextFailure([HISTORY[0]])).toBeNull();
  });

  it('computePMSignal returns risk_score in [0,1]', () => {
    const sig = computePMSignal('a1', HISTORY);
    expect(sig).toBeDefined();
    expect(sig?.risk_score).toBeGreaterThanOrEqual(0);
    expect(sig?.risk_score).toBeLessThanOrEqual(1);
  });

  it('listHighRiskAssets filters above threshold', () => {
    const list = listHighRiskAssets([{ asset_id: 'a1', history: HISTORY }], 0.0);
    expect(Array.isArray(list)).toBe(true);
  });
});
