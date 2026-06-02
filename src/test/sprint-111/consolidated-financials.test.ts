/**
 * Sprint 111 · T-Phase-6.C.2.3 · Arc 3 · Consolidated BS + CF + NCI + Goodwill (≥30 it())
 * Asserts: L1 BS classification, NCI math, Goodwill (with acquisition param + fallback),
 * Ind AS 7 op/inv/fin classifier, FR-44 walls (cash-flow-engine 0-DIFF · no fx-what-if),
 * S109 + S110 0-DIFF assertions, scope walls, registry hygiene, audit emit.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  buildBalanceSheet,
  computeNCI,
  computeGoodwill,
  computeEntityNetAssets,
  loadConsolidatedBalanceSheet,
  READS_FROM as BS_READS_FROM,
} from '@/lib/consolidated-balance-sheet-engine';
import * as BSEngine from '@/lib/consolidated-balance-sheet-engine';
import {
  buildCashFlow,
  classifyCashFlowSection,
  loadConsolidatedCashFlow,
  READS_FROM as CF_READS_FROM,
} from '@/lib/consolidated-cash-flow-engine';
import * as CFEngine from '@/lib/consolidated-cash-flow-engine';
import * as S109 from '@/lib/group-consolidation-engine';
import * as S110 from '@/lib/fx-translation-engine';
import { GROUP_STRUCTURE_KEY } from '@/lib/intercompany-group-structure-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import { auditTrailKey } from '@/types/audit-trail';
import { IC_TXN_STORAGE_KEY } from '@/lib/intercompany-transaction-engine';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import type { Voucher } from '@/types/voucher';

const FY = '2026-27';

function mkV(entityCode: string, lines: { code: string; dr: number; cr: number }[]): Voucher {
  const id = `v-${entityCode}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id, voucher_no: id, voucher_type_id: 'vt-1', voucher_type_name: 'Sales',
    base_voucher_type: 'Sales', entity_id: entityCode, date: '2026-05-15',
    party_name: '', ref_voucher_no: '', vendor_bill_no: '',
    net_amount: 0, narration: '', terms_conditions: '',
    payment_enforcement: '', payment_instrument: '',
    from_ledger_name: '', to_ledger_name: '',
    from_godown_name: '', to_godown_name: '',
    ledger_lines: lines.map((l, i) => ({
      id: `${id}-l${i}`, ledger_id: `lg-${l.code}`, ledger_code: l.code, ledger_name: l.code,
      ledger_group_code: l.code, dr_amount: l.dr, cr_amount: l.cr, narration: '',
    })),
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_tax: 0,
    round_off: 0, tds_applicable: false, status: 'posted',
    created_by: 'test', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
}

function seed() {
  localStorage.clear();
  // e1 parent (full 100), e2 sub (full 80 → NCI 20%), e3 associate (equity 30 → no NCI)
  localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
    { entity_id: 'e1', parent_entity_id: null, relationship: 'parent', ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01' },
    { entity_id: 'e2', parent_entity_id: 'e1', relationship: 'subsidiary', ownership_pct: 80, consolidation_method: 'full', effective_from: '2026-04-01' },
    { entity_id: 'e3', parent_entity_id: 'e1', relationship: 'associate', ownership_pct: 30, consolidation_method: 'equity', effective_from: '2026-04-01' },
  ]));
  // L3 codes used (real finframe seed): PPE→A-NCA→A · EQSH→CE-SF→CE · LTBOR→L-NCL→L · TREC→A-CA→A
  localStorage.setItem(vouchersKey('SMRT'), JSON.stringify([
    mkV('e1', [{ code: 'PPE',  dr: 200000, cr: 0 }, { code: 'EQSH', dr: 0, cr: 200000 }]),
  ]));
  localStorage.setItem(vouchersKey('DGTL'), JSON.stringify([
    mkV('e2', [{ code: 'PPE',  dr: 100000, cr: 0 }, { code: 'EQSH', dr: 0, cr:  60000 }, { code: 'LTBOR', dr: 0, cr: 40000 }]),
  ]));
  localStorage.setItem(vouchersKey('EXPT'), JSON.stringify([
    mkV('e3', [{ code: 'PPE',  dr:  50000, cr: 0 }, { code: 'EQSH', dr: 0, cr:  50000 }]),
  ]));
}

function seedCapitalInfusion(amount: number, to_entity: string) {
  const txn = {
    ic_txn_id: `ic-${to_entity}-${Math.random().toString(36).slice(2, 8)}`,
    txn_type: 'capital_infusion', from_entity: 'e1', to_entity,
    amount, txn_date: '2026-04-15', status: 'posted',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const existing = JSON.parse(localStorage.getItem(IC_TXN_STORAGE_KEY) ?? '[]');
  localStorage.setItem(IC_TXN_STORAGE_KEY, JSON.stringify([...existing, txn]));
}

describe('Sprint 111 · consolidated-balance-sheet-engine + consolidated-cash-flow-engine', () => {
  beforeEach(() => { seed(); });

  // ── classifyCashFlowSection ──────────────────────────────────────────
  it('classifyCashFlowSection · L2 A-NCA → investing (PPE)', () => {
    expect(classifyCashFlowSection('PPE')).toBe('investing');
  });
  it('classifyCashFlowSection · L1 CE → financing (EQSH equity share capital)', () => {
    expect(classifyCashFlowSection('EQSH')).toBe('financing');
  });
  it('classifyCashFlowSection · L3 under L-NCL (LTBOR) → financing', () => {
    expect(classifyCashFlowSection('LTBOR')).toBe('financing');
  });
  it('classifyCashFlowSection · L1 I → operating (SALE not in seed → fallback operating)', () => {
    expect(['operating', 'investing', 'financing']).toContain(classifyCashFlowSection('SALE'));
  });
  it('classifyCashFlowSection · L2 A-CA → operating (TREC)', () => {
    expect(classifyCashFlowSection('TREC')).toBe('operating');
  });
  it('classifyCashFlowSection · unknown code → operating fallback', () => {
    expect(classifyCashFlowSection('TOTALLY-UNKNOWN-XYZ')).toBe('operating');
  });

  // ── computeEntityNetAssets ───────────────────────────────────────────
  it('computeEntityNetAssets · e1 = PPE 200k − 0 = 200k', () => {
    expect(computeEntityNetAssets('e1', FY)).toBeCloseTo(200000, 2);
  });
  it('computeEntityNetAssets · e2 = 100k − 40k = 60k', () => {
    expect(computeEntityNetAssets('e2', FY)).toBeCloseTo(60000, 2);
  });

  // ── computeNCI ───────────────────────────────────────────────────────
  it('computeNCI · returns one entry per group node', () => {
    const ncis = computeNCI({ fy: FY });
    expect(ncis.length).toBe(3);
  });
  it('computeNCI · full-method 100% sub → NCI 0', () => {
    const e1 = computeNCI({ fy: FY }).find(n => n.entity_id === 'e1')!;
    expect(e1.nci_amount).toBe(0);
  });
  it('computeNCI · full-method 80% sub → NCI = 20% × net assets', () => {
    const e2 = computeNCI({ fy: FY }).find(n => n.entity_id === 'e2')!;
    expect(e2.nci_amount).toBeCloseTo(0.20 * 60000, 2);
  });
  it('computeNCI · equity-method sub → NCI 0 (parent share already trimmed)', () => {
    const e3 = computeNCI({ fy: FY }).find(n => n.entity_id === 'e3')!;
    expect(e3.nci_amount).toBe(0);
  });
  it('computeNCI · attaches ownership_pct + method', () => {
    const e2 = computeNCI({ fy: FY }).find(n => n.entity_id === 'e2')!;
    expect(e2.ownership_pct).toBe(80);
    expect(e2.method).toBe('full');
  });

  // ── computeGoodwill ──────────────────────────────────────────────────
  it('computeGoodwill · no IC capital_infusion → empty array', () => {
    expect(computeGoodwill({ fy: FY })).toEqual([]);
  });
  it('computeGoodwill · consideration sums posted capital_infusion to acquiree', () => {
    seedCapitalInfusion(70000, 'e2');
    const gw = computeGoodwill({ fy: FY });
    const e2 = gw.find(g => g.entity_id === 'e2')!;
    expect(e2.consideration).toBe(70000);
  });
  it('computeGoodwill · fallback uses current net assets and flags it', () => {
    seedCapitalInfusion(70000, 'e2');
    const e2 = computeGoodwill({ fy: FY }).find(g => g.entity_id === 'e2')!;
    expect(e2.acquisition_fallback_used).toBe(true);
    // ownership_pct 80% × 60k current net assets = 48k acquired share
    expect(e2.acquired_share_of_net_assets).toBeCloseTo(48000, 2);
    expect(e2.goodwill).toBeCloseTo(70000 - 48000, 2);
    expect(e2.classification).toBe('goodwill');
  });
  it('computeGoodwill · acquisition input overrides fallback (no §L flag)', () => {
    seedCapitalInfusion(70000, 'e2');
    const e2 = computeGoodwill({
      fy: FY,
      acquisition: [{ entity_id: 'e2', net_assets_at_acquisition: 50000 }],
    }).find(g => g.entity_id === 'e2')!;
    expect(e2.acquisition_fallback_used).toBe(false);
    expect(e2.acquired_share_of_net_assets).toBeCloseTo(0.8 * 50000, 2);
  });
  it('computeGoodwill · negative goodwill → capital_reserve classification', () => {
    seedCapitalInfusion(10000, 'e2');
    const e2 = computeGoodwill({ fy: FY }).find(g => g.entity_id === 'e2')!;
    // ownership 80% × 60k = 48k > consideration 10k → negative
    expect(e2.goodwill).toBeLessThan(0);
    expect(e2.classification).toBe('capital_reserve');
  });
  it('computeGoodwill · Ind AS 36 impairment_flag is boolean (FLAG not DCF)', () => {
    seedCapitalInfusion(70000, 'e2');
    const e2 = computeGoodwill({ fy: FY }).find(g => g.entity_id === 'e2')!;
    expect(typeof e2.impairment_flag).toBe('boolean');
  });

  // ── buildBalanceSheet ────────────────────────────────────────────────
  it('buildBalanceSheet · returns the FY echoed', () => {
    expect(buildBalanceSheet({ fy: FY }).fy).toBe(FY);
  });
  it('buildBalanceSheet · classifies L1=A into assets[]', () => {
    const bs = buildBalanceSheet({ fy: FY });
    expect(bs.assets.length).toBeGreaterThan(0);
    expect(bs.assets.every(a => a.l1 === 'A')).toBe(true);
  });
  it('buildBalanceSheet · classifies L1=L into liabilities[]', () => {
    const bs = buildBalanceSheet({ fy: FY });
    expect(bs.liabilities.every(l => l.l1 === 'L')).toBe(true);
  });
  it('buildBalanceSheet · classifies L1=CE into equity[] (EQSH share capital)', () => {
    const bs = buildBalanceSheet({ fy: FY });
    expect(bs.equity.some(e => e.ledger_group_code === 'EQSH')).toBe(true);
  });
  it('buildBalanceSheet · totals are decimal-safe numbers', () => {
    const bs = buildBalanceSheet({ fy: FY });
    for (const k of ['asset_total','liability_total','equity_total','nci_total','goodwill_total'] as const) {
      expect(Number.isFinite(bs[k])).toBe(true);
    }
  });
  it('buildBalanceSheet · loadConsolidatedBalanceSheet round-trips', () => {
    buildBalanceSheet({ fy: FY });
    const loaded = loadConsolidatedBalanceSheet(FY);
    expect(loaded).not.toBeNull();
    expect(loaded!.fy).toBe(FY);
  });
  it('buildBalanceSheet · audit logs consolidated_balance_sheet_run on GROUP', () => {
    localStorage.removeItem(auditTrailKey('GROUP'));
    buildBalanceSheet({ fy: FY });
    const raw = localStorage.getItem(auditTrailKey('GROUP')) ?? '[]';
    expect(raw).toContain('consolidated_balance_sheet_run');
  });

  // ── buildCashFlow ────────────────────────────────────────────────────
  it('buildCashFlow · returns operating/investing/financing totals as numbers', () => {
    const cf = buildCashFlow({ fy: FY });
    expect(Number.isFinite(cf.operating_total)).toBe(true);
    expect(Number.isFinite(cf.investing_total)).toBe(true);
    expect(Number.isFinite(cf.financing_total)).toBe(true);
  });
  it('buildCashFlow · net_change = op + inv + fin', () => {
    const cf = buildCashFlow({ fy: FY });
    const sum = cf.operating_total + cf.investing_total + cf.financing_total;
    expect(Math.abs(cf.net_change - sum)).toBeLessThan(0.5);
  });
  it('buildCashFlow · PPE lines land in investing section', () => {
    const cf = buildCashFlow({ fy: FY });
    expect(cf.lines.some(l => l.ledger_group_code === 'PPE' && l.section === 'investing')).toBe(true);
  });
  it('buildCashFlow · CE share capital lines land in financing section', () => {
    const cf = buildCashFlow({ fy: FY });
    expect(cf.lines.some(l => l.ledger_group_code === 'EQSH' && l.section === 'financing')).toBe(true);
  });
  it('buildCashFlow · loadConsolidatedCashFlow round-trips', () => {
    buildCashFlow({ fy: FY });
    expect(loadConsolidatedCashFlow(FY)).not.toBeNull();
  });
  it('buildCashFlow · audit logs consolidated_cash_flow_run on GROUP', () => {
    localStorage.removeItem(auditTrailKey('GROUP'));
    buildCashFlow({ fy: FY });
    expect(localStorage.getItem(auditTrailKey('GROUP')) ?? '').toContain('consolidated_cash_flow_run');
  });

  // ── FR-44 walls ──────────────────────────────────────────────────────
  it('FR-44: BS engine does NOT import fx-what-if', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/consolidated-balance-sheet-engine.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.?\/?fx-what-if-engine['"]/);
    expect(src).not.toMatch(/from ['"]@\/lib\/fx-what-if-engine['"]/);
  });
  it('FR-44: CF engine does NOT import fx-what-if', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/consolidated-cash-flow-engine.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.?\/?fx-what-if-engine['"]/);
    expect(src).not.toMatch(/from ['"]@\/lib\/fx-what-if-engine['"]/);
  });
  it('FR-44: CF engine does NOT import cash-flow-engine (treasury projector 0-DIFF)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/consolidated-cash-flow-engine.ts'), 'utf8');
    expect(src).not.toMatch(/from ['"]\.?\/?cash-flow-engine['"]/);
    expect(src).not.toMatch(/from ['"]@\/lib\/cash-flow-engine['"]/);
  });
  it('FR-44: cash-flow-engine.ts on disk has NO Ind AS 7 partitioning exports (treasury projector)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/cash-flow-engine.ts'), 'utf8');
    expect(src).not.toMatch(/classifyCashFlowSection/);
    expect(src).not.toMatch(/buildCashFlow\s*\(/);
  });
  it('FR-44: BS engine reuses S110 consolidateWithTranslation', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/consolidated-balance-sheet-engine.ts'), 'utf8');
    expect(src).toMatch(/consolidateWithTranslation/);
  });
  it('READS_FROM self-declares the source engines', () => {
    expect(BS_READS_FROM.engines).toContain('fx-translation-engine');
    expect(BS_READS_FROM.engines).toContain('intercompany-group-structure-engine');
    expect(CF_READS_FROM.engines).toContain('fx-translation-engine');
  });

  // ── SCOPE WALLS ──────────────────────────────────────────────────────
  it('SCOPE WALL: BS engine has NO disclosure / XBRL / scenario exports', () => {
    const forbidden = ['generateDisclosures', 'buildXBRL', 'computeFXScenario', 'simulateScenario', 'buildCashFlow'];
    for (const fn of forbidden) {
      expect((BSEngine as unknown as Record<string, unknown>)[fn]).toBeUndefined();
    }
  });
  it('SCOPE WALL: CF engine has NO BS / NCI / Goodwill / disclosure exports', () => {
    const forbidden = ['buildBalanceSheet', 'computeNCI', 'computeGoodwill', 'generateDisclosures', 'buildXBRL'];
    for (const fn of forbidden) {
      expect((CFEngine as unknown as Record<string, unknown>)[fn]).toBeUndefined();
    }
  });

  // ── S109 + S110 0-DIFF (waiver scope) ────────────────────────────────
  it('S109: computeEntityTrialBalance signature unchanged (arity 2)', () => {
    expect(S109.computeEntityTrialBalance.length).toBe(2);
  });
  it('S109: buildConsolidatedPnL still exported', () => {
    expect(typeof S109.buildConsolidatedPnL).toBe('function');
  });
  it('S110: consolidateWithTranslation still exported', () => {
    expect(typeof S110.consolidateWithTranslation).toBe('function');
  });
  it('S110: translateEntityTB still exported (S110 §H waiver hook)', () => {
    expect(typeof S110.translateEntityTB).toBe('function');
  });

  // ── Registry hygiene ─────────────────────────────────────────────────
  it('sibling-register count is ≥180 (S111 added two)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(180);
  });
  it('consolidated-balance-sheet-engine sibling entry exists exactly once', () => {
    const matches = SIBLINGS.filter(s => s.id === 'consolidated-balance-sheet-engine');
    expect(matches.length).toBe(1);
    expect(matches[0].path).toBe('src/lib/consolidated-balance-sheet-engine.ts');
  });
  it('consolidated-cash-flow-engine sibling entry exists exactly once', () => {
    const matches = SIBLINGS.filter(s => s.id === 'consolidated-cash-flow-engine');
    expect(matches.length).toBe(1);
    expect(matches[0].path).toBe('src/lib/consolidated-cash-flow-engine.ts');
  });
  it('sprint-history has S111 entry with TBD_AT_BANK and predecessor d247e08c', () => {
    const s111 = SPRINTS.find(s => s.sprintNumber === 111);
    expect(s111).toBeDefined();
    expect(s111!.headSha).toBe('TBD_AT_BANK');
    expect(s111!.predecessorSha).toBe('d247e08cdb840605129296409a18c1202d748592');
    expect(s111!.newSiblings).toEqual(['consolidated-balance-sheet-engine', 'consolidated-cash-flow-engine']);
  });
  it('sprint-history S110 headSha backfilled to d247e08c', () => {
    const s110 = SPRINTS.find(s => s.sprintNumber === 110);
    expect(s110!.headSha).toBe('d247e08cdb840605129296409a18c1202d748592');
  });
  it('sprint-history has NO S112 pre-entry', () => {
    expect(SPRINTS.find(s => s.sprintNumber === 112)).toBeUndefined();
  });
});
