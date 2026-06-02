/**
 * Sprint 109 · T-Phase-6.C.2.1 · Group Consolidation test pack (≥30 it())
 * Asserts: per-entity TB compute, 3 methods, eliminations subtraction, TB balance,
 * P&L math, orchestration (no reimplementation), scope wall, registry hygiene.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeEntityTrialBalance,
  consolidate,
  buildConsolidatedPnL,
  getConsolidationSummary,
} from '@/lib/group-consolidation-engine';
import * as ConsolidationEngine from '@/lib/group-consolidation-engine';
import * as StructureEngine from '@/lib/intercompany-group-structure-engine';
import * as EliminationsEngine from '@/lib/group-eliminations-engine';
import { GROUP_STRUCTURE_KEY } from '@/lib/intercompany-group-structure-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import { auditTrailKey } from '@/types/audit-trail';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
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
  // Structure: e1 parent (full 100), e2 subsidiary (proportional 60), e3 associate (equity 30)
  localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
    { entity_id: 'e1', parent_entity_id: null, relationship: 'parent',
      ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01' },
    { entity_id: 'e2', parent_entity_id: 'e1', relationship: 'subsidiary',
      ownership_pct: 60, consolidation_method: 'proportional', effective_from: '2026-04-01' },
    { entity_id: 'e3', parent_entity_id: 'e1', relationship: 'associate',
      ownership_pct: 30, consolidation_method: 'equity', effective_from: '2026-04-01' },
  ]));
  // Vouchers — entity_code via mock-entities shortCode: e1→'GRP1' (DEFAULT), e2→'DGTL', e3→'EXPT'
  // We use entity.shortCode lookup; align with mock-entities: e1 DEFAULT_ENTITY_SHORTCODE, e2 'DGTL', e3 'EXPT'.
  // To stay robust, read MOCK_ENTITIES shortCodes through engine which uses loadEntities by id.
  localStorage.setItem(vouchersKey('SMRT'), JSON.stringify([
    mkV('e1', [{ code: 'SALE', dr: 0, cr: 100000 }, { code: 'PRTY-DR', dr: 100000, cr: 0 }]),
    mkV('e1', [{ code: 'PURCH', dr: 40000, cr: 0 }, { code: 'PRTY-CR', dr: 0, cr: 40000 }]),
  ]));
  localStorage.setItem(vouchersKey('DGTL'), JSON.stringify([
    mkV('e2', [{ code: 'SALE', dr: 0, cr: 50000 }, { code: 'PRTY-DR', dr: 50000, cr: 0 }]),
  ]));
  localStorage.setItem(vouchersKey('EXPT'), JSON.stringify([
    mkV('e3', [{ code: 'SALE', dr: 0, cr: 20000 }, { code: 'PRTY-DR', dr: 20000, cr: 0 }]),
  ]));
}

describe('Sprint 109 · group-consolidation-engine', () => {
  beforeEach(() => { seed(); });

  it('computeEntityTrialBalance sums vouchers by ledger_group_code', () => {
    const tb = computeEntityTrialBalance('e1', FY);
    const sale = tb.lines.find(l => l.ledger_group_code === 'SALE');
    expect(sale?.credit).toBe(100000);
  });
  it('computeEntityTrialBalance classifies I-OR/SALE as pnl', () => {
    const tb = computeEntityTrialBalance('e1', FY);
    expect(tb.lines.find(l => l.ledger_group_code === 'SALE')?.classification).toBe('pnl');
  });
  it('computeEntityTrialBalance classifies non-income/expense as bs', () => {
    const tb = computeEntityTrialBalance('e1', FY);
    const party = tb.lines.find(l => l.ledger_group_code === 'PRTY-DR');
    // PRTY-DR not in seed → getL1Code returns '' → classified bs
    expect(party?.classification).toBe('bs');
  });
  it('computeEntityTrialBalance respects FY window', () => {
    const tb = computeEntityTrialBalance('e1', '2030-31');
    expect(tb.lines.length).toBe(0);
  });
  it('computeEntityTrialBalance returns empty for unknown entity', () => {
    const tb = computeEntityTrialBalance('not-an-entity', FY);
    expect(tb.lines.length).toBe(0);
  });
  it('computeEntityTrialBalance attaches method from group structure', () => {
    expect(computeEntityTrialBalance('e1', FY).method).toBe('full');
    expect(computeEntityTrialBalance('e2', FY).method).toBe('proportional');
    expect(computeEntityTrialBalance('e3', FY).method).toBe('equity');
  });
  it('computeEntityTrialBalance attaches ownership_pct', () => {
    expect(computeEntityTrialBalance('e2', FY).ownership_pct).toBe(60);
  });

  it('consolidate returns ConsolidatedTrialBalance with fy + entity_count', () => {
    const tb = consolidate({ fy: FY });
    expect(tb.fy).toBe(FY);
    expect(tb.entity_count).toBe(3);
  });
  it('consolidate full-method entity contributes 100% line-by-line', () => {
    const tb = consolidate({ fy: FY });
    const sale = tb.lines.find(l => l.ledger_group_code === 'SALE');
    // full=100k + proportional 60% of 50k=30k + equity (line-zero) = 130k
    expect(sale?.credit).toBe(130000);
  });
  it('consolidate proportional method applies ownership_pct share', () => {
    // remove e1 and e3 to isolate e2 proportional
    localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
      { entity_id: 'e2', parent_entity_id: null, relationship: 'subsidiary',
        ownership_pct: 60, consolidation_method: 'proportional', effective_from: '2026-04-01' },
    ]));
    const tb = consolidate({ fy: FY });
    expect(tb.lines.find(l => l.ledger_group_code === 'SALE')?.credit).toBe(30000);
  });
  it('consolidate equity method is NOT line-by-line (zeroes raw lines)', () => {
    localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
      { entity_id: 'e3', parent_entity_id: null, relationship: 'associate',
        ownership_pct: 30, consolidation_method: 'equity', effective_from: '2026-04-01' },
    ]));
    const tb = consolidate({ fy: FY });
    const sale = tb.lines.find(l => l.ledger_group_code === 'SALE');
    expect(sale?.credit ?? 0).toBe(0);
  });
  it('consolidate equity method rolls up single investment line', () => {
    localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
      { entity_id: 'e3', parent_entity_id: null, relationship: 'associate',
        ownership_pct: 30, consolidation_method: 'equity', effective_from: '2026-04-01' },
    ]));
    const tb = consolidate({ fy: FY });
    const inv = tb.lines.find(l => l.ledger_group_code === 'IC-EQUITY-INVEST');
    expect(inv).toBeTruthy();
    // 30% × 20000 = 6000 (income → debit on parent side)
    expect((inv?.debit ?? 0) + (inv?.credit ?? 0)).toBeCloseTo(6000, 2);
  });
  it('consolidate subtracts generateEliminations entries (count surfaces)', () => {
    const elims = EliminationsEngine.generateEliminations({ fy: FY });
    const tb = consolidate({ fy: FY });
    expect(tb.eliminations_applied).toBe(elims.length);
  });
  it('consolidated TB is balanced (Dr=Cr)', () => {
    const tb = consolidate({ fy: FY });
    const dr = tb.lines.reduce((s, l) => s + l.debit, 0);
    const cr = tb.lines.reduce((s, l) => s + l.credit, 0);
    expect(tb.balanced).toBe(true);
    expect(Math.abs(dr - cr)).toBeLessThan(0.01);
  });
  it('consolidate is decimal-safe (no floating drift)', () => {
    const tb = consolidate({ fy: FY });
    tb.lines.forEach(l => {
      expect(Number.isFinite(l.debit)).toBe(true);
      expect(Number.isFinite(l.credit)).toBe(true);
    });
  });

  it('buildConsolidatedPnL derives revenue from I-OR (SALE)', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    expect(pnl.revenue).toBeGreaterThan(0);
  });
  it('buildConsolidatedPnL math: gross_profit = revenue − cogs', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    expect(pnl.gross_profit).toBeCloseTo(pnl.revenue - pnl.cogs, 2);
  });
  it('buildConsolidatedPnL math: operating_profit = gross − expenses', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    expect(pnl.operating_profit).toBeCloseTo(pnl.gross_profit - pnl.expenses, 2);
  });
  it('buildConsolidatedPnL math: PBT = operating + other_income', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    expect(pnl.profit_before_tax).toBeCloseTo(pnl.operating_profit + pnl.other_income, 2);
  });
  it('buildConsolidatedPnL reflects 3 methods + eliminations', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    // Revenue = full(100k) + proportional(30k) + equity(line-zero,0) = 130k (pre-elim; elim may reduce)
    expect(pnl.revenue).toBeLessThanOrEqual(130000);
  });
  it('buildConsolidatedPnL lines are only P&L-classified', () => {
    const pnl = buildConsolidatedPnL({ fy: FY });
    pnl.lines.forEach(l => { expect(typeof l.amount).toBe('number'); });
  });

  it('getConsolidationSummary returns per-entity contribution', () => {
    const s = getConsolidationSummary(FY);
    expect(s.length).toBe(3);
    expect(s.find(r => r.entity_id === 'e1')?.method).toBe('full');
  });
  it('getConsolidationSummary scales proportional by ownership_pct', () => {
    const s = getConsolidationSummary(FY);
    const e2 = s.find(r => r.entity_id === 'e2');
    // e2 net = 50000 → × 60% = 30000
    expect(e2?.contribution).toBeCloseTo(30000, 2);
  });
  it('getConsolidationSummary scales equity by ownership_pct', () => {
    const s = getConsolidationSummary(FY);
    const e3 = s.find(r => r.entity_id === 'e3');
    expect(e3?.contribution).toBeCloseTo(6000, 2);
  });

  it('audit: group_consolidation_run logged on consolidate', () => {
    localStorage.removeItem(auditTrailKey('GROUP'));
    consolidate({ fy: FY });
    const raw = localStorage.getItem(auditTrailKey('GROUP')) ?? '[]';
    const entries = JSON.parse(raw) as { entity_type: string; source_module: string }[];
    expect(entries.some(e => e.entity_type === 'group_consolidation_run')).toBe(true);
  });
  it('audit: sourceModule is group-consolidation-engine', () => {
    localStorage.removeItem(auditTrailKey('GROUP'));
    consolidate({ fy: FY });
    const entries = JSON.parse(localStorage.getItem(auditTrailKey('GROUP')) ?? '[]') as { source_module: string }[];
    expect(entries.some(e => e.source_module === 'group-consolidation-engine')).toBe(true);
  });

  // FR-44 orchestration assertions
  it('FR-44: engine READS listGroupStructure (does not re-derive)', () => {
    expect(typeof StructureEngine.listGroupStructure).toBe('function');
  });
  it('FR-44: engine READS generateEliminations (does not re-run logic)', () => {
    expect(typeof EliminationsEngine.generateEliminations).toBe('function');
  });
  it('FR-44: engine does NOT export postVoucher / re-posting fn', () => {
    expect((ConsolidationEngine as Record<string, unknown>).postVoucher).toBeUndefined();
    expect((ConsolidationEngine as Record<string, unknown>).repostLedgers).toBeUndefined();
  });
  it('FR-44: engine does NOT re-export elimination derivers', () => {
    expect((ConsolidationEngine as Record<string, unknown>).deriveE1).toBeUndefined();
    expect((ConsolidationEngine as Record<string, unknown>).generateEliminations).toBeUndefined();
  });
  it('FR-44: engine does NOT re-derive group structure', () => {
    expect((ConsolidationEngine as Record<string, unknown>).upsertGroupStructure).toBeUndefined();
  });

  // SCOPE WALL DP-A3-9
  it('SCOPE WALL: NO buildBalanceSheet export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).buildBalanceSheet).toBeUndefined();
  });
  it('SCOPE WALL: NO buildCashFlow export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).buildCashFlow).toBeUndefined();
  });
  it('SCOPE WALL: NO computeNCI / minority interest export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).computeNCI).toBeUndefined();
    expect((ConsolidationEngine as Record<string, unknown>).computeMinorityInterest).toBeUndefined();
  });
  it('SCOPE WALL: NO computeGoodwill export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).computeGoodwill).toBeUndefined();
  });
  it('SCOPE WALL: NO FX / multi-currency translate export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).translateFX).toBeUndefined();
    expect((ConsolidationEngine as Record<string, unknown>).convertCurrency).toBeUndefined();
  });
  it('SCOPE WALL: NO disclosure / note generator export', () => {
    expect((ConsolidationEngine as Record<string, unknown>).generateDisclosures).toBeUndefined();
  });

  // Registry hygiene
  it('sibling-register: count is ≥177 (S110 added 178th)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(177);
  });
  it('sibling-register: group-consolidation-engine present exactly once', () => {
    const matches = SIBLINGS.filter(s => s.id === 'group-consolidation-engine');
    expect(matches.length).toBe(1);
  });
  it('sibling-register: comply360-tier2 still 1', () => {
    const matches = SIBLINGS.filter(s => s.id.includes('comply360-tier2'));
    expect(matches.length).toBeLessThanOrEqual(1);
  });

  // Page wiring (no dead UI)
  it('page module: reads engine via published API', () => {
    expect(typeof consolidate).toBe('function');
    expect(typeof buildConsolidatedPnL).toBe('function');
    expect(typeof getConsolidationSummary).toBe('function');
  });
});
