/**
 * useProjects.ts — Project CRUD hook + status transitions + soft delete
 * Sprint T-Phase-1.1.2-a · Tier 1 Card #1
 * Storage: projectsKey(entityCode) = erp_projects_{entityCode}
 * [JWT] GET/POST/PUT/DELETE /api/projx/projects
 */
import { useState, useCallback } from 'react';
import type { Project, ProjectStatus } from '@/types/projx/project';
import { projectsKey } from '@/types/projx/project';
import { canTransitionStatus, makeStatusEvent, makeInitialStatusEvent, nextProjectCode } from '@/lib/projx-engine';
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

export type CreateProjectInput = Omit<Project,
  'id' | 'project_no' | 'entity_id' | 'created_at' | 'updated_at' |
  'status_history' | 'milestone_count' | 'milestones_completed' |
  'change_request_count' | 'billed_to_date' | 'cost_to_date' | 'margin_pct' |
  'schedule_risk_index' | 'actual_end_date' | 'deleted_at' | 'deleted_by_id' | 'deletion_reason'
>;

export function useProjects(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = projectsKey(entityCode);
  const [projects, setProjects] = useState<Project[]>(() => ls<Project>(key));

  const refresh = useCallback(() => setProjects(ls<Project>(key)), [key]);

  const createProject = useCallback((
    input: CreateProjectInput,
    createdBy: { id: string; name: string },
  ): Project => {
    const now = new Date().toISOString();
    const initialEvent = makeInitialStatusEvent(createdBy, input.status);
    const project: Project = {
      ...input,
      id: `prj-${Date.now()}`,
      entity_id: entityCode,
      project_no: nextProjectCode(entityCode),
      status_history: [initialEvent],
      milestone_count: 0,
      milestones_completed: 0,
      change_request_count: 0,
      billed_to_date: 0,
      cost_to_date: 0,
      margin_pct: 0,
      schedule_risk_index: null,
      actual_end_date: null,
      deleted_at: null,
      deleted_by_id: null,
      deletion_reason: null,
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<Project>(key), project];
    ss(key, all);
    setProjects(all);
    // [JWT] POST /api/projx/projects
    return project;
  }, [key, entityCode]);

  const updateProject = useCallback((
    id: string,
    patch: Partial<Omit<Project, 'id' | 'project_no' | 'entity_id' | 'created_at' | 'status_history'>>,
  ) => {
    const all = ls<Project>(key).map(p =>
      p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p);
    ss(key, all);
    setProjects(all);
    // [JWT] PATCH /api/projx/projects/:id
  }, [key]);

  /** Append a status transition · the only way status changes */
  const transitionStatus = useCallback((
    projectId: string,
    toStatus: ProjectStatus,
    changedBy: { id: string; name: string },
    note: string,
  ): { ok: true } | { ok: false; reason: string } => {
    const all = ls<Project>(key);
    const idx = all.findIndex(p => p.id === projectId);
    if (idx === -1) return { ok: false, reason: 'Project not found' };
    const current = all[idx];
    const check = canTransitionStatus(current.status, toStatus);
    if (!check.ok) return check;
    if (current.status === toStatus) return { ok: true };
    const event = makeStatusEvent(current.status, toStatus, changedBy, note);
    all[idx] = {
      ...current,
      status: toStatus,
      status_history: [...current.status_history, event],
      actual_end_date: toStatus === 'completed' ? new Date().toISOString().slice(0, 10) : current.actual_end_date,
      updated_at: new Date().toISOString(),
    };
    ss(key, all);
    setProjects(all);
    // [JWT] PATCH /api/projx/projects/:id/status
    return { ok: true };
  }, [key]);

  /** Soft delete with audit */
  const softDelete = useCallback((
    projectId: string,
    deletedBy: { id: string; name: string },
    reason: string,
  ): { ok: true } | { ok: false; reason: string } => {
    const all = ls<Project>(key);
    const idx = all.findIndex(p => p.id === projectId);
    if (idx === -1) return { ok: false, reason: 'Project not found' };
    if (!reason.trim()) return { ok: false, reason: 'Deletion reason required' };
    const current = all[idx];
    const now = new Date().toISOString();
    const event = makeStatusEvent(current.status, 'cancelled', deletedBy, `Soft delete: ${reason}`);
    all[idx] = {
      ...current,
      is_active: false,
      deleted_at: now,
      deleted_by_id: deletedBy.id,
      deletion_reason: reason,
      status_history: [...current.status_history, event],
      updated_at: now,
    };
    ss(key, all);
    setProjects(all);
    // [JWT] DELETE /api/projx/projects/:id
    return { ok: true };
  }, [key]);

  return { projects, createProject, updateProject, transitionStatus, softDelete, refresh };
}
