/**
 * @file        src/lib/comply360-ims-engine.ts
 * @purpose     IMS (Invoice Management System) pre-filing state · GSTN buyer-action tracker
 * @sprint      Sprint 70a · T-Phase-5.A.1.2-PASS-A · Block 4 · Q-LOCK-3-P1-C
 * @decisions   D-S69-1 (100% native) · DP-S70-3 (IMS engine) · DP-S70-6 (3-state model)
 * @iso         Reliability · Auditability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure
 */
import { z } from 'zod';
import { readStorageOr } from './typed-storage';

export type IMSStatus = 'pending' | 'accepted' | 'rejected' | 'kept_pending';

export interface IMSAction {
  id: string;
  entity_id: string;
  gstin: string;
  return_period: string;        // 'MM-YYYY'
  source_invoice_ref: string;
  supplier_gstin: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  status: IMSStatus;
  action_at?: string;           // ISO timestamp when user acted
  action_user?: string;
  reason?: string;
}

const IMSActionSchema = z.object({
  id: z.string(),
  entity_id: z.string(),
  gstin: z.string(),
  return_period: z.string(),
  source_invoice_ref: z.string(),
  supplier_gstin: z.string(),
  taxable_value: z.number(),
  igst: z.number(),
  cgst: z.number(),
  sgst: z.number(),
  status: z.enum(['pending', 'accepted', 'rejected', 'kept_pending']),
  action_at: z.string().optional(),
  action_user: z.string().optional(),
  reason: z.string().optional(),
});

const IMSArraySchema = z.array(IMSActionSchema);

export const imsStorageKey = (entity_id: string, return_period: string): string =>
  `comply360.ims.${entity_id}.${return_period}`;

// [JWT] GET /api/comply360/ims?entity_id=<id>&return_period=<period> · Phase 2 migration
export function loadIMSActions(entity_id: string, return_period: string): IMSAction[] {
  return readStorageOr(imsStorageKey(entity_id, return_period), IMSArraySchema, []);
}

// [JWT] POST /api/comply360/ims/action · Phase 2 migration
export function recordIMSAction(
  action: Omit<IMSAction, 'action_at' | 'action_user'>,
): IMSAction[] {
  const list = loadIMSActions(action.entity_id, action.return_period);
  const idx = list.findIndex(a => a.id === action.id);
  const next: IMSAction = {
    ...action,
    action_at: new Date().toISOString(),
    action_user: 'current-user', // Phase 2 · resolve from auth context
  };
  const updated = idx >= 0
    ? [...list.slice(0, idx), next, ...list.slice(idx + 1)]
    : [...list, next];
  try {
    localStorage.setItem(
      imsStorageKey(action.entity_id, action.return_period),
      JSON.stringify(updated),
    );
  } catch { /* quota — diagnostics handled by useStorageQuota */ }
  return updated;
}

export function getIMSPendingCount(entity_id: string, return_period: string): number {
  return loadIMSActions(entity_id, return_period).filter(a => a.status === 'pending').length;
}

// [JWT] POST /api/comply360/ims/bulk-accept · Phase 2 migration
export function bulkAcceptIMS(
  entity_id: string,
  return_period: string,
  invoice_refs: string[],
): IMSAction[] {
  const list = loadIMSActions(entity_id, return_period);
  const updated = list.map(a =>
    invoice_refs.includes(a.source_invoice_ref)
      ? {
          ...a,
          status: 'accepted' as const,
          action_at: new Date().toISOString(),
          action_user: 'current-user',
        }
      : a,
  );
  try {
    localStorage.setItem(
      imsStorageKey(entity_id, return_period),
      JSON.stringify(updated),
    );
  } catch { /* quota */ }
  return updated;
}

export const IMS_VALID_STATUSES: readonly IMSStatus[] =
  ['pending', 'accepted', 'rejected', 'kept_pending'] as const;
