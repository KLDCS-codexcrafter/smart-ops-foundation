/**
 * useProjectMilestones.ts — CRUD for milestones · auto-creates invoice schedule
 * Sprint T-Phase-1.1.2-b
 * [JWT] /api/projx/milestones
 */
import { useState, useCallback } from 'react';
import type { ProjectMilestone } from '@/types/projx/project-milestone';
import { projectMilestonesKey, MILESTONE_SEQ_KEY } from '@/types/projx/project-milestone';
import { dMul, round2 } from '@/lib/decimal-helpers';
import { useProjectInvoiceSchedule } from '@/hooks/useProjectInvoiceSchedule';
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

export function nextMilestoneNo(entityCode: string, projectId: string): string {
  const seqKey = MILESTONE_SEQ_KEY(entityCode, projectId);
  const raw = localStorage.getItem(seqKey);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  localStorage.setItem(seqKey, String(seq));
  return `M-${String(seq).padStart(2, '0')}`;
}

export function computeMilestoneInvoiceAmount(contractValue: number, invoicePct: number): number {
  return round2(dMul(contractValue, invoicePct) / 100);
}

export type CreateMilestoneInput = Omit<ProjectMilestone,
  'id' | 'entity_id' | 'milestone_no' | 'created_at' | 'updated_at' |
  'is_billed' | 'invoice_voucher_id' | 'invoice_voucher_no' | 'actual_completion_date' | 'invoice_amount'
>;

export function useProjectMilestones(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = projectMilestonesKey(entityCode);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>(() => ls<ProjectMilestone>(key));
  const { createSchedule } = useProjectInvoiceSchedule(entityCode);

  const refresh = useCallback(() => setMilestones(ls<ProjectMilestone>(key)), [key]);

  /**
   * Creates milestone AND auto-generates a ProjectInvoiceSchedule entry
   * (Q4 lock from 1.1.2-b discussion).
   */
  const createMilestone = useCallback((
    input: CreateMilestoneInput,
    contractValue: number,
  ): ProjectMilestone => {
    const now = new Date().toISOString();
    const invoiceAmount = computeMilestoneInvoiceAmount(contractValue, input.invoice_pct);
    const ms: ProjectMilestone = {
      ...input,
      id: `ms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: entityCode,
      milestone_no: nextMilestoneNo(entityCode, input.project_id),
      invoice_amount: invoiceAmount,
      is_billed: false,
      invoice_voucher_id: null,
      invoice_voucher_no: null,
      actual_completion_date: null,
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<ProjectMilestone>(key), ms];
    ss(key, all);
    setMilestones(all);
    // [JWT] POST /api/projx/milestones
    // Auto-create invoice schedule entry
    createSchedule({
      project_id: ms.project_id,
      project_centre_id: ms.project_centre_id,
      milestone_id: ms.id,
      scheduled_date: ms.target_date,
      amount: invoiceAmount,
      description: `Invoice for milestone ${ms.milestone_no} — ${ms.milestone_name}`,
    });
    return ms;
  }, [key, entityCode, createSchedule]);

  const updateMilestone = useCallback((
    id: string,
    patch: Partial<Omit<ProjectMilestone, 'id' | 'entity_id' | 'milestone_no' | 'created_at'>>,
    contractValue?: number,
  ) => {
    const all = ls<ProjectMilestone>(key).map(m => {
      if (m.id !== id) return m;
      const next = { ...m, ...patch, updated_at: new Date().toISOString() };
      if (patch.invoice_pct !== undefined && contractValue !== undefined) {
        next.invoice_amount = computeMilestoneInvoiceAmount(contractValue, patch.invoice_pct);
      }
      return next;
    });
    ss(key, all);
    setMilestones(all);
    // [JWT] PATCH /api/projx/milestones/:id
  }, [key]);

  const deleteMilestone = useCallback((id: string): { ok: true } | { ok: false; reason: string } => {
    const target = ls<ProjectMilestone>(key).find(m => m.id === id);
    if (!target) return { ok: false, reason: 'Milestone not found' };
    if (target.is_billed) return { ok: false, reason: 'Cannot delete a billed milestone — reverse the invoice first' };
    const all = ls<ProjectMilestone>(key).filter(m => m.id !== id);
    ss(key, all);
    setMilestones(all);
    // [JWT] DELETE /api/projx/milestones/:id
    return { ok: true };
  }, [key]);

  const markBilled = useCallback((id: string) => {
    const now = new Date().toISOString();
    const all = ls<ProjectMilestone>(key).map(m =>
      m.id === id ? { ...m, is_billed: true, updated_at: now } : m);
    ss(key, all);
    setMilestones(all);
  }, [key]);

  const getMilestonesByProject = useCallback((projectId: string) =>
    ls<ProjectMilestone>(key).filter(m => m.project_id === projectId),
  [key]);

  return {
    milestones, createMilestone, updateMilestone, deleteMilestone,
    markBilled, getMilestonesByProject, refresh,
  };
}
