/**
 * useHeatNumbers.ts — CRUD + traceability for Heat / Cast numbers.
 * Sprint T-Phase-1.2.3 · Card #2 sub-sprint 3/6
 *
 * Storage: erp_heat_numbers_{entityCode}
 * [JWT] GET/POST/PATCH /api/inventory/heat-numbers
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  heatNumbersKey, type HeatNumber, type HeatTraceability,
} from '@/types/heat-number';
import type { MaterialIssueNote, ConsumptionEntry } from '@/types/consumption';

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

export function useHeatNumbers(entityCode: string) {
  const key = heatNumbersKey(entityCode);
  const [heats, setHeats] = useState<HeatNumber[]>(() => ls<HeatNumber>(key));

  const refresh = useCallback(() => setHeats(ls<HeatNumber>(key)), [key]);

  const createHeat = useCallback((h: HeatNumber) => {
    setHeats(prev => {
      const dup = prev.find(x => x.heat_no === h.heat_no);
      if (dup) {
        toast.warning(`Heat ${h.heat_no} already exists — duplicate`);
      }
      const next = [h, ...prev];
      ss(key, next);
      return next;
    });
    // [JWT] POST /api/inventory/heat-numbers
  }, [key]);

  const updateHeat = useCallback((id: string, patch: Partial<HeatNumber>) => {
    setHeats(prev => {
      const next = prev.map(x =>
        x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x);
      ss(key, next);
      return next;
    });
    // [JWT] PATCH /api/inventory/heat-numbers/:id
  }, [key]);

  const deleteHeat = useCallback((id: string) => {
    setHeats(prev => {
      const target = prev.find(x => x.id === id);
      if (!target) return prev;
      // Only allow delete if never consumed
      if ((target.consumed_qty ?? 0) > 0 ||
          (target.received_qty != null && target.available_qty != null
            && target.available_qty < target.received_qty)) {
        toast.error('Cannot delete a heat that has been partially / fully consumed');
        return prev;
      }
      const next = prev.filter(x => x.id !== id);
      ss(key, next);
      toast.success(`Heat ${target.heat_no} deleted`);
      return next;
    });
    // [JWT] DELETE /api/inventory/heat-numbers/:id
  }, [key]);

  const getHeatsByItem = useCallback((itemId: string): HeatNumber[] =>
    heats.filter(h => h.item_id === itemId && h.status !== 'consumed' && h.status !== 'rejected'),
  [heats]);

  const computeHeatTraceability = useCallback((
    heatId: string,
    mins: readonly MaterialIssueNote[],
    consumptionEntries: readonly ConsumptionEntry[],
  ): HeatTraceability | null => {
    const heat = heats.find(h => h.id === heatId);
    if (!heat) return null;
    const consumed_in_min_ids = mins
      .filter(m => m.lines.some(l => l.notes?.includes(heat.heat_no) || l.batch_no === heat.heat_no))
      .map(m => m.id);
    const consumed_in_ce_ids = consumptionEntries
      .filter(c => c.lines.some(l => l.notes?.includes(heat.heat_no)))
      .map(c => c.id);
    return { heat, consumed_in_min_ids, consumed_in_ce_ids };
  }, [heats]);

  return {
    heats, refresh,
    createHeat, updateHeat, deleteHeat,
    getHeatsByItem, computeHeatTraceability,
  };
}
