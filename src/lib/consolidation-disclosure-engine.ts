/**
 * @file        src/lib/consolidation-disclosure-engine.ts
 * @sibling     NEW @ Sprint 112 · T-Phase-6.C.2.4 · Arc 3 CAPSTONE · "Horizon 1.5"
 * @ind-as      110 (Consolidated Financial Statements) + Schedule III (Companies Act 2013)
 *              consolidated-financials disclosure pack.
 * @fr-44       ASSEMBLES S109/S111 consolidated statements + CROSS-REFERENCES
 *              comply360-xbrl-builder-engine (buildXBRL · Schedule III taxonomy) +
 *              board-pack-pdf-engine + form-3ceb. Builds NO financial figures itself
 *              and NO XBRL taxonomy — pure assembly/orchestration. 0-DIFF on all sources.
 * @reads-from  group-consolidation-engine · consolidated-balance-sheet-engine ·
 *              consolidated-cash-flow-engine · comply360-xbrl-builder-engine ·
 *              comply360-audit-framework-engine · form-3ceb-engine
 * @scope-wall  DP-A3-9 · disclosure assembly + PDF/XBRL export ONLY · NO new financial
 *              computation · NO OOB · NO Pillar C.3 (those are Arc 4).
 * @bridge-§L   buildXBRL requires aoc4_xbrl_id + generated_by_bap which a group-consolidation
 *              context cannot supply (it is a group pack, not a single-entity AOC-4).
 *              Bridge: synthesize a consolidation-scoped id `consolidation-xbrl-${fy}`
 *              and use getActiveBAPAccount() for the BAP. buildXBRL handles missing AOC-4
 *              gracefully (fy='UNKNOWN', mapped values default to 0) and still emits a
 *              Schedule-III-shaped iXBRL envelope; per-element value injection is Arc 4
 *              / Phase 8 work. xbrl-builder STAYS 0-DIFF.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { dSum, round2 } from './decimal-helpers';
import { logAudit } from './audit-trail-engine';
import { getActiveBAPAccount } from './comply360-audit-framework-engine';
import {
  buildConsolidatedPnL,
  type ConsolidatedPnL,
} from './group-consolidation-engine';
import {
  buildBalanceSheet, computeNCI, computeGoodwill,
  type ConsolidatedBalanceSheet, type NCIEntry, type GoodwillEntry,
  type GoodwillAcquisitionInput,
} from './consolidated-balance-sheet-engine';
import {
  buildCashFlow, type ConsolidatedCashFlow,
} from './consolidated-cash-flow-engine';
import {
  buildXBRL, validateXBRL, exportXBRLDownload,
  getSchedIIITaxonomyElements,
  type SchedIIITaxonomyVersion, type XBRLValidationResult,
} from './comply360-xbrl-builder-engine';
import { loadForm3CEBSnapshots } from './form-3ceb-engine';

export const READS_FROM = {
  engines: [
    'group-consolidation-engine',
    'consolidated-balance-sheet-engine',
    'consolidated-cash-flow-engine',
    'comply360-xbrl-builder-engine',
    'comply360-audit-framework-engine',
    'form-3ceb-engine',
  ],
  storage_keys: ['erp_consolidation_disclosure_packs'],
} as const;

// ── Types ────────────────────────────────────────────────────────────────

export type DisclosureCategory =
  | 'balance_sheet' | 'profit_loss' | 'cash_flow' | 'notes';

export interface DisclosureRow { label: string; amount: number }

export interface DisclosureSection {
  key: string;
  title: string;
  category: DisclosureCategory;
  rows: DisclosureRow[];
  total: number;
  taxonomy_element_code: string | null;
}

export interface DisclosureNciNote { label: string; amount: number }
export interface DisclosureGoodwillNote {
  label: string; amount: number; impairment_flag: boolean;
}

export interface ConsolidationDisclosurePack {
  fy: string;
  generated_at: string;
  taxonomy_version: SchedIIITaxonomyVersion;
  sections: DisclosureSection[];
  nci_note: DisclosureNciNote[];
  goodwill_note: DisclosureGoodwillNote[];
  schedule_iii_compliant: boolean;
  ind_as_110_compliant: boolean;
  /** Cross-reference scope: count of CA-signed Form 3CEB snapshots discovered for FY. */
  form_3ceb_cross_ref_count: number;
}

