/**
 * @file        qa-coa-print-engine.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block E · D-341 (Q4=a)
 * @purpose     Certificate of Analysis (CoA) print payload builder + persistence helper.
 *              Pure data + persistence — UI-agnostic. Mirrors voucher-print-shared loaders.
 *              CoA is generated on-demand and cached on the QaInspectionRecord
 *              (coa_url + coa_generated_at additive nullable fields per Block A).
 * @reuses      voucher-print-shared.loadEntityGst + buildSupplierBlock
 *              · qa-inspection-engine + qa-spec-engine read APIs
 * @[JWT]       POST /api/qa/coa/:qaId
 */
import type { QaInspectionRecord } from '@/types/qa-inspection';
import type { QaSpec } from '@/types/qa-spec';
import { getQaInspection, listQaInspections } from '@/lib/qa-inspection-engine';
import { getQaSpec } from '@/lib/qa-spec-engine';
import { qaInspectionKey } from '@/types/qa-inspection';
import {
  buildSupplierBlock, loadEntityGst, formatDDMMMYYYY,
  type PrintSupplierBlock,
} from '@/lib/voucher-print-shared';

export interface CoAParameterRow {
  parameter_name: string;
  parameter_type: string;
  spec_value: string;
  observed_value: string;
  result: 'pass' | 'fail' | 'na';
}

export interface CoAPayload {
  qa_id: string;
  qa_no: string;
  inspection_date: string;
  item_id: string;
  item_name: string;
  batch_id: string | null;
  uom: string | null;
  qty_inspected: number;
  qty_passed: number;
  qty_failed: number;
  vendor_id: string | null;
  vendor_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  inspector_user_id: string;
  authority: string;
  external_lab_party_id: string | null;
  external_lab_report_url: string | null;
  parameters: CoAParameterRow[];
  spec_code: string | null;
  spec_name: string | null;
  supplier: PrintSupplierBlock;
  generated_at: string;
}

function judgeResult(
  paramType: string,
  specVal: string,
  observed: string | undefined,
): 'pass' | 'fail' | 'na' {
  if (observed === undefined || observed === '') return 'na';
  if (paramType === 'numeric') {
    const o = Number(observed);
    if (Number.isNaN(o)) return 'na';
    // spec format: "min-max" or "<=X" or ">=X" or "=X"
    const range = specVal.split('-').map(s => Number(s.trim()));
    if (range.length === 2 && !range.some(Number.isNaN)) {
      return o >= range[0] && o <= range[1] ? 'pass' : 'fail';
    }
    return 'na';
  }
  if (paramType === 'boolean') {
    return observed.toLowerCase() === specVal.toLowerCase() ? 'pass' : 'fail';
  }
  // text / master_lookup — exact match
  return observed === specVal ? 'pass' : 'fail';
}

function specValueOf(p: import('@/types/qa-spec').QaSpecParameter): string {
  if (p.parameter_type === 'numeric') {
    if (p.min_value !== null && p.max_value !== null) return `${p.min_value}-${p.max_value}`;
    if (p.min_value !== null) return `>=${p.min_value}`;
    if (p.max_value !== null) return `<=${p.max_value}`;
    return '';
  }
  return p.expected_text ?? '';
}

function buildParamRows(spec: QaSpec | null, observed: Record<string, string>): CoAParameterRow[] {
  if (!spec) return [];
  return spec.parameters.map(p => {
    const specVal = specValueOf(p);
    const obs = observed[p.id] ?? observed[p.name];
    return {
      parameter_name: p.name,
      parameter_type: p.parameter_type,
      spec_value: specVal,
      observed_value: obs ?? '',
      result: judgeResult(p.parameter_type, specVal, obs),
    };
  });
}

/** Build a CoA payload for an inspection. Returns null if the inspection is missing. */
export function buildCoAPayload(qaId: string, entityCode: string): CoAPayload | null {
  const ins = getQaInspection(qaId, entityCode);
  if (!ins) return null;

  const spec = ins.spec_id ? getQaSpec(ins.spec_id, entityCode) : null;
  const line = ins.lines?.[0];
  const observed = ins.parameter_results ?? {};
  const supplier = buildSupplierBlock(loadEntityGst(entityCode));

  return {
    qa_id: ins.id,
    qa_no: ins.qa_no,
    inspection_date: formatDDMMMYYYY(ins.inspection_date),
    item_id: line?.item_id ?? '',
    item_name: line?.item_name ?? '',
    batch_id: line?.batch_id ?? null,
    uom: line?.uom ?? null,
    qty_inspected: line?.qty_inspected ?? 0,
    qty_passed: line?.qty_passed ?? 0,
    qty_failed: line?.qty_failed ?? 0,
    vendor_id: ins.vendor_id ?? null,
    vendor_name: ins.vendor_name ?? null,
    customer_id: ins.customer_id ?? null,
    customer_name: ins.customer_name ?? null,
    inspector_user_id: ins.inspector_user_id,
    authority: ins.inspection_authority ?? 'internal',
    external_lab_party_id: ins.external_lab_party_id ?? null,
    external_lab_report_url: ins.external_lab_report_url ?? null,
    parameters: buildParamRows(spec, observed),
    spec_code: spec?.code ?? null,
    spec_name: spec?.name ?? null,
    supplier,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Persist the on-demand CoA reference back onto the inspection record
 * (additive coa_url + coa_generated_at fields · D-341).
 */
export function generateAndCacheCoA(
  qaId: string,
  entityCode: string,
): { ok: boolean; payload: CoAPayload | null; coa_url: string | null } {
  const payload = buildCoAPayload(qaId, entityCode);
  if (!payload) return { ok: false, payload: null, coa_url: null };

  // [JWT] POST /api/qa/coa/:qaId  → server returns coa_url
  const coa_url = `coa://${entityCode}/${qaId}`;
  try {
    const raw = localStorage.getItem(qaInspectionKey(entityCode));
    const list: QaInspectionRecord[] = raw ? JSON.parse(raw) as QaInspectionRecord[] : [];
    const idx = list.findIndex(q => q.id === qaId);
    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        coa_url,
        coa_generated_at: payload.generated_at,
      };
      localStorage.setItem(qaInspectionKey(entityCode), JSON.stringify(list));
    }
  } catch { /* quota silent */ }

  return { ok: true, payload, coa_url };
}

export interface CoARegisterRow {
  qa_id: string;
  qa_no: string;
  item_name: string;
  party_name: string | null;
  generated_at: string;
  coa_url: string;
}

/** All inspections that have a cached CoA · for the CoA Register panel. */
export function listGeneratedCoA(entityCode: string): CoARegisterRow[] {
  return listQaInspections(entityCode)
    .filter(q => q.coa_url && q.coa_generated_at)
    .map(q => ({
      qa_id: q.id,
      qa_no: q.qa_no,
      item_name: q.lines?.[0]?.item_name ?? '',
      party_name: q.vendor_name ?? q.customer_name ?? null,
      generated_at: q.coa_generated_at as string,
      coa_url: q.coa_url as string,
    }))
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}
