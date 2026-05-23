/**
 * @file        src/lib/wastage-drift-detector-engine.ts
 * @sprint      T-Phase-3.PROD-2 · ST10 · PROD-LEAK-13 closure · Q-LOCK-10
 * @purpose     Detects wastage drift · recent 7-day average vs baseline 30-day average per
 *              factory + category_12. Surfaces alerts when drift exceeds threshold.
 *              Sub-helper engine · NOT a new SIBLING · reuses wastage-analysis-engine output.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       POST /api/production/wastage-drift/scan
 *
 * v1 limitation note:
 * Drift is computed at category_12 grain. Per-machine drift split deferred (PROD-3) until
 * machine-master baseline benchmarks are wired into the source rows.
 * Acceptable trade-off for LEAK-13 v1 closure.
 */

import type { JobCard } from '@/types/job-card';
import type { Machine } from '@/types/machine';
import type {
  WastageSourceRow, WastageCategory12,
} from '@/types/wastage-snapshot';
import { CATEGORY_12_LABELS } from '@/types/wastage-snapshot';
import { buildWastageSourceRows } from '@/lib/wastage-analysis-engine';

const RECENT_WINDOW_DAYS = 7;
const BASELINE_WINDOW_DAYS = 30;
const DRIFT_WARN_PCT = 25;
const DRIFT_CRIT_PCT = 50;

export interface WastageDriftAlert {
  id: string;
  factory_id: string | null;
  category_12: WastageCategory12;
  category_label: string;
  recent_avg_qty: number;
  baseline_avg_qty: number;
  drift_pct: number;
  severity: 'warning' | 'critical';
  detected_at: string;
  acknowledged_at: string | null;
  sample_size_recent: number;
  sample_size_baseline: number;
}

export const wastageDriftAlertsKey = (entityCode: string): string =>
  `erp_wastage_drift_alerts_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/*
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    // [JWT] PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota silent */
  }
}

function daysBetween(a: string, b: string): number {
  return Math.abs((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export interface DetectWastageDriftInput {
  entity_id: string;
  factory_id: string | null;
  job_cards: JobCard[];
  machines: Machine[];
}

export function detectWastageDrift(
  entityCode: string,
  input: DetectWastageDriftInput,
): WastageDriftAlert[] {
  const sourceRows: WastageSourceRow[] = buildWastageSourceRows({
    entity_id: input.entity_id,
    factory_id: input.factory_id,
    job_cards: input.job_cards,
    dwr_entries: [],
    machines: input.machines,
  });

  const now = new Date().toISOString();
  const recentRows = sourceRows.filter(r => daysBetween(r.date, now) <= RECENT_WINDOW_DAYS);
  const baselineRows = sourceRows.filter(
    r =>
      daysBetween(r.date, now) > RECENT_WINDOW_DAYS &&
      daysBetween(r.date, now) <= BASELINE_WINDOW_DAYS + RECENT_WINDOW_DAYS,
  );

  function aggregate(rows: WastageSourceRow[]): Map<WastageCategory12, { qty: number; n: number }> {
    const m = new Map<WastageCategory12, { qty: number; n: number }>();
    for (const r of rows) {
      const cur = m.get(r.category_12) ?? { qty: 0, n: 0 };
      cur.qty += r.wastage_qty;
      cur.n += 1;
      m.set(r.category_12, cur);
    }
    return m;
  }

  const recentMap = aggregate(recentRows);
  const baselineMap = aggregate(baselineRows);

  const alerts: WastageDriftAlert[] = [];
  for (const [cat, recent] of recentMap) {
    const baseline = baselineMap.get(cat);
    if (!baseline || baseline.n === 0) continue;
    const recentAvg = recent.qty / Math.max(recent.n, 1);
    const baselineAvg = baseline.qty / Math.max(baseline.n, 1);
    if (baselineAvg <= 0) continue;
    const driftPct = Number((((recentAvg - baselineAvg) / baselineAvg) * 100).toFixed(2));
    if (driftPct < DRIFT_WARN_PCT) continue;
    alerts.push({
      id: `wd-${input.factory_id ?? 'all'}-${cat}-${Date.now()}`,
      factory_id: input.factory_id,
      category_12: cat,
      category_label: CATEGORY_12_LABELS[cat],
      recent_avg_qty: Number(recentAvg.toFixed(4)),
      baseline_avg_qty: Number(baselineAvg.toFixed(4)),
      drift_pct: driftPct,
      severity: driftPct >= DRIFT_CRIT_PCT ? 'critical' : 'warning',
      detected_at: now,
      acknowledged_at: null,
      sample_size_recent: recent.n,
      sample_size_baseline: baseline.n,
    });
  }

  // Persist · keep acknowledgement state across re-scans
  const existing = lsRead<WastageDriftAlert[]>(wastageDriftAlertsKey(entityCode), []);
  const ackMap = new Map(
    existing.map(a => [`${a.factory_id ?? ''}::${a.category_12}`, a.acknowledged_at] as const),
  );
  const merged = alerts.map(a => ({
    ...a,
    acknowledged_at: ackMap.get(`${a.factory_id ?? ''}::${a.category_12}`) ?? null,
  }));
  lsWrite(wastageDriftAlertsKey(entityCode), merged);
  return merged;
}

export function listOpenWastageDriftAlerts(entityCode: string): WastageDriftAlert[] {
  return lsRead<WastageDriftAlert[]>(wastageDriftAlertsKey(entityCode), []).filter(
    a => a.acknowledged_at === null,
  );
}

export function acknowledgeWastageDriftAlert(alertId: string, entityCode: string): void {
  const list = lsRead<WastageDriftAlert[]>(wastageDriftAlertsKey(entityCode), []);
  lsWrite(
    wastageDriftAlertsKey(entityCode),
    list.map(a =>
      a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a,
    ),
  );
}
