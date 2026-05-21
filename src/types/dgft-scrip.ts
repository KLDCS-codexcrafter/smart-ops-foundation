/**
 * @file        src/types/dgft-scrip.ts
 * @purpose     DGFT Scrip 6-state lifecycle · RoDTEP/Drawback realization · transferability
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q3=a FULL 6-state · consumes voucher-runtime-engine
 */
import type { DGFTSchemeKind } from './dgft-scheme';

export type ScripState =
  | 'claimed'
  | 'issued'
  | 'transferable'
  | 'transferred'
  | 'utilized'
  | 'expired';

export const SCRIP_VALID_TRANSITIONS: Record<ScripState, ScripState[]> = {
  claimed: ['issued', 'expired'],
  issued: ['transferable', 'utilized', 'expired'],
  transferable: ['transferred', 'utilized', 'expired'],
  transferred: ['utilized', 'expired'],
  utilized: [],
  expired: [],
};

export interface DGFTScrip {
  id: string;
  scrip_no: string;
  entity_id: string;
  state: ScripState;
  scheme_kind: DGFTSchemeKind;
  related_realisation_id: string | null;
  related_boe_id: string | null;
  source_fob_value_inr: number;
  scheme_rate_pct: number;
  scrip_face_value_inr: number;
  scrip_market_value_inr: number;
  claimed_at: string;
  issued_at: string | null;
  validity_to: string | null;
  transferred_to_entity: string | null;
  transferred_at: string | null;
  transfer_sale_price_inr: number | null;
  utilized_against_boe_id: string | null;
  utilized_at: string | null;
  utilization_amount_inr: number;
  remaining_balance_inr: number;
  income_voucher_runtime_id: string | null;
  utilization_voucher_runtime_id: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const dgftScripKey = (entityCode: string): string => `erp_${entityCode}_dgft_scrips`;
