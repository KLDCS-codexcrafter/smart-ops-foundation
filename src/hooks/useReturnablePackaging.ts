/**
 * useReturnablePackaging.ts — CRUD + lifecycle for ReturnablePackaging units.
 * Sprint T-Phase-1.2.5
 * [JWT] GET/POST/PATCH /api/inventory/returnable-packaging
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  returnablePackagingKey, type ReturnablePackaging,
} from '@/types/returnable-packaging';

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

export function useReturnablePackaging(entityCode: string) {
  const key = returnablePackagingKey(entityCode);
  const [units, setUnits] = useState<ReturnablePackaging[]>(() => ls<ReturnablePackaging>(key));

  const refresh = useCallback(() => setUnits(ls<ReturnablePackaging>(key)), [key]);

  const createUnit = useCallback((u: ReturnablePackaging) => {
    setUnits(prev => {
      const next = [u, ...prev];
      ss(key, next);
      // [JWT] POST /api/inventory/returnable-packaging
      return next;
    });
    toast.success(`${u.unit_no} added`);
  }, [key]);

  const updateUnit = useCallback((id: string, patch: Partial<ReturnablePackaging>) => {
    setUnits(prev => {
      const next = prev.map(x =>
        x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x);
      ss(key, next);
      // [JWT] PATCH /api/inventory/returnable-packaging/:id
      return next;
    });
  }, [key]);

  const deleteUnit = useCallback((id: string) => {
    setUnits(prev => {
      const next = prev.filter(x => x.id !== id);
      ss(key, next);
      return next;
    });
    toast.success('Unit deleted');
  }, [key]);

  const markSent = useCallback((id: string, customerId: string, customerName: string, dlnId: string | null, dueDate: string) => {
    const now = new Date().toISOString();
    updateUnit(id, {
      status: 'with_customer',
      sent_with_dln_id: dlnId,
      sent_to_customer_id: customerId,
      sent_to_customer_name: customerName,
      sent_at: now,
      return_due_date: dueDate,
      current_location: customerName,
      current_godown_id: null,
      current_customer_id: customerId,
    });
    toast.success('Marked as sent');
  }, [updateUnit]);

  const markReturned = useCallback((id: string, condition: 'good' | 'damaged' | 'requires_repair', grnId: string | null) => {
    const now = new Date().toISOString();
    const found = units.find(x => x.id === id);
    updateUnit(id, {
      status: condition === 'damaged' ? 'damaged' : 'returned',
      returned_at: now,
      return_grn_id: grnId,
      return_condition: condition,
      current_location: 'IN_STOCK',
      current_customer_id: null,
      sent_to_customer_id: null,
      current_cycle_count: (found?.current_cycle_count ?? 0) + 1,
    });
    toast.success('Marked as returned');
  }, [units, updateUnit]);

  const markDamaged = useCallback((id: string) => {
    updateUnit(id, { status: 'damaged' });
  }, [updateUnit]);

  const markLost = useCallback((id: string) => {
    updateUnit(id, { status: 'lost' });
  }, [updateUnit]);

  return {
    units, refresh,
    createUnit, updateUnit, deleteUnit,
    markSent, markReturned, markDamaged, markLost,
  };
}