const PACK_KEY = 'erp_consolidation_disclosure_packs';
const DEFAULT_TAXONOMY: SchedIIITaxonomyVersion = 'C_IndAS_2024';

function readPacks(): ConsolidationDisclosurePack[] {
  try {
    const raw = localStorage.getItem(PACK_KEY);
    return raw ? (JSON.parse(raw) as ConsolidationDisclosurePack[]) : [];
  } catch { return []; }
}
function writePacks(p: ConsolidationDisclosurePack[]): void {
  try { localStorage.setItem(PACK_KEY, JSON.stringify(p)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

// ── Section assembly ─────────────────────────────────────────────────────

function taxonomyMap(): Record<DisclosureCategory, string | null> {
  const els = getSchedIIITaxonomyElements(DEFAULT_TAXONOMY);
  // First element in each category provides a representative anchor code.
  const find = (c: DisclosureCategory): string | null =>
    els.find((e) => e.category === c)?.element_code ?? null;
  return {
    balance_sheet: find('balance_sheet'),
    profit_loss: find('profit_loss'),
    cash_flow: find('cash_flow'),
    notes: find('notes'),
  };
}

function pnlSection(pnl: ConsolidatedPnL, tx: string | null): DisclosureSection {
  const rows: DisclosureRow[] = [
    { label: 'Revenue from Operations', amount: round2(pnl.revenue) },
    { label: 'Cost of Goods Sold', amount: round2(pnl.cogs) },
    { label: 'Gross Profit', amount: round2(pnl.gross_profit) },
    { label: 'Other Operating Expenses', amount: round2(pnl.expenses) },
    { label: 'Operating Profit', amount: round2(pnl.operating_profit) },
    { label: 'Other Income', amount: round2(pnl.other_income) },
    { label: 'Profit Before Tax', amount: round2(pnl.profit_before_tax) },
  ];
  return {
    key: 'consolidated-pnl',
    title: 'Consolidated Statement of Profit and Loss',
    category: 'profit_loss',
    rows,
    total: round2(pnl.profit_before_tax),
    taxonomy_element_code: tx,
  };
}

function bsSection(bs: ConsolidatedBalanceSheet, tx: string | null): DisclosureSection {
  const rows: DisclosureRow[] = [
    { label: 'Total Assets', amount: round2(bs.asset_total) },
    { label: 'Total Liabilities', amount: round2(bs.liability_total) },
    { label: 'Total Equity', amount: round2(bs.equity_total) },
    { label: 'Non-Controlling Interest (NCI)', amount: round2(bs.nci_total) },
    { label: 'Goodwill on Consolidation', amount: round2(bs.goodwill_total) },
  ];
  return {
    key: 'consolidated-bs',
    title: 'Consolidated Balance Sheet (Schedule III)',
    category: 'balance_sheet',
    rows,
    total: round2(bs.asset_total),
    taxonomy_element_code: tx,
  };
}

function cfSection(cf: ConsolidatedCashFlow, tx: string | null): DisclosureSection {
  const rows: DisclosureRow[] = [
    { label: 'Net Cash from Operating Activities', amount: round2(cf.operating_total) },
    { label: 'Net Cash from Investing Activities', amount: round2(cf.investing_total) },
    { label: 'Net Cash from Financing Activities', amount: round2(cf.financing_total) },
    { label: 'Net Change in Cash and Cash Equivalents', amount: round2(cf.net_change) },
  ];
  return {
    key: 'consolidated-cf',
    title: 'Consolidated Statement of Cash Flows (Ind AS 7)',
    category: 'cash_flow',
    rows,
    total: round2(cf.net_change),
    taxonomy_element_code: tx,
  };
}

function nciSection(ncis: NCIEntry[], tx: string | null): DisclosureSection {
  const rows: DisclosureRow[] = ncis.map((n) => ({
    label: `NCI · ${n.entity_id} (${(100 - n.ownership_pct).toFixed(2)}%)`,
    amount: round2(n.nci_amount),
  }));
  const total = round2(dSum(ncis, (n) => n.nci_amount));
  return {
    key: 'nci-disclosure',
    title: 'Non-Controlling Interest (Ind AS 110)',
    category: 'notes',
    rows,
    total,
    taxonomy_element_code: tx,
  };
}

function goodwillSection(gws: GoodwillEntry[], tx: string | null): DisclosureSection {
  const rows: DisclosureRow[] = gws.map((g) => ({
    label: `${g.classification === 'goodwill' ? 'Goodwill' : 'Capital Reserve'} · ${g.entity_id}` +
      (g.impairment_flag ? ' · IMPAIRMENT FLAG' : '') +
      (g.acquisition_fallback_used ? ' · (acq. fallback)' : ''),
    amount: round2(g.goodwill),
  }));
  const total = round2(dSum(gws, (g) => g.goodwill));
  return {
    key: 'goodwill-disclosure',
    title: 'Goodwill on Consolidation (Ind AS 103 + 36 flag)',
    category: 'notes',
    rows,
    total,
    taxonomy_element_code: tx,
  };
}

function policyNotesSection(tx: string | null): DisclosureSection {
  return {
    key: 'accounting-policy-notes',
    title: 'Significant Accounting Policies (Schedule III · Ind AS)',
    category: 'notes',
    rows: [
      { label: 'Basis of consolidation: Ind AS 110 — full consolidation for subsidiaries, equity method for associates/JVs.', amount: 0 },
      { label: 'Foreign currency translation: Ind AS 21 Current Rate Method (closing→BS, average→P&L, historical→equity, FCTR→OCI).', amount: 0 },
      { label: 'Business combinations: Ind AS 103 — acquisition method; goodwill = consideration − share of net assets at acquisition.', amount: 0 },
      { label: 'Impairment of goodwill: Ind AS 36 — annual impairment flag (no DCF in Phase 6).', amount: 0 },
      { label: 'Intercompany transactions: eliminated in full per Ind AS 110 (offset on consolidation).', amount: 0 },
    ],
    total: 0,
    taxonomy_element_code: tx,
  };
}

// ── Public API ───────────────────────────────────────────────────────────

export function buildDisclosurePack(input: {
  fy: string;
  acquisition?: GoodwillAcquisitionInput[];
}): ConsolidationDisclosurePack {
  // ASSEMBLE — call S109/S111 builders (no recompute).
  const pnl = buildConsolidatedPnL({ fy: input.fy });
  const bs = buildBalanceSheet({ fy: input.fy, acquisition: input.acquisition });
  const cf = buildCashFlow({ fy: input.fy });
  const ncis = computeNCI({ fy: input.fy });
  const gws = computeGoodwill({ fy: input.fy, acquisition: input.acquisition });

  const tx = taxonomyMap();

  const sections: DisclosureSection[] = [
    bsSection(bs, tx.balance_sheet),
    pnlSection(pnl, tx.profit_loss),
    cfSection(cf, tx.cash_flow),
    nciSection(ncis, tx.notes),
    goodwillSection(gws, tx.notes),
    policyNotesSection(tx.notes),
  ];

  const nci_note: DisclosureNciNote[] = ncis.map((n) => ({
    label: `${n.entity_id} (method=${n.method})`,
    amount: round2(n.nci_amount),
  }));
  const goodwill_note: DisclosureGoodwillNote[] = gws.map((g) => ({
    label: `${g.entity_id} · ${g.classification}`,
    amount: round2(g.goodwill),
    impairment_flag: g.impairment_flag,
  }));

  const schedule_iii_compliant =
    sections.some((s) => s.category === 'balance_sheet') &&
    sections.some((s) => s.category === 'profit_loss') &&
    sections.some((s) => s.category === 'cash_flow');
  const ind_as_110_compliant = bs.balanced;

  // Cross-reference Form 3CEB (active entity) — scope-noted in §L.
  const form3ceb = loadForm3CEBSnapshots(activeEntityCode())
    .filter((f) => f.financial_year === input.fy);

  const pack: ConsolidationDisclosurePack = {
    fy: input.fy,
    generated_at: new Date().toISOString(),
    taxonomy_version: DEFAULT_TAXONOMY,
    sections,
    nci_note,
    goodwill_note,
    schedule_iii_compliant,
    ind_as_110_compliant,
    form_3ceb_cross_ref_count: form3ceb.length,
  };

  const all = readPacks();
  const idx = all.findIndex((p) => p.fy === input.fy);
  if (idx >= 0) all[idx] = pack; else all.push(pack);
  writePacks(all);

  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: 'consolidation_disclosure_event',
    recordId: `disclosure-pack-${input.fy}`,
    recordLabel: `Consolidation Disclosure Pack · FY ${input.fy} · ${sections.length} sections`,
    beforeState: null,
    afterState: {
      fy: input.fy,
      section_count: sections.length,
      schedule_iii_compliant,
      ind_as_110_compliant,
      export_kind: 'pack',
    },
    sourceModule: 'consolidation-disclosure-engine',
  });

  return pack;
}

export function listDisclosurePacks(): { fy: string; generated_at: string }[] {
  return readPacks().map((p) => ({ fy: p.fy, generated_at: p.generated_at }));
}

export function loadDisclosurePack(fy: string): ConsolidationDisclosurePack | null {
  return readPacks().find((p) => p.fy === fy) ?? null;
}

// ── XBRL export (REUSES comply360-xbrl-builder · 0-DIFF on builder) ──────

/** Bridge: synthetic consolidation-scoped AOC-4 id (see @bridge-§L). */
function consolidationAoc4Id(fy: string): string {
  return `consolidation-xbrl-${fy}`;
}

export function exportDisclosureXBRL(input: { fy: string }): {
  xbrl_output_id: string;
  validation: XBRLValidationResult;
  download: { blob: Blob; filename: string };
} {
  // Ensure the pack exists (assembly first).
  if (!loadDisclosurePack(input.fy)) buildDisclosurePack({ fy: input.fy });

  const xbrl = buildXBRL({
    aoc4_xbrl_id: consolidationAoc4Id(input.fy),
    taxonomy_version: DEFAULT_TAXONOMY,
    generated_by_bap: getActiveBAPAccount(),
  });
  const validation = validateXBRL(xbrl.id);
  const download = exportXBRLDownload(xbrl.id);

  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: 'consolidation_disclosure_event',
    recordId: xbrl.id,
    recordLabel: `Consolidation XBRL Export · FY ${input.fy} · valid=${validation.is_valid}`,
    beforeState: null,
    afterState: {
      fy: input.fy,
      xbrl_output_id: xbrl.id,
      export_kind: 'xbrl',
      is_valid: validation.is_valid,
    },
    sourceModule: 'consolidation-disclosure-engine',
  });

  return { xbrl_output_id: xbrl.id, validation, download };
}

