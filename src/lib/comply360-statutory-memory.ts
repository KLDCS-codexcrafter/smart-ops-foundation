/**
 * @file        src/lib/comply360-statutory-memory.ts
 * @purpose     Statutory Memory · OOB-5 · persistent filing register + seed obligations
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Block 3 · OOB-5
 * @decisions   D-S69-1 · D-S69-3 · multi-tenant key scoping (see mem://architecture/multi-tenant-key-scoping)
 * @disciplines SD-13
 */
import { z } from 'zod';
import { readStorageOr } from './typed-storage';
import type { FilingObligation } from './comply360-health-score-engine';

const STORAGE_KEY = 'comply360.statutory-memory.v1';

const FilingObligationSchema = z.object({
  id: z.string(),
  label: z.string(),
  module: z.string(),
  due_date: z.string(),
  status: z.enum(['pending', 'filed', 'overdue', 'breach']),
  arn: z.string().optional(),
  filed_at: z.string().optional(),
});

const FilingArraySchema = z.array(FilingObligationSchema);

/** Seed obligations · realistic Indian SME compliance calendar across FY 25-26. */
const SEED_OBLIGATIONS: FilingObligation[] = [
  { id: 'gstr-1-apr', label: 'GSTR-1 · Apr 2026',     module: 'tax-gst',  due_date: '2026-05-11', status: 'pending' },
  { id: 'gstr-3b-apr', label: 'GSTR-3B · Apr 2026',   module: 'tax-gst',  due_date: '2026-05-20', status: 'pending' },
  { id: 'tds-q4',     label: 'TDS Q4 FY25-26 · 26Q',  module: 'tax-gst',  due_date: '2026-05-31', status: 'pending' },
  { id: 'epf-apr',    label: 'EPF · ECR Apr 2026',    module: 'payroll',  due_date: '2026-05-15', status: 'pending' },
  { id: 'esi-apr',    label: 'ESI · Apr 2026',        module: 'payroll',  due_date: '2026-05-15', status: 'pending' },
  { id: 'pt-apr',     label: 'PT · Apr 2026',         module: 'payroll',  due_date: '2026-05-21', status: 'pending' },
  { id: 'mca-aoc4',   label: 'AOC-4 · FY24-25',       module: 'roc',      due_date: '2026-05-30', status: 'pending' },
  { id: 'mca-mgt7',   label: 'MGT-7 · FY24-25',       module: 'roc',      due_date: '2026-05-29', status: 'overdue' },
  { id: 'gst-9-fy25', label: 'GSTR-9 · FY24-25',      module: 'tax-gst',  due_date: '2026-05-25', status: 'pending' },
  // 🆕 Sprint 70b Pass B · 3 NEW obligations · GSTR-1A · GSTR-2B · IMS pre-filing
  { id: 'gstr-1a-apr', label: 'GSTR-1A · Apr 2026 Amendment', module: 'tax-gst', due_date: '2026-06-11', status: 'pending' },
  { id: 'gstr-2b-apr', label: 'GSTR-2B · Apr 2026 Reco',      module: 'tax-gst', due_date: '2026-05-14', status: 'pending' },
  { id: 'ims-apr',     label: 'IMS · Apr 2026 Pre-filing',    module: 'tax-gst', due_date: '2026-05-10', status: 'pending' },
  // 🆕 Sprint 71 · 2 NEW obligations · GSTR-3B reco + cross-return reconciliation review
  { id: 'gstr-3b-apr-reco', label: 'GSTR-3B · Apr 2026 Reconciliation', module: 'tax-gst', due_date: '2026-05-18', status: 'pending' },
  { id: 'ecrs-apr', label: 'ECRS Review · Apr 2026', module: 'tax-gst', due_date: '2026-05-17', status: 'pending' },
  { id: 'cross-return-apr', label: 'Cross-Return Reconciliation · Apr 2026', module: 'tax-gst', due_date: '2026-05-19', status: 'pending' },
  // 🆕 Sprint 72 · 3 NEW obligations · TDS suite (194Q + SFT + Form 26AS reco) · module `'tds'`
  { id: 'tds-194q-q4', label: 'TDS 194Q · Q4 FY25-26', module: 'tds', due_date: '2026-05-31', status: 'pending' },
  { id: 'sft-fy25', label: 'SFT · Form 61A FY24-25', module: 'tds', due_date: '2026-05-31', status: 'pending' },
  { id: 'form26as-reco-fy25', label: 'Form 26AS Reconciliation · FY24-25', module: 'tds', due_date: '2026-06-15', status: 'pending' },
  // 🆕 Sprint 73b Pass B · 3 NEW obligations · MSME Form 1 + E-Way pending + Section 393 disclosure
  { id: 'msme-form1-h1-fy25', label: 'MSME Form 1 · H1 FY25-26', module: 'vendor', due_date: '2026-10-31', status: 'pending' },
  { id: 'eway-pending-apr', label: 'E-Way Bill Pending Closures · Apr 2026', module: 'exim', due_date: '2026-05-31', status: 'pending' },
  { id: 'section393-disclosure-fy25', label: 'Section 393 Arrangements Disclosure · FY24-25', module: 'roc', due_date: '2026-09-30', status: 'pending' },
  // 🆕 Sprint 74a Pass A · 3 NEW obligations · GSTR-9 · GSTR-9C · Tax Audit 3CD (Q19 Annual Returns + Tax Audit)
  { id: 'gstr-9-fy2425',  label: 'GSTR-9 · FY24-25 Annual Return',         module: 'tax-gst',        due_date: '2026-12-31', status: 'pending' },
  { id: 'gstr-9c-fy2425', label: 'GSTR-9C · FY24-25 Reconciliation',       module: 'tax-gst',        due_date: '2026-12-31', status: 'pending' },
  { id: 'tax-audit-3cd-fy2425', label: 'Tax Audit 3CA/3CB/3CD · FY24-25',  module: 'external-audit', due_date: '2026-09-30', status: 'pending' },
  { id: 'fact-lic',   label: 'Factory Licence Renewal', module: 'licenses', due_date: '2026-06-30', status: 'pending' },
  { id: 'pollu-cert', label: 'Pollution Consent (CTO)', module: 'licenses', due_date: '2026-07-15', status: 'pending' },
  { id: 'brsr-q4',    label: 'BRSR Q4 · ESG Report',  module: 'esg',      due_date: '2026-06-15', status: 'pending' },
  { id: 'gstr-3b-mar', label: 'GSTR-3B · Mar 2026',   module: 'tax-gst',  due_date: '2026-04-20', status: 'filed', arn: 'AA0326123456789', filed_at: '2026-04-18' },
  { id: 'gstr-1-mar', label: 'GSTR-1 · Mar 2026',     module: 'tax-gst',  due_date: '2026-04-11', status: 'filed', arn: 'AA0326987654321', filed_at: '2026-04-10' },
  { id: 'epf-mar',    label: 'EPF · ECR Mar 2026',    module: 'payroll',  due_date: '2026-04-15', status: 'filed', filed_at: '2026-04-14' },
];

/** Read persisted statutory memory · falls back to seed obligations on first run. */
// [JWT] localStorage — replace with REST GET /api/comply360/statutory-memory in Phase 2
export function loadObligations(): FilingObligation[] {
  return readStorageOr(STORAGE_KEY, FilingArraySchema, SEED_OBLIGATIONS);
}

/** Persist a filing acknowledgement (mark as filed with ARN). */
// [JWT] localStorage.setItem — replace with REST POST /api/comply360/statutory-memory in Phase 2
export function recordFiling(id: string, arn: string): FilingObligation[] {
  const list = loadObligations();
  const next = list.map((o) =>
    o.id === id
      ? { ...o, status: 'filed' as const, arn, filed_at: new Date().toISOString().slice(0, 10) }
      : o,
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota — diagnostics handled by useStorageQuota */
  }
  return next;
}

export const COMPLY360_STATUTORY_STORAGE_KEY = STORAGE_KEY;
