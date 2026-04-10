import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemRateHistory, RateType } from '@/types/item-rate-history';

const KEY = 'erp_item_rate_history';
const load = (): ItemRateHistory[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export function useItemRates() {
  const [history, setHistory] = useState<ItemRateHistory[]>(load());
  // [JWT] Replace with GET /api/inventory/item-rates/history
  const save = (d: ItemRateHistory[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/item-rates/history */ };

  const logRateChange = (
    itemId: string, itemCode: string, itemName: string,
    rateType: RateType, oldRate: number | null, newRate: number,
    reason: string, category: ItemRateHistory['change_reason_category'],
    effectiveFrom: string, bulkUpdateId?: string,
    showToast: boolean = true
  ) => {
    const entry: ItemRateHistory = {
      id: crypto.randomUUID(),
      item_id: itemId,
      item_code: itemCode,
      item_name: itemName,
      rate_type: rateType,
      old_rate: oldRate,
      new_rate: newRate,
      changed_by: 'current_user',
      change_reason: reason,
      change_reason_category: category,
      effective_from: effectiveFrom,
      bulk_update_id: bulkUpdateId ?? null,
      created_at: new Date().toISOString(),
    };
    const u = [entry, ...history];
    setHistory(u); save(u);
    if (showToast) toast.success(`Rate change logged for ${itemName}`);
    // [JWT] POST /api/inventory/item-rates/history
    return entry;
  };

  const getHistory = (itemId: string) =>
    history.filter(h => h.item_id === itemId);
  // [JWT] GET /api/inventory/item-rates/history?item_id=

  const getBulkHistory = (bulkUpdateId: string) =>
    history.filter(h => h.bulk_update_id === bulkUpdateId);
  // [JWT] GET /api/inventory/item-rates/history?bulk_update_id=

  return { history, logRateChange, getHistory, getBulkHistory };
}
