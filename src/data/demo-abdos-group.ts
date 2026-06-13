/**
 * @file        src/data/demo-abdos-group.ts
 * @sprint      T-B1-Abdos-Group-Seed · Wave-1 · predecessor dcd42db
 * @purpose     Turn the single-entity ABDOS blueprint into a real multi-company
 *              GROUP that feeds the Group Consolidation page. Seeds:
 *                · 6 entities (parent + 5 verticals) into erp_group_entities
 *                · group-structure tree with the Ind-AS METHOD MIX
 *                  (3 full · 1 proportional JV · 1 equity associate)
 *                · per-entity posted vouchers so consolidation has real TBs
 *                · 3 intercompany transactions so eliminations have flows
 *
 * @scope-wall  DP-A3-9 · feeds Consolidated P&L + TB + eliminations ONLY.
 *              Does NOT touch / pretend to surface BS / CF / NCI / FX (walled).
 *
 * @disciplines FR-44 (consumes existing engines · ZERO new SIBLINGs) ·
 *              FR-19 SIBLING · FR-91 honest scope.
 *
 * [JWT] POST /api/demo/seed/abdos-group
 */

import {
  upsertGroupStructure,
  listGroupStructure,
} from '@/lib/intercompany-group-structure-engine';
import {
  createICTransaction,
  postICTransaction,
} from '@/lib/intercompany-transaction-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';

// ─── The 6 ABDOS group entities (parent + 5 verticals) ──────────────────────

export interface AbdosEntitySeed {
  id: string;
  name: string;
  shortCode: string;
  type: 'parent' | 'subsidiary';
}

export const ABDOS_GROUP_ENTITIES: readonly AbdosEntitySeed[] = [
  { id: 'e-abdos', name: 'Abdos Group Holdings',          shortCode: 'ABDOS', type: 'parent'     },
  { id: 'e-ablsc', name: 'Abdos Life Sciences',           shortCode: 'ABLSC', type: 'subsidiary' },
  { id: 'e-abcmf', name: 'Abdos Contract Manufacturing',  shortCode: 'ABCMF', type: 'subsidiary' },
  { id: 'e-abpkg', name: 'Abdos Packaging',               shortCode: 'ABPKG', type: 'subsidiary' },
  { id: 'e-abdst', name: 'Abdos Distribution',            shortCode: 'ABDST', type: 'subsidiary' },
  { id: 'e-abhhc', name: 'Abdos Hygiene & Homecare',      shortCode: 'ABHHC', type: 'subsidiary' },
] as const;

const ENTITY_STORE_KEY = 'erp_group_entities';
const STRUCTURE_EFFECTIVE_FROM = '2024-04-01';
const DEFAULT_FY = '2024-25';

// ─── Block 1 · entity registration (merge-safe · preserves other blueprints) ─

function registerEntities(): void {
  let existing: AbdosEntitySeed[] = [];
  try {
    // [JWT] GET /api/foundation/entities
    const raw = localStorage.getItem(ENTITY_STORE_KEY);
    existing = raw ? (JSON.parse(raw) as AbdosEntitySeed[]) : [];
  } catch { existing = []; }

  const byCode = new Map<string, AbdosEntitySeed>();
  for (const e of existing) byCode.set(e.shortCode, e);
  for (const e of ABDOS_GROUP_ENTITIES) byCode.set(e.shortCode, { ...e });

  // [JWT] POST /api/foundation/entities (bulk upsert)
  localStorage.setItem(ENTITY_STORE_KEY, JSON.stringify([...byCode.values()]));
}

// ─── Block 2 · group-structure tree · the Ind-AS method mix ─────────────────

