/**
 * @file        src/lib/dgft-scrip-engine.ts
 * @purpose     DGFT Scrip 6-state lifecycle · consumes voucher-runtime-engine (D-NEW-FG · 6th consumer)
 * @sprint      T-Phase-1.EX-10-DGFT-Scrip-VendorScorecard-HSNReclass-D-NEW-FF
 * @decisions   EX-10-Q3=a FULL · Q7=a auto-post via voucher-runtime-engine
 */
import type { DGFTScrip, ScripState } from '@/types/dgft-scrip';
import type { DGFTScripUtilization } from '@/types/dgft-scrip-utilization';
import { dgftScripKey, SCRIP_VALID_TRANSITIONS } from '@/types/dgft-scrip';
import { dgftScripUtilizationKey } from '@/types/dgft-scrip-utilization';
import { postRuntimeVoucher } from '@/lib/voucher-runtime-engine';

const SEED_DGFT_SCRIPS: DGFTScrip[] = [
  { id: 'scrip-001', scrip_no: 'RoDTEP/MUM/2026/001', entity_id: 'sinha-trading', state: 'utilized', scheme_kind: 'RoDTEP', related_realisation_id: 'real-sinha-001', related_boe_id: null, source_fob_value_inr: 18500000, scheme_rate_pct: 2.5, scrip_face_value_inr: 462500, scrip_market_value_inr: 439375, claimed_at: '2026-04-15T00:00:00.000Z', issued_at: '2026-04-25T00:00:00.000Z', validity_to: '2028-04-24', transferred_to_entity: null, transferred_at: null, transfer_sale_price_inr: null, utilized_against_boe_id: 'boe-sinha-001', utilized_at: '2026-05-10T00:00:00.000Z', utilization_amount_inr: 462500, remaining_balance_inr: 0, income_voucher_runtime_id: 'vch-rt-scrip-001-income', utilization_voucher_runtime_id: 'vch-rt-scrip-001-utilization', notes: 'USA export · RoDTEP 2.5% · fully utilized against BoE-001 BCD payment', created_at: '2026-04-15T00:00:00.000Z', updated_at: '2026-05-10T00:00:00.000Z' },
  { id: 'scrip-002', scrip_no: 'RoDTEP/MUM/2026/002', entity_id: 'sinha-trading', state: 'transferable', scheme_kind: 'RoDTEP', related_realisation_id: 'real-sinha-002', related_boe_id: null, source_fob_value_inr: 12000000, scheme_rate_pct: 1.8, scrip_face_value_inr: 216000, scrip_market_value_inr: 205200, claimed_at: '2026-05-05T00:00:00.000Z', issued_at: '2026-05-15T00:00:00.000Z', validity_to: '2028-05-14', transferred_to_entity: null, transferred_at: null, transfer_sale_price_inr: null, utilized_against_boe_id: null, utilized_at: null, utilization_amount_inr: 0, remaining_balance_inr: 216000, income_voucher_runtime_id: 'vch-rt-scrip-002-income', utilization_voucher_runtime_id: null, notes: 'UAE export · transferable · awaiting sale or self-utilization', created_at: '2026-05-05T00:00:00.000Z', updated_at: '2026-05-15T00:00:00.000Z' },
];

// [JWT] GET /api/eximx/dgft-scrips?entityCode=...
export function loadDGFTScrips(entityCode: string): DGFTScrip[] {
  try {
    const raw = localStorage.getItem(dgftScripKey(entityCode));
    if (!raw) { localStorage.setItem(dgftScripKey(entityCode), JSON.stringify(SEED_DGFT_SCRIPS)); return SEED_DGFT_SCRIPS; }
    return JSON.parse(raw) as DGFTScrip[];
  } catch { return SEED_DGFT_SCRIPS; }
}

export function saveDGFTScrips(entityCode: string, list: DGFTScrip[]): void {
  localStorage.setItem(dgftScripKey(entityCode), JSON.stringify(list));
}

export function loadScripUtilizations(entityCode: string): DGFTScripUtilization[] {
  try {
    const raw = localStorage.getItem(dgftScripUtilizationKey(entityCode));
    return raw ? (JSON.parse(raw) as DGFTScripUtilization[]) : [];
  } catch { return []; }
}

