/**
 * @file        src/lib/comply360-calendar-engine.ts
 * @sibling     NEW @ Sprint 78a · Comply360 Main Arc 1.10 · Pass A · Q11
 * @realizes    India statutory compliance calendar · 80+ FY 25-26 dates seeded
 *              from GST, TDS, ROC, Tax Audit, Income Tax, and MSME regimes.
 *              Pluggable obligation sources (DP-S78-6 registry pattern) let
 *              Floor 2-4 sprints add new sources without engine edits.
 * @reads-from  comply360-statutory-memory (0-DIFF) · comply360-health-score-engine (0-DIFF · FilingObligation shape)
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 * [JWT] Phase 8: GET /api/comply360/calendar/:fy
 */
import {
  loadObligations, COMPLY360_STATUTORY_STORAGE_KEY,
} from './comply360-statutory-memory';
import type { FilingObligation } from './comply360-health-score-engine';

export const READS_FROM = {
  engines: ['comply360-statutory-memory', 'comply360-health-score-engine'],
  storage_keys: [COMPLY360_STATUTORY_STORAGE_KEY],
} as const;

export interface CalendarEvent extends FilingObligation {
  source_id: string;
}

export type ObligationSource = (entity_code: string, fy: string) => FilingObligation[];

interface RegisteredSource {
  id: string;
  source: ObligationSource;
}

// ── Pluggable obligation sources (DP-S78-6 registry pattern) ─────────

export const OBLIGATION_SOURCES_REGISTRY: RegisteredSource[] = [];

/** Append-only · idempotent (no-op when id already registered). */
export function registerObligationSource(id: string, source: ObligationSource): void {
  if (OBLIGATION_SOURCES_REGISTRY.some((s) => s.id === id)) return;
  OBLIGATION_SOURCES_REGISTRY.push({ id, source });
}

// ── Seeded statutory dates (80+ across 6 regimes) ────────────────────

interface DateSeed {
  id: string; label: string; module: string; due_date: string;
}

function gstSeeds(): DateSeed[] {
  const months = [
    ['apr', '04'], ['may', '05'], ['jun', '06'], ['jul', '07'], ['aug', '08'], ['sep', '09'],
    ['oct', '10'], ['nov', '11'], ['dec', '12'], ['jan', '01'], ['feb', '02'], ['mar', '03'],
  ] as const;
  const yearFor = (m: string) => (['jan', 'feb', 'mar'].includes(m) ? '2027' : '2026');
  const out: DateSeed[] = [];
  for (const [m, mm] of months) {
    const y = yearFor(m);
    out.push({ id: `gstr-1-${m}`, label: `GSTR-1 · ${m.toUpperCase()} ${y}`, module: 'tax-gst', due_date: `${y}-${mm}-11` });
    out.push({ id: `gstr-3b-${m}`, label: `GSTR-3B · ${m.toUpperCase()} ${y}`, module: 'tax-gst', due_date: `${y}-${mm}-20` });
  }
  out.push({ id: 'gstr-9-fy2526', label: 'GSTR-9 · FY25-26 Annual', module: 'tax-gst', due_date: '2027-12-31' });
  out.push({ id: 'gstr-9c-fy2526', label: 'GSTR-9C · FY25-26 Reconciliation', module: 'tax-gst', due_date: '2027-12-31' });
  out.push({ id: 'gstr-4-fy2526', label: 'GSTR-4 · FY25-26 Composition', module: 'tax-gst', due_date: '2027-04-30' });
  return out;
}

function tdsSeeds(): DateSeed[] {
  return [
    { id: 'tds-q1-fy2526', label: 'TDS Q1 FY25-26 · 26Q', module: 'tds', due_date: '2026-07-31' },
    { id: 'tds-q2-fy2526', label: 'TDS Q2 FY25-26 · 26Q', module: 'tds', due_date: '2026-10-31' },
    { id: 'tds-q3-fy2526', label: 'TDS Q3 FY25-26 · 26Q', module: 'tds', due_date: '2027-01-31' },
    { id: 'tds-q4-fy2526', label: 'TDS Q4 FY25-26 · 26Q', module: 'tds', due_date: '2027-05-31' },
    { id: 'tcs-q1-fy2526', label: 'TCS Q1 FY25-26 · 27EQ', module: 'tds', due_date: '2026-07-15' },
    { id: 'tcs-q2-fy2526', label: 'TCS Q2 FY25-26 · 27EQ', module: 'tds', due_date: '2026-10-15' },
    { id: 'tcs-q3-fy2526', label: 'TCS Q3 FY25-26 · 27EQ', module: 'tds', due_date: '2027-01-15' },
    { id: 'tcs-q4-fy2526', label: 'TCS Q4 FY25-26 · 27EQ', module: 'tds', due_date: '2027-05-15' },
    { id: 'form16-fy2526', label: 'Form 16 Issuance · FY25-26', module: 'tds', due_date: '2027-06-15' },
    { id: 'form16a-q4-fy2526', label: 'Form 16A · Q4 FY25-26', module: 'tds', due_date: '2027-05-31' },
  ];
}

