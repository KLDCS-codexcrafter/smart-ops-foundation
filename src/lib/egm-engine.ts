/**
 * @file        src/lib/egm-engine.ts
 * @purpose     EGM lifecycle + vessel manifest closure
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 */
import type { EGM, EGMStatus } from '@/types/egm';
import { egmKey, EGM_VALID_TRANSITIONS } from '@/types/egm';

export function loadEGMs(entityCode: string): EGM[] {
  try {
    const raw = localStorage.getItem(egmKey(entityCode));
    return raw ? (JSON.parse(raw) as EGM[]) : [];
  } catch { return []; }
}

export function saveEGMs(entityCode: string, egms: EGM[]): void {
  localStorage.setItem(egmKey(entityCode), JSON.stringify(egms));
}

export function transitionEGM(entityCode: string, egmId: string, newStatus: EGMStatus): EGM {
  const egms = loadEGMs(entityCode);
  const egm = egms.find((e) => e.id === egmId);
  if (!egm) throw new Error(`EGM not found: ${egmId}`);
  if (!EGM_VALID_TRANSITIONS[egm.status].includes(newStatus)) {
    throw new Error(`Invalid EGM transition: ${egm.status} → ${newStatus}`);
  }
  const now = new Date().toISOString();
  const updated: EGM = { ...egm, status: newStatus, updated_at: now };
  if (newStatus === 'requested') updated.icegate_requested_at = now;
  if (newStatus === 'assigned') updated.icegate_assigned_at = now;
  if (newStatus === 'vessel_sailed') updated.actual_sailing_date = now;
  saveEGMs(entityCode, egms.map((e) => (e.id === egmId ? updated : e)));
  return updated;
}

export async function simulateEGMAssign(egmId: string, vesselName: string): Promise<{ egm_no: string; assigned_at: string }> {
  await new Promise((r) => setTimeout(r, 200));
  const seq = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  void egmId;
  return {
    egm_no: `EGM/${new Date().getFullYear()}/${vesselName.replace(/\s/g, '').slice(0, 3).toUpperCase()}/${seq}`,
    assigned_at: new Date().toISOString(),
  };
}

export function getEGM(entityCode: string, id: string): EGM | null {
  return loadEGMs(entityCode).find((e) => e.id === id) ?? null;
}

export function getEGMsForShippingBill(entityCode: string, sbId: string): EGM[] {
  return loadEGMs(entityCode).filter((e) => e.related_shipping_bill_ids.includes(sbId));
}
