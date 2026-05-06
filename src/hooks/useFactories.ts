/**
 * useFactories.ts — CRUD hook for Factory master (D-570)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/factories
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { Factory } from '@/types/factory';
import { factoriesKey } from '@/types/factory';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { useDepartmentVisibility } from '@/hooks/useDepartmentVisibility';

export function useFactories(): {
  factories: Factory[];
  allFactories: Factory[];
  reload: () => void;
  createFactory: (input: Omit<Factory, 'id' | 'created_at' | 'updated_at'> & { code?: string }) => Factory;
  updateFactory: (id: string, patch: Partial<Factory>) => Factory | null;
  deleteFactory: (id: string) => boolean;
} {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('production');
  const [factories, setFactories] = useState<Factory[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/plant-ops/factories?entity={entityCode}
      const raw = localStorage.getItem(factoriesKey(entityCode));
      setFactories(raw ? (JSON.parse(raw) as Factory[]) : []);
    } catch {
      setFactories([]);
    }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const visibleFactories = useMemo(() => {
    if (visibility.canViewAllDepartments) return factories;
    if (!visibility.myDepartmentId) return factories;
    return factories.filter(
      f => f.department_ids.length === 0 || f.department_ids.includes(visibility.myDepartmentId!),
    );
  }, [factories, visibility]);

  const persist = (next: Factory[]) => {
    // [JWT] PUT /api/plant-ops/factories (bulk replace)
    localStorage.setItem(factoriesKey(entityCode), JSON.stringify(next));
    setFactories(next);
  };

  const createFactory = useCallback(
    (input: Omit<Factory, 'id' | 'created_at' | 'updated_at'> & { code?: string }): Factory => {
      const now = new Date().toISOString();
      const maxNum = factories
        .map(f => parseInt(f.code.replace(/^FAC-/, ''), 10))
        .filter(n => !isNaN(n))
        .reduce((m, n) => Math.max(m, n), 0);
      const code = input.code?.trim() || `FAC-${String(maxNum + 1).padStart(3, '0')}`;
      if (factories.some(f => f.code === code)) {
        throw new Error(`Factory code ${code} already exists`);
      }
      const factory: Factory = {
        ...input,
        code,
        id: `fac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        created_at: now,
        updated_at: now,
      };
      persist([...factories, factory]);
      return factory;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factories, entityCode],
  );

  const updateFactory = useCallback(
    (id: string, patch: Partial<Factory>): Factory | null => {
      const idx = factories.findIndex(f => f.id === id);
      if (idx < 0) return null;
      const next = [...factories];
      next[idx] = { ...next[idx], ...patch, updated_at: new Date().toISOString() };
      persist(next);
      return next[idx];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factories, entityCode],
  );

  const deleteFactory = useCallback(
    (id: string): boolean => {
      const filtered = factories.filter(f => f.id !== id);
      if (filtered.length === factories.length) return false;
      persist(filtered);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [factories, entityCode],
  );

  return {
    factories: visibleFactories,
    allFactories: factories,
    reload,
    createFactory,
    updateFactory,
    deleteFactory,
  };
}
