/**
 * useProjectCentres.ts — Project Centre CRUD hook (mirror of useAssetCentres)
 * Sprint T-Phase-1.1.2-a · Sister to D-218 Asset Centre master
 * Storage: projectCentresKey(entityCode) = erp_project_centres_{entityCode}
 * [JWT] GET/POST/PUT/DELETE /api/projx/project-centres
 */
import { useState, useCallback } from 'react';
import type { ProjectCentre } from '@/types/projx/project-centre';
import { projectCentresKey, PROJECT_CENTRE_SEQ_KEY } from '@/types/projx/project-centre';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function ss<T>(key: string, val: T): void {
  // [JWT] PUT /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(val));
}

function nextProjectCentreCode(entityCode: string): string {
  const key = PROJECT_CENTRE_SEQ_KEY(entityCode);
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  localStorage.setItem(key, String(seq));
  return `PCT-${String(seq).padStart(4, '0')}`;
}

export function useProjectCentres(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = projectCentresKey(entityCode);
  const [centres, setCentres] = useState<ProjectCentre[]>(() => ls<ProjectCentre>(key));

  const refresh = useCallback(() => setCentres(ls<ProjectCentre>(key)), [key]);

  const createProjectCentre = useCallback((data: Omit<ProjectCentre, 'id' | 'code' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const pc: ProjectCentre = {
      ...data,
      id: `pc-${Date.now()}`,
      code: nextProjectCentreCode(entityCode),
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<ProjectCentre>(key), pc];
    ss(key, all);
    setCentres(all);
    // [JWT] POST /api/projx/project-centres
    return pc;
  }, [key, entityCode]);

  const updateProjectCentre = useCallback((id: string, patch: Partial<Omit<ProjectCentre, 'id' | 'code' | 'created_at'>>) => {
    const all = ls<ProjectCentre>(key).map(pc =>
      pc.id === id ? { ...pc, ...patch, updated_at: new Date().toISOString() } : pc);
    ss(key, all);
    setCentres(all);
    // [JWT] PATCH /api/projx/project-centres/:id
  }, [key]);

  const deleteProjectCentre = useCallback((id: string) => {
    // soft delete by toggling inactive — preserves FK integrity
    const all = ls<ProjectCentre>(key).map(pc =>
      pc.id === id ? { ...pc, status: 'inactive' as const, updated_at: new Date().toISOString() } : pc);
    ss(key, all);
    setCentres(all);
    // [JWT] DELETE /api/projx/project-centres/:id
  }, [key]);

  const toggleActive = useCallback((id: string) => {
    const current = ls<ProjectCentre>(key).find(pc => pc.id === id);
    if (!current) return;
    updateProjectCentre(id, {
      status: current.status === 'active' ? 'inactive' : 'active',
    });
  }, [key, updateProjectCentre]);

  return { centres, createProjectCentre, updateProjectCentre, deleteProjectCentre, toggleActive, refresh };
}
