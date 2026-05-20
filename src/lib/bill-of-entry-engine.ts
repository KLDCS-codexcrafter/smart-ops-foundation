/**
 * @file        src/lib/bill-of-entry-engine.ts
 * @purpose     BoE CRUD + status transitions + ICEGATE simulator · Q14=b simulated only
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q1=b sibling · EX-6-Q14=b ICEGATE simulated 200ms delay
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped
 */
import type { BillOfEntry, BoEStatus } from '@/types/bill-of-entry';
import { billOfEntryKey, BOE_VALID_TRANSITIONS } from '@/types/bill-of-entry';
import { SINHA_BILLS_OF_ENTRY } from '@/data/sinha-bill-of-entry-seed-data';

export function loadBoEs(entityCode: string): BillOfEntry[] {
  try {
    const raw = localStorage.getItem(billOfEntryKey(entityCode));
    if (!raw) {
      localStorage.setItem(billOfEntryKey(entityCode), JSON.stringify(SINHA_BILLS_OF_ENTRY));
      return SINHA_BILLS_OF_ENTRY;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BillOfEntry[]) : SINHA_BILLS_OF_ENTRY;
  } catch { return SINHA_BILLS_OF_ENTRY; }
}

export function saveBoEs(entityCode: string, boes: BillOfEntry[]): void {
  localStorage.setItem(billOfEntryKey(entityCode), JSON.stringify(boes));
}

export function getBoE(entityCode: string, id: string): BillOfEntry | null {
  return loadBoEs(entityCode).find((b) => b.id === id) ?? null;
}

export function transitionBoE(entityCode: string, boeId: string, newStatus: BoEStatus): BillOfEntry {
  const boes = loadBoEs(entityCode);
  const boe = boes.find((b) => b.id === boeId);
  if (!boe) throw new Error(`BoE not found: ${boeId}`);
  if (!BOE_VALID_TRANSITIONS[boe.status].includes(newStatus)) {
    throw new Error(`Invalid BoE transition: ${boe.status} → ${newStatus}`);
  }
  const updated = { ...boe, status: newStatus, updated_at: new Date().toISOString() };
  saveBoEs(entityCode, boes.map((b) => (b.id === boeId ? updated : b)));
  return updated;
}

/** ICEGATE simulator · Q14=b · 200ms delay · risk-factor-based lane response */
export async function simulateICEGATESubmit(
  boeId: string,
  riskFactors: string[],
  aeoTier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo',
): Promise<{ submission_id: string; assigned_lane: 'green' | 'yellow' | 'red'; response_timestamp: string }> {
  await new Promise((r) => setTimeout(r, 200));
  const has_red_flag = riskFactors.some((f) =>
    /sanctioned|dumped|prohibited|fake.coO/i.test(f),
  );
  let lane: 'green' | 'yellow' | 'red';
  if (has_red_flag) {
    lane = 'red';
  } else if (aeoTier === 'tier_2' || aeoTier === 'tier_3') {
    lane = 'green';
  } else if (riskFactors.length >= 3) {
    lane = 'yellow';
  } else {
    lane = 'green';
  }
  return {
    submission_id: `IG-SUB-${Date.now()}-${boeId.slice(-4)}`,
    assigned_lane: lane,
    response_timestamp: new Date().toISOString(),
  };
}

export function summarizeBoEs(boes: BillOfEntry[]): {
  total: number;
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  total_duty_paid_inr: number;
  total_demurrage_inr: number;
  aeo_fast_track_count: number;
  project_import_count: number;
} {
  const summary = {
    total: boes.length,
    by_type: {} as Record<string, number>,
    by_status: {} as Record<string, number>,
    total_duty_paid_inr: 0,
    total_demurrage_inr: 0,
    aeo_fast_track_count: 0,
    project_import_count: 0,
  };
  for (const b of boes) {
    summary.by_type[b.boe_type] = (summary.by_type[b.boe_type] ?? 0) + 1;
    summary.by_status[b.status] = (summary.by_status[b.status] ?? 0) + 1;
    summary.total_duty_paid_inr += b.total_duty_inr;
    summary.total_demurrage_inr += b.total_demurrage_inr;
    if (b.aeo_fast_track_eligible) summary.aeo_fast_track_count += 1;
    if (b.is_project_import) summary.project_import_count += 1;
  }
  return summary;
}
