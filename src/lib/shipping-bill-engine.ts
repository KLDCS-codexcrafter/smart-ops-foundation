/**
 * @file        src/lib/shipping-bill-engine.ts
 * @purpose     SB CRUD + status transitions + ICEGATE simulator
 * @sprint      T-Phase-1.EX-7b-ShippingBill-EGM-LEO-DispatchMirror
 * @decisions   EX-7b-Q1=b sibling · EX-7b-Q8=b ICEGATE simulated 200ms
 */
import type { ShippingBill, ShippingBillStatus } from '@/types/shipping-bill';
import { shippingBillKey, SB_VALID_TRANSITIONS } from '@/types/shipping-bill';
import { SINHA_SHIPPING_BILLS } from '@/data/sinha-shipping-bill-seed-data';

export function loadShippingBills(entityCode: string): ShippingBill[] {
  try {
    const raw = localStorage.getItem(shippingBillKey(entityCode));
    if (!raw) {
      localStorage.setItem(shippingBillKey(entityCode), JSON.stringify(SINHA_SHIPPING_BILLS));
      return SINHA_SHIPPING_BILLS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ShippingBill[]) : SINHA_SHIPPING_BILLS;
  } catch { return SINHA_SHIPPING_BILLS; }
}

export function saveShippingBills(entityCode: string, sbs: ShippingBill[]): void {
  localStorage.setItem(shippingBillKey(entityCode), JSON.stringify(sbs));
}

export function getShippingBill(entityCode: string, id: string): ShippingBill | null {
  return loadShippingBills(entityCode).find((s) => s.id === id) ?? null;
}

export function transitionShippingBill(entityCode: string, sbId: string, newStatus: ShippingBillStatus): ShippingBill {
  const sbs = loadShippingBills(entityCode);
  const sb = sbs.find((s) => s.id === sbId);
  if (!sb) throw new Error(`Shipping Bill not found: ${sbId}`);
  if (!SB_VALID_TRANSITIONS[sb.status].includes(newStatus)) {
    throw new Error(`Invalid SB transition: ${sb.status} → ${newStatus}`);
  }
  const updated: ShippingBill = { ...sb, status: newStatus, updated_at: new Date().toISOString() };
  saveShippingBills(entityCode, sbs.map((s) => (s.id === sbId ? updated : s)));
  return updated;
}

export async function simulateICEGATESubmitSB(
  sbId: string,
  riskFactors: string[],
  aeoTier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo',
  isSelfSealing: boolean,
): Promise<{ submission_id: string; assigned_sb_no: string; rms_lane: 'green' | 'yellow' | 'red'; response_timestamp: string }> {
  await new Promise((r) => setTimeout(r, 200));
  const has_red_flag = riskFactors.some((f) => /sanctioned|prohibited|fake.coO|denied.party/i.test(f));
  let rms_lane: 'green' | 'yellow' | 'red';
  if (has_red_flag) {
    rms_lane = 'red';
  } else if (isSelfSealing && (aeoTier === 'tier_2' || aeoTier === 'tier_3')) {
    rms_lane = 'green';
  } else if (aeoTier === 'tier_2' || aeoTier === 'tier_3') {
    rms_lane = 'green';
  } else if (riskFactors.length >= 3) {
    rms_lane = 'yellow';
  } else {
    rms_lane = 'green';
  }
  return {
    submission_id: `IG-SB-${Date.now()}-${sbId.slice(-4)}`,
    assigned_sb_no: `SB/EXP/${new Date().getFullYear()}/${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
    rms_lane,
    response_timestamp: new Date().toISOString(),
  };
}

export function summarizeShippingBills(sbs: ShippingBill[]): {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  total_fob_inr: number;
  total_rodtep_inr: number;
  total_drawback_inr: number;
  self_sealing_count: number;
  embassy_legalization_pending: number;
} {
  const s = {
    total: sbs.length, by_type: {} as Record<string, number>, by_status: {} as Record<string, number>,
    total_fob_inr: 0, total_rodtep_inr: 0, total_drawback_inr: 0,
    self_sealing_count: 0, embassy_legalization_pending: 0,
  };
  for (const sb of sbs) {
    s.by_type[sb.sb_type] = (s.by_type[sb.sb_type] ?? 0) + 1;
    s.by_status[sb.status] = (s.by_status[sb.status] ?? 0) + 1;
    s.total_fob_inr += sb.total_fob_value_inr;
    s.total_rodtep_inr += sb.rodtep_total_inr;
    s.total_drawback_inr += sb.drawback_total_inr;
    if (sb.is_self_sealing_facility) s.self_sealing_count += 1;
    if (sb.coo_legalization_state === 'embassy_submitted' || sb.coo_legalization_state === 'chamber_attested') {
      s.embassy_legalization_pending += 1;
    }
  }
  return s;
}