export function saveScripUtilization(entityCode: string, util: DGFTScripUtilization): void {
  const all = loadScripUtilizations(entityCode);
  localStorage.setItem(dgftScripUtilizationKey(entityCode), JSON.stringify([...all, util]));
}

export function transitionScrip(entityCode: string, scripId: string, next: ScripState): DGFTScrip {
  const list = loadDGFTScrips(entityCode);
  const s = list.find((x) => x.id === scripId);
  if (!s) throw new Error(`Scrip not found: ${scripId}`);
  if (!SCRIP_VALID_TRANSITIONS[s.state].includes(next)) {
    throw new Error(`Invalid scrip transition: ${s.state} → ${next}`);
  }
  const now = new Date().toISOString();
  const updated: DGFTScrip = { ...s, state: next, updated_at: now };
  if (next === 'issued') {
    updated.issued_at = now;
    const validityDate = new Date();
    validityDate.setFullYear(validityDate.getFullYear() + 2);
    updated.validity_to = validityDate.toISOString().slice(0, 10);
    const result = postRuntimeVoucher({
      source_kind: 'tt_outward',
      source_ref_id: s.id,
      amount_inr: s.scrip_face_value_inr,
      ledger_name: 'DGFT Scrip Income (other-income)',
      entity_id: entityCode,
      notes: `Scrip ${s.scrip_no} issued · ${s.scheme_kind} · FOB ${s.source_fob_value_inr.toLocaleString()} × ${s.scheme_rate_pct}%`,
    });
    updated.income_voucher_runtime_id = result.posted_voucher_id;
  }
  saveDGFTScrips(entityCode, list.map((x) => (x.id === scripId ? updated : x)));
  return updated;
}

export function utilizeScripAgainstBoE(
  entityCode: string,
  scripId: string,
  boeId: string,
  boeNo: string,
  amountInr: number,
  utilizedByUser: string,
): { scrip: DGFTScrip; utilization: DGFTScripUtilization } {
  const list = loadDGFTScrips(entityCode);
  const s = list.find((x) => x.id === scripId);
  if (!s) throw new Error(`Scrip not found: ${scripId}`);
  if (s.state !== 'issued' && s.state !== 'transferable' && s.state !== 'transferred') {
    throw new Error(`Scrip state ${s.state} cannot be utilized`);
  }
  if (amountInr > s.remaining_balance_inr) {
    throw new Error(`Utilization amount ${amountInr} exceeds remaining balance ${s.remaining_balance_inr}`);
  }
  const now = new Date().toISOString();
  const voucherResult = postRuntimeVoucher({
    source_kind: 'tt_outward',
    source_ref_id: scripId,
    amount_inr: amountInr,
    ledger_name: `Customs BCD (scrip-paid · BoE ${boeNo})`,
    entity_id: entityCode,
    notes: `Scrip ${s.scrip_no} utilized against BoE ${boeNo} · ${amountInr.toLocaleString()}`,
  });
  const utilization: DGFTScripUtilization = {
    id: `util-${Date.now()}`, utilization_no: `UTIL-${entityCode.toUpperCase()}-${Date.now()}`,
    entity_id: entityCode, related_scrip_id: scripId, related_scrip_no: s.scrip_no,
    related_boe_id: boeId, related_boe_no: boeNo,
    utilized_amount_inr: amountInr, utilized_at: now, utilized_by_user: utilizedByUser,
    voucher_runtime_id: voucherResult.posted_voucher_id,
    notes: '', created_at: now, updated_at: now,
  };
  saveScripUtilization(entityCode, utilization);
  const newRemaining = s.remaining_balance_inr - amountInr;
  const updatedScrip: DGFTScrip = {
    ...s,
    state: newRemaining === 0 ? 'utilized' : s.state,
    utilized_against_boe_id: newRemaining === 0 ? boeId : s.utilized_against_boe_id,
    utilized_at: newRemaining === 0 ? now : s.utilized_at,
    utilization_amount_inr: s.utilization_amount_inr + amountInr,
    remaining_balance_inr: newRemaining,
    utilization_voucher_runtime_id: voucherResult.posted_voucher_id,
    updated_at: now,
  };
  saveDGFTScrips(entityCode, list.map((x) => (x.id === scripId ? updatedScrip : x)));
  return { scrip: updatedScrip, utilization };
}
