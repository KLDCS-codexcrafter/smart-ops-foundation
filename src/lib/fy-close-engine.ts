/**
 * @file     fy-close-engine.ts
 * @sprint   T-Phase-3.PROD-FIX-A · ST8 · PASS 2
 * @purpose  Production-arc FY-close orchestrator (Q-LOCK-5).
 *           Wraps existing WIPReconciliationSnapshot + ProductionVariance freeze +
 *           opening WIP carry-forward. NOT a SIBLING · sub-helper engine.
 *           Engine-side localStorage per FR-93.
 */
import { readFiscalYears } from '@/lib/fiscal-year-engine';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import {
  listProductionVariances,
  freezeProductionVariance,
} from '@/lib/production-variance-engine';
import {
  runWIPReconciliation,
  wipReconciliationKey,
  type WIPReconciliationSnapshot,
} from '@/lib/production-wip-reconciliation-engine';

const lsRead = <T>(key: string, def: T): T => {
  try {
    // [JWT] GET /api/* (engine-side · per FR-93)
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch { return def; }
};
const lsWrite = <T>(key: string, value: T): void => {
  try {
    // [JWT] PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota silent */ }
};

/** FY-end WIP snapshot · extends existing trigger union (ST10 added 'fy_end_manual'). */
export interface FYEndWIPSnapshot extends WIPReconciliationSnapshot {
  trigger: 'fy_end_manual';
  fiscal_year_id: string;
}

/** FY closure summary · single source of truth for FY-close ceremony record. */
export interface FYClosureSummary {
  id: string;
  entity_code: string;
  fiscal_year_id: string;
  closed_at: string;
  closed_by: { id: string; name: string };
  wip_snapshot_id: string;
  variances_frozen_count: number;
  opening_wip_carry_forward_count: number;
  in_progress_po_ids: string[];
}

export const fyClosureSummariesKey = (entityCode: string): string =>
  `erp_fy_closure_summaries_${entityCode}`;

/**
 * Q-LOCK-7 · Snapshot Production WIP at FY-end · reuses WIPReconciliationSnapshot
 * with extended trigger 'fy_end_manual' and FY tag.
 */
export function snapshotProductionWIPAtFYEnd(
  entityCode: string,
  fiscalYearId: string,
  user: { id: string; name: string },
): FYEndWIPSnapshot {
  const baseSnapshot = runWIPReconciliation(entityCode, user, 'manual');
  const fyEndSnapshot: FYEndWIPSnapshot = {
    ...baseSnapshot,
    trigger: 'fy_end_manual',
    fiscal_year_id: fiscalYearId,
    notes: `FY-end snapshot for ${fiscalYearId}. ${baseSnapshot.notes}`,
  };
  const list = lsRead<WIPReconciliationSnapshot[]>(wipReconciliationKey(entityCode), []);
  const idx = list.findIndex(s => s.id === baseSnapshot.id);
  if (idx >= 0) list[idx] = fyEndSnapshot as unknown as WIPReconciliationSnapshot;
  else list.unshift(fyEndSnapshot as unknown as WIPReconciliationSnapshot);
  lsWrite(wipReconciliationKey(entityCode), list);
  return fyEndSnapshot;
}

/**
 * Q-LOCK-8 (variance) · Freeze open ProductionVariances at FY-end using
 * existing freezeProductionVariance (entityCode, poId, user) signature.
 */
export function freezeOpenVariancesAtFYEnd(
  entityCode: string,
  user: { id: string; name: string },
): number {
  const variances = listProductionVariances(entityCode).filter(v => !v.is_frozen);
  let count = 0;
  for (const v of variances) {
    try {
      const result = freezeProductionVariance(entityCode, v.po_id, user);
      if (result) count++;
    } catch {
      // Skip variances that fail to freeze (already frozen or invalid state)
    }
  }
  return count;
}

/**
 * Q-LOCK-8 · Tag in-progress POs with opening_wip_snapshot_id for next FY carry-forward.
 */
export function generateOpeningWIPForNextFY(
  entityCode: string,
  _closingFyId: string,
  wipSnapshotId: string,
): { taggedPOIds: string[] } {
  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []);
  const taggedPOIds: string[] = [];
  for (const po of pos) {
    if (po.status === 'in_progress') {
      po.opening_wip_snapshot_id = wipSnapshotId;
      taggedPOIds.push(po.id);
    }
  }
  lsWrite(productionOrdersKey(entityCode), pos);
  return { taggedPOIds };
}

/**
 * Q-LOCK-5 · Orchestrator · close Production for entire FY.
 * Calls all 3 sub-operations and records the closure summary.
 */
export function closeProductionForFY(
  entityCode: string,
  fiscalYearId: string,
  user: { id: string; name: string },
): FYClosureSummary {
  const fys = readFiscalYears(entityCode);
  const fy = fys.find(f => f.id === fiscalYearId);
  if (!fy) throw new Error(`Fiscal Year ${fiscalYearId} not found`);

  const wipSnapshot = snapshotProductionWIPAtFYEnd(entityCode, fiscalYearId, user);
  const variancesFrozenCount = freezeOpenVariancesAtFYEnd(entityCode, user);
  const { taggedPOIds } = generateOpeningWIPForNextFY(entityCode, fiscalYearId, wipSnapshot.id);

  const summary: FYClosureSummary = {
    id: `fyc-${Date.now()}`,
    entity_code: entityCode,
    fiscal_year_id: fiscalYearId,
    closed_at: new Date().toISOString(),
    closed_by: user,
    wip_snapshot_id: wipSnapshot.id,
    variances_frozen_count: variancesFrozenCount,
    opening_wip_carry_forward_count: taggedPOIds.length,
    in_progress_po_ids: taggedPOIds,
  };

  const summaries = lsRead<FYClosureSummary[]>(fyClosureSummariesKey(entityCode), []);
  lsWrite(fyClosureSummariesKey(entityCode), [summary, ...summaries].slice(0, 100));

  return summary;
}

/** List all FY closures for entity. */
export function listFYClosureSummaries(entityCode: string): FYClosureSummary[] {
  return lsRead<FYClosureSummary[]>(fyClosureSummariesKey(entityCode), []);
}
