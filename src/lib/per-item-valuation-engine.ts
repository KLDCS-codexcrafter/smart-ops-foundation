/**
 * @file        src/lib/per-item-valuation-engine.ts
 * @purpose     D-NEW-FF RESOLUTION engine · sibling · per-BoE-line override application
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q1=a SIBLING · BoELine + CILine + ImportPOLine + duty-waterfall-engine.ts STAY 0-DIFF
 */
import type { BoELineValuationOverride, OverrideReason } from '@/types/bill-of-entry-item-valuation-override';
import { boeLineOverrideKey } from '@/types/bill-of-entry-item-valuation-override';
import type { BillOfEntry, BoELine } from '@/types/bill-of-entry';
import { loadBoEs } from '@/lib/bill-of-entry-engine';

const SEED_OVERRIDES: BoELineValuationOverride[] = [
  { id: 'ovr-001', override_no: 'OVR-SINHA-2026-001', entity_id: 'sinha-steel', related_boe_id: 'boe-sinha-002', related_boe_no: 'BOE-SINHA-2026-002', related_boe_line_id: 'boe-sinha-002-line-1', line_no: 1, original_final_cif_inr: 850000, original_final_assessable_inr: 870000, original_bcd_inr: 87000, original_total_duty_inr: 165300, overridden_final_cif_inr: 920000, overridden_final_assessable_inr: 940000, overridden_bcd_inr: 94000, overridden_total_duty_inr: 178600, delta_cif_inr: 70000, delta_assessable_inr: 70000, delta_bcd_inr: 7000, delta_total_duty_inr: 13300, reason: 'customs_revaluation', justification: 'Rule 9 deductive value method · transaction price rejected · comparable contemporaneous imports', approver_user: 'CFO Sinha', approved_at: '2026-05-09T00:00:00.000Z', is_active: true, notes: 'BoE-002 Yellow RMS · revaluation post audit', created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' },
  { id: 'ovr-002', override_no: 'OVR-SINHA-2026-002', entity_id: 'sinha-steel', related_boe_id: 'boe-sinha-002', related_boe_no: 'BOE-SINHA-2026-002', related_boe_line_id: 'boe-sinha-002-line-2', line_no: 2, original_final_cif_inr: 420000, original_final_assessable_inr: 430000, original_bcd_inr: 43000, original_total_duty_inr: 81700, overridden_final_cif_inr: 445000, overridden_final_assessable_inr: 455000, overridden_bcd_inr: 45500, overridden_total_duty_inr: 86450, delta_cif_inr: 25000, delta_assessable_inr: 25000, delta_bcd_inr: 2500, delta_total_duty_inr: 4750, reason: 'royalty_addition', justification: 'Royalty 3% on inputs added per Rule 10(1)(c)', approver_user: 'CFO Sinha', approved_at: '2026-05-09T00:00:00.000Z', is_active: true, notes: 'Rule 10 inclusion · royalty share', created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' },
  { id: 'ovr-003', override_no: 'OVR-SINHA-2026-003', entity_id: 'sinha-steel', related_boe_id: 'boe-sinha-002', related_boe_no: 'BOE-SINHA-2026-002', related_boe_line_id: 'boe-sinha-002-line-3', line_no: 3, original_final_cif_inr: 230000, original_final_assessable_inr: 235000, original_bcd_inr: 23500, original_total_duty_inr: 44650, overridden_final_cif_inr: 250000, overridden_final_assessable_inr: 255000, overridden_bcd_inr: 25500, overridden_total_duty_inr: 48450, delta_cif_inr: 20000, delta_assessable_inr: 20000, delta_bcd_inr: 2000, delta_total_duty_inr: 3800, reason: 'related_party_adjustment', justification: 'Related-party price < arms-length CUP by 9% · adjusted to CUP benchmark', approver_user: 'CFO Sinha', approved_at: '2026-05-09T00:00:00.000Z', is_active: true, notes: 'TP adjustment under Rule 3(3)(b)', created_at: '2026-05-09T00:00:00.000Z', updated_at: '2026-05-09T00:00:00.000Z' },
];

// [JWT] GET /api/eximx/boe-line-overrides?entityCode=...
export function loadBoELineOverrides(entityCode: string): BoELineValuationOverride[] {
  try {
    const raw = localStorage.getItem(boeLineOverrideKey(entityCode));
    if (!raw) { localStorage.setItem(boeLineOverrideKey(entityCode), JSON.stringify(SEED_OVERRIDES)); return SEED_OVERRIDES; }
    return JSON.parse(raw) as BoELineValuationOverride[];
  } catch { return SEED_OVERRIDES; }
}

export function saveBoELineOverrides(entityCode: string, list: BoELineValuationOverride[]): void {
  localStorage.setItem(boeLineOverrideKey(entityCode), JSON.stringify(list));
}

export function getActiveOverrideForLine(entityCode: string, boeLineId: string): BoELineValuationOverride | null {
  return loadBoELineOverrides(entityCode).find((o) => o.related_boe_line_id === boeLineId && o.is_active) ?? null;
}

export function applyOverridesToBoE(entityCode: string, boe: BillOfEntry): { lines: BoELine[]; total_overridden_duty_inr: number; total_delta_inr: number } {
  const overrides = loadBoELineOverrides(entityCode).filter((o) => o.related_boe_id === boe.id && o.is_active);
  const overrideMap = new Map(overrides.map((o) => [o.related_boe_line_id, o]));
  let total_overridden_duty_inr = 0;
  let total_delta_inr = 0;
  const lines = boe.lines.map((line) => {
    const ovr = overrideMap.get(line.id);
    if (!ovr) {
      total_overridden_duty_inr += line.total_duty_inr;
      return line;
    }
    total_overridden_duty_inr += ovr.overridden_total_duty_inr;
    total_delta_inr += ovr.delta_total_duty_inr;
    return {
      ...line,
      final_cif_inr: ovr.overridden_final_cif_inr,
      final_assessable_inr: ovr.overridden_final_assessable_inr,
      bcd_inr: ovr.overridden_bcd_inr,
      total_duty_inr: ovr.overridden_total_duty_inr,
    };
  });
  return { lines, total_overridden_duty_inr, total_delta_inr };
}

export function createOverride(
  entityCode: string,
  boe: BillOfEntry,
  line: BoELine,
  overrides: { final_cif_inr: number; final_assessable_inr: number; bcd_inr: number; total_duty_inr: number },
  reason: OverrideReason,
  justification: string,
  approverUser: string,
): BoELineValuationOverride {
  const now = new Date().toISOString();
  const list = loadBoELineOverrides(entityCode);
  const newOverride: BoELineValuationOverride = {
    id: `ovr-${Date.now()}`,
    override_no: `OVR-${entityCode.toUpperCase()}-${Date.now()}`,
    entity_id: entityCode,
    related_boe_id: boe.id, related_boe_no: boe.boe_no, related_boe_line_id: line.id, line_no: line.line_no,
    original_final_cif_inr: line.final_cif_inr, original_final_assessable_inr: line.final_assessable_inr,
    original_bcd_inr: line.bcd_inr, original_total_duty_inr: line.total_duty_inr,
    overridden_final_cif_inr: overrides.final_cif_inr, overridden_final_assessable_inr: overrides.final_assessable_inr,
    overridden_bcd_inr: overrides.bcd_inr, overridden_total_duty_inr: overrides.total_duty_inr,
    delta_cif_inr: overrides.final_cif_inr - line.final_cif_inr,
    delta_assessable_inr: overrides.final_assessable_inr - line.final_assessable_inr,
    delta_bcd_inr: overrides.bcd_inr - line.bcd_inr,
    delta_total_duty_inr: overrides.total_duty_inr - line.total_duty_inr,
    reason, justification, approver_user: approverUser, approved_at: now,
    is_active: true, notes: '', created_at: now, updated_at: now,
  };
  saveBoELineOverrides(entityCode, [...list, newOverride]);
  return newOverride;
}

export function getEligibleBoEsForOverride(entityCode: string): BillOfEntry[] {
  return loadBoEs(entityCode);
}
