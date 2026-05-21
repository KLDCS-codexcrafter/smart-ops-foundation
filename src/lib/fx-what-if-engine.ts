/**
 * @file        src/lib/fx-what-if-engine.ts
 * @purpose     FX What-If scenario simulator · consumes currency + dual-rate + month-end-reval READ-ONLY
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q3=a SCENARIO SIMULATOR · all source engines STAY 0-DIFF
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26
 */
import type { FXScenario, FXScenarioTargetKind } from '@/types/fx-scenario';
import { fxScenarioKey } from '@/types/fx-scenario';
import { loadRealisations } from '@/lib/export-realisation-engine';

const SEED_FX_SCENARIOS: FXScenario[] = [
  { id: 'fxs-001', scenario_no: 'FXS-SINHA-2026-001', entity_id: 'sinha-trading', target_kind: 'realisation', target_id: 'real-sinha-001', target_ref: 'REAL-SINHA-2026-001', base_currency: 'USD', base_rate_inr: 83.5, base_amount_foreign: 224000, base_amount_inr: 18704000, rate_change_pct: 5, scenario_rate_inr: 87.675, scenario_amount_inr: 19639200, delta_inr: 935200, delta_pct: 5, impact_on_fema_state: 'safe', impact_summary: 'USD up 5% · realisation INR up ₹9.35L · upside scenario', scenario_label: 'USD strengthens 5%', notes: 'Hypothetical · used in board pack scenario analysis', created_at: '2026-05-18T00:00:00.000Z', created_by_user: 'CFO Sinha' },
  { id: 'fxs-002', scenario_no: 'FXS-SINHA-2026-002', entity_id: 'sinha-trading', target_kind: 'realisation', target_id: 'real-sinha-002', target_ref: 'REAL-SINHA-2026-002', base_currency: 'USD', base_rate_inr: 83.5, base_amount_foreign: 144000, base_amount_inr: 12024000, rate_change_pct: -10, scenario_rate_inr: 75.15, scenario_amount_inr: 10821600, delta_inr: -1202400, delta_pct: -10, impact_on_fema_state: 'warning', impact_summary: 'USD down 10% · realisation INR drops ₹12.02L · downside risk', scenario_label: 'USD weakens 10%', notes: 'Stress-test scenario · hedge ratio review trigger', created_at: '2026-05-18T00:00:00.000Z', created_by_user: 'CFO Sinha' },
];

// [JWT] GET /api/eximx/fx-scenarios?entityCode=...
export function loadFXScenarios(entityCode: string): FXScenario[] {
  try {
    const raw = localStorage.getItem(fxScenarioKey(entityCode));
    if (!raw) { localStorage.setItem(fxScenarioKey(entityCode), JSON.stringify(SEED_FX_SCENARIOS)); return SEED_FX_SCENARIOS; }
    return JSON.parse(raw) as FXScenario[];
  } catch { return SEED_FX_SCENARIOS; }
}

// [JWT] PUT /api/eximx/fx-scenarios
export function saveFXScenarios(entityCode: string, list: FXScenario[]): void {
  localStorage.setItem(fxScenarioKey(entityCode), JSON.stringify(list));
}

export interface FXWhatIfInput {
  target_kind: FXScenarioTargetKind;
  target_id: string;
  rate_change_pct: number;
  scenario_label: string;
}

export interface FXWhatIfOutput {
  base_currency: string;
  base_rate_inr: number;
  base_amount_foreign: number;
  base_amount_inr: number;
  scenario_rate_inr: number;
  scenario_amount_inr: number;
  delta_inr: number;
  delta_pct: number;
  impact_summary: string;
}

/** Compute FX scenario for a realisation target · pure */
export function computeFXScenarioForRealisation(entityCode: string, realisationId: string, rateChangePct: number): FXWhatIfOutput | null {
  const realisations = loadRealisations(entityCode);
  const r = realisations.find((x) => x.id === realisationId);
  if (!r) return null;

  const base_rate_inr = r.forex_triangulation.realised_rate ?? r.forex_triangulation.booking_rate;
  const base_amount_foreign = r.invoice_value_foreign ?? 0;
  const base_amount_inr = base_amount_foreign * base_rate_inr;

  const multiplier = 1 + (rateChangePct / 100);
  const scenario_rate_inr = Math.round(base_rate_inr * multiplier * 1000) / 1000;
  const scenario_amount_inr = Math.round(base_amount_foreign * scenario_rate_inr);
  const delta_inr = scenario_amount_inr - base_amount_inr;
  const delta_pct = base_amount_inr > 0 ? Math.round((delta_inr / base_amount_inr) * 10000) / 100 : 0;

  const direction = rateChangePct > 0 ? 'strengthens' : 'weakens';
  const upside = delta_inr > 0 ? 'upside' : 'downside';
  const impact_summary = `${r.currency_code} ${direction} ${Math.abs(rateChangePct)}% · realisation INR changes by ₹${(delta_inr / 100000).toFixed(2)}L · ${upside} scenario · FEMA state: ${r.fema_state}`;

  return {
    base_currency: r.currency_code,
    base_rate_inr, base_amount_foreign, base_amount_inr,
    scenario_rate_inr, scenario_amount_inr, delta_inr, delta_pct,
    impact_summary,
  };
}

/** Save scenario · pure factory */
export function saveScenario(entityCode: string, input: FXWhatIfInput, output: FXWhatIfOutput, targetRef: string, user: string, notes: string): FXScenario {
  const now = new Date().toISOString();
  const scenario: FXScenario = {
    id: `fxs-${Date.now()}`,
    scenario_no: `FXS-${entityCode.toUpperCase()}-${Date.now()}`,
    entity_id: entityCode,
    target_kind: input.target_kind, target_id: input.target_id, target_ref: targetRef,
    base_currency: output.base_currency, base_rate_inr: output.base_rate_inr,
    base_amount_foreign: output.base_amount_foreign, base_amount_inr: output.base_amount_inr,
    rate_change_pct: input.rate_change_pct,
    scenario_rate_inr: output.scenario_rate_inr, scenario_amount_inr: output.scenario_amount_inr,
    delta_inr: output.delta_inr, delta_pct: output.delta_pct,
    impact_on_fema_state: null, impact_summary: output.impact_summary,
    scenario_label: input.scenario_label, notes,
    created_at: now, created_by_user: user,
  };
  const all = loadFXScenarios(entityCode);
  saveFXScenarios(entityCode, [...all, scenario]);
  return scenario;
}
