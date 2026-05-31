/**
 * @file        src/lib/comply360-xbrl-builder-engine.ts
 * @sibling     NEW @ Sprint 84 · Comply360 Floor 3 ROC-Suite Arc 3.2 · DP-S84-2
 * @realizes    iXBRL builder · matures S83 AOC-4 XBRL JSON-bundle to actual iXBRL XML
 *              per Schedule III taxonomy (Indian GAAP or IndAS).
 *              USE-SITE READS S83 aoc4-engine (v1.26 canon · S83 engine 0-DIFF).
 *              Phase 5 LIMIT: client-side iXBRL output · Phase 8 backend MCA portal.
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine ·
 *              comply360-aoc4-engine (USE-SITE) ·
 *              comply360-rule-11g-report-engine · comply360-tax-audit-3cd-engine
 * @sprint      Sprint 84 · T-Phase-5.C.3.2
 * [JWT] Phase 8: POST /api/comply360/xbrl/{build,validate,submit}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';
// USE-SITE READS (S83 aoc4-engine 0-DIFF)
import { getAOC4Filing, listXBRLMappings } from './comply360-aoc4-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-aoc4-engine',
    'comply360-rule-11g-report-engine',
    'comply360-tax-audit-3cd-engine',
  ],
  storage_keys: ['erp_xbrl_outputs', 'erp_xbrl_validation_results'],
} as const;

export type SchedIIITaxonomyVersion = 'C_Indian_GAAP_2024' | 'C_IndAS_2024';

export interface XBRLOutput {
  id: string;
  aoc4_xbrl_id: string;
  taxonomy_version: SchedIIITaxonomyVersion;
  ixbrl_xml: string;
  generated_at: string;
  generated_by_bap: BAPAccountId;
  size_bytes: number;
  total_elements_resolved: number;
}

export interface XBRLValidationResult {
  id: string;
  xbrl_output_id: string;
  validated_at: string;
  is_valid: boolean;
  errors: Array<{ element: string; rule: string; message: string }>;
  warnings: Array<{ element: string; rule: string; message: string }>;
}

const OUT_KEY = 'erp_xbrl_outputs';
const VAL_KEY = 'erp_xbrl_validation_results';
function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

const SCHED_III_ELEMENTS: Record<SchedIIITaxonomyVersion, Array<{ element_code: string; label: string; category: 'balance_sheet' | 'profit_loss' | 'cash_flow' | 'notes' }>> = {
  C_Indian_GAAP_2024: [
    { element_code: 'in-gaap:Equity', label: 'Equity', category: 'balance_sheet' },
    { element_code: 'in-gaap:NonCurrentLiabilities', label: 'Non-Current Liabilities', category: 'balance_sheet' },
    { element_code: 'in-gaap:CurrentLiabilities', label: 'Current Liabilities', category: 'balance_sheet' },
    { element_code: 'in-gaap:NonCurrentAssets', label: 'Non-Current Assets', category: 'balance_sheet' },
    { element_code: 'in-gaap:CurrentAssets', label: 'Current Assets', category: 'balance_sheet' },
    { element_code: 'in-gaap:RevenueFromOperations', label: 'Revenue from Operations', category: 'profit_loss' },
    { element_code: 'in-gaap:ProfitBeforeTax', label: 'Profit Before Tax', category: 'profit_loss' },
    { element_code: 'in-gaap:NetCashFromOperating', label: 'Net Cash from Operating', category: 'cash_flow' },
    { element_code: 'in-gaap:NotesToAccounts', label: 'Notes to Accounts', category: 'notes' },
  ],
  C_IndAS_2024: [
    { element_code: 'ind-as:Equity', label: 'Equity', category: 'balance_sheet' },
    { element_code: 'ind-as:NonCurrentLiabilities', label: 'Non-Current Liabilities', category: 'balance_sheet' },
    { element_code: 'ind-as:CurrentLiabilities', label: 'Current Liabilities', category: 'balance_sheet' },
    { element_code: 'ind-as:NonCurrentAssets', label: 'Non-Current Assets', category: 'balance_sheet' },
    { element_code: 'ind-as:CurrentAssets', label: 'Current Assets', category: 'balance_sheet' },
    { element_code: 'ind-as:Revenue', label: 'Revenue', category: 'profit_loss' },
    { element_code: 'ind-as:ProfitBeforeTax', label: 'Profit Before Tax', category: 'profit_loss' },
    { element_code: 'ind-as:NetCashOperating', label: 'Net Cash from Operating', category: 'cash_flow' },
    { element_code: 'ind-as:Notes', label: 'Notes', category: 'notes' },
  ],
};

export function getSchedIIITaxonomyElements(version: SchedIIITaxonomyVersion): Array<{ element_code: string; label: string; category: 'balance_sheet' | 'profit_loss' | 'cash_flow' | 'notes' }> {
  return SCHED_III_ELEMENTS[version];
}

export function buildXBRL(opts: { aoc4_xbrl_id: string; taxonomy_version: SchedIIITaxonomyVersion; generated_by_bap: BAPAccountId }): XBRLOutput {
  // USE-SITE READ S83 aoc4-engine
  const aoc4 = getAOC4Filing(opts.aoc4_xbrl_id);
  const mappings = listXBRLMappings(opts.aoc4_xbrl_id);
  const elements = getSchedIIITaxonomyElements(opts.taxonomy_version);
  const fy = aoc4?.fy ?? 'UNKNOWN';
  const xmlParts: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<xbrli:xbrl xmlns:xbrli="http://www.xbrl.org/2003/instance"`,
    `  xmlns:in-gaap="http://www.mca.gov.in/schema/${opts.taxonomy_version}">`,
    `  <xbrli:context id="ctx-${fy}"><xbrli:entity><xbrli:identifier scheme="http://www.mca.gov.in">${activeEntityCode()}</xbrli:identifier></xbrli:entity><xbrli:period><xbrli:startDate>${fy}-04-01</xbrli:startDate><xbrli:endDate>${fy}-03-31</xbrli:endDate></xbrli:period></xbrli:context>`,
  ];
  for (const el of elements) {
    const mapped = mappings.find((m) => m.taxonomy_element_code === el.element_code);
    const value = mapped ? String(mapped.value) : '0';
    xmlParts.push(`  <${el.element_code} contextRef="ctx-${fy}" unitRef="INR" decimals="0">${value}</${el.element_code}>`);
  }
  xmlParts.push(`</xbrli:xbrl>`);
  const xml = xmlParts.join('\n');
  const out: XBRLOutput = {
    id: uid('xbrl'),
    aoc4_xbrl_id: opts.aoc4_xbrl_id,
    taxonomy_version: opts.taxonomy_version,
    ixbrl_xml: xml,
    generated_at: new Date().toISOString(),
    generated_by_bap: opts.generated_by_bap,
    size_bytes: xml.length,
    total_elements_resolved: elements.length,
  };
  const all = readJson<XBRLOutput[]>(OUT_KEY, []);
  all.push(out); writeJson(OUT_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('xbrl_output'),
    recordId: out.id, recordLabel: `XBRL Build · ${opts.taxonomy_version} · AOC-4 ${opts.aoc4_xbrl_id}`,
    beforeState: null, afterState: out as unknown as Record<string, unknown>,
    sourceModule: 'comply360-xbrl-builder-engine',
  });
  return out;
}

export function validateXBRL(xbrl_output_id: string): XBRLValidationResult {
  const out = getXBRLOutput(xbrl_output_id);
  const errors: Array<{ element: string; rule: string; message: string }> = [];
  const warnings: Array<{ element: string; rule: string; message: string }> = [];
  if (!out) {
    errors.push({ element: '*', rule: 'EXIST', message: 'XBRL output not found' });
  } else {
    if (!out.ixbrl_xml.startsWith('<?xml')) errors.push({ element: '*', rule: 'XML_DECL', message: 'Missing XML declaration' });
    if (!out.ixbrl_xml.includes('xbrli:xbrl')) errors.push({ element: 'xbrli:xbrl', rule: 'ROOT', message: 'Missing xbrli:xbrl root' });
    const elements = getSchedIIITaxonomyElements(out.taxonomy_version);
    for (const el of elements) {
      if (!out.ixbrl_xml.includes(el.element_code)) {
        warnings.push({ element: el.element_code, rule: 'COMPLETENESS', message: `Element ${el.element_code} missing` });
      }
    }
  }
  const result: XBRLValidationResult = {
    id: uid('xval'), xbrl_output_id, validated_at: new Date().toISOString(),
    is_valid: errors.length === 0, errors, warnings,
  };
  const all = readJson<XBRLValidationResult[]>(VAL_KEY, []);
  all.push(result); writeJson(VAL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('xbrl_validation_result'),
    recordId: result.id, recordLabel: `XBRL Validation · ${xbrl_output_id} · valid=${result.is_valid}`,
    beforeState: null, afterState: result as unknown as Record<string, unknown>,
    sourceModule: 'comply360-xbrl-builder-engine',
  });
  return result;
}

export function listXBRLOutputs(opts: { aoc4_xbrl_id?: string } = {}): XBRLOutput[] {
  return readJson<XBRLOutput[]>(OUT_KEY, []).filter(
    (o) => opts.aoc4_xbrl_id ? o.aoc4_xbrl_id === opts.aoc4_xbrl_id : true,
  );
}

export function getXBRLOutput(id: string): XBRLOutput | null {
  return readJson<XBRLOutput[]>(OUT_KEY, []).find((o) => o.id === id) ?? null;
}

export function exportXBRLDownload(xbrl_output_id: string): { blob: Blob; filename: string } {
  const out = getXBRLOutput(xbrl_output_id);
  if (!out) throw new Error(`XBRL output not found: ${xbrl_output_id}`);
  const blob = new Blob([out.ixbrl_xml], { type: 'application/xml' });
  return { blob, filename: `aoc4_${out.aoc4_xbrl_id}_${out.taxonomy_version}.xml` };
}

registerAuditEntityType({ id: 'xbrl_output', module: 'mca-roc', label: 'XBRL Output' });
registerAuditEntityType({ id: 'xbrl_validation_result', module: 'mca-roc', label: 'XBRL Validation Result' });
