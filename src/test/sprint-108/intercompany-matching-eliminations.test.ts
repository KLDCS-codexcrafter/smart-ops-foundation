/**
 * @file        src/test/sprint-108/intercompany-matching-eliminations.test.ts
 * @sprint      Sprint 108 · T-Phase-6.C.1.4 · 🏁 Arc 2 Capstone · Pillar C.1
 * @purpose     Verify intercompany-matching-engine + group-eliminations-engine.
 *              Asserts ELIMINATION_TYPES length === 7, E6 minority math,
 *              zero-source no-fabrication, scope wall (NO consolidation fns),
 *              sibling count 176, ComplianceModule untouched.
 * @form-A      ≥30 discrete it() blocks (v1.30 §N).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  runICMatching,
  getMatchBreaks,
  getMatchSummary,
  IC_MATCH_BREAK_REASONS,
} from '@/lib/intercompany-matching-engine';
import * as matchEngine from '@/lib/intercompany-matching-engine';
import {
  ELIMINATION_TYPES,
  generateEliminations,
  generateEliminationsByType,
  getEliminationSummary,
} from '@/lib/group-eliminations-engine';
import * as elimEngine from '@/lib/group-eliminations-engine';
import {
  createICTransaction,
  postICTransaction,
} from '@/lib/intercompany-transaction-engine';
import * as pricingEngine from '@/lib/internal-pricing-engine';
import * as tpEngine from '@/lib/idea-7-transfer-pricing-audit-engine';
import { upsertGroupStructure } from '@/lib/intercompany-group-structure-engine';
import { MOCK_ENTITIES } from '@/data/mock-entities';
import { auditTrailKey, type AuditEntityType } from '@/types/audit-trail';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const MATCH_PATH = path.resolve(__dirname, '../../lib/intercompany-matching-engine.ts');
const ELIM_PATH = path.resolve(__dirname, '../../lib/group-eliminations-engine.ts');
const PAGE_PATH = path.resolve(__dirname, '../../features/intercompany/GroupEliminationsPage.tsx');
const AUDIT_PATH = path.resolve(__dirname, '../../types/audit-trail.ts');
const COMPLIANCE_PATH = path.resolve(__dirname, '../../pages/erp/comply360/Comply360Sidebar.types.ts');

const MATCH_SRC = fs.readFileSync(MATCH_PATH, 'utf8');
const ELIM_SRC = fs.readFileSync(ELIM_PATH, 'utf8');
const PAGE_SRC = fs.readFileSync(PAGE_PATH, 'utf8');
const AUDIT_SRC = fs.readFileSync(AUDIT_PATH, 'utf8');
const COMPLIANCE_SRC = fs.existsSync(COMPLIANCE_PATH) ? fs.readFileSync(COMPLIANCE_PATH, 'utf8') : '';

const PARENT_ID = MOCK_ENTITIES[0].id;
const SUB_ID = MOCK_ENTITIES[1].id;

function reset(): void { localStorage.clear(); }

function registerBoth(ownershipPct = 80): void {
  upsertGroupStructure({
    entity_id: PARENT_ID, parent_entity_id: null, relationship: 'parent',
    ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01',
  });
  upsertGroupStructure({
    entity_id: SUB_ID, parent_entity_id: PARENT_ID, relationship: 'subsidiary',
    ownership_pct: ownershipPct, consolidation_method: 'full', effective_from: '2026-04-01',
  });
}

function seedPricing(): string {
  const rule_id = 'pr-ic-s108-001';
  const rule = {
    pricing_rule_id: rule_id,
    scope: 'inter_entity' as const,
    from_entity: PARENT_ID,
    to_entity: SUB_ID,
    item_key: 'ITEM-X',
    method: 'cup' as const,
    price: 1000,
    effective_from: '2026-04-01',
    effective_to: null as string | null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };
  localStorage.setItem('erp_internal_pricing_rules', JSON.stringify([rule]));
  return rule_id;
}

function stubResolvePrice(rule_id: string): void {
  vi.spyOn(pricingEngine, 'resolvePrice').mockReturnValue({
    price: 1000,
    pricing_rule_id: rule_id,
    method: 'cup',
    matched: true,
  } as unknown as ReturnType<typeof pricingEngine.resolvePrice>);
  vi.spyOn(tpEngine, 'generateTPAudit').mockReturnValue({
    tp_audit_id: 'tp-s108-001',
  } as unknown as ReturnType<typeof tpEngine.generateTPAudit>);
}

function postInvoice(amount = 1000, date = '2026-05-01'): string {
  const t = createICTransaction({
    txn_type: 'invoice', from_entity: PARENT_ID, to_entity: SUB_ID,
    item_key: 'ITEM-X', quantity: 1, amount, txn_date: date,
  });
  postICTransaction(t.ic_txn_id);
  return t.ic_txn_id;
}

describe('Sprint 108 · intercompany-matching-engine', () => {
  beforeEach(() => { reset(); registerBoth(); vi.restoreAllMocks(); });

  it('IC_MATCH_BREAK_REASONS exposes all 4 break taxonomy members', () => {
    expect(IC_MATCH_BREAK_REASONS).toEqual([
      'missing_counterparty_voucher', 'amount_mismatch', 'status_mismatch', 'unposted',
    ]);
  });

  it('runICMatching returns empty when no IC transactions exist', () => {
    expect(runICMatching()).toEqual([]);
  });

  it('getMatchSummary returns zero match_rate_pct when no txns (no NaN)', () => {
    const s = getMatchSummary();
    expect(s).toEqual({ total: 0, matched: 0, breaks: 0, match_rate_pct: 0 });
  });

  it('draft IC txn is flagged as `unposted` break', () => {
    createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 500, txn_date: '2026-05-01',
    });
    const breaks = getMatchBreaks();
    expect(breaks).toHaveLength(1);
    expect(breaks[0].break_reason).toBe('unposted');
    expect(breaks[0].matched).toBe(false);
  });

  it('posted IC txn matches its reciprocal vouchers (matched=true · variance=0)', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    const results = runICMatching();
    expect(results).toHaveLength(1);
    expect(results[0].matched).toBe(true);
    expect(results[0].variance).toBe(0);
    expect(results[0].amount_from).toBe(1000);
    expect(results[0].amount_to).toBe(1000);
  });

  it('getMatchSummary computes match_rate_pct via decimal-helpers', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 200, txn_date: '2026-05-01',
    });
    const s = getMatchSummary();
    expect(s.total).toBe(2);
    expect(s.matched).toBe(1);
    expect(s.breaks).toBe(1);
    expect(s.match_rate_pct).toBe(50);
  });

  it('filter narrows runICMatching by from_entity', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    expect(runICMatching({ from_entity: PARENT_ID })).toHaveLength(1);
    expect(runICMatching({ from_entity: SUB_ID })).toHaveLength(0);
  });

  it('filter narrows by to_entity', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    expect(runICMatching({ to_entity: SUB_ID })).toHaveLength(1);
    expect(runICMatching({ to_entity: PARENT_ID })).toHaveLength(0);
  });

  it('logs intercompany_match audit on each matching run', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    runICMatching();
    const auditRaw = localStorage.getItem(auditTrailKey(PARENT_ID))
                  ?? localStorage.getItem(auditTrailKey('GROUP'))
                  ?? '[]';
    const allKeys = Object.keys(localStorage);
    const found = allKeys.some((k) => {
      if (!k.startsWith('erp_audit_trail_')) return false;
      try {
        const list = JSON.parse(localStorage.getItem(k) || '[]') as Array<{ entity_type: AuditEntityType }>;
        return list.some((e) => e.entity_type === 'intercompany_match');
      } catch { return false; }
    });
    expect(found || auditRaw.includes('intercompany_match')).toBe(true);
  });

  it('amount_mismatch break is detected when voucher amount differs from txn', () => {
    stubResolvePrice(seedPricing());
    const id = postInvoice(1000);
    // tamper with the to-side voucher amount in storage
    const toCode = MOCK_ENTITIES[1].shortCode;
    const key = `erp_group_vouchers_${toCode}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]') as Array<{ gross_amount: number }>;
    if (list[0]) list[0].gross_amount = 950;
    localStorage.setItem(key, JSON.stringify(list));
    const breaks = getMatchBreaks();
    expect(breaks.find((b) => b.ic_txn_id === id)?.break_reason).toBe('amount_mismatch');
  });

  it('missing_counterparty_voucher break is detected when to-side voucher removed', () => {
    stubResolvePrice(seedPricing());
    const id = postInvoice(1000);
    const toCode = MOCK_ENTITIES[1].shortCode;
    localStorage.setItem(`erp_group_vouchers_${toCode}`, '[]');
    const breaks = getMatchBreaks();
    expect(breaks.find((b) => b.ic_txn_id === id)?.break_reason).toBe('missing_counterparty_voucher');
  });

  it('status_mismatch break is detected when vouchers have different statuses', () => {
    stubResolvePrice(seedPricing());
    const id = postInvoice(1000);
    const toCode = MOCK_ENTITIES[1].shortCode;
    const key = `erp_group_vouchers_${toCode}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]') as Array<{ status: string }>;
    if (list[0]) list[0].status = 'draft';
    localStorage.setItem(key, JSON.stringify(list));
    const breaks = getMatchBreaks();
    expect(breaks.find((b) => b.ic_txn_id === id)?.break_reason).toBe('status_mismatch');
  });

  it('READS_FROM declares intercompany-transaction-engine + fincore + decimal-helpers', () => {
    expect(matchEngine.READS_FROM.icTransactions).toMatch(/intercompany-transaction-engine/);
    expect(matchEngine.READS_FROM.fincore).toMatch(/fincore-engine/);
    expect(matchEngine.READS_FROM.decimalHelpers).toMatch(/decimal-helpers/);
  });
});

describe('Sprint 108 · group-eliminations-engine · ELIMINATION_TYPES + scope wall', () => {
  beforeEach(() => { reset(); registerBoth(); vi.restoreAllMocks(); });

  it('ELIMINATION_TYPES length is EXACTLY 7', () => {
    expect(ELIMINATION_TYPES).toHaveLength(7);
  });

  it('ELIMINATION_TYPES order is locked (E1..E7)', () => {
    expect(ELIMINATION_TYPES).toEqual([
      'E1_ic_sales_purchases', 'E2_ic_balances', 'E3_unrealized_profit_inventory',
      'E4_ic_dividends', 'E5_ic_loans_interest', 'E6_investment_vs_equity',
      'E7_unrealized_profit_fixed_assets',
    ]);
  });

  it('generateEliminations returns [] when no IC postings exist', () => {
    expect(generateEliminations({ fy: '2026-27' })).toEqual([]);
  });

  it('getEliminationSummary returns 7 rows even with empty source', () => {
    const s = getEliminationSummary('2026-27');
    expect(s).toHaveLength(7);
    expect(s.every((r) => r.count === 0 && r.total === 0)).toBe(true);
  });

  it('SCOPE WALL · engine source has NO consolidated P&L / BS / CF function', () => {
    expect(ELIM_SRC).not.toMatch(/buildConsolidatedPL|consolidatedBalanceSheet|consolidatedCashFlow/);
    expect(MATCH_SRC).not.toMatch(/buildConsolidatedPL|consolidatedBalanceSheet|consolidatedCashFlow/);
  });

  it('SCOPE WALL · NO NCI rollup or Goodwill function in either engine', () => {
    expect(ELIM_SRC).not.toMatch(/computeNCI|rollupNCI|computeGoodwill|goodwillCalc/);
    expect(MATCH_SRC).not.toMatch(/computeNCI|rollupNCI|computeGoodwill|goodwillCalc/);
  });

  it('SCOPE WALL · NO multi-currency translation function in either engine', () => {
    expect(ELIM_SRC).not.toMatch(/translateCurrency|fxTranslate|multiCurrencyConsolidat/);
    expect(MATCH_SRC).not.toMatch(/translateCurrency|fxTranslate|multiCurrencyConsolidat/);
  });

  it('engine uses decimal-helpers (no raw +/-/* on money)', () => {
    expect(ELIM_SRC).toMatch(/from '@\/lib\/decimal-helpers'/);
  });

  it('E4 (IC dividends) returns zero entries (no fabrication · §L)', () => {
    const e4 = generateEliminationsByType({ fy: '2026-27', type: 'E4_ic_dividends' });
    expect(e4).toEqual([]);
  });

  it('READS_FROM declares the three upstream engines + decimal-helpers', () => {
    expect(elimEngine.READS_FROM.icTransactions).toMatch(/intercompany-transaction-engine/);
    expect(elimEngine.READS_FROM.groupStructure).toMatch(/intercompany-group-structure-engine/);
    expect(elimEngine.READS_FROM.decimalHelpers).toMatch(/decimal-helpers/);
  });
});

describe('Sprint 108 · per-E-type derivation (E1/E2/E5/E6/E7)', () => {
  beforeEach(() => { reset(); registerBoth(80); vi.restoreAllMocks(); });

  it('E1 derives from posted invoice + stock_transfer + service_charge', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000, '2026-05-01');
    const e1 = generateEliminationsByType({ fy: '2026-27', type: 'E1_ic_sales_purchases' });
    expect(e1).toHaveLength(1);
    expect(e1[0].amount).toBe(1000);
    expect(e1[0].debit_account).toBe('IC-SALES-INC');
    expect(e1[0].credit_account).toBe('IC-PURCH-EXP');
  });

  it('E2 nets payments against gross IC balance', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000, '2026-05-01');
    // post a payment that settles 400 of the balance
    const pay = createICTransaction({
      txn_type: 'payment', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 400, txn_date: '2026-05-05',
    });
    postICTransaction(pay.ic_txn_id);
    const e2 = generateEliminationsByType({ fy: '2026-27', type: 'E2_ic_balances' });
    expect(e2).toHaveLength(1);
    expect(e2[0].amount).toBe(600);
  });

  it('E3 returns zero when no stock_transfer exists', () => {
    const e3 = generateEliminationsByType({ fy: '2026-27', type: 'E3_unrealized_profit_inventory' });
    expect(e3).toEqual([]);
  });

  it('E5 eliminates posted loan principal', () => {
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 50000, txn_date: '2026-05-10',
    });
    postICTransaction(t.ic_txn_id);
    const e5 = generateEliminationsByType({ fy: '2026-27', type: 'E5_ic_loans_interest' });
    expect(e5).toHaveLength(1);
    expect(e5[0].amount).toBe(50000);
    expect(e5[0].debit_account).toBe('IC-LOAN-PAY');
  });

  it('E6 derives from capital_infusion + uses getGroupStructure.ownership_pct', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 10000, txn_date: '2026-05-15',
    });
    postICTransaction(t.ic_txn_id);
    const e6 = generateEliminationsByType({ fy: '2026-27', type: 'E6_investment_vs_equity' });
    expect(e6).toHaveLength(1);
    expect(e6[0].amount).toBe(10000);
  });

  it('E6 minority_share = dSub(100, ownership_pct) applied to amount (ownership 80 → 20%)', () => {
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 10000, txn_date: '2026-05-15',
    });
    postICTransaction(t.ic_txn_id);
    const e6 = generateEliminationsByType({ fy: '2026-27', type: 'E6_investment_vs_equity' });
    // ownership 80 → minority 20 → 20% of 10000 = 2000
    expect(e6[0].minority_share).toBe(2000);
  });

  it('E6 minority_share is 0 at 100% ownership (no minority)', () => {
    reset();
    registerBoth(100);
    const t = createICTransaction({
      txn_type: 'capital_infusion', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 5000, txn_date: '2026-05-15',
    });
    postICTransaction(t.ic_txn_id);
    const e6 = generateEliminationsByType({ fy: '2026-27', type: 'E6_investment_vs_equity' });
    expect(e6[0].minority_share).toBe(0);
  });

  it('E7 returns zero when no asset_transfer exists', () => {
    const e7 = generateEliminationsByType({ fy: '2026-27', type: 'E7_unrealized_profit_fixed_assets' });
    expect(e7).toEqual([]);
  });

  it('generateEliminations aggregates all types into a single list', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    const t = createICTransaction({
      txn_type: 'loan', from_entity: PARENT_ID, to_entity: SUB_ID,
      amount: 5000, txn_date: '2026-05-10',
    });
    postICTransaction(t.ic_txn_id);
    const all = generateEliminations({ fy: '2026-27' });
    expect(all.length).toBeGreaterThanOrEqual(2);
  });

  it('getEliminationSummary totals match generateEliminationsByType per row', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000);
    const s = getEliminationSummary('2026-27');
    const e1 = s.find((r) => r.type === 'E1_ic_sales_purchases');
    expect(e1?.count).toBe(1);
    expect(e1?.total).toBe(1000);
  });

  it('FY filter excludes postings outside the year prefix', () => {
    stubResolvePrice(seedPricing());
    postInvoice(1000, '2025-05-01');
    const e1 = generateEliminationsByType({ fy: '2026-27', type: 'E1_ic_sales_purchases' });
    expect(e1).toEqual([]);
  });

  it('logs group_elimination audit on generateEliminations run', () => {
    generateEliminations({ fy: '2026-27' });
    const keys = Object.keys(localStorage).filter((k) => k.startsWith('erp_audit_trail_'));
    const found = keys.some((k) => {
      try {
        const list = JSON.parse(localStorage.getItem(k) || '[]') as Array<{ entity_type: AuditEntityType }>;
        return list.some((e) => e.entity_type === 'group_elimination');
      } catch { return false; }
    });
    expect(found).toBe(true);
  });
});

describe('Sprint 108 · audit types + registers + page wiring', () => {
  it('intercompany_match is in AuditEntityType', () => {
    expect(AUDIT_SRC).toMatch(/'intercompany_match'/);
  });

  it('group_elimination is in AuditEntityType', () => {
    expect(AUDIT_SRC).toMatch(/'group_elimination'/);
  });

  it('ComplianceModule (Comply360Sidebar.types) is UNTOUCHED by S108', () => {
    // S108 must not have inserted any new module ids into the compliance sidebar.
    expect(COMPLIANCE_SRC).not.toMatch(/intercompany_match|group_elimination|group-eliminations/);
  });

  it('sibling-register has intercompany-matching-engine exactly once', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'intercompany-matching-engine');
    expect(hits).toHaveLength(1);
  });

  it('sibling-register has group-eliminations-engine exactly once', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'group-eliminations-engine');
    expect(hits).toHaveLength(1);
  });

  it('comply360-tier2-extensions-engine still appears exactly once', () => {
    const hits = SIBLINGS.filter((s) => s.id === 'comply360-tier2-extensions-engine');
    expect(hits).toHaveLength(1);
  });

  it('getSiblingCount >= 176 (174 + 2 new SIBLINGs · floored S110 T1 lesson)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(176);
  });

  it('sprint-history S108 entry is appended with TBD_AT_BANK + correct predecessor', () => {
    const s108 = SPRINTS.find((s) => s.sprintNumber === 108);
    expect(s108).toBeTruthy();
    expect(s108?.headSha).toBe('TBD_AT_BANK');
    expect(s108?.predecessorSha).toBe('c39e70c36d83097471990f9e5da6db65bcd47a7c');
    expect(s108?.newSiblings).toEqual([
      'intercompany-matching-engine', 'group-eliminations-engine',
    ]);
  });

  it('S107 headSha backfilled to c39e70c3...', () => {
    const s107 = SPRINTS.find((s) => s.sprintNumber === 107);
    expect(s107?.headSha).toBe('c39e70c36d83097471990f9e5da6db65bcd47a7c');
  });

  it('NO S109 entry has been pre-created', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 109)).toBeUndefined();
  });

  it('GroupEliminationsPage READS both new engines (no dead UI)', () => {
    expect(PAGE_SRC).toMatch(/from '@\/lib\/intercompany-matching-engine'/);
    expect(PAGE_SRC).toMatch(/from '@\/lib\/group-eliminations-engine'/);
    expect(PAGE_SRC).toMatch(/runICMatching|getMatchSummary|getMatchBreaks/);
    expect(PAGE_SRC).toMatch(/generateEliminationsByType|getEliminationSummary/);
  });

  it('GroupEliminationsPage is NOT a SIBLING (not registered as sibling)', () => {
    expect(SIBLINGS.find((s) => s.id === 'group-eliminations-page')).toBeUndefined();
  });
});