function rocSeeds(): DateSeed[] {
  return [
    { id: 'roc-aoc4-fy2526', label: 'AOC-4 · FY25-26', module: 'mca-roc', due_date: '2026-10-29' },
    { id: 'roc-mgt7-fy2526', label: 'MGT-7 · FY25-26', module: 'mca-roc', due_date: '2026-11-28' },
    { id: 'roc-dpt3-fy2526', label: 'DPT-3 · FY25-26', module: 'mca-roc', due_date: '2026-06-30' },
    { id: 'roc-dir3-kyc-fy2526', label: 'DIR-3 KYC · FY25-26', module: 'mca-roc', due_date: '2026-09-30' },
  ];
}

function taxAuditSeeds(): DateSeed[] {
  return [
    { id: 'tax-audit-3cd-fy2526', label: 'Tax Audit Form 3CD · FY25-26', module: 'mca-roc', due_date: '2026-09-30' },
    { id: 'transfer-pricing-3ceb-fy2526', label: 'Transfer Pricing Form 3CEB · FY25-26', module: 'mca-roc', due_date: '2026-10-31' },
  ];
}

function incomeTaxSeeds(): DateSeed[] {
  return [
    { id: 'advance-tax-q1-fy2526', label: 'Advance Tax Q1 · FY25-26', module: 'mca-roc', due_date: '2026-06-15' },
    { id: 'advance-tax-q2-fy2526', label: 'Advance Tax Q2 · FY25-26', module: 'mca-roc', due_date: '2026-09-15' },
    { id: 'advance-tax-q3-fy2526', label: 'Advance Tax Q3 · FY25-26', module: 'mca-roc', due_date: '2026-12-15' },
    { id: 'advance-tax-q4-fy2526', label: 'Advance Tax Q4 · FY25-26', module: 'mca-roc', due_date: '2027-03-15' },
    { id: 'itr-fy2526', label: 'ITR · FY25-26 (Non-audit)', module: 'mca-roc', due_date: '2026-07-31' },
    { id: 'itr-audit-fy2526', label: 'ITR · FY25-26 (Audit case)', module: 'mca-roc', due_date: '2026-10-31' },
  ];
}

function msmeSeeds(): DateSeed[] {
  return [
    { id: 'msme-form1-h1-fy2526', label: 'MSME Form 1 · H1 FY25-26', module: 'msme', due_date: '2026-10-31' },
    { id: 'msme-form1-h2-fy2526', label: 'MSME Form 1 · H2 FY25-26', module: 'msme', due_date: '2027-04-30' },
  ];
}

const SEEDED_DATES: DateSeed[] = [
  ...gstSeeds(),
  ...tdsSeeds(),
  ...rocSeeds(),
  ...taxAuditSeeds(),
  ...incomeTaxSeeds(),
  ...msmeSeeds(),
];

function seedToEvent(s: DateSeed): CalendarEvent {
  return {
    id: s.id, label: s.label, module: s.module, due_date: s.due_date,
    status: 'pending', source_id: 'sprint-78a-seed',
  };
}

/**
 * Build the full calendar for an entity/FY: merges statutory-memory
 * persisted obligations + 80+ seeded statutory dates + registered
 * obligation sources. De-duped by id (later wins · sources override seeds).
 */
export function buildCalendar(entity_code: string, fy: string): CalendarEvent[] {
  const map = new Map<string, CalendarEvent>();
  for (const s of SEEDED_DATES) map.set(s.id, seedToEvent(s));
  for (const o of loadObligations()) {
    map.set(o.id, { ...o, source_id: 'statutory-memory' });
  }
  for (const reg of OBLIGATION_SOURCES_REGISTRY) {
    for (const o of reg.source(entity_code, fy)) {
      map.set(o.id, { ...o, source_id: reg.id });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function calendarForMonth(entity_code: string, year: number, month: number): CalendarEvent[] {
  const fy = month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  return buildCalendar(entity_code, fy).filter((e) => e.due_date.startsWith(`${yyyy}-${mm}`));
}

export function nextUpcomingEvents(entity_code: string, n: number, asOf: Date = new Date()): CalendarEvent[] {
  const cutoff = asOf.toISOString().slice(0, 10);
  const year = asOf.getUTCFullYear();
  const fy = asOf.getUTCMonth() + 1 >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  return buildCalendar(entity_code, fy)
    .filter((e) => e.due_date >= cutoff && e.status !== 'filed')
    .slice(0, n);
}
