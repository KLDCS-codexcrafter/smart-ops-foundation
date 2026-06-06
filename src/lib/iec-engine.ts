/**
 * @file        src/lib/iec-engine.ts
 * @purpose     IEC CRUD engine + validity classifier (3-bucket: valid / expiring-90d / expired)
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   v10 FINAL Q15=b · D-NEW-ET pulse pattern
 */

import type { IEC } from '@/types/iec';
import { IEC_LOCALSTORAGE_KEY } from '@/types/iec';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.3 · Block 1 · eximx_event
import type { AuditEntityType } from '@/types/audit-trail';

export const listIECs = (entityId: string): IEC[] => {
  const raw = localStorage.getItem(IEC_LOCALSTORAGE_KEY(entityId));
  return raw ? (JSON.parse(raw) as IEC[]) : [];
};

export const upsertIEC = (entityId: string, iec: IEC): IEC[] => {
  const all = listIECs(entityId);
  const idx = all.findIndex(x => x.id === iec.id);
  const now = new Date().toISOString();
  const isUpdate = idx >= 0;
  if (idx >= 0) all[idx] = { ...iec, updated_at: now };
  else all.push({ ...iec, created_at: now, updated_at: now });
  localStorage.setItem(IEC_LOCALSTORAGE_KEY(entityId), JSON.stringify(all));
  logAudit({
    entityCode: entityId,
    action: isUpdate ? 'update' : 'create',
    entityType: 'eximx_event' as unknown as AuditEntityType,
    recordId: iec.id,
    recordLabel: `IEC ${iec.iec_number ?? iec.id}`,
    beforeState: null,
    afterState: { iec_number: iec.iec_number, validity: iec.validity },
    sourceModule: 'eximx',
  });
  return all;
};

export const deleteIEC = (entityId: string, id: string): IEC[] => {
  const all = listIECs(entityId).filter(x => x.id !== id);
  localStorage.setItem(IEC_LOCALSTORAGE_KEY(entityId), JSON.stringify(all));
  return all;
};

export type IECValidityBucket = 'valid' | 'expiring-90d' | 'expired';

export const classifyIECValidity = (iec: IEC, now: Date = new Date()): IECValidityBucket => {
  const validityDate = new Date(iec.validity);
  const daysToExpiry = Math.floor((validityDate.getTime() - now.getTime()) / 86400000);
  if (daysToExpiry < 0) return 'expired';
  if (daysToExpiry <= 90) return 'expiring-90d';
  return 'valid';
};

export const summarizeIECValidity = (entityId: string): { valid: number; expiring: number; expired: number; total: number } => {
  const all = listIECs(entityId);
  const counts = { valid: 0, expiring: 0, expired: 0, total: all.length };
  for (const iec of all) {
    const bucket = classifyIECValidity(iec);
    if (bucket === 'valid') counts.valid++;
    else if (bucket === 'expiring-90d') counts.expiring++;
    else counts.expired++;
  }
  return counts;
};
