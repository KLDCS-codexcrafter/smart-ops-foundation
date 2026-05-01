/**
 * useConsumptionEntries.ts — CRUD + post for Consumption Entries
 * Sprint T-Phase-1.2.2 · Inventory Hub MOAT sprint
 *
 * Storage: erp_consumption_entries_${entityCode}
 * Stock balance: deducts actual_qty from godown using weighted-avg rate.
 * Computes variance vs BOM standard at post time.
 *
 * [JWT] GET/POST/PATCH /api/inventory/consumption-entries
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  consumptionEntriesKey, type ConsumptionEntry,
} from '@/types/consumption';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import { dAdd, dSub, dMul, round2 } from '@/lib/decimal-helpers';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

export interface PostValidation {
  ok: boolean;
  reason?: string;
}

/**
 * Compute variance lines from a consumption draft.
 * variance_qty = actual_qty − standard_qty
 * variance_percent = (variance_qty / standard_qty) × 100, or 0 when standard is 0.
 */
export function computeConsumptionVariance(
  entry: ConsumptionEntry,
): { lines: ConsumptionEntry['lines']; total_variance_value: number } {
  let totVar = 0;
  const lines = entry.lines.map(l => {
    const variance_qty = round2(dSub(l.actual_qty, l.standard_qty));
    const variance_percent = l.standard_qty > 0
      ? round2((variance_qty / l.standard_qty) * 100) : 0;
    const value = round2(dMul(l.actual_qty, l.rate));
    totVar = dAdd(totVar, dMul(variance_qty, l.rate));
    return { ...l, variance_qty, variance_percent, value };
  });
  return { lines, total_variance_value: round2(totVar) };
}

export function useConsumptionEntries(entityCode: string) {
  const key = consumptionEntriesKey(entityCode);
  const [entries, setEntries] = useState<ConsumptionEntry[]>(
    () => ls<ConsumptionEntry>(key));

  const refresh = useCallback(() => setEntries(ls<ConsumptionEntry>(key)), [key]);

  const upsert = useCallback((e: ConsumptionEntry) => {
    setEntries(prev => {
      const idx = prev.findIndex(x => x.id === e.id);
      const next = idx === -1 ? [e, ...prev] : prev.map(x => x.id === e.id ? e : x);
      ss(key, next);
      return next;
    });
  }, [key]);

  const postEntry = useCallback((draft: ConsumptionEntry): PostValidation => {
    if (isPeriodLocked(draft.consumption_date, entityCode)) {
      const msg = periodLockMessage(draft.consumption_date, entityCode) ?? 'Period locked';
      toast.error(msg); return { ok: false, reason: msg };
    }
    if (draft.lines.length === 0) {
      const msg = 'At least one line required';
      toast.error(msg); return { ok: false, reason: msg };
    }
    if (draft.mode === 'job' && !draft.project_centre_id) {
      const msg = 'Job-mode consumption requires a project'; toast.error(msg);
      return { ok: false, reason: msg };
    }
    if (draft.mode === 'overhead' && !draft.overhead_ledger_id) {
      const msg = 'Overhead-mode consumption requires an overhead ledger';
      toast.error(msg); return { ok: false, reason: msg };
    }

    // Validate balance available in source godown
    const balances = ls<StockBalanceEntry>(stockBalanceKey(entityCode));
    for (const ln of draft.lines) {
      if (ln.actual_qty <= 0) continue;
      const bal = balances.find(b => b.item_id === ln.item_id && b.godown_id === draft.godown_id);
      const avail = bal?.qty ?? 0;
      if (avail < ln.actual_qty) {
        const msg = `${ln.item_name} — only ${avail} available · ${ln.actual_qty} requested`;
        toast.error(msg); return { ok: false, reason: msg };
      }
    }

    // Apply variance + deduct stock
    const variance = computeConsumptionVariance(draft);
    const now = new Date().toISOString();
    const updatedBalances: StockBalanceEntry[] = [...balances];
    let totQty = 0, totValue = 0;
    for (const ln of variance.lines) {
      totQty = dAdd(totQty, ln.actual_qty);
      totValue = dAdd(totValue, ln.value);
      if (ln.actual_qty <= 0) continue;
      const idx = updatedBalances.findIndex(
        b => b.item_id === ln.item_id && b.godown_id === draft.godown_id);
      if (idx === -1) continue;
      const ex = updatedBalances[idx];
      const nq = round2(dSub(ex.qty, ln.actual_qty));
      const nv = round2(dSub(ex.value, dMul(ln.actual_qty, ex.weighted_avg_rate)));
      updatedBalances[idx] = {
        ...ex,
        qty: Math.max(0, nq),
        value: Math.max(0, nv),
        updated_at: now,
      };
    }
    ss(stockBalanceKey(entityCode), updatedBalances);

    // Sprint T-Phase-1.2.5 · Update Item.last_issued_at in single batched write
    try {
      const IKEY = 'erp_inventory_items';
      // [JWT] GET /api/inventory/items
      const itemsRaw = localStorage.getItem(IKEY);
      if (itemsRaw) {
        const arr: Array<{ id: string; last_issued_at?: string | null; updated_at?: string }> = JSON.parse(itemsRaw);
        const lineItemIds = new Set(variance.lines.filter(l => l.actual_qty > 0).map(l => l.item_id));
        let changed = false;
        for (let i = 0; i < arr.length; i++) {
          if (lineItemIds.has(arr[i].id)) {
            arr[i] = { ...arr[i], last_issued_at: now, updated_at: now };
            changed = true;
          }
        }
        // [JWT] PATCH /api/inventory/items (bulk last_issued_at)
        if (changed) localStorage.setItem(IKEY, JSON.stringify(arr));
      }
    } catch { /* best-effort */ }

    const posted: ConsumptionEntry = {
      ...draft,
      lines: variance.lines,
      total_qty: round2(totQty),
      total_value: round2(totValue),
      total_variance_value: variance.total_variance_value,
      status: 'posted',
      posted_at: now,
      updated_at: now,
    };
    upsert(posted);
    toast.success(`Consumption ${posted.ce_no} posted · stock deducted from ${posted.godown_name}`);
    return { ok: true };
  }, [entityCode, upsert]);

  const cancelEntry = useCallback((id: string, reason: string) => {
    const now = new Date().toISOString();
    const found = entries.find(x => x.id === id);
    if (!found) return;
    if (found.status === 'posted') {
      toast.error('Cannot cancel a posted consumption — create a reversing entry');
      return;
    }
    upsert({
      ...found, status: 'cancelled',
      cancelled_at: now, cancellation_reason: reason, updated_at: now,
    });
  }, [entries, upsert]);

  return { entries, refresh, upsert, postEntry, cancelEntry };
}
