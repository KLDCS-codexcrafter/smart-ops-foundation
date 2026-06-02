/**
 * @file        src/test/sprint-106/intercompany-transactions-pt1.test.ts
 * @sprint      Sprint 106 · T-Phase-6.C.1.2 · Arc 2 · Pillar C.1 · IC Transactions Pt 1
 * @purpose     Verify intercompany-transaction-engine ORCHESTRATES resolvePrice +
 *              generateTPAudit + postVoucher (FR-44 spine · no reimplementation).
 *              Validates page wiring, sibling-register +1, scope wall, audit.
 * @form-A      ≥30 discrete it() blocks (v1.30 §N).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  IC_TRANSACTION_TYPES,
  PRICED_IC_TYPES,
  UNPRICED_IC_TYPES,
  IC_TXN_STORAGE_KEY,
  READS_FROM,
  createICTransaction,
  postICTransaction,
  listICTransactions,
  getICTransaction,
  getICTotalsForEntity,
} from '@/lib/intercompany-transaction-engine';
import * as icEngine from '@/lib/intercompany-transaction-engine';
import * as pricingEngine from '@/lib/internal-pricing-engine';
import * as tpEngine from '@/lib/idea-7-transfer-pricing-audit-engine';
import * as fincoreEngine from '@/lib/fincore-engine';
import { upsertGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { MOCK_ENTITIES } from '@/data/mock-entities';
import { auditTrailKey, type AuditEntityType } from '@/types/audit-trail';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const ENG_PATH = path.resolve(__dirname, '../../lib/intercompany-transaction-engine.ts');
const PAGE_PATH = path.resolve(
  __dirname,
  '../../features/intercompany/IntercompanyTransactionsHubPage.tsx',
);
const CC_PATH = path.resolve(
  __dirname,
  '../../features/command-center/pages/CommandCenterPage.tsx',
);
const SIDEBAR_PATH = path.resolve(
  __dirname,
  '../../apps/erp/configs/command-center-sidebar-config.ts',
);
const COMPLIANCE_MODULE_PATH = path.resolve(
  __dirname,
  '../../pages/erp/comply360/Comply360Sidebar.types.ts',
);
const AUDIT_TYPES_PATH = path.resolve(__dirname, '../../types/audit-trail.ts');

const ENGINE_SRC = fs.readFileSync(ENG_PATH, 'utf8');
const PAGE_SRC = fs.readFileSync(PAGE_PATH, 'utf8');
const CC_SRC = fs.readFileSync(CC_PATH, 'utf8');
const SIDEBAR_SRC = fs.readFileSync(SIDEBAR_PATH, 'utf8');
const COMPLIANCE_MODULE_SRC = fs.readFileSync(COMPLIANCE_MODULE_PATH, 'utf8');
const AUDIT_TYPES_SRC = fs.readFileSync(AUDIT_TYPES_PATH, 'utf8');

const PARENT_ID = MOCK_ENTITIES[0].id;
const SUB_ID = MOCK_ENTITIES[1].id;
const _BRANCH_ID = MOCK_ENTITIES[2].id; void _BRANCH_ID;
const PARENT_CODE = MOCK_ENTITIES[0].shortCode;
const SUB_CODE = MOCK_ENTITIES[1].shortCode;

function resetStores(): void {
  localStorage.clear();
}

function registerBothParties(): void {
  upsertGroupStructure({
    entity_id: PARENT_ID,
    parent_entity_id: null,
    relationship: 'parent',
    ownership_pct: 100,
    consolidation_method: 'full',
    effective_from: '2026-04-01',
  });
  upsertGroupStructure({
    entity_id: SUB_ID,
    parent_entity_id: PARENT_ID,
    relationship: 'subsidiary',
    ownership_pct: 80,
    consolidation_method: 'full',
    effective_from: '2026-04-01',
  });
}

function seedPricingRule(): string {
  const rule_id = 'pr-ic-test-001';
  const now = '2026-04-01T00:00:00.000Z';
  const rule = {
    pricing_rule_id: rule_id,
    rule_type: 'inter_entity' as const,
    from_scope: { entity_id: PARENT_ID },
    to_scope: { entity_id: SUB_ID },
    item_scope: 'all' as const,
    item_key: 'ALL',
    pricing_method: 'arms_length_market' as const,
    markup_percentage: 0,
    overhead_allocation_pct: 0,
    variance_handling: 'absorb_at_source' as const,
    base_cost: 0,
    market_rate: 1000,
    standard_cost: 0,
    budget_rate: 0,
    mrp: 0,
    lowest_external_rate: 0,
    effective_from: '2026-04-01',
    effective_to: null,
    approval_workflow: 'auto' as const,
    created_at: now,
    updated_at: now,
  };
  localStorage.setItem('erp_internal_pricing_rules', JSON.stringify([rule]));
  return rule_id;
}

describe('S106 · Block 0 · Pre-flight & contract shape', () => {
  it('exports the 4 IC transaction types in order (S106 first-four · S107 extends)', () => {
    expect(IC_TRANSACTION_TYPES.slice(0, 4)).toEqual(['stock_transfer', 'service_charge', 'capital_infusion', 'loan']);
  });

  it('classifies S106 priced vs unpriced types correctly (S107 may add more)', () => {
    expect(PRICED_IC_TYPES).toEqual(expect.arrayContaining(['stock_transfer', 'service_charge']));
    expect(UNPRICED_IC_TYPES).toEqual(expect.arrayContaining(['capital_infusion', 'loan']));
  });

  it('READS_FROM declares the 4 orchestrated engines', () => {
    expect(READS_FROM.internalPricing).toContain('internal-pricing-engine');
    expect(READS_FROM.idea7TP).toContain('idea-7-transfer-pricing-audit-engine');
    expect(READS_FROM.fincore).toContain('fincore-engine');
    expect(READS_FROM.groupStructure).toContain('intercompany-group-structure-engine');
  });

  it('engine file carries the @orchestrator header (v1.31 §P)', () => {
    expect(ENGINE_SRC).toMatch(/@orchestrator/);
    expect(ENGINE_SRC).toMatch(/scope-wall.*DP-A2-9/i);
  });

  it('storage key is the documented side-store', () => {
    expect(IC_TXN_STORAGE_KEY).toBe('erp_intercompany_transactions');
  });
});

describe('S106 · Block 2 · createICTransaction', () => {
  beforeEach(resetStores);

  it('creates a draft stock_transfer txn', () => {
    const t = createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'WIDGET-1', quantity: 5, amount: 0, txn_date: '2026-06-01',
    });
    expect(t.status).toBe('draft');
    expect(t.ic_txn_id).toMatch(/^ic-/);
  });

  it('creates a draft service_charge txn', () => {
    const t = createICTransaction({
      txn_type: 'service_charge', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'SVC-MGMT', quantity: 1, amount: 0, txn_date: '2026-06-01',
    });
    expect(t.txn_type).toBe('service_charge');
  });

  it('creates a draft capital_infusion txn (principal · no item)', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 5_000_000, txn_date: '2026-06-01',
    });
    expect(t.amount).toBe(5_000_000);
    expect(t.item_key).toBeUndefined();
  });

  it('creates a draft loan txn (principal · no item)', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 2_000_000, txn_date: '2026-06-01',
    });
    expect(t.txn_type).toBe('loan');
    expect(t.amount).toBe(2_000_000);
  });

  it('rejects same from/to entity', () => {
    expect(() => createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: PARENT_ID,
      amount: 100, txn_date: '2026-06-01',
    })).toThrow(/must differ/);
  });

  it('rejects priced type without item_key', () => {
    expect(() => createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      txn_date: '2026-06-01',
    })).toThrow(/item_key required/);
  });

  it('rejects unpriced type without amount', () => {
    expect(() => createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      txn_date: '2026-06-01',
    })).toThrow(/amount > 0 required/);
  });

  it('persists drafts to listICTransactions', () => {
    createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 1000, txn_date: '2026-06-01',
    });
    expect(listICTransactions()).toHaveLength(1);
  });

  it('getICTransaction returns null for unknown id', () => {
    expect(getICTransaction('ic-nope')).toBeNull();
  });
});

describe('S106 · Block 2-3 · postICTransaction party validation', () => {
  beforeEach(resetStores);

  it('rejects when from_entity is not in group structure', () => {
    upsertGroupStructure({
      entity_id: SUB_ID, parent_entity_id: null, relationship: 'parent',
      ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01',
    });
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    expect(() => postICTransaction(t.ic_txn_id)).toThrow(/from_entity not in group structure/);
  });

  it('rejects when to_entity is not in group structure', () => {
    upsertGroupStructure({
      entity_id: PARENT_ID, parent_entity_id: null, relationship: 'parent',
      ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01',
    });
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    expect(() => postICTransaction(t.ic_txn_id)).toThrow(/to_entity not in group structure/);
  });
});

describe('S106 · Block 3 · postICTransaction orchestration (FR-44 spine)', () => {
  beforeEach(() => {
    resetStores();
    registerBothParties();
  });

  it('capital_infusion posts WITHOUT pricing or TP audit (equity skip)', () => {
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const postSpy = vi.spyOn(fincoreEngine, 'postVoucher');
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 1_000_000, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(tpSpy).not.toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(posted.pricing_rule_id).toBeUndefined();
    expect(posted.tp_audit_id).toBeUndefined();
    expect(posted.status).toBe('posted');
    resolveSpy.mockRestore(); tpSpy.mockRestore(); postSpy.mockRestore();
  });

  it('loan posts principal WITHOUT pricing or TP audit (interest deferred to S107)', () => {
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const postSpy = vi.spyOn(fincoreEngine, 'postVoucher');
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 2_500_000, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(tpSpy).not.toHaveBeenCalled();
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(posted.amount).toBe(2_500_000);
    tpSpy.mockRestore(); postSpy.mockRestore();
  });

  it('stock_transfer with pricing rule CALLS resolvePrice + generateTPAudit + postVoucher (×2)', () => {
    const rule_id = seedPricingRule();
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const postSpy = vi.spyOn(fincoreEngine, 'postVoucher');
    const t = createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 3, amount: 0, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(resolveSpy).toHaveBeenCalled();
    expect(tpSpy).toHaveBeenCalledWith(expect.objectContaining({ pricing_rule_id: rule_id }));
    expect(postSpy).toHaveBeenCalledTimes(2);
    expect(posted.pricing_rule_id).toBe(rule_id);
    expect(posted.tp_audit_id).toBeDefined();
    expect(posted.amount).toBe(3000); // 1000 × 3
    resolveSpy.mockRestore(); tpSpy.mockRestore(); postSpy.mockRestore();
  });

  it('service_charge with pricing rule fires same pipeline', () => {
    seedPricingRule();
    const resolveSpy = vi.spyOn(pricingEngine, 'resolvePrice');
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'service_charge', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, amount: 0, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    expect(resolveSpy).toHaveBeenCalled();
    expect(tpSpy).toHaveBeenCalled();
    resolveSpy.mockRestore(); tpSpy.mockRestore();
  });

  it('priced type falls back to caller amount when no pricing rule matches', () => {
    const tpSpy = vi.spyOn(tpEngine, 'generateTPAudit');
    const t = createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'NO-RULE-ITEM', quantity: 1, amount: 750, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(posted.pricing_rule_id).toBeUndefined();
    expect(tpSpy).not.toHaveBeenCalled();
    expect(posted.amount).toBe(750);
    tpSpy.mockRestore();
  });

  it('priced type with no rule and no fallback amount throws', () => {
    const t = createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'NO-RULE-ITEM', quantity: 1, amount: 0, txn_date: '2026-06-01',
    });
    expect(() => postICTransaction(t.ic_txn_id)).toThrow(/no inter_entity pricing rule/);
  });

  it('postICTransaction is idempotent (re-post returns same txn)', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    const first = postICTransaction(t.ic_txn_id);
    const second = postICTransaction(t.ic_txn_id);
    expect(second.from_voucher_id).toBe(first.from_voucher_id);
    expect(second.to_voucher_id).toBe(first.to_voucher_id);
  });

  it('status transitions draft → posted', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    expect(t.status).toBe('draft');
    expect(postICTransaction(t.ic_txn_id).status).toBe('posted');
  });

  it('records both reciprocal voucher ids and numbers', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    const posted = postICTransaction(t.ic_txn_id);
    expect(posted.from_voucher_id).toMatch(/^vch-/);
    expect(posted.to_voucher_id).toMatch(/^vch-/);
    expect(posted.from_voucher_no).toBeTruthy();
    expect(posted.to_voucher_no).toBeTruthy();
  });

  it('reciprocal vouchers are written to each entity vouchers key', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromVouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]');
    const toVouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]');
    expect(fromVouchers.length).toBeGreaterThan(0);
    expect(toVouchers.length).toBeGreaterThan(0);
  });

  it('reciprocal ledger lines balance (dr == cr) per side', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 1234.56, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromVouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]');
    const v = fromVouchers[fromVouchers.length - 1];
    const dr = v.ledger_lines.reduce((s: number, l: { dr_amount: number }) => s + l.dr_amount, 0);
    const cr = v.ledger_lines.reduce((s: number, l: { cr_amount: number }) => s + l.cr_amount, 0);
    expect(Math.round((dr - cr) * 100)).toBe(0);
  });

  it('logs intercompany_transaction audit on post', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const audits = JSON.parse(localStorage.getItem(auditTrailKey(PARENT_ID)) ?? '[]');
    const own = audits.filter((a: { entity_type: string }) => a.entity_type === 'intercompany_transaction');
    expect(own.length).toBeGreaterThan(0);
  });

  it('getICTotalsForEntity aggregates posted amounts', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 500, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const totals = getICTotalsForEntity(PARENT_ID);
    expect(totals.from).toBe(500);
    expect(getICTotalsForEntity(SUB_ID).to).toBe(500);
  });

  it('per-type ledger codes appear in reciprocal lines (stock_transfer)', () => {
    seedPricingRule();
    const t = createICTransaction({
      txn_type: 'stock_transfer', from_entity: PARENT_ID, to_entity: SUB_ID,
      item_key: 'ALL', quantity: 1, amount: 0, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromVouchers = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]');
    const v = fromVouchers[fromVouchers.length - 1];
    const codes = v.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code);
    expect(codes).toContain('IC-RECV');
    expect(codes).toContain('IC-INV-OUT');
  });

  it('per-type ledger codes for loan use IC-LOAN-RECV / IC-LOAN-PAY', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-LOAN-RECV');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-LOAN-PAY');
  });

  it('per-type ledger codes for capital_infusion use IC-INVEST / IC-EQUITY', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 100, txn_date: '2026-06-01',
    });
    postICTransaction(t.ic_txn_id);
    const fromV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${PARENT_CODE}`) ?? '[]').slice(-1)[0];
    const toV = JSON.parse(localStorage.getItem(`erp_group_vouchers_${SUB_CODE}`) ?? '[]').slice(-1)[0];
    expect(fromV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-INVEST');
    expect(toV.ledger_lines.map((l: { ledger_code: string }) => l.ledger_code)).toContain('IC-EQUITY');
  });
});

describe('S106 · Block 3 · FR-44 no-reimplementation guard', () => {
  it('engine does NOT redefine recommendALPMethod', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+recommendALPMethod/);
  });

  it('engine does NOT redefine computePriceForMethod', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+computePriceForMethod/);
  });

  it('engine does NOT redefine buildForm3CEBSnapshot', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+buildForm3CEBSnapshot/);
  });

  it('engine does NOT manually persist journal entries (no journalKey writes)', () => {
    expect(ENGINE_SRC).not.toMatch(/journalKey\s*\(/);
    expect(ENGINE_SRC).not.toMatch(/erp_journal_/);
  });

  it('engine USE-SITE calls resolvePrice (not redefines)', () => {
    expect(ENGINE_SRC).toMatch(/import\s*\{[^}]*resolvePrice/);
    expect(ENGINE_SRC).toMatch(/resolvePrice\s*\(/);
  });

  it('engine USE-SITE calls generateTPAudit', () => {
    expect(ENGINE_SRC).toMatch(/import\s*\{[^}]*generateTPAudit/);
    expect(ENGINE_SRC).toMatch(/generateTPAudit\s*\(/);
  });

  it('engine USE-SITE calls postVoucher', () => {
    expect(ENGINE_SRC).toMatch(/import\s*\{[^}]*postVoucher/);
    expect(ENGINE_SRC).toMatch(/postVoucher\s*\(/);
  });

  it('engine validates via getGroupStructure', () => {
    expect(ENGINE_SRC).toMatch(/getGroupStructure\s*\(/);
  });
});

describe('S106 · Block 4 · Audit type', () => {
  it("'intercompany_transaction' is a valid AuditEntityType", () => {
    const t: AuditEntityType = 'intercompany_transaction';
    expect(t).toBe('intercompany_transaction');
  });

  it('audit-trail.ts declares intercompany_transaction', () => {
    expect(AUDIT_TYPES_SRC).toMatch(/'intercompany_transaction'/);
  });

  it("declares intercompany_settlement (added by S107 · backward-compatible)", () => {
    expect(AUDIT_TYPES_SRC).toMatch(/'intercompany_settlement'/);
  });
});

describe('S106 · Block 5 · Page wiring', () => {
  it('IntercompanyTransactionsHubPage file exists', () => {
    expect(fs.existsSync(PAGE_PATH)).toBe(true);
  });

  it('page is a default export', () => {
    expect(PAGE_SRC).toMatch(/export default function IntercompanyTransactionsHubPage/);
  });

  it('page reads engine (no dead UI)', () => {
    expect(PAGE_SRC).toMatch(/listICTransactions/);
    expect(PAGE_SRC).toMatch(/createICTransaction/);
    expect(PAGE_SRC).toMatch(/postICTransaction/);
  });

  it('CommandCenterPage registers fincore-intercompany-transactions-hub case', () => {
    expect(CC_SRC).toMatch(/case 'fincore-intercompany-transactions-hub'\s*:\s*return\s*<IntercompanyTransactionsHubPage/);
  });

  it('sidebar config has type: item entry for the hub', () => {
    expect(SIDEBAR_SRC).toMatch(/fincore-intercompany-transactions-hub/);
    expect(SIDEBAR_SRC).toMatch(/type:\s*'item'[\s\S]{0,200}fincore-intercompany-transactions-hub|fincore-intercompany-transactions-hub[\s\S]{0,200}type:\s*'item'/);
    expect(SIDEBAR_SRC).toMatch(/requiredCards:\s*\['command-center'\][\s\S]{0,260}fincore-intercompany-transactions-hub|fincore-intercompany-transactions-hub[\s\S]{0,260}requiredCards:\s*\['command-center'\]/);
  });
});

describe('S106 · Block 6 · Registers & sprint history', () => {
  it('sibling-register has the new engine id exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'intercompany-transaction-engine');
    expect(matches).toHaveLength(1);
    expect(matches[0].provenance).toBe('CONFIRMED');
    expect(matches[0].path).toBe('src/lib/intercompany-transaction-engine.ts');
  });

  it('sibling-register comply360-tier2 still occurs exactly once', () => {
    const m = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(m).toHaveLength(1);
  });

  it('getSiblingCount() ≥ 174 (real entries)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(174);
  });

  it('sprint-history S106 entry exists with newSiblings + grade A', () => {
    const s106 = SPRINTS.find((s) => s.sprintNumber === 106);
    expect(s106).toBeDefined();
    expect(s106?.code).toBe('T-Phase-6.C.1.2');
    expect(s106?.grade).toBe('A');
    expect(s106?.newSiblings).toEqual(['intercompany-transaction-engine']);
    expect(s106?.predecessorSha).toBe('f75081139fe8b4df9c41e72d8c753c647e37e5b7');
    expect(s106?.headSha).toBe('TBD_AT_BANK');
  });
});

describe('S106 · §7 · Scope wall & §H boundaries', () => {
  it('engine does NOT export matching / elimination / consolidation fns', () => {
    expect(icEngine).not.toHaveProperty('matchICTransactions');
    expect(icEngine).not.toHaveProperty('eliminateICEntries');
    expect(icEngine).not.toHaveProperty('consolidateGroup');
    expect(icEngine).not.toHaveProperty('buildConsolidatedPL');
  });

  it('engine source does NOT contain matching / elimination / consolidation keywords', () => {
    expect(ENGINE_SRC).not.toMatch(/function\s+(match|eliminate|consolidate)/i);
  });

  it('ComplianceModule (Comply360Sidebar.types.ts) is UNTOUCHED by S106 (no IC refs)', () => {
    expect(COMPLIANCE_MODULE_SRC).not.toMatch(/intercompany_transaction/);
    expect(COMPLIANCE_MODULE_SRC).not.toMatch(/IntercompanyTransactionsHub/);
  });
});
