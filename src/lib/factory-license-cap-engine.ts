/**
 * @file        src/lib/factory-license-cap-engine.ts
 * @sprint      T-Phase-3.PROD-2 · ST8 · PROD-LEAK-10 closure · Q-LOCK-8
 * @purpose     Factory licence installed-capacity vs actual FY production utilisation tracker.
 *              Sub-helper engine · NOT a new SIBLING · reads Factory + ProductionOrder masters.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       GET /api/production/factory-license-cap/:entityCode
 *
 * v1 limitation note:
 * Installed capacity is read from a side-store (erp_factory_capacity_${entityCode}) seeded
 * out-of-band · Factory master extension deferred to avoid touching frozen masters.
 * Acceptable trade-off for LEAK-10 v1 closure.
 */

import type { Factory } from '@/types/factory';
import { factoriesKey } from '@/types/factory';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';

export interface FactoryCapacityRecord {
  factory_id: string;
  installed_capacity_units: number;
  license_no: string;
  uom: string;
}

export interface FactoryLicenseUtilisation {
  factory_id: string;
  factory_name: string;
  license_no: string;
  installed_capacity: number;
  actual_fy_qty: number;
  utilisation_pct: number;
  status: 'ok' | 'warning' | 'breach';
  fy_label: string;
}

export interface FactoryLicenseAlert {
  id: string;
  factory_id: string;
  factory_name: string;
  utilisation_pct: number;
  status: 'warning' | 'breach';
  fy_label: string;
  detected_at: string;
  acknowledged_at: string | null;
}

const WARNING_PCT = 80;
const BREACH_PCT = 100;

export const factoryCapacityKey = (entityCode: string): string =>
  `erp_factory_capacity_${entityCode}`;
export const factoryLicenseAlertsKey = (entityCode: string): string =>
  `erp_factory_license_alerts_${entityCode}`;

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

/** Indian FY label for a given ISO date (e.g. '2025-07-15' → 'FY26'). */
function fyLabelForDate(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth();
  const fyStartYear = m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `FY${String((fyStartYear + 1) % 100).padStart(2, '0')}`;
}

export function currentFYLabel(): string {
  return fyLabelForDate(new Date().toISOString());
}

export function computeFactoryLicenseUtilisation(
  entityCode: string,
  fyLabel: string = currentFYLabel(),
): FactoryLicenseUtilisation[] {
  const factories = lsRead<Factory[]>(factoriesKey(entityCode), []).filter(
    f => f.status === 'active' && f.unit_type !== 'warehouse_only',
  );
  const caps = lsRead<FactoryCapacityRecord[]>(factoryCapacityKey(entityCode), []);
  const capMap = new Map(caps.map(c => [c.factory_id, c]));
  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []).filter(
    p =>
      (p.status === 'completed' || p.status === 'closed' || p.status === 'in_progress') &&
      fyLabelForDate(p.start_date) === fyLabel,
  );

  const out: FactoryLicenseUtilisation[] = [];
  for (const f of factories) {
    const cap = capMap.get(f.id);
    if (!cap || cap.installed_capacity_units <= 0) continue;
    const fyQty = pos
      .filter(p => p.production_site_id === f.id)
      .reduce((s, p) => s + (p.planned_qty ?? 0), 0);
    const pct = Number(((fyQty / cap.installed_capacity_units) * 100).toFixed(2));
    const status: FactoryLicenseUtilisation['status'] =
      pct >= BREACH_PCT ? 'breach' : pct >= WARNING_PCT ? 'warning' : 'ok';
    out.push({
      factory_id: f.id,
      factory_name: f.name,
      license_no: cap.license_no || f.factory_license_no,
      installed_capacity: cap.installed_capacity_units,
      actual_fy_qty: Number(fyQty.toFixed(2)),
      utilisation_pct: pct,
      status,
      fy_label: fyLabel,
    });
  }
  return out.sort((a, b) => b.utilisation_pct - a.utilisation_pct);
}

export function detectFactoryLicenseBreaches(entityCode: string): FactoryLicenseAlert[] {
  const util = computeFactoryLicenseUtilisation(entityCode);
  const now = new Date().toISOString();
  const existing = lsRead<FactoryLicenseAlert[]>(factoryLicenseAlertsKey(entityCode), []);
  const ackMap = new Map(
    existing.map(a => [`${a.factory_id}::${a.fy_label}`, a.acknowledged_at] as const),
  );
  const alerts = util
    .filter(u => u.status !== 'ok')
    .map<FactoryLicenseAlert>(u => ({
      id: `flc-${u.factory_id}-${u.fy_label}`,
      factory_id: u.factory_id,
      factory_name: u.factory_name,
      utilisation_pct: u.utilisation_pct,
      status: u.status === 'breach' ? 'breach' : 'warning',
      fy_label: u.fy_label,
      detected_at: now,
      acknowledged_at: ackMap.get(`${u.factory_id}::${u.fy_label}`) ?? null,
    }));
  lsWrite(factoryLicenseAlertsKey(entityCode), alerts);
  return alerts;
}

export function listOpenFactoryLicenseAlerts(entityCode: string): FactoryLicenseAlert[] {
  return lsRead<FactoryLicenseAlert[]>(factoryLicenseAlertsKey(entityCode), []).filter(
    a => a.acknowledged_at === null,
  );
}

export function acknowledgeFactoryLicenseAlert(
  alertId: string,
  entityCode: string,
): void {
  const list = lsRead<FactoryLicenseAlert[]>(factoryLicenseAlertsKey(entityCode), []);
  lsWrite(
    factoryLicenseAlertsKey(entityCode),
    list.map(a =>
      a.id === alertId ? { ...a, acknowledged_at: new Date().toISOString() } : a,
    ),
  );
}
