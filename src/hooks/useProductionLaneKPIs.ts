/**
 * @file        src/hooks/useProductionLaneKPIs.ts
 * @sprint      T-Phase-3.PROD-1 · ST6 · Q-LOCK-8 hybrid
 * @purpose     5 KPI reader for Command Center ProductionModule.
 * @[JWT]       GET /api/production/lane-kpis/:entityCode
 */
import { useEffect, useState, useCallback } from 'react';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { computeOpenVarianceAlerts } from '@/lib/production-variance-alert-engine';
// T-Phase-3.PROD-2 · ST12 · 6th KPI "Open Leaks Count" feeds (Q-LOCK-12)
import { listOpenJWShortageAlerts } from '@/lib/job-work-shortage-engine';
import { listOpenBOMDriftAlerts } from '@/lib/bom-drift-detector-engine';
import { listOpenJWMSMEBreaches } from '@/lib/msme-43bh-jw-engine';
import { listOpenFactoryLicenseAlerts } from '@/lib/factory-license-cap-engine';
import { listOpenHazmatCapAlerts } from '@/lib/hazmat-production-cap-engine';
import { listOpenWastageDriftAlerts } from '@/lib/wastage-drift-detector-engine';
import { listOpenToolingAlerts } from '@/lib/tooling-consumption-tracker-engine';

export interface ProductionLaneKPIs {
  activePOs: number;
  plantOEE: number;
  onTimeDeliveryPct: number;
  variancAlertsOpen: number;
  wipValue: number;
  openLeaksCount: number;
}

function readPOs(entityCode: string): ProductionOrder[] {
  try {
    // [JWT] GET /api/production-orders/:entityCode
    const raw = localStorage.getItem(productionOrdersKey(entityCode));
    return raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
  } catch {
    return [];
  }
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function computePlantOEE(pos: ProductionOrder[]): number {
  // Simplified plant-wide OEE proxy · weighted avg of (good/planned) across completed POs.
  // [JWT] Phase 2: aggregate buildOEESourceData/computeOEE across all machines · weighted by capacity.
  const completed = pos.filter(p => p.status === 'completed' || p.status === 'closed');
  if (completed.length === 0) return 0;
  let num = 0;
  let den = 0;
  for (const po of completed) {
    const planned = po.planned_qty ?? 0;
    const produced = (po.outputs ?? []).reduce((s, o) => s + (o.actual_qty ?? 0), 0)
      || planned;
    num += Math.min(produced, planned) * planned;
    den += planned * planned;
  }
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function computeOnTimePct(pos: ProductionOrder[]): number {
  const cutoff = daysAgoISO(30);
  const completed = pos.filter(p =>
    (p.status === 'completed' || p.status === 'closed') &&
    p.actual_completion_date &&
    p.actual_completion_date >= cutoff,
  );
  if (completed.length === 0) return 0;
  const onTime = completed.filter(p =>
    !!p.actual_completion_date && !!p.target_end_date &&
    p.actual_completion_date <= p.target_end_date,
  ).length;
  return Math.round((onTime / completed.length) * 100);
}

function computeWIPValue(pos: ProductionOrder[]): number {
  // WIP = sum of in_progress PO budget totals (matches WIP cascade amount source · ST5 Q-LOCK-6)
  return pos
    .filter(p => p.status === 'in_progress')
    .reduce((s, p) => s + (p.cost_structure?.budget?.total ?? p.cost_structure?.master?.total ?? 0), 0);
}

export function computeOpenLeaksCount(entityCode: string): number {
  return (
    listOpenJWShortageAlerts(entityCode).length +
    listOpenBOMDriftAlerts(entityCode).length +
    listOpenJWMSMEBreaches(entityCode).length +
    listOpenFactoryLicenseAlerts(entityCode).length +
    listOpenHazmatCapAlerts(entityCode).length +
    listOpenWastageDriftAlerts(entityCode).length +
    listOpenToolingAlerts(entityCode).length
  );
}

export function useProductionLaneKPIs(entityCode: string): ProductionLaneKPIs {
  const [kpis, setKPIs] = useState<ProductionLaneKPIs>({
    activePOs: 0,
    plantOEE: 0,
    onTimeDeliveryPct: 0,
    variancAlertsOpen: 0,
    wipValue: 0,
    openLeaksCount: 0,
  });

  const reload = useCallback(() => {
    const pos = readPOs(entityCode);
    const activePOs = pos.filter(p => p.status === 'released' || p.status === 'in_progress').length;
    const plantOEE = computePlantOEE(pos);
    const onTimeDeliveryPct = computeOnTimePct(pos);
    const variancAlertsOpen = computeOpenVarianceAlerts(entityCode).length;
    const wipValue = computeWIPValue(pos);
    const openLeaksCount = computeOpenLeaksCount(entityCode);
    setKPIs({ activePOs, plantOEE, onTimeDeliveryPct, variancAlertsOpen, wipValue, openLeaksCount });
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  return kpis;
}
