/**
 * @file        src/lib/bcd-calculator-engine.ts
 * @purpose     BCD Calculator · consumes duty-waterfall-engine READ-ONLY · saves snapshots
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q2=a STANDALONE · duty-waterfall-engine.ts STAYS 0-DIFF
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26
 *
 * IMPORTANT: duty-waterfall-engine.ts STAYS 0-DIFF. We CONSUME via computeDutyWaterfall().
 */
import type { BCDCalcSnapshot } from '@/types/bcd-calc-snapshot';
import { bcdCalcSnapshotKey } from '@/types/bcd-calc-snapshot';
import { computeDutyWaterfall } from '@/lib/duty-waterfall-engine';

const SEED_SNAPSHOTS: BCDCalcSnapshot[] = [
  { id: 'bcds-001', snapshot_no: 'BCD-SINHA-2026-001', entity_id: 'sinha-steel', cth_code: '7208', country_code: 'CN', cif_value_inr: 1000000, effective_date: '2026-05-15', fta_treaty_code: null, bcd_inr: 100000, sws_inr: 10000, igst_inr: 198000, comp_cess_inr: 0, anti_dumping_inr: 50000, safeguard_inr: 0, landing_inr: 10000, total_custom_duty_inr: 368000, total_landed_value_inr: 1378000, scenario_label: 'China hot-rolled steel · current rate · DGTR anti-dumping live', notes: 'Baseline for comparison vs FTA scenarios', created_at: '2026-05-15T00:00:00.000Z', created_by_user: 'CFO Sinha' },
  { id: 'bcds-002', snapshot_no: 'BCD-SINHA-2026-002', entity_id: 'sinha-steel', cth_code: '8517', country_code: 'SG', cif_value_inr: 800000, effective_date: '2026-05-15', fta_treaty_code: 'India-ASEAN-FTA', bcd_inr: 0, sws_inr: 0, igst_inr: 144000, comp_cess_inr: 0, anti_dumping_inr: 0, safeguard_inr: 0, landing_inr: 8000, total_custom_duty_inr: 152000, total_landed_value_inr: 960000, scenario_label: 'Singapore routers · ASEAN-FTA preference · BCD reduced to 0', notes: 'Demonstrates FTA preference advantage', created_at: '2026-05-16T00:00:00.000Z', created_by_user: 'CFO Sinha' },
];

// [JWT] GET /api/eximx/bcd-snapshots?entityCode=...
export function loadBCDSnapshots(entityCode: string): BCDCalcSnapshot[] {
  try {
    const raw = localStorage.getItem(bcdCalcSnapshotKey(entityCode));
    if (!raw) { localStorage.setItem(bcdCalcSnapshotKey(entityCode), JSON.stringify(SEED_SNAPSHOTS)); return SEED_SNAPSHOTS; }
    return JSON.parse(raw) as BCDCalcSnapshot[];
  } catch { return SEED_SNAPSHOTS; }
}

// [JWT] PUT /api/eximx/bcd-snapshots
export function saveBCDSnapshots(entityCode: string, list: BCDCalcSnapshot[]): void {
  localStorage.setItem(bcdCalcSnapshotKey(entityCode), JSON.stringify(list));
}

export interface BCDCalcInput {
  cth_code: string;
  country_code: string;
  cif_value_inr: number;
  effective_date: string;
  fta_treaty_code: string | null;
}

export interface BCDCalcOutput {
  bcd_inr: number;
  sws_inr: number;
  igst_inr: number;
  comp_cess_inr: number;
  anti_dumping_inr: number;
  safeguard_inr: number;
  landing_inr: number;
  total_custom_duty_inr: number;
  total_landed_value_inr: number;
  effective_rate_pct: number;
}

/** Compute BCD waterfall · pure · consumes duty-waterfall-engine READ-ONLY */
export function computeBCDCalculation(entityCode: string, input: BCDCalcInput): BCDCalcOutput {
  const result = computeDutyWaterfall(entityCode, input.cif_value_inr, input.cth_code, input.country_code, input.effective_date);

  const out: BCDCalcOutput = {
    bcd_inr: 0, sws_inr: 0, igst_inr: 0, comp_cess_inr: 0,
    anti_dumping_inr: 0, safeguard_inr: 0, landing_inr: 0,
    total_custom_duty_inr: result.total_custom_duty_inr,
    total_landed_value_inr: result.total_landed_value_inr,
    effective_rate_pct: 0,
  };

  for (const row of result.rows) {
    switch (row.kind) {
      case 'C_bcd': out.bcd_inr += row.amount_inr; break;
      case 'D_sws': out.sws_inr += row.amount_inr; break;
      case 'E_igst': out.igst_inr += row.amount_inr; break;
      case 'F_comp_cess': out.comp_cess_inr += row.amount_inr; break;
      case 'G_anti_dumping': out.anti_dumping_inr += row.amount_inr; break;
      case 'H_safeguard': out.safeguard_inr += row.amount_inr; break;
      case 'B_landing_handling': out.landing_inr += row.amount_inr; break;
      default: break;
    }
  }

  out.effective_rate_pct = input.cif_value_inr > 0
    ? Math.round((out.total_custom_duty_inr / input.cif_value_inr) * 10000) / 100
    : 0;

  return out;
}

/** Save snapshot · pure factory */
export function saveSnapshot(entityCode: string, input: BCDCalcInput, output: BCDCalcOutput, label: string, user: string, notes: string): BCDCalcSnapshot {
  const now = new Date().toISOString();
  const snapshot: BCDCalcSnapshot = {
    id: `bcds-${Date.now()}`,
    snapshot_no: `BCD-${entityCode.toUpperCase()}-${Date.now()}`,
    entity_id: entityCode,
    cth_code: input.cth_code, country_code: input.country_code,
    cif_value_inr: input.cif_value_inr, effective_date: input.effective_date,
    fta_treaty_code: input.fta_treaty_code,
    bcd_inr: output.bcd_inr, sws_inr: output.sws_inr, igst_inr: output.igst_inr,
    comp_cess_inr: output.comp_cess_inr, anti_dumping_inr: output.anti_dumping_inr,
    safeguard_inr: output.safeguard_inr, landing_inr: output.landing_inr,
    total_custom_duty_inr: output.total_custom_duty_inr,
    total_landed_value_inr: output.total_landed_value_inr,
    scenario_label: label, notes,
    created_at: now, created_by_user: user,
  };
  const all = loadBCDSnapshots(entityCode);
  saveBCDSnapshots(entityCode, [...all, snapshot]);
  return snapshot;
}
