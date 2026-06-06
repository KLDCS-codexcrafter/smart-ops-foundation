/**
 * @file        src/lib/lut-engine.ts
 * @purpose     LUT CRUD + 7-state machine + APR-due classifier · Moat #4 LUT-as-Workflow
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q3=c workflow-only · Moat #4 · D-NEW-ET pulse pattern
 */

import type { LUT, LUTStatus, LUTTransition } from '@/types/lut';
import { LUT_LOCALSTORAGE_KEY, LUT_VALID_TRANSITIONS } from '@/types/lut';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.3 · Block 1 · eximx_event
import type { AuditEntityType } from '@/types/audit-trail';

export const listLUTs = (entityId: string): LUT[] => {
  const raw = localStorage.getItem(LUT_LOCALSTORAGE_KEY(entityId));
  return raw ? (JSON.parse(raw) as LUT[]) : [];
};

export const upsertLUT = (entityId: string, lut: LUT): LUT[] => {
  const all = listLUTs(entityId);
  const idx = all.findIndex(x => x.id === lut.id);
  const now = new Date().toISOString();
  const isUpdate = idx >= 0;
  if (idx >= 0) all[idx] = { ...lut, updated_at: now };
  else all.push({ ...lut, created_at: now, updated_at: now });
  localStorage.setItem(LUT_LOCALSTORAGE_KEY(entityId), JSON.stringify(all));
  logAudit({
    entityCode: entityId,
    action: isUpdate ? 'update' : 'create',
    entityType: 'eximx_event' as unknown as AuditEntityType,
    recordId: lut.id,
    recordLabel: `LUT ${lut.lut_arn ?? lut.id}`,
    beforeState: null,
    afterState: { status: lut.status, validity_to: lut.validity_to },
    sourceModule: 'eximx',
  });
  return all;
};

export const transitionLUT = (
  entityId: string,
  lutId: string,
  toStatus: LUTStatus,
  userId: string,
  notes?: string,
): { success: boolean; lut?: LUT; error?: string } => {
  const all = listLUTs(entityId);
  const lut = all.find(x => x.id === lutId);
  if (!lut) return { success: false, error: 'LUT not found' };

  const allowed = LUT_VALID_TRANSITIONS[lut.status] || [];
  if (!allowed.includes(toStatus)) {
    return { success: false, error: `Invalid transition: ${lut.status} → ${toStatus}` };
  }

  const transition: LUTTransition = {
    from_status: lut.status,
    to_status: toStatus,
    transitioned_at: new Date().toISOString(),
    transitioned_by: userId,
    notes,
  };
  const fromStatus = lut.status;
  lut.status = toStatus;
  lut.workflow_history = [...(lut.workflow_history || []), transition];
  lut.updated_at = new Date().toISOString();

  localStorage.setItem(LUT_LOCALSTORAGE_KEY(entityId), JSON.stringify(all));
  logAudit({
    entityCode: entityId,
    action: 'update',
    entityType: 'eximx_event' as unknown as AuditEntityType,
    recordId: lut.id,
    recordLabel: `LUT ${lut.lut_arn ?? lut.id} ${fromStatus}→${toStatus}`,
    beforeState: { status: fromStatus },
    afterState: { status: toStatus },
    sourceModule: 'eximx',
  });
  return { success: true, lut };
};

export type LUTExpiryBucket = 'safe' | 'expiring' | 'renewal-due' | 'expired';

export const classifyLUTExpiry = (lut: LUT, now: Date = new Date()): LUTExpiryBucket => {
  const validityEnd = new Date(lut.validity_to);
  const daysToExpiry = Math.floor((validityEnd.getTime() - now.getTime()) / 86400000);
  if (daysToExpiry < 0) return 'expired';
  if (daysToExpiry <= 30) return 'renewal-due';
  if (daysToExpiry <= 90) return 'expiring';
  return 'safe';
};

export const summarizeLUTExpiry = (entityId: string): { safe: number; expiring: number; renewalDue: number; expired: number; total: number } => {
  const all = listLUTs(entityId);
  const counts = { safe: 0, expiring: 0, renewalDue: 0, expired: 0, total: all.length };
  for (const lut of all) {
    const bucket = classifyLUTExpiry(lut);
    if (bucket === 'safe') counts.safe++;
    else if (bucket === 'expiring') counts.expiring++;
    else if (bucket === 'renewal-due') counts.renewalDue++;
    else counts.expired++;
  }
  return counts;
};
