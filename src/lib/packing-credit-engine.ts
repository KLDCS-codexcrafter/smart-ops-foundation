/**
 * @file        src/lib/packing-credit-engine.ts
 * @purpose     D-NEW-FK · Packing Credit (PCFC + EPC) lifecycle · 11th SIBLING + 9th D-NEW-FG consumer
 * @sprint      T-Phase-2.A-EX-12-LC-PackingCredit · Block B
 * @decisions   Q-LOCK-4(a) 11th SIBLING · Q-LOCK-6(a) 9th D-NEW-FG consumer
 *              ExportPO + ExportRealisation STAY 0-DIFF · PC-as-Realisation-precursor pattern
 */
import type { PackingCreditContract, PCStatus } from '@/types/packing-credit';
import {
  PC_VALID_TRANSITIONS,
  packingCreditKey,
  RBI_PC_TENOR_DAYS,
} from '@/types/packing-credit';

const now = '2026-05-21T00:00:00.000Z';

function computeDaysToDeadline(deadline: string, asOf: Date = new Date()): number {
  if (!deadline) return 0;
  const dl = new Date(deadline).getTime();
  const ms = dl - asOf.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const SEED_PCS: PackingCreditContract[] = [
  {
    id: 'pc-sinha-001',
    pc_contract_no: 'PCFC-SBI-2026-001',
    entity_id: 'sinha-trading',
    status: 'drawn',
    variant: 'PCFC',
    related_export_po_id: 'expo-sinha-001',
    related_export_po_no: 'EXPO-SINHA-2026-001',
    related_foreign_customer_id: 'fc-sinha-usa-001',
    ad_bank_code: 'SBININBB',
    ad_bank_name: 'State Bank of India',
    currency_code: 'USD',
    sanctioned_amount_foreign: 10000,
    sanctioned_amount_inr: 850000,
    drawn_amount_foreign: 10000,
    drawn_amount_inr: 850000,
    interest_rate_pct: 6.25,
    rbi_tenor_days: RBI_PC_TENOR_DAYS,
    sanction_date: '2026-05-10',
    drawdown_date: '2026-05-12',
    liquidation_deadline: addDays('2026-05-12', RBI_PC_TENOR_DAYS),
    liquidations: [],
    outstanding_amount_inr: 850000,
    days_to_deadline: computeDaysToDeadline(addDays('2026-05-12', RBI_PC_TENOR_DAYS)),
    notes: 'PCFC USD · USA export prep finance · expected liquidation via export realisation',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'pc-sinha-002',
    pc_contract_no: 'PCFC-HDFC-2026-002',
    entity_id: 'sinha-trading',
    status: 'sanctioned',
    variant: 'PCFC',
    related_export_po_id: 'expo-sinha-002',
    related_export_po_no: 'EXPO-SINHA-2026-002',
    related_foreign_customer_id: 'fc-sinha-uae-001',
    ad_bank_code: 'HDFCINBB',
    ad_bank_name: 'HDFC Bank',
    currency_code: 'USD',
    sanctioned_amount_foreign: 5000,
    sanctioned_amount_inr: 425000,
    drawn_amount_foreign: 0,
    drawn_amount_inr: 0,
    interest_rate_pct: 6.5,
    rbi_tenor_days: RBI_PC_TENOR_DAYS,
    sanction_date: '2026-05-18',
    drawdown_date: null,
    liquidation_deadline: '',
    liquidations: [],
    outstanding_amount_inr: 0,
    days_to_deadline: 0,
    notes: 'PCFC USD · UAE export prep · sanctioned · awaiting drawdown',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'pc-sinha-003',
    pc_contract_no: 'EPC-BARB-2026-003',
    entity_id: 'sinha-trading',
    status: 'drawn',
    variant: 'EPC',
    related_export_po_id: 'expo-sinha-003',
    related_export_po_no: 'EXPO-SINHA-2026-003',
    related_foreign_customer_id: 'fc-sinha-jp-001',
    ad_bank_code: 'BARBINBB',
    ad_bank_name: 'Bank of Baroda',
    currency_code: 'INR',
    sanctioned_amount_foreign: 0,
    sanctioned_amount_inr: 4500000,
    drawn_amount_foreign: 0,
    drawn_amount_inr: 4500000,
    interest_rate_pct: 7.75,
    rbi_tenor_days: RBI_PC_TENOR_DAYS,
    sanction_date: '2026-05-19',
    drawdown_date: '2026-05-20',
    liquidation_deadline: addDays('2026-05-20', RBI_PC_TENOR_DAYS),
    liquidations: [],
    outstanding_amount_inr: 4500000,
    days_to_deadline: computeDaysToDeadline(addDays('2026-05-20', RBI_PC_TENOR_DAYS)),
    notes: 'EPC INR · high-value Japan export · 270-day RBI tenor · liquidation via JPY realisation',
    created_at: now,
    updated_at: now,
  },
];

export function loadPCs(entityCode: string): PackingCreditContract[] {
  try {
    const raw = localStorage.getItem(packingCreditKey(entityCode));
    if (!raw) {
      localStorage.setItem(packingCreditKey(entityCode), JSON.stringify(SEED_PCS));
      return SEED_PCS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PackingCreditContract[]) : SEED_PCS;
  } catch {
    return SEED_PCS;
  }
}

export function savePCs(entityCode: string, list: PackingCreditContract[]): void {
  localStorage.setItem(packingCreditKey(entityCode), JSON.stringify(list));
}

export function getPC(entityCode: string, id: string): PackingCreditContract | null {
  return loadPCs(entityCode).find((p) => p.id === id) ?? null;
}

export function transitionPC(entityCode: string, id: string, next: PCStatus): PackingCreditContract {
  const current = getPC(entityCode, id);
  if (!current) throw new Error(`PC ${id} not found`);
  const validNexts = PC_VALID_TRANSITIONS[current.status];
  if (!validNexts.includes(next)) {
    throw new Error(`Invalid PC transition ${current.status} → ${next}`);
  }
  const nowIso = new Date().toISOString();
  const updated: PackingCreditContract = {
    ...current,
    status: next,
    updated_at: nowIso,
    ...(next === 'drawn' && current.drawdown_date === null && {
      drawdown_date: nowIso.slice(0, 10),
      liquidation_deadline: addDays(nowIso.slice(0, 10), current.rbi_tenor_days),
    }),
  };
  const all = loadPCs(entityCode);
  savePCs(entityCode, all.map((p) => (p.id === id ? updated : p)));
  return updated;
}

export interface PCVoucherEntry {
  pc_id: string;
  pc_contract_no: string;
  event_type: 'pc_drawdown' | 'pc_liquidation' | 'pc_interest_accrual';
  voucher_routing_target: 'voucher_runtime_engine';
  debit_inr: number;
  credit_inr: number;
  ledger_account: string;
  narration: string;
  generated_at: string;
}

export function generatePCVoucherEntries(pc: PackingCreditContract): PCVoucherEntry[] {
  const entries: PCVoucherEntry[] = [];
  if (pc.status === 'drawn' && pc.drawn_amount_inr > 0) {
    entries.push({
      pc_id: pc.id,
      pc_contract_no: pc.pc_contract_no,
      event_type: 'pc_drawdown',
      voucher_routing_target: 'voucher_runtime_engine',
      debit_inr: pc.drawn_amount_inr,
      credit_inr: pc.drawn_amount_inr,
      ledger_account: `${pc.variant}_LOAN_LIABILITY`,
      narration: `${pc.variant} drawdown · ${pc.pc_contract_no} · debit Bank · credit ${pc.variant} Loan`,
      generated_at: new Date().toISOString(),
    });
  }
  for (const liq of pc.liquidations) {
    entries.push({
      pc_id: pc.id,
      pc_contract_no: pc.pc_contract_no,
      event_type: 'pc_liquidation',
      voucher_routing_target: 'voucher_runtime_engine',
      debit_inr: liq.amount_inr,
      credit_inr: liq.amount_inr,
      ledger_account: `${pc.variant}_LOAN_LIABILITY`,
      narration: `${pc.variant} liquidation · debit ${pc.variant} Loan · credit Export Realisation`,
      generated_at: liq.liquidated_at,
    });
  }
  return entries;
}

export function summarizePCs(pcs: readonly PackingCreditContract[]): {
  total: number;
  sanctioned: number;
  drawn: number;
  fully_liquidated: number;
  overdue: number;
  total_outstanding_inr: number;
  pcfc_outstanding_inr: number;
  epc_outstanding_inr: number;
} {
  let sanctioned = 0, drawn = 0, liquidated = 0, overdue = 0;
  let pcfcOut = 0, epcOut = 0;
  for (const pc of pcs) {
    if (pc.status === 'sanctioned') sanctioned += 1;
    if (pc.status === 'drawn' || pc.status === 'partially_liquidated') drawn += 1;
    if (pc.status === 'fully_liquidated') liquidated += 1;
    if (pc.status === 'overdue') overdue += 1;
    if (pc.variant === 'PCFC') pcfcOut += pc.outstanding_amount_inr;
    if (pc.variant === 'EPC') epcOut += pc.outstanding_amount_inr;
  }
  return {
    total: pcs.length,
    sanctioned,
    drawn,
    fully_liquidated: liquidated,
    overdue,
    total_outstanding_inr: pcfcOut + epcOut,
    pcfc_outstanding_inr: pcfcOut,
    epc_outstanding_inr: epcOut,
  };
}
