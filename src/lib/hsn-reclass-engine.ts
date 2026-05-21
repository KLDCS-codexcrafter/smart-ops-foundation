/**
 * @file        src/lib/hsn-reclass-engine.ts
 * @purpose     HSN/CTH Reclass dispute workflow · 5-state · cth-history-engine READ-ONLY
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q5=b FOUNDATION
 */
import type { HSNReclassCase, HSNReclassStatus, HSNReclassOutcome } from '@/types/hsn-reclass-case';
import { hsnReclassKey, HSN_RECLASS_VALID_TRANSITIONS } from '@/types/hsn-reclass-case';

const SEED_HSN_RECLASS_CASES: HSNReclassCase[] = [
  { id: 'hsr-001', case_no: 'HSR-MUM-2026-001', entity_id: 'sinha-steel', status: 'response_filed', outcome: 'pending', related_boe_id: 'boe-sinha-003', related_boe_no: 'BOE-SINHA-2026-003', related_boe_line_id: null, original_cth: '7208', proposed_cth: '7210', customs_zone: 'Mumbai Custom Zone', original_bcd_pct: 10, proposed_bcd_pct: 15, duty_differential_inr: 18750, dispute_initiated_date: '2026-04-26', objection_received_date: '2026-05-01', response_filed_date: '2026-05-12', decision_date: null, resolved_date: null, appeal_filed: false, appeal_filed_date: null, appeal_authority: null, customs_grounds: 'Customs claims goods are coated steel sheets (CTH 7210) attracting 15% BCD · not hot-rolled non-coated (CTH 7208)', importer_response: 'Mill test certificate + supplier declaration confirms uncoated · classification 7208 correct', decision_summary: '', notes: 'Linked BoE-003 · Yellow lane · same line under dispute', created_at: '2026-04-26T00:00:00.000Z', updated_at: '2026-05-12T00:00:00.000Z' },
];

// [JWT] GET /api/eximx/hsn-reclass-cases?entityCode=...
export function loadHSNReclassCases(entityCode: string): HSNReclassCase[] {
  try {
    const raw = localStorage.getItem(hsnReclassKey(entityCode));
    if (!raw) { localStorage.setItem(hsnReclassKey(entityCode), JSON.stringify(SEED_HSN_RECLASS_CASES)); return SEED_HSN_RECLASS_CASES; }
    return JSON.parse(raw) as HSNReclassCase[];
  } catch { return SEED_HSN_RECLASS_CASES; }
}

export function saveHSNReclassCases(entityCode: string, list: HSNReclassCase[]): void {
  localStorage.setItem(hsnReclassKey(entityCode), JSON.stringify(list));
}

export function transitionHSNReclass(entityCode: string, id: string, next: HSNReclassStatus): HSNReclassCase {
  const list = loadHSNReclassCases(entityCode);
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error(`HSN Reclass case not found: ${id}`);
  if (!HSN_RECLASS_VALID_TRANSITIONS[c.status].includes(next)) {
    throw new Error(`Invalid HSN Reclass transition: ${c.status} → ${next}`);
  }
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const updated: HSNReclassCase = { ...c, status: next, updated_at: now };
  if (next === 'customs_objection_received') updated.objection_received_date = today;
  if (next === 'response_filed') updated.response_filed_date = today;
  if (next === 'decision_pending') updated.decision_date = today;
  if (next === 'resolved') updated.resolved_date = today;
  saveHSNReclassCases(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function setHSNReclassOutcome(entityCode: string, id: string, outcome: HSNReclassOutcome, decisionSummary: string): HSNReclassCase {
  const list = loadHSNReclassCases(entityCode);
  const c = list.find((x) => x.id === id);
  if (!c) throw new Error(`HSN Reclass case not found: ${id}`);
  const now = new Date().toISOString();
  const updated: HSNReclassCase = { ...c, outcome, decision_summary: decisionSummary, updated_at: now };
  saveHSNReclassCases(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}

export function computeDutyDifferential(originalCifInr: number, originalBcdPct: number, proposedBcdPct: number): number {
  return Math.round(originalCifInr * ((proposedBcdPct - originalBcdPct) / 100));
}
