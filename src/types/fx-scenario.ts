/**
 * @file        src/types/fx-scenario.ts
 * @purpose     FX What-If scenario persistence · localStorage entity-scoped
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q11=a FR-26 entity-scoped persistence
 * @disciplines FR-30 · FR-50 · FR-58 · FR-26
 */

export type FXScenarioTargetKind = 'realisation' | 'tt_payment' | 'import_po' | 'commercial_invoice';

export interface FXScenario {
  id: string;
  scenario_no: string;
  entity_id: string;
  target_kind: FXScenarioTargetKind;
  target_id: string;
  target_ref: string;
  base_currency: string;
  base_rate_inr: number;
  base_amount_foreign: number;
  base_amount_inr: number;
  rate_change_pct: number;
  scenario_rate_inr: number;
  scenario_amount_inr: number;
  delta_inr: number;
  delta_pct: number;
  impact_on_fema_state: string | null;
  impact_summary: string;
  scenario_label: string;
  notes: string;
  created_at: string;
  created_by_user: string;
}

export const fxScenarioKey = (entityCode: string): string =>
  `erp_${entityCode}_fx_scenarios`;
