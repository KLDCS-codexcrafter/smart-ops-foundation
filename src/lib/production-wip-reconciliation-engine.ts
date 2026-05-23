/**
 * @file        src/lib/production-wip-reconciliation-engine.ts
 * @sprint      T-Phase-3.PROD-2 · Sub-theme 1 · PROD-LEAK-1 closure · Q-LOCK-1
 * @purpose     Phantom WIP reconciliation · ledger WIP vs physical WIP · on-demand
 *              + month-end auto-fire. Sub-helper engine · NOT a new SIBLING.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       POST /api/production/wip-reconciliation/run
 */

import { vouchersKey } from '@/lib/fincore-engine';
import { getWIPEstimate } from '@/lib/stock-reservation-engine';
import { productionOrdersKey } from '@/types/production-order';
import type { ProductionOrder } from '@/types/production-order';

export interface WIPReconciliationSnapshot {
  id: string;
  entity_code: string;
  run_date: string;
  trigger: 'manual' | 'month_end_auto';
  ledger_wip_value: number;
  physical_wip_value: number;
  variance: number;
  variance_abs: number;
  severity: 'ok' | 'warning' | 'critical';
  in_progress_po_count: number;
  reconciler: { id: string; name: string };
  notes: string;
}

const WARNING_THRESHOLD = 10_000;
const CRITICAL_THRESHOLD = 50_000;

export const wipReconciliationKey = (entityCode: string): string =>
  `erp_wip_reconciliation_${entityCode}`;

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

interface MinimalVoucher {
  voucher_type_id?: string;
  status?: string;
  total_amount?: number;
  amount?: number;
}

/** Ledger WIP = capitalized into WIP - capitalized out as FG. */
function computeLedgerWIP(entityCode: string): number {
  const vouchers = lsRead<MinimalVoucher[]>(vouchersKey(entityCode), []);
  let inWIP = 0;
  let outFG = 0;
  for (const v of vouchers) {
    if (v.status === 'cancelled') continue;
    const amt = Number(v.total_amount ?? v.amount ?? 0);
    if (v.voucher_type_id === 'production_wip_capitalization') inWIP += amt;
    else if (v.voucher_type_id === 'production_fg_capitalization') outFG += amt;
  }
  return Math.round(inWIP - outFG);
}

/** Physical WIP = sum of in_progress PO budget totals + getWIPEstimate signal. */
function computePhysicalWIP(entityCode: string): { value: number; po_count: number } {
  const pos = lsRead<ProductionOrder[]>(productionOrdersKey(entityCode), []);
  const inProgress = pos.filter(p => p.status === 'in_progress');
  const budgetTotal = inProgress.reduce(
    (s, p) =>
      s +
      (p.cost_structure?.budget?.total ??
        p.cost_structure?.master?.total ??
        0),
    0,
  );
  // [JWT] getWIPEstimate stub returns 0 in Phase 1 · live in Phase 2
  const inv = getWIPEstimate('__all__', entityCode);
  return { value: Math.round(budgetTotal + (inv.wip_qty ?? 0)), po_count: inProgress.length };
}

function severityFor(varianceAbs: number): WIPReconciliationSnapshot['severity'] {
  if (varianceAbs > CRITICAL_THRESHOLD) return 'critical';
  if (varianceAbs > WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

export function runWIPReconciliation(
  entityCode: string,
  user: { id: string; name: string },
  trigger: 'manual' | 'month_end_auto',
): WIPReconciliationSnapshot {
  const ledger = computeLedgerWIP(entityCode);
  const physical = computePhysicalWIP(entityCode);
  const variance = ledger - physical.value;
  const variance_abs = Math.abs(variance);
  const severity = severityFor(variance_abs);
  const now = new Date();
  const snapshot: WIPReconciliationSnapshot = {
    id: `wipr-${now.getTime()}`,
    entity_code: entityCode,
    run_date: now.toISOString(),
    trigger,
    ledger_wip_value: ledger,
    physical_wip_value: physical.value,
    variance,
    variance_abs,
    severity,
    in_progress_po_count: physical.po_count,
    reconciler: { id: user.id, name: user.name },
    notes:
      severity === 'ok'
        ? 'Within tolerance · no action required.'
        : severity === 'warning'
          ? 'Variance exceeds ₹10K · review recommended.'
          : 'Critical variance · investigation required.',
  };
  const list = lsRead<WIPReconciliationSnapshot[]>(wipReconciliationKey(entityCode), []);
  lsWrite(wipReconciliationKey(entityCode), [snapshot, ...list].slice(0, 200));
  return snapshot;
}

export function listWIPReconciliations(entityCode: string): WIPReconciliationSnapshot[] {
  return lsRead<WIPReconciliationSnapshot[]>(wipReconciliationKey(entityCode), []);
}

export function getLatestWIPReconciliation(
  entityCode: string,
): WIPReconciliationSnapshot | null {
  const list = listWIPReconciliations(entityCode);
  return list.length > 0 ? list[0] : null;
}

/** True if today is last 3 days of month AND no reconciliation done this month. */
export function shouldAutoFireMonthEnd(entityCode: string): boolean {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isLast3 = today.getDate() >= lastDay - 2;
  if (!isLast3) return false;
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const list = listWIPReconciliations(entityCode);
  return !list.some(s => s.run_date.startsWith(ym));
}
