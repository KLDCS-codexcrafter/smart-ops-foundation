/**
 * @file        src/test/sprint-112/consolidation-disclosure.test.ts
 * @sprint      T-Phase-6.C.2.4 · Sprint 112 · Arc 3 CAPSTONE · "Horizon 1.5"
 * @scope       consolidation-disclosure-engine + page extension + registers.
 *
 * ≥30 discrete `it()` blocks · v1.30 §N meta.
 *
 * Coverage:
 *   - buildDisclosurePack ASSEMBLES from S109/S111 builders (CALLS · not recompute).
 *   - sections mapped to Schedule III taxonomy (getSchedIIITaxonomyElements).
 *   - schedule_iii_compliant + ind_as_110_compliant flags.
 *   - exportDisclosureXBRL reuses buildXBRL + validateXBRL + exportXBRLDownload.
 *   - exportDisclosurePDF returns {blob, filename} via board-pack pattern.
 *   - consolidation_disclosure_event audit logged.
 *   - FR-44: engine builds NO financial figures + NO XBRL taxonomy itself.
 *   - All sources 0-DIFF (xbrl-builder, S109, S111, board-pack).
 *   - SCOPE WALL: no OOB/Pillar-C.3 functions.
 *   - sibling count ≥ 181 (real entries); ComplianceModule untouched.
 *   - Guardrail 1 + 3 (S112 headSha = 'TBD_AT_BANK'; prior counts floored).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as engine from '@/lib/consolidation-disclosure-engine';
import * as xbrlBuilder from '@/lib/comply360-xbrl-builder-engine';
import * as s109 from '@/lib/group-consolidation-engine';
import * as s111bs from '@/lib/consolidated-balance-sheet-engine';
import * as s111cf from '@/lib/consolidated-cash-flow-engine';
import * as boardPack from '@/lib/board-pack-pdf-engine';
import * as form3ceb from '@/lib/form-3ceb-engine';
import { logAudit, readAuditTrail } from '@/lib/audit-trail-engine';
import { getSiblingCount, SIBLINGS } from '@/lib/_institutional/sibling-register';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const FY = '2026-27';
const ENGINE_PATH = resolve(__dirname, '../../lib/consolidation-disclosure-engine.ts');
const ENGINE_SRC = readFileSync(ENGINE_PATH, 'utf8');
const PAGE_PATH = resolve(__dirname, '../../features/intercompany/ConsolidatedFinancialsPage.tsx');
const PAGE_SRC = readFileSync(PAGE_PATH, 'utf8');

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('S112 · consolidation-disclosure-engine · assembly (FR-44)', () => {
  it('exports buildDisclosurePack', () => {
    expect(typeof engine.buildDisclosurePack).toBe('function');
  });

  it('exports exportDisclosureXBRL', () => {
    expect(typeof engine.exportDisclosureXBRL).toBe('function');
  });

  it('exports exportDisclosurePDF', () => {
    expect(typeof engine.exportDisclosurePDF).toBe('function');
  });

  it('exports listDisclosurePacks + loadDisclosurePack', () => {
    expect(typeof engine.listDisclosurePacks).toBe('function');
    expect(typeof engine.loadDisclosurePack).toBe('function');
  });

  it('declares READS_FROM with the six expected source engines', () => {
    expect(engine.READS_FROM.engines).toEqual(expect.arrayContaining([
      'group-consolidation-engine',
      'consolidated-balance-sheet-engine',
      'consolidated-cash-flow-engine',
      'comply360-xbrl-builder-engine',
      'comply360-audit-framework-engine',
      'form-3ceb-engine',
    ]));
  });

  it('buildDisclosurePack CALLS S109 buildConsolidatedPnL (not recompute)', () => {
    const spy = vi.spyOn(s109, 'buildConsolidatedPnL');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalledWith({ fy: FY });
  });

  it('buildDisclosurePack CALLS S111 buildBalanceSheet (not recompute)', () => {
    const spy = vi.spyOn(s111bs, 'buildBalanceSheet');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('buildDisclosurePack CALLS S111 buildCashFlow (not recompute)', () => {
    const spy = vi.spyOn(s111cf, 'buildCashFlow');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalledWith({ fy: FY });
  });

  it('buildDisclosurePack CALLS S111 computeNCI', () => {
    const spy = vi.spyOn(s111bs, 'computeNCI');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('buildDisclosurePack CALLS S111 computeGoodwill', () => {
    const spy = vi.spyOn(s111bs, 'computeGoodwill');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('returns sections covering BS + P&L + CF + NCI + Goodwill + policy notes', () => {
    const pack = engine.buildDisclosurePack({ fy: FY });
    const keys = pack.sections.map((s) => s.key);
    expect(keys).toEqual(expect.arrayContaining([
      'consolidated-bs', 'consolidated-pnl', 'consolidated-cf',
      'nci-disclosure', 'goodwill-disclosure', 'accounting-policy-notes',
    ]));
  });

  it('maps each section to a Schedule III taxonomy category', () => {
    const pack = engine.buildDisclosurePack({ fy: FY });
    const cats = pack.sections.map((s) => s.category);
    expect(cats).toEqual(expect.arrayContaining([
      'balance_sheet', 'profit_loss', 'cash_flow', 'notes',
    ]));
  });

  it('attaches taxonomy_element_code per section from getSchedIIITaxonomyElements', () => {
    const elements = xbrlBuilder.getSchedIIITaxonomyElements('C_IndAS_2024');
    const elementCodes = new Set(elements.map((e) => e.element_code));
    const pack = engine.buildDisclosurePack({ fy: FY });
    for (const section of pack.sections) {
      if (section.taxonomy_element_code !== null) {
        expect(elementCodes.has(section.taxonomy_element_code)).toBe(true);
      }
    }
  });

  it('sets schedule_iii_compliant when BS+P&L+CF sections are present', () => {
    const pack = engine.buildDisclosurePack({ fy: FY });
    expect(pack.schedule_iii_compliant).toBe(true);
  });

  it('exposes ind_as_110_compliant boolean tied to balance check', () => {
    const pack = engine.buildDisclosurePack({ fy: FY });
    expect(typeof pack.ind_as_110_compliant).toBe('boolean');
  });

  it('uses C_IndAS_2024 taxonomy version by default', () => {
    const pack = engine.buildDisclosurePack({ fy: FY });
    expect(pack.taxonomy_version).toBe('C_IndAS_2024');
  });

  it('persists pack via listDisclosurePacks/loadDisclosurePack', () => {
    engine.buildDisclosurePack({ fy: FY });
    expect(engine.listDisclosurePacks().some((p) => p.fy === FY)).toBe(true);
    expect(engine.loadDisclosurePack(FY)?.fy).toBe(FY);
  });

  it('overwrites an existing pack for the same FY (idempotent assembly)', () => {
    engine.buildDisclosurePack({ fy: FY });
    engine.buildDisclosurePack({ fy: FY });
    const packs = engine.listDisclosurePacks().filter((p) => p.fy === FY);
    expect(packs.length).toBe(1);
  });

  it('cross-references form-3ceb (count of CA-signed snapshots for FY)', () => {
    const spy = vi.spyOn(form3ceb, 'loadForm3CEBSnapshots');
    engine.buildDisclosurePack({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });
});

describe('S112 · exportDisclosureXBRL · reuses comply360-xbrl-builder (0-DIFF)', () => {
  it('CALLS xbrl-builder buildXBRL (does not reimplement)', () => {
    const spy = vi.spyOn(xbrlBuilder, 'buildXBRL');
    engine.exportDisclosureXBRL({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('CALLS xbrl-builder validateXBRL', () => {
    const spy = vi.spyOn(xbrlBuilder, 'validateXBRL');
    engine.exportDisclosureXBRL({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('CALLS xbrl-builder exportXBRLDownload', () => {
    const spy = vi.spyOn(xbrlBuilder, 'exportXBRLDownload');
    engine.exportDisclosureXBRL({ fy: FY });
    expect(spy).toHaveBeenCalled();
  });

  it('returns xbrl_output_id + validation + download Blob', () => {
    const r = engine.exportDisclosureXBRL({ fy: FY });
    expect(r.xbrl_output_id).toMatch(/^xbrl_/);
    expect(r.validation).toHaveProperty('is_valid');
    expect(r.download.blob).toBeInstanceOf(Blob);
    expect(r.download.filename).toMatch(/\.xml$/i);
  });

  it('passes a consolidation-scoped aoc4_xbrl_id (Block 0 bridge)', () => {
    const spy = vi.spyOn(xbrlBuilder, 'buildXBRL');
    engine.exportDisclosureXBRL({ fy: FY });
    const arg = spy.mock.calls[0][0];
    expect(arg.aoc4_xbrl_id).toBe(`consolidation-xbrl-${FY}`);
    expect(arg.taxonomy_version).toBe('C_IndAS_2024');
  });
});

describe('S112 · exportDisclosurePDF · reuses board-pack pattern (board-pack 0-DIFF)', () => {
  it('returns a Blob and a filename ending in .pdf', () => {
    const r = engine.exportDisclosurePDF({ fy: FY });
    expect(r.blob).toBeInstanceOf(Blob);
    expect(r.filename).toMatch(/\.pdf$/);
  });

  it('filename embeds the FY', () => {
    const r = engine.exportDisclosurePDF({ fy: FY });
    expect(r.filename).toContain(FY);
  });

  it('engine source imports jsPDF + autoTable (board-pack pattern)', () => {
    expect(ENGINE_SRC).toMatch(/from\s+['"]jspdf['"]/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]jspdf-autotable['"]/);
  });

  it('board-pack-pdf-engine remains importable / 0-DIFF surface', () => {
    expect(typeof boardPack.generateBoardPackPDF).toBe('function');
    expect(typeof boardPack.downloadBoardPackPDF).toBe('function');
  });
});

describe('S112 · audit · consolidation_disclosure_event (mca-roc)', () => {
  it('buildDisclosurePack logs a consolidation_disclosure_event entry', () => {
    engine.buildDisclosurePack({ fy: FY });
    const all = readAuditTrail('OPERIX-DEMO');
    expect(all.some((e) => e.entity_type === 'consolidation_disclosure_event')).toBe(true);
  });

  it('exportDisclosureXBRL logs an xbrl export_kind event', () => {
    engine.exportDisclosureXBRL({ fy: FY });
    const all = readAuditTrail('OPERIX-DEMO');
    const xbrlEvents = all.filter((e) =>
      e.entity_type === 'consolidation_disclosure_event' &&
      (e.after_state as { export_kind?: string } | null)?.export_kind === 'xbrl',
    );
    expect(xbrlEvents.length).toBeGreaterThan(0);
  });

  it('exportDisclosurePDF logs a pdf export_kind event', () => {
    engine.exportDisclosurePDF({ fy: FY });
    const all = readAuditTrail('OPERIX-DEMO');
    const pdfEvents = all.filter((e) =>
      e.entity_type === 'consolidation_disclosure_event' &&
      (e.after_state as { export_kind?: string } | null)?.export_kind === 'pdf',
    );
    expect(pdfEvents.length).toBeGreaterThan(0);
  });

  it('audit trail engine logAudit accepts the new entity type', () => {
    const entry = logAudit({
      entityCode: 'OPERIX-DEMO', action: 'create',
      entityType: 'consolidation_disclosure_event',
      recordId: 'x', recordLabel: 'x',
      beforeState: null, afterState: null, sourceModule: 'test',
    });
    expect(entry.entity_type).toBe('consolidation_disclosure_event');
  });
});

describe('S112 · FR-44 + SCOPE WALL (engine source assertions)', () => {
  it('engine declares @fr-44 header (pure assembly)', () => {
    expect(ENGINE_SRC).toMatch(/@fr-44/);
  });

  it('engine declares @scope-wall DP-A3-9', () => {
    expect(ENGINE_SRC).toMatch(/@scope-wall[\s\S]*DP-A3-9/);
  });

  it('engine does NOT define its own taxonomy literal (no in-gaap:/ind-as: maps)', () => {
    // Strip comments/strings to limit false positives from §H/§L notes.
    const noComments = ENGINE_SRC.replace(/\/\*[\s\S]*?\*\//g, '');
    // Look for an object/array literal containing taxonomy element prefixes.
    expect(noComments).not.toMatch(/in-gaap:\w+['"]\s*[,:]/);
    expect(noComments).not.toMatch(/ind-as:\w+['"]\s*[,:]/);
  });

  it('engine does NOT export OOB / Pillar-C.3 functions', () => {
    const banned = ['exportOOB', 'buildOOB', 'pillarC3', 'computeDisclosureFigures', 'recomputeBS', 'recomputePnL', 'recomputeCF'];
    for (const fn of banned) {
      expect((engine as Record<string, unknown>)[fn]).toBeUndefined();
    }
  });

  it('engine does NOT import OOB / Pillar-C.3 modules', () => {
    expect(ENGINE_SRC).not.toMatch(/from\s+['"][^'"]*oob[^'"]*['"]/i);
    expect(ENGINE_SRC).not.toMatch(/pillar[-_ ]?c[-_ ]?3/i);
  });

  it('engine reuses xbrl-builder (imports buildXBRL · validateXBRL · exportXBRLDownload)', () => {
    expect(ENGINE_SRC).toMatch(/buildXBRL[\s\S]*validateXBRL[\s\S]*exportXBRLDownload/);
    expect(ENGINE_SRC).toMatch(/from\s+['"]\.\/comply360-xbrl-builder-engine['"]/);
  });

  it('engine reuses S109 buildConsolidatedPnL (imported)', () => {
    expect(ENGINE_SRC).toMatch(/buildConsolidatedPnL/);
  });

  it('engine reuses S111 buildBalanceSheet/buildCashFlow/computeNCI/computeGoodwill', () => {
    expect(ENGINE_SRC).toMatch(/buildBalanceSheet/);
    expect(ENGINE_SRC).toMatch(/buildCashFlow/);
    expect(ENGINE_SRC).toMatch(/computeNCI/);
    expect(ENGINE_SRC).toMatch(/computeGoodwill/);
  });

  it('engine cross-references form-3ceb-engine (loadForm3CEBSnapshots)', () => {
    expect(ENGINE_SRC).toMatch(/loadForm3CEBSnapshots/);
  });

  it('engine uses decimal-helpers (round2/dSum) for totals', () => {
    expect(ENGINE_SRC).toMatch(/decimal-helpers/);
  });
});

describe('S112 · page extension · ConsolidatedFinancialsPage (#39)', () => {
  it('page imports consolidation-disclosure-engine (no dead UI)', () => {
    expect(PAGE_SRC).toMatch(/from\s+['"]@\/lib\/consolidation-disclosure-engine['"]/);
  });

  it('page exposes Assemble Pack + Export PDF + Export XBRL controls', () => {
    expect(PAGE_SRC).toMatch(/Assemble Pack/);
    expect(PAGE_SRC).toMatch(/Export PDF/);
    expect(PAGE_SRC).toMatch(/Export XBRL/);
  });

  it('page adds a Disclosure Pack tab (extends · does NOT replace S111 tabs)', () => {
    expect(PAGE_SRC).toMatch(/value="disclosure"/);
    expect(PAGE_SRC).toMatch(/value="bs"/);
    expect(PAGE_SRC).toMatch(/value="cf"/);
    expect(PAGE_SRC).toMatch(/value="nci"/);
    expect(PAGE_SRC).toMatch(/value="gw"/);
  });
});

describe('S112 · registers + guardrails', () => {
  it('sibling-register contains consolidation-disclosure-engine exactly once', () => {
    const matches = SIBLINGS.filter((s) => s.id === 'consolidation-disclosure-engine');
    expect(matches.length).toBe(1);
  });

  it('sibling count is at least 181 (Guardrail 3 floor)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(181);
  });

  it('comply360-tier2 registry entry still appears exactly once (untouched)', () => {
    const matches = SIBLINGS.filter((s) => s.id.includes('comply360-tier2'));
    expect(matches.length).toBe(1);
  });

  it('sprint-history has S112 entry with TBD_AT_BANK (Guardrail 1)', () => {
    const s112 = SPRINTS.find((s) => s.sprintNumber === 112);
    expect(s112).toBeTruthy();
    expect(s112?.headSha).toBe('TBD_AT_BANK');
    expect(s112?.predecessorSha).toBe('3f00b9813e36e28fbea99ad2a6a1ca5f4427e5dd');
    expect(s112?.newSiblings).toEqual(['consolidation-disclosure-engine']);
    expect(s112?.code).toBe('T-Phase-6.C.2.4');
    expect(s112?.grade).toBe('A');
  });

  it('S111 sprint-history headSha was backfilled to 3f00b981 (Block 1)', () => {
    const s111 = SPRINTS.find((s) => s.sprintNumber === 111);
    expect(s111?.headSha).toBe('3f00b9813e36e28fbea99ad2a6a1ca5f4427e5dd');
  });

  it('NO S113 entry has been pre-created (Guardrail 2)', () => {
    expect(SPRINTS.find((s) => s.sprintNumber === 113)).toBeUndefined();
  });
});
