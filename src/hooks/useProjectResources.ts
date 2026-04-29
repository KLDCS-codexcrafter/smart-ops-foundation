/**
 * useProjectResources.ts — CRUD for project resource allocations
 * Sprint T-Phase-1.1.2-b
 * [JWT] /api/projx/resources
 */
import { useState, useCallback } from 'react';
import type { ProjectResource } from '@/types/projx/project-resource';
import { projectResourcesKey, hasOverlappingAllocation } from '@/types/projx/project-resource';
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

export type CreateResourceInput = Omit<ProjectResource,
  'id' | 'entity_id' | 'created_at' | 'updated_at'
>;

export function useProjectResources(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = projectResourcesKey(entityCode);
  const [resources, setResources] = useState<ProjectResource[]>(() => ls<ProjectResource>(key));

  const refresh = useCallback(() => setResources(ls<ProjectResource>(key)), [key]);

  const createResource = useCallback((input: CreateResourceInput): ProjectResource => {
    const now = new Date().toISOString();
    const r: ProjectResource = {
      ...input,
      id: `pr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<ProjectResource>(key), r];
    ss(key, all);
    setResources(all);
    // [JWT] POST /api/projx/resources
    return r;
  }, [key, entityCode]);

  const updateResource = useCallback((id: string, patch: Partial<Omit<ProjectResource, 'id' | 'entity_id' | 'created_at'>>) => {
    const all = ls<ProjectResource>(key).map(r =>
      r.id === id ? { ...r, ...patch, updated_at: new Date().toISOString() } : r);
    ss(key, all);
    setResources(all);
    // [JWT] PATCH /api/projx/resources/:id
  }, [key]);

  const deleteResource = useCallback((id: string) => {
    const all = ls<ProjectResource>(key).filter(r => r.id !== id);
    ss(key, all);
    setResources(all);
    // [JWT] DELETE /api/projx/resources/:id
  }, [key]);

  const checkOverlap = useCallback((personId: string, projectId: string, fromISO: string, untilISO: string | null, excludeId?: string) =>
    hasOverlappingAllocation(ls<ProjectResource>(key), personId, projectId, fromISO, untilISO, excludeId),
  [key]);

  const getResourcesByPerson = useCallback((personId: string) =>
    ls<ProjectResource>(key).filter(r => r.person_id === personId && r.is_active),
  [key]);

  const getResourcesByProject = useCallback((projectId: string) =>
    ls<ProjectResource>(key).filter(r => r.project_id === projectId),
  [key]);

  return {
    resources, createResource, updateResource, deleteResource, checkOverlap,
    getResourcesByPerson, getResourcesByProject, refresh,
  };
}
