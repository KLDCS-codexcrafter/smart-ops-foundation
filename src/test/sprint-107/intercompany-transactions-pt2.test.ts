/**
 * @file        src/test/sprint-107/intercompany-transactions-pt2.test.ts
 * @sprint      Sprint 107 · T-Phase-6.C.1.3 · Arc 2 · Pillar C.1 · IC Transactions Pt 2
 * @purpose     Verify intercompany-transaction-engine EXTENSION (4 new types +
 *              settleICTransaction). FR-44 spine reused · no new orchestration.
 *              S106 types still work (regression). All 8 IC types complete.
 * @form-A      ≥30 discrete it() blocks (v1.30 §N).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  IC_TRANSACTION_TYPES,
  PRICED_IC_TYPES,
  UNPRICED_IC_TYPES,
  createICTransaction,
  postICTransaction,
  settleICTransaction,
} from '@/lib/intercompany-transaction-engine';
import * as icEngine from '@/lib/intercompany-transaction-engine';
import * as pricingEngine from '@/lib/internal-pricing-engine';
import * as tpEngine from '@/lib/idea-7-transfer-pricing-audit-engine';
import * as fincoreEngine from '@/lib/fincore-engine';
import { upsertGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { MOCK_ENTITIES } from '@/data/mock-entities';
import { auditTrailKey, type AuditEntityType } from '@/types/audit-trail';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENG_PATH = path.resolve(__dirname, '../../lib/intercompany-transaction-engine.ts');
const PAGE_PATH = path.resolve(__dirname, '../../features/intercompany/IntercompanyTransactionsHubPage.tsx');
const AUDIT_PATH = path.resolve(__dirname, '../../types/audit-trail.ts');
const COMPLIANCE_PATH = path.resolve(__dirname, '../../pages/erp/comply360/Comply360Sidebar.types.ts');
const ENGINE_SRC = fs.readFileSync(ENG_PATH, 'utf8');
const PAGE_SRC = fs.readFileSync(PAGE_PATH, 'utf8');
const AUDIT_SRC = fs.readFileSync(AUDIT_PATH, 'utf8');
const COMPLIANCE_SRC = fs.readFileSync(COMPLIANCE_PATH, 'utf8');

const PARENT_ID = MOCK_ENTITIES[0].id;
const SUB_ID = MOCK_ENTITIES[1].id;
const PARENT_CODE = MOCK_ENTITIES[0].shortCode;
const SUB_CODE = MOCK_ENTITIES[1].shortCode;

function resetStores(): void { localStorage.clear(); }
function registerBoth(): void {
  upsertGroupStructure({
    entity_id: PARENT_ID, parent_entity_id: null, relationship: 'parent',
    ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01',
  });
  upsertGroupStructure({
    entity_id: SUB_ID, parent_entity_id: PARENT_ID, relationship: 'subsidiary',
    ownership_pct: 80, consolidation_method: 'full', effective_from: '2026-04-01',
  });
}
function seedPricingRule(): string {
  const rule_id = 'pr-ic-s107-001';
  const now = '2026-04-01T00:00:00.000Z';
  const rule = {
    pricing_rule_id: rule_id,
    rule_type: 'inter_entity' as const,
    from_scope: { entity_id: PARENT_ID }, to_scope: { entity_id: SUB_ID },
    item_scope: 'all' as const, item_key: 'ALL',
    pricing_method: 'arms_length_market' as const,
    markup_percentage: 0, overhead_allocation_pct: 0,
    variance_handling: 'absorb_at_source' as const,
    base_cost: 0, market_rate: 2500, standard_cost: 0, budget_rate: 0,
    mrp: 0, lowest_external_rate: 0,
    effective_from: '2026-04-01', effective_to: null,
    approval_workflow: 'auto' as const, created_at: now, updated_at: now,
  };
  localStorage.setItem('erp_internal_pricing_rules', JSON.stringify([rule]));
  return rule_id;
}

describe('S107 · Block 2 · Union + classification (4 new types · 0-DIFF on S106)', () => {
  it('IC_TRANSACTION_TYPES has all 8 types (S106 first-four preserved · S107 appended)', () => {
    expect(IC_TRANSACTION_TYPES).toEqual([
      'stock_transfer', 'service_charge', 'capital_infusion', 'loan',
      'expense_allocation', 'asset_transfer', 'invoice', 'payment',
    ]);
    expect(IC_TRANSACTION_TYPES.length).toBe(8);
  });
  it('S106 first 4 union members are 0-DIFF (regression-safe)', () => {
    expect(IC_TRANSACTION_TYPES.slice(0, 4)).toEqual([
      'stock_transfer', 'service_charge', 'capital_infusion', 'loan',
    ]);
  });
  it('PRICED_IC_TYPES adds asset_transfer + invoice', () => {
    expect(PRICED_IC_TYPES).toEqual(expect.arrayContaining([
      'stock_transfer', 'service_charge', 'asset_transfer', 'invoice',
    ]));
    expect(PRICED_IC_TYPES.length).toBe(4);
  });
  it('UNPRICED_IC_TYPES adds expense_allocation + payment', () => {
    expect(UNPRICED_IC_TYPES).toEqual(expect.arrayContaining([
      'capital_infusion', 'loan', 'expense_allocation', 'payment',
    ]));
    expect(UNPRICED_IC_TYPES.length).toBe(4);
  });
  it('PRICED and UNPRICED partitions are disjoint and cover all 8', () => {
    const p = new Set<string>(PRICED_IC_TYPES);
    const u = new Set<string>(UNPRICED_IC_TYPES);
    for (const t of IC_TRANSACTION_TYPES) {
      expect(p.has(t) || u.has(t)).toBe(true);
      expect(p.has(t) && u.has(t)).toBe(false);
    }
  });
});

describe('S107 · Block 3 · 4 NEW reciprocal cases · post via existing orchestration', () => {
  beforeEach(() => { resetStores(); registerBoth(); });

  it('expense_allocation: posts, balanced, UNPRICED (no resolvePrice/TP)', () => {
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'expense_allocation', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 12_000, txn_date: '2026-06-01', allocation_basis: 'headcount',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(posted.status).toBe('posted');
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(tpSpy).not.toHaveBeenCalled();
    resolveSpy.mockRestore(); tpSpy.mockRestore();
  });
  it('expense_allocation: ledger codes IC-ALLOC-INC / IC-ALLOC-EXP appear', () => {
    const t = createICTransaction({
      txn_type: 'expense_allocation', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 5000, txn_date: '2026-06-01', allocation_basis: 'revenue',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-ALLOC-INC');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-ALLOC-EXP');
  });
  it('expense_allocation: stores allocation_basis on the txn', () => {
    const t = createICTransaction({
      txn_type: 'expense_allocation', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01', allocation_basis: 'area',
    });
    expect(t.allocation_basis).toBe('area');
  });

  it('asset_transfer: PRICED · CALLS resolvePrice + generateTPAudit', () => {
    seedPricingRule();
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'asset_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(resolveSpy).toHaveBeenCalled();
    expect(tpSpy).toHaveBeenCalled();
    expect(posted.tp_audit_id).toBeDefined();
    expect(posted.amount).toBe(2500);
    resolveSpy.mockRestore(); tpSpy.mockRestore();
  });
  it('asset_transfer: ledger codes FA-DISPOSAL / IC-FA appear', () => {
    seedPricingRule();
    const t = createICTransaction({
      txn_type: 'asset_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('FA-DISPOSAL');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-FA');
  });

  it('invoice: PRICED · CALLS resolvePrice + generateTPAudit', () => {
    seedPricingRule();
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'invoice', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 2, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(resolveSpy).toHaveBeenCalled();
    expect(tpSpy).toHaveBeenCalled();
    expect(posted.amount).toBe(5000);
    resolveSpy.mockRestore(); tpSpy.mockRestore();
  });
  it('invoice: ledger codes IC-SALES-INC / IC-PURCH-EXP appear', () => {
    seedPricingRule();
    const t = createICTransaction({
      txn_type: 'invoice', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-SALES-INC');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-PURCH-EXP');
  });

  it('payment: UNPRICED · skips pricing/TP', () => {
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'payment', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 999, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(tpSpy).not.toHaveBeenCalled();
    resolveSpy.mockRestore(); tpSpy.mockRestore();
  });
  it('payment: ledger codes IC-RECV-CLR / IC-PAY-CLR appear', () => {
    const t = createICTransaction({
      txn_type: 'payment', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 750, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-RECV-CLR');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-PAY-CLR');
  });
  it('payment: stores settles_ic_txn_id link when given', () => {
    const link = createICTransaction({
      txn_type: 'invoice', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, txn_date: '2026-06-01',
    });
    const pay = createICTransaction({
      txn_type: 'payment', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 200, txn_date: '2026-06-02', settles_ic_txn_id: link.ic_txn_id,
    });
    expect(pay.settles_ic_txn_id).toBe(link.ic_txn_id);
  });

  it.each(['expense_allocation', 'asset_transfer', 'invoice', 'payment'] as const)(
    '%s reciprocal vouchers balance (dr == cr)', (txn_type) => {
      if (txn_type === 'asset_transfer' || txn_type === 'invoice') seedPricingRule();
      const isPriced = txn_type === 'asset_transfer' || txn_type === 'invoice';
      const t = createICTransaction({
        txn_type, from_entity: PARENT_ID, to_entity: SUB_ID,
        item_key: isPriced ? 'ALL' : undefined,
        quantity: isPriced ? 1 : undefined,
        amount: isPriced ? 0 : 1234.56,
        txn_date: '2026-06-01',
        allocation_basis: txn_type === 'expense_allocation' ? 'headcount' : undefined,
      });
      postICTransaction(t.ic_txn_id);
      const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
      const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
      for (const v of [fromV, toV]) {
        const dr = v.ledger_lines.reduce((s: number, l: { dr_amount: number }) => s + l.dr_amount, 0);
        const cr = v.ledger_lines.reduce((s: number, l: { cr_amount: number }) => s + l.cr_amount, 0);
        expect(Math.round((dr - cr) * 100)).toBe(0);
      }
    },
  );
});

describe('S107 · Block 4 · Settlement', () => {
  beforeEach(() => { resetStores(); registerBoth(); });

  it('settleICTransaction transitions posted → settled', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const settled = settleICTransaction(t.ic_txn_id, { settlement_date: '2026-06-15' });
    expect(settled.status).toBe('settled');
    expect(settled.settlement_date).toBe('2026-06-15');
  });
  it('settleICTransaction is idempotent', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const a = settleICTransaction(t.ic_txn_id, { settlement_date: '2026-06-15' });
    const b = settleICTransaction(t.ic_txn_id, { settlement_date: '2026-06-30' });
    expect(b.settlement_date).toBe(a.settlement_date);
  });
  it('settleICTransaction rejects non-posted txn', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    expect(() => settleICTransaction(t.ic_txn_id, { settlement_date: '2026-06-15' }))
      .toThrow(/must be 'posted'/);
  });
  it('settleICTransaction rejects unknown id', () => {
    expect(() => settleICTransaction('ic-nope', { settlement_date: '2026-06-15' }))
      .toThrow(/not found/);
  });
  it('settleICTransaction requires settlement_date', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    expect(() => settleICTransaction(t.ic_txn_id, { settlement_date: '' }))
      .toThrow(/settlement_date/);
  });
  it('settleICTransaction links payment_ic_txn_id', () => {
    const t = createICTransaction({
      txn_type: 'invoice', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const settled = settleICTransaction(t.ic_txn_id, {
      settlement_date: '2026-06-15', payment_ic_txn_id: 'ic-pay-xyz',
    });
    expect(settled.settlement_payment_ic_txn_id).toBe('ic-pay-xyz');
  });
  it('settleICTransaction logs intercompany_settlement audit', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    settleICTransaction(t.ic_txn_id, { settlement_date: '2026-06-15' });
    const audits = JSON.parse(localStorage.getItem(auditTrailKey(PARENT_ID)) ?? '[]');
    const settle = audits.filter((a: { entity_type: string }) => a.entity_type === 'intercompany_settlement');
    expect(settle.length).toBeGreaterThan(0);
  });
  it("'intercompany_settlement' is a valid AuditEntityType", () => {
    const t: AuditEntityType = 'intercompany_settlement';
    expect(t).toBe('intercompany_settlement');
  });
  it("audit-trail.ts declares 'intercompany_settlement'", () => {
    expect(AUDIT_SRC).toMatch(/'intercompany_settlement'/);
  });
  it("4 new txn types reuse 'intercompany_transaction' audit type (no per-type audit type)", () => {
    expect(AUDIT_SRC).not.toMatch(/'intercompany_expense_allocation'/);
    expect(AUDIT_SRC).not.toMatch(/'intercompany_asset_transfer'/);
    expect(AUDIT_SRC).not.toMatch(/'intercompany_invoice'/);
    expect(AUDIT_SRC).not.toMatch(/'intercompany_payment'/);
  });
});

describe('S107 · Regression · S106 4 types still work', () => {
  beforeEach(() => { resetStores(); registerBoth(); });
  it.each(['stock_transfer', 'service_charge', 'capital_infusion', 'loan'] as const)(
    'S106 type %s still posts cleanly', (txn_type) => {
      if (txn_type === 'stock_transfer' || txn_type === 'service_charge') seedPricingRule();
      const isPriced = txn_type === 'stock_transfer' || txn_type === 'service_charge';
      const t = createICTransaction({
        txn_type, from_entity: PARENT_ID, to_entity: SUB_ID,
        item_key: isPriced ? 'ALL' : undefined,
        quantity: isPriced ? 1 : undefined,
        amount: isPriced ? 0 : 1000, txn_date: '2026-06-01',
      });
      expect(postICTransaction(t.ic_txn_id).status).toBe('posted');
    },
  );
});

describe('S107 · FR-44 spine reused · no new orchestration', () => {
  it('engine still does NOT redefine recommendALPMethod / computePriceForMethod', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+recommendALPMethod/);
    expect(ENGINE_SRC).not.toMatch(/function\s+computePriceForMethod/);
  });
  it('engine does NOT add a second pricing pipeline (single postICTransaction)', () => {
    const matches = ENGINE_SRC.match(/export function postICTransaction/g) ?? [];
    expect(matches.length).toBe(1);
  });
  it('engine does NOT export matching / elimination / consolidation fns (scope wall DP-A2-9)', () => {
    expect(icEngine).not.toHaveProperty('matchICTransactions');
    expect(icEngine).not.toHaveProperty('eliminateICEntries');
    expect(icEngine).not.toHaveProperty('consolidateGroup');
    expect(icEngine).not.toHaveProperty('eliminateUnrealizedFAProfit');
  });
  it('engine source has no matching/elimination/consolidation function defs', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+(match|eliminate|consolidate)/i);
  });
});

describe('S107 · Page wiring (extension only · #35 unchanged page)', () => {
  it('IntercompanyTransactionsHubPage exists and is default export', () => {
    expect(fs.existsSync(PAGE_PATH)).toBe(true);
    expect(PAGE_SRC).toMatch(/export default function IntercompanyTransactionsHubPage/);
  });
  it('page wires settleICTransaction', () => {
    expect(PAGE_SRC).toMatch(/settleICTransaction/);
  });
  it('page renders Settle action', () => {
    expect(PAGE_SRC).toMatch(/Settle/);
  });
});

describe('S107 · Registers · sibling-register UNCHANGED · S107 history appended', () => {
  it('sibling count is still 174 (no new SIBLING this sprint)', () => {
    expect(getSiblingCount()).toBe(174);
  });
  it('sprint-history S107 entry present with correct shape', () => {
    const s107 = SPRINTS.find((s) => s.sprintNumber === 107);
    expect(s107).toBeDefined();
    expect(s107?.code).toBe('T-Phase-6.C.1.3');
    expect(s107?.grade).toBe('A');
    expect(s107?.newSiblings).toEqual([]);
    expect(s107?.headSha).toBe('TBD_AT_BANK');
    expect(s107?.predecessorSha).toBe('30839e082e3250b11ac79ef40b6696e7d64e8481');
  });
  it('S106 headSha is backfilled to 30839e08 (final bank HEAD · not Pass-A)', () => {
    const s106 = SPRINTS.find((s) => s.sprintNumber === 106);
    expect(s106?.headSha).toBe('30839e082e3250b11ac79ef40b6696e7d64e8481');
  });
  it('no S108 entry pre-created (Guardrail 2)', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 108)).toBeUndefined();
  });
  it('ComplianceModule untouched by S107', () => {
    expect(COMPLIANCE_SRC).not.toMatch(/intercompany_settlement/);
    expect(COMPLIANCE_SRC).not.toMatch(/expense_allocation|asset_transfer/);
  });
});
