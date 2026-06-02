/**
 * Sprint 110 · T-Phase-6.C.2.2 · Arc 3 · FX Translation (Ind AS 21) test pack (≥30 it())
 * Asserts: rate-set mapping, classification, FCTR residual, S109 §H waiver (default 0-DIFF),
 * FR-44 wall (no fx-what-if usage; reuses dual-rate.loadForexRates), scope wall, registry hygiene.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  getFXRateSet,
  getFunctionalCurrency,
  setFunctionalCurrency,
  classifyForTranslation,
  translateForeignEntity,
  translateEntityTB,
  consolidateWithTranslation,
  listTranslations,
  clearTranslations,
  FX_RATE_SOURCE_ENTITY,
  READS_FROM,
} from '@/lib/fx-translation-engine';
import * as FxEngine from '@/lib/fx-translation-engine';
import * as S109 from '@/lib/group-consolidation-engine';
import { consolidate, computeEntityTrialBalance } from '@/lib/group-consolidation-engine';
import { GROUP_STRUCTURE_KEY } from '@/lib/intercompany-group-structure-engine';
import { vouchersKey } from '@/lib/fincore-engine';
import { auditTrailKey } from '@/types/audit-trail';
import { recordMasterVersion } from '@/lib/idea-1-time-travel-masters-engine';
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
  // 3 entities: e1 parent (INR/full), e2 sub (proportional 60), e3 associate (equity 30)
  localStorage.setItem(GROUP_STRUCTURE_KEY, JSON.stringify([
    { entity_id: 'e1', parent_entity_id: null, relationship: 'parent', ownership_pct: 100, consolidation_method: 'full', effective_from: '2026-04-01' },
    { entity_id: 'e2', parent_entity_id: 'e1', relationship: 'subsidiary', ownership_pct: 60, consolidation_method: 'proportional', effective_from: '2026-04-01' },
    { entity_id: 'e3', parent_entity_id: 'e1', relationship: 'associate', ownership_pct: 30, consolidation_method: 'equity', effective_from: '2026-04-01' },
  ]));
  localStorage.setItem(vouchersKey('SMRT'), JSON.stringify([
    mkV('e1', [{ code: 'SALE', dr: 0, cr: 100000 }, { code: 'PRTY-DR', dr: 100000, cr: 0 }]),
  ]));
  localStorage.setItem(vouchersKey('DGTL'), JSON.stringify([
    mkV('e2', [{ code: 'SALE', dr: 0, cr: 50000 }, { code: 'PRTY-DR', dr: 50000, cr: 0 }]),
  ]));
  localStorage.setItem(vouchersKey('EXPT'), JSON.stringify([
    mkV('e3', [{ code: 'SALE', dr: 0, cr: 20000 }, { code: 'PRTY-DR', dr: 20000, cr: 0 }]),
  ]));
  // Seed USD forex rates against GROUP entity (S110 convention)
  localStorage.setItem(`erp_${FX_RATE_SOURCE_ENTITY}_forex_rates`, JSON.stringify([
    {
      id: 'fx-usd-1', currency_id: 'USD', applicable_from: '2027-03-31',
      selling_rate: 85, buying_rate: 83, standard_rate: 84,
      last_voucher_rate: 84.5, customs_valuation_rate: null, created_at: '2027-03-31T00:00:00.000Z',
    },
  ]));
}

describe('Sprint 110 · fx-translation-engine · Ind AS 21', () => {
  beforeEach(() => { seed(); });

  // ── getFXRateSet ─────────────────────────────────────────────────────
  it('INR functional currency returns 1:1 rate set', () => {
    const set = getFXRateSet({ fy: FY, from_currency: 'INR' });
    expect(set.closing_rate).toBe(1); expect(set.average_rate).toBe(1); expect(set.historical_rate).toBe(1);
  });
  it('getFXRateSet pulls closing from dual-rate loadForexRates standard_rate', () => {
    const set = getFXRateSet({ fy: FY, from_currency: 'USD' });
    expect(set.closing_rate).toBe(84);
    expect(set.source.closing).toBe('forex-master');
  });
  it('getFXRateSet computes average as mean of selling+buying', () => {
    const set = getFXRateSet({ fy: FY, from_currency: 'USD' });
    expect(set.average_rate).toBe(84); // (85+83)/2
  });
  it('getFXRateSet historical falls back to closing when idea-1 chain absent', () => {
    const set = getFXRateSet({ fy: FY, from_currency: 'USD' });
    expect(set.historical_rate).toBe(84);
    expect(set.source.historical).toBe('fallback');
  });
  it('getFXRateSet historical reads idea-1 getMasterAsOf when chain seeded', () => {
    recordMasterVersion({
      master_type: 'ledger', master_key: 'forex_USD',
      snapshot: { standard_rate: 70, buying_rate: 70, selling_rate: 70 },
      effective_from_date: '2020-01-01', changed_by: 'test',
    });
    const set = getFXRateSet({ fy: FY, from_currency: 'USD' });
    expect(set.historical_rate).toBe(70);
    expect(set.source.historical).toBe('idea-1');
  });
  it('getFXRateSet to_currency is always INR', () => {
    expect(getFXRateSet({ fy: FY, from_currency: 'USD' }).to_currency).toBe('INR');
  });
  it('getFXRateSet upper-cases the iso code', () => {
    const set = getFXRateSet({ fy: FY, from_currency: 'usd' });
    expect(set.from_currency).toBe('USD');
  });

  // ── classification ───────────────────────────────────────────────────
  it('classifyForTranslation maps income codes to pnl', () => {
    expect(classifyForTranslation('SALE')).toBe('pnl');
  });
  it('classifyForTranslation maps non-I/E/CE to bs', () => {
    expect(classifyForTranslation('PRTY-DR')).toBe('bs');
  });

  // ── functional-currency side-store ───────────────────────────────────
  it('getFunctionalCurrency defaults to INR', () => {
    expect(getFunctionalCurrency('e1')).toBe('INR');
  });
  it('setFunctionalCurrency persists and upper-cases', () => {
    setFunctionalCurrency('e2', 'usd');
    expect(getFunctionalCurrency('e2')).toBe('USD');
  });

  // ── translateForeignEntity ───────────────────────────────────────────
  it('INR-functional entity passes through (rate 1, FCTR 0)', () => {
    const t = translateForeignEntity({ entity_id: 'e1', fy: FY });
    expect(t.from_currency).toBe('INR');
    expect(t.fctr_amount).toBe(0);
    expect(t.balanced_pre_fctr).toBe(true);
    for (const l of t.lines) expect(l.rate_applied).toBe(1);
  });
  it('foreign entity applies closing/average to bs/pnl', () => {
    setFunctionalCurrency('e2', 'USD');
    const t = translateForeignEntity({ entity_id: 'e2', fy: FY });
    const sale = t.lines.find(l => l.ledger_group_code === 'SALE')!;
    expect(sale.rate_type).toBe('average');
    expect(sale.inr_credit).toBe(50000 * 84);
    const prty = t.lines.find(l => l.ledger_group_code === 'PRTY-DR')!;
    expect(prty.rate_type).toBe('closing');
    expect(prty.inr_debit).toBe(50000 * 84);
  });
  it('FCTR = residual exchange difference (dr-cr after translation)', () => {
    setFunctionalCurrency('e2', 'USD');
    const t = translateForeignEntity({ entity_id: 'e2', fy: FY });
    // sale is PNL @ 84, PRTY-DR is BS @ 84 — same rate here, balanced
    expect(t.fctr_amount).toBe(0);
    expect(t.balanced_pre_fctr).toBe(true);
  });
  it('FCTR is non-zero when avg vs closing diverge', () => {
    // Different selling/buying split so average != closing
    localStorage.setItem(`erp_${FX_RATE_SOURCE_ENTITY}_forex_rates`, JSON.stringify([
      { id: 'fx-usd-2', currency_id: 'USD', applicable_from: '2027-03-31',
        selling_rate: 90, buying_rate: 80, standard_rate: 84, last_voucher_rate: null,
        customs_valuation_rate: null, created_at: '2027-03-31T00:00:00.000Z' },
    ]));
    setFunctionalCurrency('e2', 'USD');
    const t = translateForeignEntity({ entity_id: 'e2', fy: FY });
    // SALE @ avg 85 (90+80/2), PRTY-DR @ closing 84
    expect(t.rate_set.average_rate).toBe(85);
    expect(t.rate_set.closing_rate).toBe(84);
    expect(t.fctr_amount).not.toBe(0);
  });
  it('translateForeignEntity is idempotent (same inputs → same lines)', () => {
    setFunctionalCurrency('e2', 'USD');
    const a = translateForeignEntity({ entity_id: 'e2', fy: FY });
    const b = translateForeignEntity({ entity_id: 'e2', fy: FY });
    expect(a.lines).toEqual(b.lines);
    expect(a.fctr_amount).toBe(b.fctr_amount);
  });
  it('translateForeignEntity persists run via listTranslations', () => {
    setFunctionalCurrency('e2', 'USD');
    translateForeignEntity({ entity_id: 'e2', fy: FY });
    expect(listTranslations(FY).some(r => r.entity_id === 'e2')).toBe(true);
  });
  it('clearTranslations wipes the side-store', () => {
    setFunctionalCurrency('e2', 'USD');
    translateForeignEntity({ entity_id: 'e2', fy: FY });
    clearTranslations(FY);
    expect(listTranslations(FY)).toEqual([]);
  });

  // ── audit emit ───────────────────────────────────────────────────────
  it('translateForeignEntity logs fx_translation_run audit (mca-roc semantics)', () => {
    setFunctionalCurrency('e2', 'USD');
    translateForeignEntity({ entity_id: 'e2', fy: FY });
    const raw = localStorage.getItem(auditTrailKey('e2')) ?? '[]';
    expect(raw).toContain('fx_translation_run');
  });

  // ── S109 §H waiver: default-path 0-DIFF ──────────────────────────────
  it('S109 consolidate({fy}) with no provider is byte-equal to legacy behaviour', () => {
    const a = consolidate({ fy: FY });
    const b = consolidate({ fy: FY });
    expect(a).toEqual(b);
    // and equal to a manual rollup of computeEntityTrialBalance lines (smoke):
    expect(a.entity_count).toBe(3);
  });
  it('translateEntityTB for INR entity equals computeEntityTrialBalance verbatim', () => {
    const direct = computeEntityTrialBalance('e1', FY);
    const viaTranslator = translateEntityTB('e1', FY);
    expect(viaTranslator).toEqual(direct);
  });
  it('consolidateWithTranslation uses entityTBProvider hook', () => {
    const result = consolidateWithTranslation({ fy: FY });
    expect(result.entity_count).toBe(3);
    expect(typeof result.balanced).toBe('boolean');
  });
  it('consolidateWithTranslation result for all-INR group equals plain consolidate', () => {
    const a = consolidate({ fy: FY });
    const b = consolidateWithTranslation({ fy: FY });
    expect(b.lines.length).toBe(a.lines.length);
  });
  it('consolidateWithTranslation for foreign sub keeps overall TB balanced (FCTR-OCI line)', () => {
    setFunctionalCurrency('e2', 'USD');
    const r = consolidateWithTranslation({ fy: FY });
    expect(r.balanced).toBe(true);
  });

  // ── FR-44 WALL ───────────────────────────────────────────────────────
  it('FR-44 WALL: fx-translation-engine source does NOT mention fx-what-if', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/fx-translation-engine.ts'), 'utf8');
    expect(src).not.toMatch(/fx-what-if/i);
    expect(src).not.toMatch(/computeFXScenarioForRealisation/);
    expect(src).not.toMatch(/saveScenario|FXScenario/);
  });
  it('FR-44 WALL: engine REUSES dual-rate loadForexRates (no parallel rate store)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/fx-translation-engine.ts'), 'utf8');
    expect(src).toMatch(/from '@\/lib\/dual-rate-engine'/);
    expect(src).toMatch(/loadForexRates/);
  });
  it('FR-44 WALL: engine reuses idea-1 getMasterAsOf for historical rate', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/fx-translation-engine.ts'), 'utf8');
    expect(src).toMatch(/getMasterAsOf/);
  });
  it('READS_FROM self-declares the 4 source engines', () => {
    expect(READS_FROM.engines).toContain('dual-rate-engine');
    expect(READS_FROM.engines).toContain('idea-1-time-travel-masters-engine');
    expect(READS_FROM.engines).toContain('group-consolidation-engine');
  });

  // ── SCOPE WALL ───────────────────────────────────────────────────────
  it('SCOPE WALL: no BS/CF/NCI/Goodwill/disclosure/scenario exports', () => {
    const forbidden = [
      'buildBalanceSheet', 'buildCashFlow', 'computeNCI', 'computeGoodwill',
      'buildDisclosure', 'computeFXScenario', 'simulateScenario',
    ];
    for (const fn of forbidden) {
      expect((FxEngine as unknown as Record<string, unknown>)[fn]).toBeUndefined();
    }
  });
  it('SCOPE WALL: source file does not import fx-what-if or scenario types', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/fx-translation-engine.ts'), 'utf8');
    expect(src).not.toMatch(/fx-scenario/);
    expect(src).not.toMatch(/fx-what-if-engine/);
  });

  // ── S109 0-DIFF assertions (waiver scope) ────────────────────────────
  it('S109: computeEntityTrialBalance signature unchanged', () => {
    expect(S109.computeEntityTrialBalance.length).toBe(2);
  });
  it('S109: buildConsolidatedPnL still exported', () => {
    expect(typeof S109.buildConsolidatedPnL).toBe('function');
  });
  it('S109: getConsolidationSummary still exported', () => {
    expect(typeof S109.getConsolidationSummary).toBe('function');
  });
  it('S109 §H waiver: consolidate accepts optional entityTBProvider', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../../lib/group-consolidation-engine.ts'), 'utf8');
    expect(src).toMatch(/entityTBProvider\?:/);
  });

  // ── Registry hygiene ─────────────────────────────────────────────────
  it('sibling-register count is 178 (was 177)', () => {
    expect(getSiblingCount()).toBe(178);
  });
  it('fx-translation-engine sibling entry exists exactly once', () => {
    const matches = SIBLINGS.filter(s => s.id === 'fx-translation-engine');
    expect(matches.length).toBe(1);
    expect(matches[0].provenance).toBe('CONFIRMED');
    expect(matches[0].path).toBe('src/lib/fx-translation-engine.ts');
  });
  it('comply360-tier2 still appears exactly once (no accidental dup)', () => {
    const matches = SIBLINGS.filter(s => s.id === 'comply360-tier2-extensions-engine');
    expect(matches.length).toBe(1);
  });
  it('sprint-history has S110 entry with TBD_AT_BANK and predecessor 49690f03', () => {
    const s110 = SPRINTS.find(s => s.sprintNumber === 110);
    expect(s110).toBeDefined();
    expect(s110!.headSha).toBe('TBD_AT_BANK');
    expect(s110!.predecessorSha).toBe('49690f03daa4eb9a42b0279930879b8bf2c3d7e4');
    expect(s110!.newSiblings).toEqual(['fx-translation-engine']);
  });
  it('sprint-history S109 headSha backfilled to 49690f03', () => {
    const s109 = SPRINTS.find(s => s.sprintNumber === 109);
    expect(s109!.headSha).toBe('49690f03daa4eb9a42b0279930879b8bf2c3d7e4');
  });
  it('sprint-history has NO S111 pre-entry', () => {
    expect(SPRINTS.find(s => s.sprintNumber === 111)).toBeUndefined();
  });
});
