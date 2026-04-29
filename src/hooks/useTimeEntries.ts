/**
 * useTimeEntries.ts — CRUD for project time entries · approval workflow
 * Sprint T-Phase-1.1.2-b
 * [JWT] /api/projx/time-entries
 */
import { useState, useCallback } from 'react';
import type { TimeEntry, TimeEntryStatus } from '@/types/projx/time-entry';
import { timeEntriesKey } from '@/types/projx/time-entry';
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

export type CreateTimeEntryInput = Omit<TimeEntry,
  'id' | 'entity_id' | 'status' | 'approved_by_id' | 'approved_by_name' |
  'approved_at' | 'rejection_reason' | 'created_at' | 'updated_at'
> & { status?: TimeEntryStatus };

export function useTimeEntries(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = timeEntriesKey(entityCode);
  const [entries, setEntries] = useState<TimeEntry[]>(() => ls<TimeEntry>(key));

  const refresh = useCallback(() => setEntries(ls<TimeEntry>(key)), [key]);

  const createTimeEntry = useCallback((input: CreateTimeEntryInput): TimeEntry => {
    const now = new Date().toISOString();
    const t: TimeEntry = {
      ...input,
      id: `te-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      status: input.status ?? 'draft',
      approved_by_id: null,
      approved_by_name: null,
      approved_at: null,
      rejection_reason: null,
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<TimeEntry>(key), t];
    ss(key, all);
    setEntries(all);
    // [JWT] POST /api/projx/time-entries
    return t;
  }, [key, entityCode]);

  const updateTimeEntry = useCallback((
    id: string,
    patch: Partial<Omit<TimeEntry, 'id' | 'entity_id' | 'status' | 'approved_by_id' | 'approved_by_name' | 'approved_at' | 'rejection_reason' | 'created_at'>>,
  ): { ok: true } | { ok: false; reason: string } => {
    const all = ls<TimeEntry>(key);
    const target = all.find(t => t.id === id);
    if (!target) return { ok: false, reason: 'Time entry not found' };
    if (target.status !== 'draft') return { ok: false, reason: 'Only draft time entries can be edited' };
    const next = all.map(t => t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t);
    ss(key, next);
    setEntries(next);
    // [JWT] PATCH /api/projx/time-entries/:id
    return { ok: true };
  }, [key]);

  const deleteTimeEntry = useCallback((id: string): { ok: true } | { ok: false; reason: string } => {
    const target = ls<TimeEntry>(key).find(t => t.id === id);
    if (!target) return { ok: false, reason: 'Time entry not found' };
    if (target.status !== 'draft') return { ok: false, reason: 'Only draft entries can be deleted' };
    const all = ls<TimeEntry>(key).filter(t => t.id !== id);
    ss(key, all);
    setEntries(all);
    return { ok: true };
  }, [key]);

  const submitTimeEntry = useCallback((id: string): { ok: true } | { ok: false; reason: string } => {
    const all = ls<TimeEntry>(key);
    const target = all.find(t => t.id === id);
    if (!target) return { ok: false, reason: 'Time entry not found' };
    if (target.status !== 'draft') return { ok: false, reason: `Cannot submit entry in '${target.status}' state` };
    const next = all.map(t => t.id === id ? { ...t, status: 'submitted' as TimeEntryStatus, updated_at: new Date().toISOString() } : t);
    ss(key, next);
    setEntries(next);
    return { ok: true };
  }, [key]);

  const approveTimeEntry = useCallback((id: string, approver: { id: string; name: string }): { ok: true } | { ok: false; reason: string } => {
    const all = ls<TimeEntry>(key);
    const target = all.find(t => t.id === id);
    if (!target) return { ok: false, reason: 'Time entry not found' };
    if (target.status !== 'submitted') return { ok: false, reason: `Cannot approve entry in '${target.status}' state` };
    const now = new Date().toISOString();
    const next = all.map(t => t.id === id ? {
      ...t, status: 'approved' as TimeEntryStatus,
      approved_by_id: approver.id, approved_by_name: approver.name, approved_at: now,
      updated_at: now,
    } : t);
    ss(key, next);
    setEntries(next);
    return { ok: true };
  }, [key]);

  const rejectTimeEntry = useCallback((id: string, approver: { id: string; name: string }, reason: string): { ok: true } | { ok: false; reason: string } => {
    if (!reason.trim()) return { ok: false, reason: 'Rejection reason required' };
    const all = ls<TimeEntry>(key);
    const target = all.find(t => t.id === id);
    if (!target) return { ok: false, reason: 'Time entry not found' };
    if (target.status !== 'submitted') return { ok: false, reason: `Cannot reject entry in '${target.status}' state` };
    const now = new Date().toISOString();
    const next = all.map(t => t.id === id ? {
      ...t, status: 'rejected' as TimeEntryStatus,
      approved_by_id: approver.id, approved_by_name: approver.name, approved_at: now,
      rejection_reason: reason, updated_at: now,
    } : t);
    ss(key, next);
    setEntries(next);
    return { ok: true };
  }, [key]);

  const getEntriesByProject = useCallback((projectId: string) =>
    ls<TimeEntry>(key).filter(t => t.project_id === projectId),
  [key]);

  const getEntriesByPerson = useCallback((personId: string) =>
    ls<TimeEntry>(key).filter(t => t.person_id === personId),
  [key]);

  return {
    entries, createTimeEntry, updateTimeEntry, deleteTimeEntry,
    submitTimeEntry, approveTimeEntry, rejectTimeEntry,
    getEntriesByProject, getEntriesByPerson, refresh,
  };
}
