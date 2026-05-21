/**
 * @file        src/lib/dgtr-duty-impact-engine.ts
 * @purpose     D-NEW-FD · 6th SIBLING application · DGTR-on-BoE auto-impact
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs
 * @decisions   Q-LOCK-5(a) 6th SIBLING · 1st post-D-NEW-FF · institutional milestone
 *              duty-waterfall-engine + bill-of-entry-engine STAY 0-DIFF · PURE HELPER
 * @discipline  Returns NEW objects via spread · zero mutation of inputs · FR-30 · FR-50 · FR-26
 */
import type { DGTRInvestigation } from '@/types/dgtr-investigation';
import { dgtrInvestigationKey } from '@/types/dgtr-investigation';
import type { BillOfEntry, BoELine } from '@/types/bill-of-entry';
import type {
  DGTRDutyImpact,
  BoELineDGTRImpact,
} from '@/types/bill-of-entry-dgtr-override';

const SEED_DGTR_INVESTIGATIONS: DGTRInvestigation[] = [
  {
    id: 'dgtr-001',
    case_no: 'DGTR/AD/2025/STEEL-CN-001',
    case_type: 'anti_dumping',
    status: 'duty_imposed',
    product_cth: '72104900',
    product_description: 'Galvanized Steel Sheets',
    exporting_country_code: 'CN',
    exporting_country_name: 'China',
    petitioner: 'Indian Steel Manufacturers Assn.',
    initiation_date: '2025-06-01',
    preliminary_finding_date: '2025-09-15',
    final_finding_date: '2026-02-01',
    duty_imposed_pct: 18.5,
    duty_valid_from: '2026-02-15',
    duty_valid_to: '2031-02-14',
    total_investigated_imports_inr: 245000000,
    notes: 'Sec 9A · 5-year anti-dumping duty · Sinha Steel CN imports impacted',
    created_at: '2025-06-01T00:00:00.000Z',
    updated_at: '2026-02-15T00:00:00.000Z',
  },
];

// [JWT] GET /api/eximx/dgtr-investigations?entityCode=...
export function loadDGTRInvestigations(entityCode: string): DGTRInvestigation[] {
  try {
    const raw = localStorage.getItem(dgtrInvestigationKey(entityCode));
    if (!raw) {
      localStorage.setItem(dgtrInvestigationKey(entityCode), JSON.stringify(SEED_DGTR_INVESTIGATIONS));
      return SEED_DGTR_INVESTIGATIONS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DGTRInvestigation[]) : SEED_DGTR_INVESTIGATIONS;
  } catch {
    return SEED_DGTR_INVESTIGATIONS;
  }
}

function buildImpactForLine(
  line: BoELine,
  filing_date: string,
  investigations: readonly DGTRInvestigation[],
): DGTRDutyImpact[] {
  return investigations
    .filter(
      (inv) =>
        inv.status === 'duty_imposed' &&
        inv.product_cth === line.cth_code &&
        inv.exporting_country_code === line.country_of_origin &&
        inv.duty_valid_from !== null &&
        inv.duty_valid_to !== null &&
        filing_date >= inv.duty_valid_from &&
        filing_date <= inv.duty_valid_to,
    )
    .map<DGTRDutyImpact>((inv) => ({
      case_no: inv.case_no,
      case_type: inv.case_type,
      duty_imposed_pct: inv.duty_imposed_pct,
      duty_valid_from: inv.duty_valid_from ?? '',
      duty_valid_to: inv.duty_valid_to ?? '',
      additional_duty_inr: Math.round(line.final_assessable_inr * (inv.duty_imposed_pct / 100)),
      applies_to_cth: inv.product_cth,
      applies_to_country: inv.exporting_country_code,
      applied_at: new Date().toISOString(),
    }));
}

/** PURE HELPER · returns NEW BoELineDGTRImpact[] · no mutation of BoE/BoELine */
export function computeBoEDGTRImpact(
  boe: BillOfEntry,
  investigations: readonly DGTRInvestigation[],
): BoELineDGTRImpact[] {
  return boe.lines.map<BoELineDGTRImpact>((line) => {
    const impacts = buildImpactForLine(line, boe.filing_date, investigations);
    const totalAdditional = impacts.reduce((s, i) => s + i.additional_duty_inr, 0);
    return {
      related_boe_id: boe.id,
      related_boe_line_id: line.id,
      line_no: line.line_no,
      impacts,
      total_additional_duty_inr: totalAdditional,
      is_active: impacts.length > 0,
      notes:
        impacts.length > 0
          ? `DGTR auto-impact computed at ${new Date().toISOString().slice(0, 10)}`
          : 'No DGTR investigation matches this BoE line',
    };
  });
}

export function summarizeBoEDGTRImpact(
  boe: BillOfEntry,
  investigations: readonly DGTRInvestigation[],
): {
  total_additional_duty_inr: number;
  affected_lines: number;
  total_lines: number;
} {
  const impacts = computeBoEDGTRImpact(boe, investigations);
  const affected = impacts.filter((i) => i.is_active);
  const total = affected.reduce((s, i) => s + i.total_additional_duty_inr, 0);
  return {
    total_additional_duty_inr: total,
    affected_lines: affected.length,
    total_lines: boe.lines.length,
  };
}
