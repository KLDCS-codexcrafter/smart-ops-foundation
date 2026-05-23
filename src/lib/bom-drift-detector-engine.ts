/**
 * @file        src/lib/bom-drift-detector-engine.ts
 * @sprint      T-Phase-3.PROD-2 · Sub-theme 5 · PROD-LEAK-7 closure · Q-LOCK-5
 * @purpose     BOM drift detection · actual yield vs BOM standard across last 5 confirmations.
 *              Sub-helper engine · NOT a new SIBLING.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       POST /api/production/bom-drift/scan
 *
 * BOM drift v1 limitation note:
 * Computes aggregate yield-implied drift (output-ratio × input-qty) per-BOM.
 * Per-material direct tracking deferred to future sprint (PROD-2.5 or PROD-3) when
 * ProductionConfirmation type can be extended to carry per-material actual_consumed_qty.
 * Current approach surfaces same drift signal class · misses per-material directional split
 * (e.g. one material wasted heavily + another conserved averages out).
 * Acceptable trade-off for LEAK-7 v1 closure.
 */

import type { Bom } from '@/types/bom';
import { bomKey } from '@/types/bom';
import type { ProductionConfirmation } from '@/types/production-confirmation';
import { productionConfirmationsKey } from '@/types/production-confirmation';

export interface BOMDriftAlert {
  id: string;
  bom_id: string;
  bom_name: string;
  parent_item_id: string;
  parent_item_name: string;
  drift_item_id: string;
  drift_item_name: string;
  bom_standard_qty: number;
  actual_avg_qty: number;
  drift_pct: number;
  drift_severity: 'warning' | 'critical';
  sample_size: number;
  detected_at: string;
  acknowledged_at: string | null;
}

const BOM_DRIFT_THRESHOLD_PCT = 10;
const SAMPLE_WINDOW = 5;

export const bomDriftAlertsKey = (entityCode: string): string =>
  `erp_bom_drift_alerts_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/* (engine-side)
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

export function getBOMDriftThreshold(): number {
  return BOM_DRIFT_THRESHOLD_PCT;
}

/** Scan active BOMs · compare standard component effective_qty vs implied actual.
 *  Implied actual_avg = standard × (planned_qty / actual_qty) average across last 5 confirmations.
 *  A persistent yield gap surfaces as component-level drift signal. */
export function detectBOMDrift(entityCode: string): BOMDriftAlert[] {
  const boms = lsRead<Bom[]>(bomKey(entityCode), []).filter(b => b.is_active);
  const confs = lsRead<ProductionConfirmation[]>(
    productionConfirmationsKey(entityCode),
    [],
  ).filter(c => c.status === 'confirmed');
  const alerts: BOMDriftAlert[] = [];
  const now = new Date().toISOString();

  for (const bom of boms) {
    const relevant = confs
      .filter(c =>
        c.lines.some(l => l.output_item_id === bom.product_item_id),
      )
      .sort((a, b) => b.confirmation_date.localeCompare(a.confirmation_date))
      .slice(0, SAMPLE_WINDOW);

    if (relevant.length === 0) continue;

    // Compute average yield ratio (planned ÷ actual) across the sample window.
    let ratioSum = 0;
    let counted = 0;
    for (const c of relevant) {
      const line = c.lines.find(l => l.output_item_id === bom.product_item_id);
      if (!line || line.actual_qty <= 0) continue;
      ratioSum += line.planned_qty / line.actual_qty;
      counted += 1;
    }
    if (counted === 0) continue;
    const avgRatio = ratioSum / counted;

    for (const comp of bom.components) {
      const stdEffective = comp.qty * (1 + (comp.wastage_percent ?? 0) / 100);
      const actualImplied = stdEffective * avgRatio;
      const drift_pct = ((actualImplied - stdEffective) / stdEffective) * 100;
      const abs = Math.abs(drift_pct);
      if (abs < BOM_DRIFT_THRESHOLD_PCT) continue;
      alerts.push({
        id: `bomd-${bom.id}-${comp.id}-${Date.now()}`,
        bom_id: bom.id,
        bom_name: `${bom.product_item_name} v${bom.version_no}`,
        parent_item_id: bom.product_item_id,
        parent_item_name: bom.product_item_name,
        drift_item_id: comp.item_id,
        drift_item_name: comp.item_name,
        bom_standard_qty: Number(stdEffective.toFixed(4)),
        actual_avg_qty: Number(actualImplied.toFixed(4)),
        drift_pct: Number(drift_pct.toFixed(2)),
        drift_severity: abs > 20 ? 'critical' : 'warning',
        sample_size: counted,
        detected_at: now,
        acknowledged_at: null,
      });
    }
  }

  // Persist · de-dup by bom+component (keep latest)
  const existing = lsRead<BOMDriftAlert[]>(bomDriftAlertsKey(entityCode), []);
  const ackMap = new Map(
    existing.map(a => [`${a.bom_id}::${a.drift_item_id}`, a.acknowledged_at] as const),
  );
  const merged = alerts.map(a => ({
    ...a,
    acknowledged_at: ackMap.get(`${a.bom_id}::${a.drift_item_id}`) ?? null,
  }));
  lsWrite(bomDriftAlertsKey(entityCode), merged);
  return merged;
}

export function listOpenBOMDriftAlerts(entityCode: string): BOMDriftAlert[] {
  return lsRead<BOMDriftAlert[]>(bomDriftAlertsKey(entityCode), []).filter(
    a => a.acknowledged_at === null,
  );
}

export function acknowledgeBOMDriftAlert(
  alertId: string,
  entityCode: string,
  _user: { id: string; name: string },
): void {
  void _user;
  const list = lsRead<BOMDriftAlert[]>(bomDriftAlertsKey(entityCode), []);
  const next = list.map(a =>
    a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a,
  );
  lsWrite(bomDriftAlertsKey(entityCode), next);
}
