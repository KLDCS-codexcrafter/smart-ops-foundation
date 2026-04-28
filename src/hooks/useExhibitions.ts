/**
 * useExhibitions.ts — CRUD for Exhibition master + Visitor book
 * [JWT] /api/salesx/exhibitions · /api/salesx/exhibition-visitors
 */
import { useState, useCallback } from 'react';
import type { Exhibition, ExhibitionVisitor } from '@/types/exhibition';
import { exhibitionsKey, exhibitionVisitorsKey } from '@/types/exhibition';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]') as T[];
  } catch { return []; }
}

export function useExhibitions(entityCode: string) {
  const exKey = exhibitionsKey(entityCode);
  const visKey = exhibitionVisitorsKey(entityCode);

  const [exhibitions, setExhibitions] = useState<Exhibition[]>(() => ls<Exhibition>(exKey));
  const [visitors, setVisitors] = useState<ExhibitionVisitor[]>(() => ls<ExhibitionVisitor>(visKey));

  const persistEx = useCallback((next: Exhibition[]) => {
    // [JWT] POST /api/salesx/exhibitions
    localStorage.setItem(exKey, JSON.stringify(next)); setExhibitions(next);
  }, [exKey]);

  const persistVis = useCallback((next: ExhibitionVisitor[]) => {
    // [JWT] POST /api/salesx/exhibition-visitors
    localStorage.setItem(visKey, JSON.stringify(next)); setVisitors(next);
  }, [visKey]);

  const saveExhibition = useCallback((
    data: Omit<Exhibition, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<Exhibition>(exKey);
    if (data.id) {
      const idx = list.findIndex(e => e.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `exh-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistEx(list); return list;
  }, [exKey, persistEx]);

  const deleteExhibition = useCallback((id: string) => {
    persistEx(ls<Exhibition>(exKey).filter(e => e.id !== id));
    persistVis(ls<ExhibitionVisitor>(visKey).filter(v => v.exhibition_id !== id));
  }, [exKey, visKey, persistEx, persistVis]);

  const saveVisitor = useCallback((
    data: Omit<ExhibitionVisitor, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<ExhibitionVisitor>(visKey);
    if (data.id) {
      const idx = list.findIndex(v => v.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `vis-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistVis(list); return list;
  }, [visKey, persistVis]);

  const deleteVisitor = useCallback((id: string) => {
    persistVis(ls<ExhibitionVisitor>(visKey).filter(v => v.id !== id));
  }, [visKey, persistVis]);

  const visitorsForExhibition = useCallback((exhibitionId: string) =>
    visitors.filter(v => v.exhibition_id === exhibitionId), [visitors]);

  return {
    exhibitions, visitors,
    saveExhibition, deleteExhibition,
    saveVisitor, deleteVisitor,
    visitorsForExhibition,
  };
}
