/**
 * @file        src/lib/production-variance-alert-engine.ts
 * @sprint      T-Phase-3.PROD-1 · ST7 · PROD-LEAK-2 · Q-LOCK-10 · Q-LOCK-16
 * @purpose     Variance threshold master + open-alerts compute (sub-helper · NOT a SIBLING).
 * @[JWT]       GET/PUT /api/production/variance-thresholds/:entityCode
 */
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';

export interface VarianceThresholds {
  material_variance_pct: number;
  labour_variance_pct: number;
  overhead_variance_pct: number;
  scrap_variance_pct: number;
}

export const DEFAULT_VARIANCE_THRESHOLDS: VarianceThresholds = {
  material_variance_pct: 10,
  labour_variance_pct: 5,
  overhead_variance_pct: 15,
  scrap_variance_pct: 20,
};

export type VarianceAlertType = 'material' | 'labour' | 'overhead' | 'scrap';

export interface VarianceAlert {
  po_id: string;
  po_no: string;
  alert_type: VarianceAlertType;
  variance_pct: number;
  threshold_pct: number;
  severity: 'warning' | 'critical';
  triggered_at: string;
  acknowledged_at: string | null;
}

const thresholdsKey = (entityCode: string): string =>
  `erp_variance_alert_thresholds_${entityCode}`;

const ackKey = (entityCode: string): string =>
  `erp_variance_alert_acks_${entityCode}`;

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
    // [JWT] POST/PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function getVarianceThresholds(entityCode: string): VarianceThresholds {
  return lsRead<VarianceThresholds>(thresholdsKey(entityCode), DEFAULT_VARIANCE_THRESHOLDS);
}

export function setVarianceThresholds(entityCode: string, thresholds: VarianceThresholds): void {
  lsWrite(thresholdsKey(entityCode), thresholds);
}

interface AckRecord {
  po_id: string;
  alert_type: VarianceAlertType;
  acknowledged_at: string;
}

function readAcks(entityCode: string): AckRecord[] {
  return lsRead<AckRecord[]>(ackKey(entityCode), []);
}

function readPOs(entityCode: string): ProductionOrder[] {
  return lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []);
}

function evalComponent(
  po: ProductionOrder,
  alert_type: VarianceAlertType,
  variance_pct: number,
  threshold_pct: number,
  ackMap: Map<string, string>,
): VarianceAlert | null {
  const abs = Math.abs(variance_pct);
  if (abs < threshold_pct) return null;
  const severity: 'warning' | 'critical' = abs >= threshold_pct * 2 ? 'critical' : 'warning';
  const ackedAt = ackMap.get(`${po.id}::${alert_type}`) ?? null;
  return {
    po_id: po.id,
    po_no: po.doc_no,
    alert_type,
    variance_pct: abs,
    threshold_pct,
    severity,
    triggered_at: po.updated_at,
    acknowledged_at: ackedAt,
  };
}

export function computeOpenVarianceAlerts(entityCode: string): VarianceAlert[] {
  const thresholds = getVarianceThresholds(entityCode);
  const pos = readPOs(entityCode);
  const acks = readAcks(entityCode);
  const ackMap = new Map(acks.map(a => [`${a.po_id}::${a.alert_type}`, a.acknowledged_at]));
  const out: VarianceAlert[] = [];

  for (const po of pos) {
    if (po.status !== 'in_progress' && po.status !== 'completed') continue;
    const variance = po.cost_structure?.variance?.master_vs_actual;
    if (!variance) continue;
    const matPct = variance.material?.total_pct ?? 0;
    const labPct = variance.labour?.total_pct ?? 0;
    const ohdPct = variance.overhead?.total_pct ?? 0;
    const scrPct = variance.scrap?.total_pct ?? 0;

    const m = evalComponent(po, 'material', matPct, thresholds.material_variance_pct, ackMap);
    if (m && !m.acknowledged_at) out.push(m);
    const l = evalComponent(po, 'labour', labPct, thresholds.labour_variance_pct, ackMap);
    if (l && !l.acknowledged_at) out.push(l);
    const o = evalComponent(po, 'overhead', ohdPct, thresholds.overhead_variance_pct, ackMap);
    if (o && !o.acknowledged_at) out.push(o);
    const s = evalComponent(po, 'scrap', scrPct, thresholds.scrap_variance_pct, ackMap);
    if (s && !s.acknowledged_at) out.push(s);
  }
  return out;
}

export function acknowledgeVarianceAlert(
  entityCode: string,
  poId: string,
  alertType: VarianceAlertType,
): void {
  const acks = readAcks(entityCode);
  const idx = acks.findIndex(a => a.po_id === poId && a.alert_type === alertType);
  const entry: AckRecord = {
    po_id: poId,
    alert_type: alertType,
    acknowledged_at: new Date().toISOString(),
  };
  if (idx >= 0) acks[idx] = entry; else acks.push(entry);
  lsWrite(ackKey(entityCode), acks);
}