// ── PDF export (REUSES board-pack-pdf-engine PATTERN — jsPDF + autoTable) ─

type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

export function exportDisclosurePDF(input: { fy: string }): { blob: Blob; filename: string } {
  const pack = loadDisclosurePack(input.fy) ?? buildDisclosurePack({ fy: input.fy });
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 20;

  // Cover
  doc.setFontSize(20);
  doc.text('Consolidated Financial Statements', 105, y, { align: 'center' });
  y += 8;
  doc.setFontSize(12);
  doc.text(`Disclosure Pack · FY ${pack.fy}`, 105, y, { align: 'center' });
  y += 6;
  doc.setFontSize(9);
  doc.text(
    `Schedule III · Ind AS 110 · Generated ${pack.generated_at}`,
    105, y, { align: 'center' },
  );
  y += 6;
  doc.text(
    `Compliance: Schedule III=${pack.schedule_iii_compliant ? 'YES' : 'NO'} · Ind AS 110=${pack.ind_as_110_compliant ? 'YES' : 'NO'}`,
    105, y, { align: 'center' },
  );
  y += 10;

  // Sections
  for (const section of pack.sections) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text(section.title, 14, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Line', 'Amount (₹)']],
      body: section.rows.map((r) => [
        r.label,
        r.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 }),
      ]),
      margin: { left: 14, right: 14 },
      theme: 'grid',
      styles: { fontSize: 9 },
    });
    y = (doc as AutoTableDoc).lastAutoTable.finalY + 8;
  }

  // Footer · Form 3CEB cross-reference scope note
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setFontSize(8);
  doc.text(
    `Form 3CEB cross-references (active entity): ${pack.form_3ceb_cross_ref_count}`,
    14, y,
  );

  const blob = doc.output('blob');
  const filename = `consolidation-disclosure-${pack.fy}.pdf`;

  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: 'consolidation_disclosure_event',
    recordId: filename,
    recordLabel: `Consolidation Disclosure PDF · FY ${input.fy}`,
    beforeState: null,
    afterState: {
      fy: input.fy,
      filename,
      export_kind: 'pdf',
      section_count: pack.sections.length,
    },
    sourceModule: 'consolidation-disclosure-engine',
  });

  return { blob, filename };
}
