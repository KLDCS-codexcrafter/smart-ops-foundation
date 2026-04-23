/**
 * Fixture Coverage Manifest
 *
 * Single source of truth for fixture availability across the ERP.
 * Read by FixtureCoverageHeatmap component. Grows sprint-by-sprint per D-081.
 *
 * Coverage levels:
 *   'ready'   — happy-path + edge-case fixtures exist, passes in all scenarios
 *   'partial' — some fixtures exist but not all 7 client scenarios covered
 *   'missing' — no fixtures yet (sprint hasn't added them)
 *
 * Scenarios (per Sheet 0.3 + 0.4):
 *   abdos · cherise · bcpl · smartpower · amith · shankar-pharma · sinha
 */

export type CoverageLevel = 'ready' | 'partial' | 'missing';
export type ScenarioId = 'abdos' | 'cherise' | 'bcpl' | 'smartpower' | 'amith' | 'shankar-pharma' | 'sinha';

export interface FixtureEntity {
  id: string;
  name: string;
  category: 'voucher' | 'master' | 'report';
  level: CoverageLevel;
  scenariosCovered: ScenarioId[];
  lastUpdatedSprint: string;
  notes?: string;
}

export const FIXTURE_MANIFEST: FixtureEntity[] = [
  // --- VOUCHERS (14 base types) ---
  { id: 'v-receipt',           name: 'Receipt',               category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.1',  notes: 'Print engine + panel shipped; scenario fixtures pending H1.5-SEED Phase 3' },
  { id: 'v-payment',           name: 'Payment',               category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.1' },
  { id: 'v-contra',            name: 'Contra Entry',          category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.1' },
  { id: 'v-journal',           name: 'Journal Entry',         category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.1' },
  { id: 'v-sales-invoice',     name: 'Sales Invoice',         category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'Earlier',       notes: 'Print infrastructure predates 2b series' },
  { id: 'v-purchase-invoice',  name: 'Purchase Invoice',      category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.2' },
  { id: 'v-credit-note',       name: 'Credit Note',           category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.2' },
  { id: 'v-debit-note',        name: 'Debit Note',            category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.2' },
  { id: 'v-delivery-note',     name: 'Delivery Note',         category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },
  { id: 'v-receipt-note',      name: 'Receipt Note (GRN)',    category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },
  { id: 'v-stock-adjustment',  name: 'Stock Adjustment',      category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },
  { id: 'v-stock-journal',     name: 'Stock Journal',         category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },
  { id: 'v-stock-transfer',    name: 'Stock Transfer',        category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },
  { id: 'v-mfg-journal',       name: 'Manufacturing Journal', category: 'voucher', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2b.3a' },

  // --- MASTERS (12 key types) ---
  { id: 'm-ledger',          name: 'Ledger',           category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.1c' },
  { id: 'm-item',            name: 'Item',             category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.1c' },
  { id: 'm-party',           name: 'Party',            category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.1c' },
  { id: 'm-godown',          name: 'Godown',           category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.1c' },
  { id: 'm-department',      name: 'Department',       category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.1c' },
  { id: 'm-employee',        name: 'Employee',         category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'Earlier' },
  { id: 'm-bom',             name: 'BOM',              category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'T10-pre.2a-S1a' },
  { id: 'm-number-series',   name: 'Number Series',    category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'Earlier' },
  { id: 'm-approval-matrix', name: 'Approval Matrix',  category: 'master', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'Earlier' },
  { id: 'm-entity',          name: 'Entity',           category: 'master', level: 'ready',   scenariosCovered: [],  lastUpdatedSprint: 'Earlier' },
  { id: 'm-bu',              name: 'Business Unit',    category: 'master', level: 'partial', scenariosCovered: [],  lastUpdatedSprint: 'Earlier' },
  { id: 'm-division',        name: 'Division',         category: 'master', level: 'missing', scenariosCovered: [],  lastUpdatedSprint: '—' },

  // --- REPORTS (14 key reports) ---
  { id: 'r-trial-balance',       name: 'Trial Balance',            category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-profit-loss',         name: 'Profit & Loss',            category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-balance-sheet',       name: 'Balance Sheet',            category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-day-book',            name: 'Day Book',                 category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-ledger-scrutiny',     name: 'Ledger Scrutiny',          category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-outstanding',         name: 'Outstanding Statement',    category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-stock-ledger',        name: 'Stock Ledger',             category: 'report', level: 'partial', scenariosCovered: [], lastUpdatedSprint: 'Earlier' },
  { id: 'r-ageing-receivables',  name: 'Receivables Ageing',       category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
  { id: 'r-ageing-payables',     name: 'Payables Ageing',          category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
  { id: 'r-gstr1',               name: 'GSTR-1',                   category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
  { id: 'r-gstr3b',              name: 'GSTR-3B',                  category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
  { id: 'r-gstr2b-match',        name: 'GSTR-2B Match',            category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
  { id: 'r-voucher-register',    name: 'Voucher Register (13 types)', category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: 'Planned T10-pre.2d' },
  { id: 'r-bank-recon',          name: 'Bank Reconciliation',      category: 'report', level: 'missing', scenariosCovered: [], lastUpdatedSprint: '—' },
];

export function getCoverageStats() {
  const total = FIXTURE_MANIFEST.length;
  const ready = FIXTURE_MANIFEST.filter(e => e.level === 'ready').length;
  const partial = FIXTURE_MANIFEST.filter(e => e.level === 'partial').length;
  const missing = FIXTURE_MANIFEST.filter(e => e.level === 'missing').length;
  return {
    total,
    ready,
    partial,
    missing,
    readyPct: Math.round((ready / total) * 100),
    partialPct: Math.round((partial / total) * 100),
    missingPct: Math.round((missing / total) * 100),
  };
}

export function getByCategory(category: FixtureEntity['category']) {
  return FIXTURE_MANIFEST.filter(e => e.category === category);
}
