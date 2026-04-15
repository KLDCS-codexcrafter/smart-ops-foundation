/**
 * useStockLedger.ts — Stock ledger read hook
 * [JWT] Replace with GET /api/inventory/stock-ledger
 */
import { useState, useCallback } from 'react';
import type { StockEntry } from '@/types/voucher';
import { stockLedgerKey } from '@/lib/finecore-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useStockLedger(entityCode: string) {
  const [entries] = useState<StockEntry[]>(() => ls<StockEntry>(stockLedgerKey(entityCode)));

  const getItemBalance = useCallback((itemId: string, godownId?: string, asOf?: string) => {
    const filtered = entries.filter(e =>
      e.item_id === itemId && !e.is_cancelled &&
      (!godownId || e.godown_id === godownId) &&
      (!asOf || e.date <= asOf)
    );
    const inward = filtered.reduce((s, e) => s + e.inward_qty, 0);
    const outward = filtered.reduce((s, e) => s + e.outward_qty, 0);
    return { inward, outward, balance: inward - outward };
  }, [entries]);

  const getStockStatement = useCallback(() => {
    const map = new Map<string, { itemId: string; itemName: string; inward: number; outward: number; balance: number }>();
    for (const e of entries) {
      if (e.is_cancelled) continue;
      const ex = map.get(e.item_id) || { itemId: e.item_id, itemName: e.item_name, inward: 0, outward: 0, balance: 0 };
      ex.inward += e.inward_qty;
      ex.outward += e.outward_qty;
      ex.balance = ex.inward - ex.outward;
      map.set(e.item_id, ex);
    }
    return Array.from(map.values());
  }, [entries]);

  const getMovementHistory = useCallback((itemId: string) => {
    return entries.filter(e => e.item_id === itemId && !e.is_cancelled);
  }, [entries]);

  return { entries, getItemBalance, getStockStatement, getMovementHistory };
}
