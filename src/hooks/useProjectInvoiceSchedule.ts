/**
 * useProjectInvoiceSchedule.ts — CRUD for project invoice schedules
 * Sprint T-Phase-1.1.2-b
 * [JWT] /api/projx/invoice-schedules
 */
import { useState, useCallback } from 'react';
import type { ProjectInvoiceSchedule } from '@/types/projx/project-invoice-schedule';
import { projectInvoiceScheduleKey } from '@/types/projx/project-invoice-schedule';
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

export type CreateScheduleInput = Omit<ProjectInvoiceSchedule,
  'id' | 'entity_id' | 'created_at' | 'updated_at' |
  'is_invoiced' | 'invoiced_voucher_id' | 'invoiced_voucher_no' | 'invoiced_at'
> & {
  is_invoiced?: boolean;
};

export function useProjectInvoiceSchedule(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = projectInvoiceScheduleKey(entityCode);
  const [schedules, setSchedules] = useState<ProjectInvoiceSchedule[]>(() => ls<ProjectInvoiceSchedule>(key));

  const refresh = useCallback(() => setSchedules(ls<ProjectInvoiceSchedule>(key)), [key]);

  const createSchedule = useCallback((input: CreateScheduleInput): ProjectInvoiceSchedule => {
    const now = new Date().toISOString();
    const entry: ProjectInvoiceSchedule = {
      ...input,
      id: `pis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      is_invoiced: input.is_invoiced ?? false,
      invoiced_voucher_id: null,
      invoiced_voucher_no: null,
      invoiced_at: null,
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<ProjectInvoiceSchedule>(key), entry];
    ss(key, all);
    setSchedules(all);
    // [JWT] POST /api/projx/invoice-schedules
    return entry;
  }, [key, entityCode]);

  const updateSchedule = useCallback((id: string, patch: Partial<ProjectInvoiceSchedule>) => {
    const all = ls<ProjectInvoiceSchedule>(key).map(s =>
      s.id === id ? { ...s, ...patch, updated_at: new Date().toISOString() } : s);
    ss(key, all);
    setSchedules(all);
    // [JWT] PATCH /api/projx/invoice-schedules/:id
  }, [key]);

  const deleteSchedule = useCallback((id: string): { ok: true } | { ok: false; reason: string } => {
    const all = ls<ProjectInvoiceSchedule>(key);
    const target = all.find(s => s.id === id);
    if (!target) return { ok: false, reason: 'Schedule not found' };
    if (target.is_invoiced) return { ok: false, reason: 'Cannot delete invoiced schedule entry' };
    ss(key, all.filter(s => s.id !== id));
    setSchedules(all.filter(s => s.id !== id));
    // [JWT] DELETE /api/projx/invoice-schedules/:id
    return { ok: true };
  }, [key]);

  const markInvoiced = useCallback((
    id: string,
    voucherInfo: { voucher_id: string | null; voucher_no: string | null },
  ) => {
    const now = new Date().toISOString();
    const all = ls<ProjectInvoiceSchedule>(key).map(s =>
      s.id === id ? {
        ...s,
        is_invoiced: true,
        invoiced_voucher_id: voucherInfo.voucher_id,
        invoiced_voucher_no: voucherInfo.voucher_no,
        invoiced_at: now,
        updated_at: now,
      } : s);
    ss(key, all);
    setSchedules(all);
  }, [key]);

  const getScheduleByProject = useCallback((projectId: string) =>
    ls<ProjectInvoiceSchedule>(key).filter(s => s.project_id === projectId),
  [key]);

  const getScheduleByMonth = useCallback((yearMonth: string) =>
    ls<ProjectInvoiceSchedule>(key).filter(s => s.scheduled_date.startsWith(yearMonth)),
  [key]);

  return {
    schedules, createSchedule, updateSchedule, deleteSchedule,
    markInvoiced, getScheduleByProject, getScheduleByMonth, refresh,
  };
}
