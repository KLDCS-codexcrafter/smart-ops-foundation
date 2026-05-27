/**
 * @file        src/lib/predictive-maintenance-fa-engine.ts
 * @sibling     NEW @ Sprint 68 FAR-4 · 51st SIBLING
 * @realizes    MOAT-51 · Predictive Maintenance ML Signal
 * @approach    Q-LOCK-7 A · Lookback heuristic + statistical signal ·
 *              reads maintenance_history from AssetUnitRecord + bridges ·
 *              no model training · explainable to auditors
 * @reads-from  maintainpro-service-history-bridge.ts (PRESERVE LIST · do NOT modify)
 * [JWT] Phase 5: POST /api/ml/pm/forecast (server-side gradient model upgrade path)
 */
import type { AssetUnitRecord, PredictiveMaintenanceSignal } from '@/types/fixed-asset';

export interface MaintenanceHistoryRecord {
  asset_unit_record_id: string;
  event_date: string; // ISO 8601
  event_type: 'preventive' | 'corrective' | 'breakdown' | 'inspection';
  cost?: number;
  technician?: string;
  notes?: string;
}

export interface ForecastResult {
  next_predicted_failure_date: string;
  confidence: number;
  days_until_failure: number;
  based_on_history_count: number;
}

const DAY_MS = 86_400_000;

function toDays(ms: number): number {
  return Math.round(ms / DAY_MS);
}

function isFailureEvent(e: MaintenanceHistoryRecord): boolean {
  return e.event_type === 'corrective' || e.event_type === 'breakdown';
}

function weightedAvgInterval(intervals: number[]): number {
  // Recent intervals weighted higher · linear ramp
  if (intervals.length === 0) return 0;
  let weightSum = 0;
  let valueSum = 0;
  intervals.forEach((v, i) => {
    const w = i + 1; // older → smaller weight
    weightSum += w;
    valueSum += w * v;
  });
  return valueSum / weightSum;
}

function computeCostTrend(failures: MaintenanceHistoryRecord[]): number {
  if (failures.length < 2) return 0;
  const costs = failures.map(f => Number.isFinite(f.cost ?? 0) ? (f.cost ?? 0) : 0);
  const half = Math.floor(costs.length / 2);
  if (half === 0) return 0;
  const earlyAvg = costs.slice(0, half).reduce((s, c) => s + c, 0) / half;
  const recentAvg = costs.slice(half).reduce((s, c) => s + c, 0) / (costs.length - half);
  if (earlyAvg === 0) return recentAvg > 0 ? 1 : 0;
  return (recentAvg - earlyAvg) / earlyAvg;
}

/**
 * Forecast next predicted failure date from history via lookback heuristic.
 */
export function forecastNextFailure(
  history: MaintenanceHistoryRecord[],
): ForecastResult | null {
  const failures = history
    .filter(isFailureEvent)
    .map(e => ({ ...e, _ts: Date.parse(e.event_date) }))
    .filter(e => !Number.isNaN(e._ts))
    .sort((a, b) => a._ts - b._ts);
  if (failures.length < 2) return null;

  const intervals: number[] = [];
  for (let i = 1; i < failures.length; i++) {
    intervals.push(toDays(failures[i]._ts - failures[i - 1]._ts));
  }
  const avg = weightedAvgInterval(intervals);
  if (avg <= 0) return null;

  const last = failures[failures.length - 1]._ts;
  const nextMs = last + avg * DAY_MS;
  const days_until_failure = Math.max(0, toDays(nextMs - Date.now()));
  // Confidence: more history → higher · capped at 0.95
  const confidence = Math.min(0.95, 0.3 + failures.length * 0.1);

  return {
    next_predicted_failure_date: new Date(nextMs).toISOString(),
    confidence,
    days_until_failure,
    based_on_history_count: failures.length,
  };
}

/**
 * Compute predictive maintenance signal from asset's maintenance history.
 * Uses lookback heuristic: weighted average inter-failure interval +
 * statistical confidence based on history depth.
 */
export function computePMSignal(
  record: AssetUnitRecord,
  history: MaintenanceHistoryRecord[],
): PredictiveMaintenanceSignal {
  const scoped = history.filter(h => h.asset_unit_record_id === record.id);
  const forecast = forecastNextFailure(scoped);
  const failures = scoped.filter(isFailureEvent);
  const recentBreakdowns = failures.filter(
    f => Date.parse(f.event_date) >= Date.now() - 180 * DAY_MS,
  ).length;
  const costTrend = computeCostTrend(failures);

  let score = 0;
  if (forecast) {
    // Inverse of days_until_failure normalized · sooner = higher risk
    const horizon = 180;
    score = Math.max(0, Math.min(1, 1 - forecast.days_until_failure / horizon));
  }
  // Bump score with recent breakdown density + rising costs
  score = Math.min(1, score + Math.min(0.3, recentBreakdowns * 0.05));
  if (costTrend > 0) score = Math.min(1, score + Math.min(0.2, costTrend * 0.1));

  const driving_factors: string[] = [];
  if (forecast) driving_factors.push(`weighted avg interval ${Math.round(forecast.days_until_failure)} d`);
  if (recentBreakdowns > 0) driving_factors.push(`${recentBreakdowns} breakdowns in last 180 d`);
  if (costTrend > 0.1) driving_factors.push(`maintenance cost trend +${Math.round(costTrend * 100)}%`);
  if (driving_factors.length === 0) driving_factors.push('insufficient history · low-confidence baseline');

  return {
    score,
    next_predicted_failure_date: forecast?.next_predicted_failure_date,
    driving_factors,
    computed_at: new Date().toISOString(),
    confidence: forecast?.confidence ?? 0.2,
  };
}

/**
 * Identify assets in an entity portfolio whose computed PM score exceeds
 * the risk threshold.
 */
export function listHighRiskAssets(
  entityCode: string,
  risk_threshold = 0.7,
): { asset_unit_record_id: string; score: number; next_failure?: string }[] {
  const out: { asset_unit_record_id: string; score: number; next_failure?: string }[] = [];
  try {
    const raw = localStorage.getItem(`erp_asset_units_${entityCode}`);
    if (!raw) return out;
    const records = JSON.parse(raw) as AssetUnitRecord[];
    for (const r of records) {
      const score = r.predictive_maintenance_score ?? 0;
      if (score >= risk_threshold) {
        out.push({
          asset_unit_record_id: r.id,
          score,
          next_failure: r.next_predicted_failure_date ?? undefined,
        });
      }
    }
  } catch {
    // ignore
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Update an AssetUnitRecord with computed predictive_maintenance_score +
 * next_predicted_failure_date (returns updated record · pure function).
 */
export function updateRecordWithPMSignal(
  record: AssetUnitRecord,
  signal: PredictiveMaintenanceSignal,
): AssetUnitRecord {
  return {
    ...record,
    predictive_maintenance_score: signal.score,
    next_predicted_failure_date: signal.next_predicted_failure_date ?? null,
    updated_at: new Date().toISOString(),
  };
}
