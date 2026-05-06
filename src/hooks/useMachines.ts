/**
 * useMachines.ts — CRUD hook for Machine master (D-573)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/machines
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Machine } from '@/types/machine';
import { machinesKey } from '@/types/machine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useMachines(filter?: { factoryId?: string; workCenterId?: string }): {
  machines: Machine[];
  allMachines: Machine[];
  reload: () => void;
  createMachine: (input: Omit<Machine, 'id' | 'created_at' | 'updated_at'> & { code?: string }) => Machine;
  updateMachine: (id: string, patch: Partial<Machine>) => Machine | null;
  deleteMachine: (id: string) => boolean;
} {
  const { entityCode } = useEntityCode();
  const [items, setItems] = useState<Machine[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/plant-ops/machines?entity={entityCode}
      const raw = localStorage.getItem(machinesKey(entityCode));
      setItems(raw ? (JSON.parse(raw) as Machine[]) : []);
    } catch {
      setItems([]);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const filtered = useMemo(() => {
    return items.filter(m => {
      if (filter?.factoryId && m.factory_id !== filter.factoryId) return false;
      if (filter?.workCenterId && m.work_center_id !== filter.workCenterId) return false;
      return true;
    });
  }, [items, filter?.factoryId, filter?.workCenterId]);

  const persist = (next: Machine[]) => {
    // [JWT] PUT /api/plant-ops/machines (bulk replace)
    localStorage.setItem(machinesKey(entityCode), JSON.stringify(next));
    setItems(next);
  };

  const createMachine = useCallback(
    (input: Omit<Machine, 'id' | 'created_at' | 'updated_at'> & { code?: string }): Machine => {
      const now = new Date().toISOString();
      const maxNum = items
        .map(m => parseInt(m.code.replace(/^MCH-/, ''), 10))
        .filter(n => !isNaN(n))
        .reduce((m, n) => Math.max(m, n), 0);
      const code = input.code?.trim() || `MCH-${String(maxNum + 1).padStart(3, '0')}`;
      if (items.some(m => m.code === code)) throw new Error(`Machine code ${code} already exists`);
      const machine: Machine = {
        ...input,
        code,
        id: `mch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: now,
        updated_at: now,
      };
      persist([...items, machine]);
      return machine;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  const updateMachine = useCallback(
    (id: string, patch: Partial<Machine>): Machine | null => {
      const idx = items.findIndex(m => m.id === id);
      if (idx < 0) return null;
      const next = [...items];
      next[idx] = { ...next[idx], ...patch, updated_at: new Date().toISOString() };
      persist(next);
      return next[idx];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  const deleteMachine = useCallback(
    (id: string): boolean => {
      const next = items.filter(m => m.id !== id);
      if (next.length === items.length) return false;
      persist(next);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, entityCode],
  );

  return {
    machines: filtered,
    allMachines: items,
    reload,
    createMachine,
    updateMachine,
    deleteMachine,
  };
}
