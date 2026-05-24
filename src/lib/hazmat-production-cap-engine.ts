/**
 * @file        src/lib/hazmat-production-cap-engine.ts
 * @sprint      T-Phase-3.PROD-2 · ST9 · PROD-LEAK-11 closure · Q-LOCK-9
 * @purpose     Hazmat production-cap enforcement · DG-class-aware monthly cap detection.
 *              Aggregates Production Order qty per DG-class from output items' hazmat_profile_id
 *              and surfaces alerts when statutory storage caps are exceeded.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper · UN DG Classes
 * @[JWT]       GET /api/production/hazmat-cap/:entityCode
 *
 * v1 limitation note:
 * Caps stored side-store (erp_hazmat_caps_${entityCode}) keyed by DG class · seeded out-of-band.
 * Inventory item lookup is via the group-wide 'erp_inventory_items' store (no entity scope on items).
 * Acceptable trade-off for LEAK-11 v1 closure.
 */

import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import type { HazmatProfile, DGClass } from '@/types/hazmat-profile';
import { hazmatProfilesKey, DG_CLASS_LABELS } from '@/types/hazmat-profile';

interface InventoryItemLite {
  id: string;
  name: string;
  hazmat_profile_id?: string | null;
}

export interface HazmatCapRecord {
  dg_class: DGClass;
  monthly_cap_units: number;
  uom: string;
}

export interface HazmatUtilisation {
  dg_class: DGClass;
  dg_class_label: string;
  monthly_cap: number;
  actual_month_qty: number;
  utilisation_pct: number;
  status: 'ok' | 'warning' | 'breach';
  month_label: string;
  contributing_items: string[];
}

export interface HazmatCapAlert {
  id: string;
  dg_class: DGClass;
  utilisation_pct: number;
  status: 'warning' | 'breach';
  month_label: string;
  detected_at: string;
  acknowledged_at: string | null;
}

const WARNING_PCT = 80;
const BREACH_PCT = 100;

export const hazmatCapsKey = (entityCode: string): string =>
  `erp_hazmat_caps_${entityCode}`;
export const hazmatCapAlertsKey = (entityCode: string): string =>
  `erp_hazmat_cap_alerts_${entityCode}`;

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

function loadItems(): InventoryItemLite[] {
  try {
    // [JWT] GET /api/inventory/items
    const raw = localStorage.getItem('erp_inventory_items');
    return raw ? (JSON.parse(raw) as InventoryItemLite[]) : [];
  } catch {
    return [];
  }
}

function monthLabelFor(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthLabel(): string {
  return monthLabelFor(new Date().toISOString());
}

export function computeHazmatUtilisation(
  entityCode: string,
  monthLabel: string = currentMonthLabel(),
): HazmatUtilisation[] {
  const items = loadItems();
  const itemMap = new Map(items.map(i => [i.id, i]));
  const profiles = lsRead<HazmatProfile[]>(hazmatProfilesKey(entityCode), []);
  const profileMap = new Map(profiles.map(p => [p.id, p]));
  const caps = lsRead<HazmatCapRecord[]>(hazmatCapsKey(entityCode), []);
  const capMap = new Map(caps.map(c => [c.dg_class, c]));

  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []).filter(
    p =>
      (p.status === 'completed' || p.status === 'closed' || p.status === 'in_progress') &&
      monthLabelFor(p.start_date) === monthLabel,
  );

  const byClass = new Map<DGClass, { qty: number; items: Set<string> }>();
  for (const po of pos) {
    const outItem = itemMap.get(po.output_item_id);
    const pid = outItem?.hazmat_profile_id;
    if (!pid) continue;
    const prof = profileMap.get(pid);
    if (!prof?.dg_class) continue;
    const bucket = byClass.get(prof.dg_class) ?? { qty: 0, items: new Set<string>() };
    bucket.qty += po.planned_qty ?? 0;
    bucket.items.add(po.output_item_name);
    byClass.set(prof.dg_class, bucket);
  }

  const out: HazmatUtilisation[] = [];
  for (const [cls, bucket] of byClass) {
    const cap = capMap.get(cls);
    if (!cap || cap.monthly_cap_units <= 0) continue;
    const pct = Number(((bucket.qty / cap.monthly_cap_units) * 100).toFixed(2));
    const status: HazmatUtilisation['status'] =
      pct >= BREACH_PCT ? 'breach' : pct >= WARNING_PCT ? 'warning' : 'ok';
    out.push({
      dg_class: cls,
      dg_class_label: DG_CLASS_LABELS[cls],
      monthly_cap: cap.monthly_cap_units,
      actual_month_qty: Number(bucket.qty.toFixed(2)),
      utilisation_pct: pct,
      status,
      month_label: monthLabel,
      contributing_items: Array.from(bucket.items).slice(0, 10),
    });
  }
  return out.sort((a, b) => b.utilisation_pct - a.utilisation_pct);
}

export function detectHazmatCapBreaches(entityCode: string): HazmatCapAlert[] {
  const util = computeHazmatUtilisation(entityCode);
  const now = new Date().toISOString();
  const existing = lsRead<HazmatCapAlert[]>(hazmatCapAlertsKey(entityCode), []);
  const ackMap = new Map(
    existing.map(a => [`${a.dg_class}::${a.month_label}`, a.acknowledged_at] as const),
  );
  const alerts = util
    .filter(u => u.status !== 'ok')
    .map<HazmatCapAlert>(u => ({
      id: `hzc-${u.dg_class}-${u.month_label}`,
      dg_class: u.dg_class,
      utilisation_pct: u.utilisation_pct,
      status: u.status === 'breach' ? 'breach' : 'warning',
      month_label: u.month_label,
      detected_at: now,
      acknowledged_at: ackMap.get(`${u.dg_class}::${u.month_label}`) ?? null,
    }));
  lsWrite(hazmatCapAlertsKey(entityCode), alerts);
  return alerts;
}

export function listOpenHazmatCapAlerts(entityCode: string): HazmatCapAlert[] {
  return lsRead<HazmatCapAlert[]>(hazmatCapAlertsKey(entityCode), []).filter(
    a => a.acknowledged_at === null,
  );
}

export function acknowledgeHazmatCapAlert(alertId: string, entityCode: string): void {
  const list = lsRead<HazmatCapAlert[]>(hazmatCapAlertsKey(entityCode), []);
  lsWrite(
    hazmatCapAlertsKey(entityCode),
    list.map(a =>
      a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a,
    ),
  );
}