function seedGroupStructure(): void {
  // Parent root node so IC txns that target the parent (royalty/mgmt fee)
  // pass the `getGroupStructure(to_entity)` guard in postICTransaction.
  upsertGroupStructure({
    entity_id: 'e-abdos', parent_entity_id: null,
    relationship: 'parent', ownership_pct: 100,
    consolidation_method: 'full', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
  // 3 full + 1 proportional (JV >50%) + 1 equity (associate <50%)
  upsertGroupStructure({
    entity_id: 'e-ablsc', parent_entity_id: 'e-abdos',
    relationship: 'subsidiary', ownership_pct: 100,
    consolidation_method: 'full', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
  upsertGroupStructure({
    entity_id: 'e-abcmf', parent_entity_id: 'e-abdos',
    relationship: 'subsidiary', ownership_pct: 100,
    consolidation_method: 'full', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
  upsertGroupStructure({
    entity_id: 'e-abpkg', parent_entity_id: 'e-abdos',
    relationship: 'subsidiary', ownership_pct: 100,
    consolidation_method: 'full', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
  upsertGroupStructure({
    entity_id: 'e-abdst', parent_entity_id: 'e-abdos',
    relationship: 'joint_venture', ownership_pct: 60,
    consolidation_method: 'proportional', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
  upsertGroupStructure({
    entity_id: 'e-abhhc', parent_entity_id: 'e-abdos',
    relationship: 'associate', ownership_pct: 30,
    consolidation_method: 'equity', effective_from: STRUCTURE_EFFECTIVE_FROM,
  });
}

// ─── Block 3 · per-entity Trial Balances ────────────────────────────────────

interface TBSeed { revenue: number; cogs: number; opex: number; cashOpen: number }

const TB_PROFILES: Record<string, TBSeed> = {
  // realistic to vertical · figures in rupees
  ABLSC: { revenue: 4_500_000, cogs: 2_200_000, opex: 800_000, cashOpen: 1_500_000 },
  ABCMF: { revenue: 3_800_000, cogs: 1_900_000, opex: 700_000, cashOpen: 1_200_000 },
  ABPKG: { revenue: 2_900_000, cogs: 1_500_000, opex: 600_000, cashOpen:   900_000 },
  ABDST: { revenue: 2_200_000, cogs: 1_700_000, opex: 300_000, cashOpen:   700_000 },
  ABHHC: { revenue: 1_500_000, cogs:   800_000, opex: 350_000, cashOpen:   500_000 },
  ABDOS: { revenue:         0, cogs:         0, opex: 250_000, cashOpen: 3_000_000 },
};

function mkLine(
  id: string, ledger_id: string, ledger_name: string, group: string,
  dr: number, cr: number, narration: string,
): VoucherLedgerLine {
  return {
    id, ledger_id, ledger_code: ledger_id, ledger_name,
    ledger_group_code: group, dr_amount: dr, cr_amount: cr, narration,
  };
}

function mkPostedVoucher(
  shortCode: string, suffix: string, date: string,
  lines: VoucherLedgerLine[], gross: number, narration: string,
): Voucher {
  const id = `vch-ABDOS-SEED-${shortCode}-${suffix}`;
  return {
    id,
    voucher_no: `${shortCode}/SEED/${suffix}`,
    voucher_type_id: 'seed-journal',
    voucher_type_name: 'Group Seed Journal',
    base_voucher_type: 'Journal',
    entity_id: shortCode,
    date,
    ledger_lines: lines,
    gross_amount: gross,
    total_discount: 0,
    total_taxable: gross,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0,
    net_amount: gross,
    tds_applicable: false,
    narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'posted',
    created_by: 'demo-abdos-group',
    created_at: '2024-09-30T10:00:00.000Z',
    updated_at: '2024-09-30T10:00:00.000Z',
  };
}

function seedTrialBalance(shortCode: string, profile: TBSeed): void {
  const key = vouchersKey(shortCode);
  let existing: Voucher[] = [];
  try {
    // [JWT] GET /api/accounting/vouchers?entity={shortCode}
    const raw = localStorage.getItem(key);
    existing = raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { existing = []; }

  // idempotent — skip if our seeded vouchers already present
  if (existing.some(v => v.id?.startsWith(`vch-ABDOS-SEED-${shortCode}-`))) return;

  const vouchers: Voucher[] = [];

  // Opening cash (BS) — Dr CASH / Cr Capital (treat as L-CL placeholder)
  if (profile.cashOpen > 0) {
    vouchers.push(mkPostedVoucher(shortCode, 'OPN', '2024-04-01', [
      mkLine('l-1', 'CASH-OPEN', 'Bank / Cash', 'CASH', profile.cashOpen, 0, 'Opening cash'),
      mkLine('l-2', 'CAP-OPEN', 'Owners Capital',  'TPAY', 0, profile.cashOpen, 'Opening capital'),
    ], profile.cashOpen, 'Opening balance seed'));
  }

  // Revenue (Dr Receivables / Cr SALE)
  if (profile.revenue > 0) {
    vouchers.push(mkPostedVoucher(shortCode, 'REV', '2024-09-30', [
      mkLine('l-1', 'TREC-IC', 'Trade Receivables', 'TREC', profile.revenue, 0, 'Revenue receivable'),
      mkLine('l-2', 'SALE-IC', 'Revenue from Operations', 'SALE', 0, profile.revenue, 'Revenue'),
    ], profile.revenue, `${shortCode} · annual revenue (seed)`));
  }

  // COGS (Dr PURCH / Cr Payables)
  if (profile.cogs > 0) {
    vouchers.push(mkPostedVoucher(shortCode, 'COG', '2024-09-30', [
      mkLine('l-1', 'PURCH-IC', 'Purchases', 'PURCH', profile.cogs, 0, 'COGS purchases'),
      mkLine('l-2', 'TPAY-IC',  'Trade Payables', 'TPAY', 0, profile.cogs, 'Vendor payable'),
    ], profile.cogs, `${shortCode} · annual COGS (seed)`));
  }

  // Opex (Dr EMPB / Cr Cash)
  if (profile.opex > 0) {
    vouchers.push(mkPostedVoucher(shortCode, 'OPX', '2024-09-30', [
      mkLine('l-1', 'EMPB-IC', 'Employee Benefits', 'EMPB', profile.opex, 0, 'Salaries / opex'),
      mkLine('l-2', 'CASH-IC', 'Bank / Cash', 'CASH', 0, profile.opex, 'Opex cash out'),
    ], profile.opex, `${shortCode} · annual opex (seed)`));
  }

  // [JWT] POST /api/accounting/vouchers/bulk?entity={shortCode}
  localStorage.setItem(key, JSON.stringify([...existing, ...vouchers]));
}

function seedAllTrialBalances(): void {
  for (const [code, profile] of Object.entries(TB_PROFILES)) {
    seedTrialBalance(code, profile);
  }
}

// ─── Block 4 · Intercompany transactions ────────────────────────────────────

interface ICSeed {
  txn_type: 'service_charge' | 'loan' | 'capital_infusion';
  from_entity: string;
  to_entity: string;
  amount: number;
  item_key?: string;
  txn_date: string;
  note: string;
}

const IC_SEEDS: readonly ICSeed[] = [
  {
    // ABPKG sells laminated tubes to ABCMF (Contract Mfg)
    txn_type: 'service_charge', from_entity: 'e-abpkg', to_entity: 'e-abcmf',
    amount: 250_000, item_key: 'LAM-TUBE',
    txn_date: '2024-09-15', note: 'IC supply · laminated tubes Packaging → Contract Mfg',
  },
  {
    // ABLSC sells labware to ABDST (Distribution)
    txn_type: 'service_charge', from_entity: 'e-ablsc', to_entity: 'e-abdst',
    amount: 180_000, item_key: 'LABWARE',
    txn_date: '2024-10-20', note: 'IC supply · labware Life Sciences → Distribution',
  },
  {
    // ABCMF royalty / management fee to parent ABDOS
    txn_type: 'service_charge', from_entity: 'e-abcmf', to_entity: 'e-abdos',
    amount: 120_000, item_key: 'MGMT-FEE',
    txn_date: '2024-11-30', note: 'IC management / royalty fee · Contract Mfg → Parent',
  },
] as const;

function seedICTransactions(): void {
  for (const s of IC_SEEDS) {
    const txn = createICTransaction({
      txn_type: s.txn_type,
      from_entity: s.from_entity,
      to_entity: s.to_entity,
      amount: s.amount,
      item_key: s.item_key,
      txn_date: s.txn_date,
      note: s.note,
    });
    try { postICTransaction(txn.ic_txn_id); } catch {
      // engine validation rejected (e.g. structure missing) — surface non-fatally
      // in seed flow so partial seeding doesn't break the page load.
    }
  }
}

// ─── Public seed entry ──────────────────────────────────────────────────────

export interface AbdosGroupSeedResult {
  entities: number;
  structureNodes: number;
  trialBalancesSeeded: string[];
  icTransactionsSeeded: number;
  fy: string;
}

export function seedAbdosGroup(): AbdosGroupSeedResult {
  registerEntities();
  seedGroupStructure();
  seedAllTrialBalances();
  seedICTransactions();

  const structureNodes = listGroupStructure().filter(n =>
    ABDOS_GROUP_ENTITIES.some(e => e.id === n.entity_id),
  ).length;

  return {
    entities: ABDOS_GROUP_ENTITIES.length,
    structureNodes,
    trialBalancesSeeded: Object.keys(TB_PROFILES),
    icTransactionsSeeded: IC_SEEDS.length,
    fy: DEFAULT_FY,
  };
}
