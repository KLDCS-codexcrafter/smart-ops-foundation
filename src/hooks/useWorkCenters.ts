/**
 * useWorkCenters.ts — CRUD hook for Work Center master (D-572)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/work-centers
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { WorkCenter } from '@/types/work-center';
import { workCentersKey } from '@/types/work-center';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useWorkCenters(factoryId?: string): {
  workCenters: WorkCenter[];
  allWorkCenters: WorkCenter[];
  reload: () => void;
  createWorkCenter: (input: Omit<WorkCenter, 'id' | 'created_at' | 'updated_at'> & { code?: string }) => WorkCenter;
  updateWorkCenter: (id: string, patch: Partial<WorkCenter>) => WorkCenter | null;
  deleteWorkCenter: (id: string) => boolean;
} {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<WorkCenter[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/plant-ops/work-centers?entity={entityCode}
      const raw = localStorage.getItem(workCentersKey(entityCode));
      setItems(raw ? (JSON.parse(raw) as WorkCenter[]) : []);
    } catch {
      setItems([]);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const filtered = useMemo(
    () => (factoryId ? items.filter(w => w.factory_id === factoryId) : items),
    [items, factoryId],
  );

  const persist = (next: WorkCenter[]) => {
    // [JWT] PUT /api/plant-ops/work-centers (bulk replace)
    localStorage.setItem(workCentersKey(entityCode), JSON.stringify(next));
    setItems(next);
  };

  const createWorkCenter = useCallback(
    (input: Omit<WorkCenter, 'id' | 'created_at' | 'updated_at'> & { code?: string }): WorkCenter => {
      const now = new Date().toISOString();
      const maxNum = items
        .map(w => parseInt(w.code.replace(/^WC-/, ''), 10))
        .filter(n => !isNaN(n))
        .reduce((m, n) => Math.max(m, n), 0);
      const code = input.code?.trim() || `WC-${String(maxNum + 1).padStart(3, '0')}`;
      if (items.some(w => w.code === code)) throw new Error(`Work center code ${code} already exists`);
      const wc: WorkCenter = {
        ...input,
        code,
        id: `wc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: now,
        updated_at: now,
      };
      persist([...items, wc]);
      return wc;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  const updateWorkCenter = useCallback(
    (id: string, patch: Partial<WorkCenter>): WorkCenter | null => {
      const idx = items.findIndex(w => w.id === id);
      if (idx < 0) return null;
      const next = [...items];
      next[idx] = { ...next[idx], ...patch, updated_at: new Date().toISOString() };
      persist(next);
      return next[idx];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  const deleteWorkCenter = useCallback(
    (id: string): boolean => {
      const next = items.filter(w => w.id !== id);
      if (next.length === items.length) return false;
      persist(next);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  return {
    workCenters: filtered,
    allWorkCenters: items,
    reload,
    createWorkCenter,
    updateWorkCenter,
    deleteWorkCenter,
  };
}
