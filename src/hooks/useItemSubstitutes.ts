/**
 * useItemSubstitutes.ts — CRUD for ItemSubstitute records.
 * Sprint T-Phase-1.2.5
 * [JWT] GET/POST/PATCH /api/inventory/item-substitutes
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { itemSubstitutesKey, type ItemSubstitute } from '@/types/item-substitute';

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

export function useItemSubstitutes(entityCode: string) {
  const key = itemSubstitutesKey(entityCode);
  const [subs, setSubs] = useState<ItemSubstitute[]>(() => ls<ItemSubstitute>(key));

  const refresh = useCallback(() => setSubs(ls<ItemSubstitute>(key)), [key]);

  const createSubstitute = useCallback((s: ItemSubstitute) => {
    setSubs(prev => {
      const next = [s, ...prev];
      ss(key, next);
      // [JWT] POST /api/inventory/item-substitutes
      return next;
    });
    toast.success(`Substitute "${s.substitute_item_name}" linked`);
  }, [key]);

  const updateSubstitute = useCallback((id: string, patch: Partial<ItemSubstitute>) => {
    setSubs(prev => {
      const next = prev.map(x =>
        x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x);
      ss(key, next);
      // [JWT] PATCH /api/inventory/item-substitutes/:id
      return next;
    });
  }, [key]);

  const deleteSubstitute = useCallback((id: string) => {
    setSubs(prev => {
      const next = prev.filter(x => x.id !== id);
      ss(key, next);
      // [JWT] DELETE /api/inventory/item-substitutes/:id
      return next;
    });
    toast.success('Substitute removed');
  }, [key]);

  /** Returns approved + active substitutes for the given primary item. */
  const getSubstitutesForItem = useCallback((primaryItemId: string): ItemSubstitute[] => {
    const today = new Date().toISOString().slice(0, 10);
    return subs.filter(s =>
      s.primary_item_id === primaryItemId
      && s.is_active
      && s.approval_status === 'approved'
      && s.effective_from <= today
      && (!s.effective_until || s.effective_until >= today),
    );
  }, [subs]);

  /** Increment used_count + last_used_at on a substitute (called from MIN "Use This"). */
  const recordUsage = useCallback((id: string) => {
    const now = new Date().toISOString();
    setSubs(prev => {
      const next = prev.map(x =>
        x.id === id
          ? { ...x, used_count: x.used_count + 1, last_used_at: now, updated_at: now }
          : x);
      ss(key, next);
      // [JWT] POST /api/inventory/item-substitutes/:id/usage
      return next;
    });
  }, [key]);

  return {
    subs, refresh,
    createSubstitute, updateSubstitute, deleteSubstitute,
    getSubstitutesForItem, recordUsage,
  };
}
