/**
 * @file        src/lib/leo-engine.ts
 * @purpose     LEO 4-state workflow · consumes RMS + AEO READ-ONLY
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import type { LEO, LEOStatus } from '@/types/leo';
import type { RMSLane } from '@/types/rms-declaration';
import { leoKey, LEO_VALID_TRANSITIONS } from '@/types/leo';

export function loadLEOs(entityCode: string): LEO[] {
  try {
    const raw = localStorage.getItem(leoKey(entityCode));
    return raw ? (JSON.parse(raw) as LEO[]) : [];
  } catch { return []; }
}

export function saveLEOs(entityCode: string, leos: LEO[]): void {
  localStorage.setItem(leoKey(entityCode), JSON.stringify(leos));
}

export function transitionLEO(entityCode: string, leoId: string, newStatus: LEOStatus): LEO {
  const leos = loadLEOs(entityCode);
  const leo = leos.find((l) => l.id === leoId);
  if (!leo) throw new Error(`LEO not found: ${leoId}`);
  if (!LEO_VALID_TRANSITIONS[leo.status].includes(newStatus)) {
    throw new Error(`Invalid LEO transition: ${leo.status} → ${newStatus}`);
  }
  const now = new Date().toISOString();
  const updated: LEO = { ...leo, status: newStatus, updated_at: now };
  if (newStatus === 'examined') updated.examined_at = now;
  if (newStatus === 'let_export') updated.let_export_at = now;
  if (newStatus === 'closed') updated.closed_at = now;
  saveLEOs(entityCode, leos.map((l) => (l.id === leoId ? updated : l)));
  return updated;
}

export function createLEO(
  entityCode: string,
  shippingBillId: string,
  rmsLane: RMSLane,
  isSelfSealing: boolean,
  aeoTier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo',
): LEO {
  const skipExamination = isSelfSealing && (aeoTier === 'tier_2' || aeoTier === 'tier_3') && rmsLane !== 'red';
  const now = new Date().toISOString();
  const leo: LEO = {
    id: `leo-${Date.now()}`,
    leo_no: `LEO/${new Date().getFullYear()}/${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
    entity_id: entityCode, status: 'pending', related_shipping_bill_id: shippingBillId,
    rms_lane_assigned: rmsLane, examination_officer: '', examination_date: null, examination_notes: '',
    containers_examined: 0, containers_total: 1,
    examination_skipped_self_sealing: skipExamination,
    pending_at: now, examined_at: null, let_export_at: null, closed_at: null,
    notes: skipExamination ? 'Self-sealing + AEO Tier-2/3 · examination skipped per CBIC AEO benefits' : '',
    created_at: now, updated_at: now,
  };
  const all = loadLEOs(entityCode);
  saveLEOs(entityCode, [...all, leo]);
  return leo;
}

export function getLEO(entityCode: string, id: string): LEO | null {
  return loadLEOs(entityCode).find((l) => l.id === id) ?? null;
}
