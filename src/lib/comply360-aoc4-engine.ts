/**
 * @file        src/lib/comply360-aoc4-engine.ts
 * @sibling     NEW @ Sprint 83 · Floor 3 ROC-Suite · DP-S83-2
 * @realizes    AOC-4 annual financial statement filing (Section 137).
 *              3 variants: standalone · consolidated · XBRL. 30-day deadline from AGM.
 *              Phase 5 JSON-bundle export · Phase 8 iXBRL builder + MCA portal.
 * @reads-from  audit-trail-engine · aggregator · rule-11g-report · audit-framework · tax-audit-3cd
 * @sprint      Sprint 83 · T-Phase-5.C.3.1
 * [JWT] Phase 8: POST /api/comply360/aoc4/{standalone,consolidated,xbrl}/{draft,file}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-rule-11g-report-engine',
    'comply360-audit-framework-engine',
    'comply360-tax-audit-3cd-engine',
  ],
  storage_keys: ['erp_aoc4_standalone', 'erp_aoc4_consolidated', 'erp_aoc4_xbrl', 'erp_aoc4_filing_attempts', 'erp_xbrl_taxonomy_mappings'],
} as const;

export type AOC4FilingType = 'standalone' | 'consolidated' | 'xbrl';
export type AOC4FilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';

export interface AOC4Filing {
  id: string;
  filing_type: AOC4FilingType;
  fy: string;
  agm_date: string;
  filing_deadline: string;
  paid_up_capital_inr: number;
  authorized_capital_inr: number;
  balance_sheet_attestation_ref: string | null;
  pl_attestation_ref: string | null;
  cash_flow_attestation_ref: string | null;
  auditor_report_attachment: string | null;
  boards_report_attachment: string | null;
  csr_annexure_2_required: boolean;
  csr_annexure_2_attachment: string | null;
  filing_fee_inr: number;
  filing_status: AOC4FilingStatus;
  prepared_at: string;
  filed_at: string | null;
  prepared_by_bap: BAPAccountId;
  rejection_reason: string | null;
}

export interface XBRLTaxonomyMapping {
  id: string;
  aoc4_xbrl_id: string;
  schedule_iii_element_code: string;
  source_account_code: string;
  mapped_value_inr: number;
  mapping_confidence: 'high' | 'medium' | 'low' | 'manual_override';
  mapped_at: string;
  mapped_by_bap: BAPAccountId;
}

export interface AOC4FilingAttempt {
  id: string;
  aoc4_filing_id: string;
  attempt_date: string;
  outcome: 'success' | 'rejected' | 'pending';
  mca_acknowledgment_no: string | null;
  rejection_codes: string[];
  recorded_at: string;
}

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ } }
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

function keyForType(t: AOC4FilingType): string {
  return t === 'standalone' ? 'erp_aoc4_standalone' : t === 'consolidated' ? 'erp_aoc4_consolidated' : 'erp_aoc4_xbrl';
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10);
}

export function computeAOC4Fee(paid_up_capital_inr: number, days_late: number): { filing_fee_inr: number; late_fee_inr: number } {
  const c = paid_up_capital_inr;
  let filing_fee_inr: number;
  if (c < 100000) filing_fee_inr = 200;
  else if (c < 500000) filing_fee_inr = 300;
  else if (c < 2500000) filing_fee_inr = 400;
  else if (c < 10000000) filing_fee_inr = 500;
  else filing_fee_inr = 600;
  const months_late = days_late > 0 ? Math.min(12, Math.ceil(days_late / 30)) : 0;
  const late_fee_inr = months_late * 12 * filing_fee_inr;
  return { filing_fee_inr, late_fee_inr };
}

export function createAOC4Filing(
  input: Omit<AOC4Filing, 'id' | 'prepared_at' | 'filed_at' | 'filing_status' | 'rejection_reason' | 'filing_deadline' | 'filing_fee_inr'>,
): AOC4Filing {
  const filing_deadline = addDays(input.agm_date, 30);
  const today = new Date().toISOString().slice(0, 10);
  const days_late = today > filing_deadline
    ? Math.floor((Date.parse(today) - Date.parse(filing_deadline)) / 86400000) : 0;
  const fee = computeAOC4Fee(input.paid_up_capital_inr, days_late);
  const filing: AOC4Filing = {
    ...input,
    id: uid('aoc4'), filing_deadline, filing_fee_inr: fee.filing_fee_inr + fee.late_fee_inr,
    filing_status: 'draft', prepared_at: new Date().toISOString(), filed_at: null, rejection_reason: null,
  };
  const key = keyForType(filing.filing_type);
  const all = readJson<AOC4Filing[]>(key, []);
  all.push(filing);
  writeJson(key, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create',
    entityType: AUD(`aoc4_${filing.filing_type}`),
    recordId: filing.id, recordLabel: `AOC-4 ${filing.filing_type} · FY ${filing.fy}`,
    beforeState: null, afterState: filing as unknown as Record<string, unknown>,
    sourceModule: 'comply360-aoc4-engine',
  });
  return filing;
}

export function updateAOC4Status(filing_id: string, status: AOC4FilingStatus, by_bap: BAPAccountId, notes?: string): AOC4Filing {
  for (const t of ['standalone', 'consolidated', 'xbrl'] as AOC4FilingType[]) {
    const key = keyForType(t);
    const all = readJson<AOC4Filing[]>(key, []);
    const idx = all.findIndex((x) => x.id === filing_id);
    if (idx >= 0) {
      const before = { ...all[idx] };
      all[idx] = {
        ...all[idx], filing_status: status,
        filed_at: status === 'filed' ? new Date().toISOString() : all[idx].filed_at,
        rejection_reason: status === 'rejected' ? (notes ?? null) : all[idx].rejection_reason,
      };
      writeJson(key, all);
      logAudit({
        entityCode: activeEntityCode(), action: 'update',
        entityType: AUD(`aoc4_${t}`), recordId: filing_id,
        recordLabel: `AOC-4 ${t} → ${status} · ${by_bap}`,
        beforeState: before as unknown as Record<string, unknown>,
        afterState: all[idx] as unknown as Record<string, unknown>,
        sourceModule: 'comply360-aoc4-engine',
      });
      return all[idx];
    }
  }
  throw new Error(`AOC-4 filing not found: ${filing_id}`);
}

export function listAOC4Filings(opts: { fy?: string; filing_type?: AOC4FilingType; filing_status?: AOC4FilingStatus } = {}): AOC4Filing[] {
  const types: AOC4FilingType[] = opts.filing_type ? [opts.filing_type] : ['standalone', 'consolidated', 'xbrl'];
  const out: AOC4Filing[] = [];
  for (const t of types) {
    const all = readJson<AOC4Filing[]>(keyForType(t), []);
    for (const f of all) {
      if (opts.fy && f.fy !== opts.fy) continue;
      if (opts.filing_status && f.filing_status !== opts.filing_status) continue;
      out.push(f);
    }
  }
  return out;
}

export function getAOC4Filing(id: string): AOC4Filing | null {
  for (const t of ['standalone', 'consolidated', 'xbrl'] as AOC4FilingType[]) {
    const f = readJson<AOC4Filing[]>(keyForType(t), []).find((x) => x.id === id);
    if (f) return f;
  }
  return null;
}

const MAP_KEY = 'erp_xbrl_taxonomy_mappings';

export function mapXBRLTaxonomyEntry(input: Omit<XBRLTaxonomyMapping, 'id' | 'mapped_at'>): XBRLTaxonomyMapping {
  const m: XBRLTaxonomyMapping = { ...input, id: uid('xbrl'), mapped_at: new Date().toISOString() };
  const all = readJson<XBRLTaxonomyMapping[]>(MAP_KEY, []);
  all.push(m);
  writeJson(MAP_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('xbrl_taxonomy_mapping'),
    recordId: m.id, recordLabel: `XBRL map · ${m.schedule_iii_element_code} ← ${m.source_account_code}`,
    beforeState: null, afterState: m as unknown as Record<string, unknown>,
    sourceModule: 'comply360-aoc4-engine',
  });
  return m;
}

export function listXBRLMappings(aoc4_xbrl_id: string): XBRLTaxonomyMapping[] {
  return readJson<XBRLTaxonomyMapping[]>(MAP_KEY, []).filter((m) => m.aoc4_xbrl_id === aoc4_xbrl_id);
}

const ATT_KEY = 'erp_aoc4_filing_attempts';

export function recordFilingAttempt(input: Omit<AOC4FilingAttempt, 'id' | 'recorded_at'>): AOC4FilingAttempt {
  const a: AOC4FilingAttempt = { ...input, id: uid('att'), recorded_at: new Date().toISOString() };
  const all = readJson<AOC4FilingAttempt[]>(ATT_KEY, []);
  all.push(a);
  writeJson(ATT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('aoc4_filing_attempt'),
    recordId: a.id, recordLabel: `AOC-4 attempt · ${a.outcome}`,
    beforeState: null, afterState: a as unknown as Record<string, unknown>,
    sourceModule: 'comply360-aoc4-engine',
  });
  return a;
}

export function listFilingAttempts(aoc4_filing_id: string): AOC4FilingAttempt[] {
  return readJson<AOC4FilingAttempt[]>(ATT_KEY, []).filter((a) => a.aoc4_filing_id === aoc4_filing_id);
}

export function exportAOC4JsonBundle(filing_id: string): { blob: Blob; filename_suggested: string } {
  const f = getAOC4Filing(filing_id);
  if (!f) throw new Error(`AOC-4 filing not found: ${filing_id}`);
  const mappings = f.filing_type === 'xbrl' ? listXBRLMappings(f.id) : [];
  const bundle = { filing: f, mappings, generated_at: new Date().toISOString(), generator: 'comply360-aoc4-engine@phase5' };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  return { blob, filename_suggested: `AOC-4_${f.filing_type}_${f.fy}_${f.id}.json` };
}

registerAuditEntityType({ id: 'aoc4_standalone', module: 'mca-roc', label: 'AOC-4 Standalone' });
registerAuditEntityType({ id: 'aoc4_consolidated', module: 'mca-roc', label: 'AOC-4 Consolidated' });
registerAuditEntityType({ id: 'aoc4_xbrl', module: 'mca-roc', label: 'AOC-4 XBRL' });
registerAuditEntityType({ id: 'xbrl_taxonomy_mapping', module: 'mca-roc', label: 'XBRL Taxonomy Mapping' });
registerAuditEntityType({ id: 'aoc4_filing_attempt', module: 'mca-roc', label: 'AOC-4 Filing Attempt' });
