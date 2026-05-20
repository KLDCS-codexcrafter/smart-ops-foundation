/**
 * @file        src/lib/stpi-softex-engine.ts
 * @purpose     STPI Softex FULL · v7 Gap #11 closure · consumes EX-7c STPI seed fields
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q4=a FULL · export-realisation.ts STAYS 0-DIFF · consumes is_stpi_export
 */
import type { SoftexForm, SoftexStatus, STPIUnit } from '@/types/stpi-softex';
import { softexFormKey, stpiUnitKey, SOFTEX_VALID_TRANSITIONS } from '@/types/stpi-softex';
import { loadRealisations } from '@/lib/export-realisation-engine';

const DEFAULT_STPI_UNIT: STPIUnit = {
  id: 'stpi-001', unit_code: 'STPI-MUM-001', unit_name: 'Sinha Software Pvt Ltd · STPI Unit Mumbai',
  location: 'STPI-Mumbai · Andheri Tech Park · Unit 4', registration_date: '2024-04-01',
  annual_export_target_inr: 50000000, validity_to: '2034-03-31', is_active: true,
};

const SEED_SOFTEX_FORMS: SoftexForm[] = [
  { id: 'sft-001', softex_form_no: 'SFT/MUM/2026/001', entity_id: 'sinha-trading', status: 'certified_by_stpi', form_type: 'Form_A', related_realisation_id: 'real-sinha-003', stpi_unit_id: 'stpi-001', stpi_unit_name: 'Sinha Software Pvt Ltd · STPI Unit Mumbai', export_value_foreign: 2500000, export_value_inr: 1400000, currency_code: 'JPY', invoice_no: 'INV-2026-JPN-001', invoice_date: '2026-05-19', filing_deadline_date: '2026-06-18', days_remaining: 30, is_overdue: false, total_inflows_inr: 1400000, total_outflows_inr: 350000, positive_nfe_inr: 1050000, is_positive_nfe: true, stpi_certified_at: '2026-05-20T00:00:00.000Z', rbi_filed_at: null, rbi_acknowledgment_ref: null, notes: 'Japan software export · Form A · positive NFE 75% margin', created_at: '2026-05-19T00:00:00.000Z', updated_at: '2026-05-20T00:00:00.000Z' },
];

export function loadStpiUnits(entityCode: string): STPIUnit[] {
  try {
    const raw = localStorage.getItem(stpiUnitKey(entityCode));
    if (!raw) { localStorage.setItem(stpiUnitKey(entityCode), JSON.stringify([DEFAULT_STPI_UNIT])); return [DEFAULT_STPI_UNIT]; }
    return JSON.parse(raw) as STPIUnit[];
  } catch { return [DEFAULT_STPI_UNIT]; }
}

export function loadSoftexForms(entityCode: string): SoftexForm[] {
  try {
    const raw = localStorage.getItem(softexFormKey(entityCode));
    if (!raw) { localStorage.setItem(softexFormKey(entityCode), JSON.stringify(SEED_SOFTEX_FORMS)); return SEED_SOFTEX_FORMS; }
    return JSON.parse(raw) as SoftexForm[];
  } catch { return SEED_SOFTEX_FORMS; }
}

export function saveSoftexForms(entityCode: string, list: SoftexForm[]): void {
  localStorage.setItem(softexFormKey(entityCode), JSON.stringify(list));
}

export function computePositiveNFE(inflowsInr: number, outflowsInr: number): { nfe_inr: number; is_positive: boolean; margin_pct: number } {
  const nfe_inr = inflowsInr - outflowsInr;
  const margin_pct = inflowsInr > 0 ? Math.round((nfe_inr / inflowsInr) * 100) : 0;
  return { nfe_inr, is_positive: nfe_inr > 0, margin_pct };
}

export function getSTPIRealisations(entityCode: string): { id: string; realisation_no: string; stpi_unit_id: string | null; stpi_softex_form_no: string | null }[] {
  return loadRealisations(entityCode)
    .filter((r) => r.is_stpi_export)
    .map((r) => ({ id: r.id, realisation_no: r.realisation_no, stpi_unit_id: r.stpi_unit_id, stpi_softex_form_no: r.stpi_softex_form_no }));
}

export function transitionSoftex(entityCode: string, id: string, next: SoftexStatus): SoftexForm {
  const list = loadSoftexForms(entityCode);
  const sf = list.find((x) => x.id === id);
  if (!sf) throw new Error(`SoftexForm not found: ${id}`);
  if (!SOFTEX_VALID_TRANSITIONS[sf.status].includes(next)) {
    throw new Error(`Invalid Softex transition: ${sf.status} → ${next}`);
  }
  const now = new Date().toISOString();
  const updated: SoftexForm = { ...sf, status: next, updated_at: now };
  if (next === 'certified_by_stpi') updated.stpi_certified_at = now;
  if (next === 'filed_with_rbi') updated.rbi_filed_at = now;
  if (next === 'acknowledged') updated.rbi_acknowledgment_ref = `RBI-SFT-ACK-${Date.now()}`;
  saveSoftexForms(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}
