/**
 * @file     qa-inspection-production-bridge.ts
 * @sprint   T-Phase-1.3-3b-pre-1 · D-616 · Card 3b QualiCheck Integration
 * @purpose  Wire existing QualiCheck module to Card 3a + Card 3-PlantOps production transactions.
 *           Q44=a · 4 source-side factories create QaInspectionRecord with explicit linkage.
 *           Q46=c · Smart merge: Template defaults → ItemQCParam overrides → QaPlan vendor/customer specific.
 *
 * Existing vendor-side createQaInspection (GRN-driven) is ZERO touch. Production-side records use
 * synthetic bill_id ('PROD-{kind}-{id}') and canonical reference fields added in Block A.
 *
 * [JWT] POST /api/qa/inspections/production
 */
import type {
  QaInspectionRecord,
  QaInspectionLine,
  QaInspectionStatus,
} from '@/types/qa-inspection';
import { qaInspectionKey } from '@/types/qa-inspection';
import type { ProductionOrder } from '@/types/production-order';
import type { ProductionConfirmation } from '@/types/production-confirmation';
import type { MaterialIssueNote } from '@/types/material-issue-note';
import type { JobCard } from '@/types/job-card';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { QaPlan } from '@/types/qa-plan';

// ─── Internal helpers ─────────────────────────────────────────────

function nextQaNoForProduction(list: QaInspectionRecord[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `QA/${ym}/${String(list.length + 1).padStart(4, '0')}`;
}

function readInspections(entityCode: string): QaInspectionRecord[] {
  try {
    // [JWT] GET /api/qa/inspections?entityCode=...
    const raw = localStorage.getItem(qaInspectionKey(entityCode));
    return raw ? (JSON.parse(raw) as QaInspectionRecord[]) : [];
  } catch { return []; }
}

function writeInspections(entityCode: string, list: QaInspectionRecord[]): void {
  // [JWT] POST /api/qa/inspections
  localStorage.setItem(qaInspectionKey(entityCode), JSON.stringify(list));
}

// ─── Q46=c · Smart merge resolver ─────────────────────────────────

export type ResolvedQCParameter = {
  key: string;
  label: string;
  type: 'numeric' | 'pass_fail' | 'visual';
  standard?: string;
  is_critical?: boolean;
  source: 'template' | 'item_qc_param' | 'qa_plan';
};

/**
 * Q46=c · Smart merge QC parameter resolution.
 * Priority (lowest → highest): Template default → QaPlan (party-specific) → ItemQCParam.
 */
export function resolveQCParameters(input: {
  itemId: string;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}): ResolvedQCParameter[] {
  const result: ResolvedQCParameter[] = [];
  const seen = new Set<string>();

  if (input.template?.qc_parameters) {
    for (const p of input.template.qc_parameters) {
      result.push({ key: p.key, label: p.label, type: p.type, source: 'template' });
      seen.add(p.key);
    }
  }

  for (const plan of input.qaPlans) {
    const k = `qa_plan_${plan.code}`;
    if (!seen.has(k)) {
      result.push({ key: k, label: plan.name, type: 'pass_fail', source: 'qa_plan' });
      seen.add(k);
    }
  }

  for (const p of input.itemQCParams) {
    const k = `item_qc_${p.id}`;
    const entry: ResolvedQCParameter = {
      key: k,
      label: p.specification,
      type: 'pass_fail',
      standard: p.standard ?? undefined,
      is_critical: p.is_critical,
      source: 'item_qc_param',
    };
    const idx = result.findIndex(r => r.key === k);
    if (idx >= 0) result[idx] = entry;
    else { result.push(entry); seen.add(k); }
  }

  return result;
}

function buildEmptyParamsRecord(params: ResolvedQCParameter[]): Record<string, string> {
  return params.reduce<Record<string, string>>((a, p) => { a[p.key] = ''; return a; }, {});
}

// ─── Factory: PRODUCTION ORDER ────────────────────────────────────

export interface CreateQaInspectionFromPOInput {
  po: ProductionOrder;
  inspector_user_id: string;
  inspection_location: string;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function createQaInspectionFromPO(input: CreateQaInspectionFromPOInput): QaInspectionRecord {
  if (!input.po.qc_required) throw new Error(`PO ${input.po.doc_no} qc_required=false`);
  if (input.po.status !== 'completed')
    throw new Error(`PO must be completed · current: ${input.po.status}`);

  const list = readInspections(input.po.entity_id);
  const now = new Date().toISOString();

  const outputs = input.po.outputs.length > 0
    ? input.po.outputs
    : [{
        item_id: input.po.output_item_id,
        item_name: input.po.output_item_name,
        uom: input.po.uom,
      }];

  const lines: QaInspectionLine[] = outputs.map((o, i) => {
    const itemParams = input.itemQCParams.filter(p => p.item_id === o.item_id);
    const itemPlans = input.qaPlans.filter(p => p.item_id === o.item_id);
    const params = resolveQCParameters({
      itemId: o.item_id,
      template: input.template,
      itemQCParams: itemParams,
      qaPlans: itemPlans,
    });
    return {
      id: `qal-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      bill_line_id: `prod-line-${o.item_id}`,
      item_id: o.item_id,
      item_name: o.item_name,
      qty_inspected: 0,
      qty_passed: 0,
      qty_failed: 0,
      failure_reason: null,
      inspection_parameters: buildEmptyParamsRecord(params),
      uom: 'uom' in o ? o.uom : input.po.uom,
      batch_id: null,
    };
  });

  const record: QaInspectionRecord = {
    id: `qa-prod-${Date.now()}-${input.po.id.slice(-6)}`,
    qa_no: nextQaNoForProduction(list),
    bill_id: `PROD-PO-${input.po.id}`,
    bill_no: input.po.doc_no,
    git_id: null,
    po_id: '',
    po_no: '',
    entity_id: input.po.entity_id,
    branch_id: null,
    inspector_user_id: input.inspector_user_id,
    inspection_date: now.slice(0, 10),
    inspection_location: input.inspection_location,
    lines,
    status: 'pending' as QaInspectionStatus,
    notes: `Auto-created from PO ${input.po.doc_no} on completion (Q45=c)`,
    inspection_type: 'in_process',
    parameter_results: null,
    created_at: now,
    updated_at: now,
    source_context: 'in_process',
    production_order_id: input.po.id,
    production_order_no: input.po.doc_no,
    production_confirmation_id: null,
    material_issue_id: null,
    job_card_id: null,
    factory_id: input.po.production_site_id ?? null,
    machine_id: null,
    work_center_id: null,
  };

  list.push(record);
  writeInspections(input.po.entity_id, list);
  return record;
}

// ─── Factory: PRODUCTION CONFIRMATION ─────────────────────────────

export interface CreateQaInspectionFromPCInput {
  pc: ProductionConfirmation;
  po: ProductionOrder;
  inspector_user_id: string;
  inspection_location: string;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function createQaInspectionFromPC(input: CreateQaInspectionFromPCInput): QaInspectionRecord {
  const list = readInspections(input.pc.entity_id);
  const now = new Date().toISOString();

  const lines: QaInspectionLine[] = input.pc.lines.map((pl, i) => {
    const itemParams = input.itemQCParams.filter(p => p.item_id === pl.output_item_id);
    const itemPlans = input.qaPlans.filter(p => p.item_id === pl.output_item_id);
    const params = resolveQCParameters({
      itemId: pl.output_item_id,
      template: input.template,
      itemQCParams: itemParams,
      qaPlans: itemPlans,
    });
    return {
      id: `qal-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      bill_line_id: `prod-line-${pl.output_item_id}`,
      item_id: pl.output_item_id,
      item_name: pl.output_item_name,
      qty_inspected: pl.actual_qty,
      qty_passed: 0,
      qty_failed: 0,
      failure_reason: null,
      inspection_parameters: buildEmptyParamsRecord(params),
      uom: pl.uom,
      batch_id: pl.batch_no ?? null,
    };
  });

  const record: QaInspectionRecord = {
    id: `qa-prod-${Date.now()}-${input.pc.id.slice(-6)}`,
    qa_no: nextQaNoForProduction(list),
    bill_id: `PROD-PC-${input.pc.id}`,
    bill_no: input.pc.doc_no,
    git_id: null,
    po_id: '',
    po_no: '',
    entity_id: input.pc.entity_id,
    branch_id: null,
    inspector_user_id: input.inspector_user_id,
    inspection_date: now.slice(0, 10),
    inspection_location: input.inspection_location,
    lines,
    status: 'pending' as QaInspectionStatus,
    notes: `Auto-created from PC ${input.pc.doc_no} on confirmation (Q45=c)`,
    inspection_type: 'in_process',
    parameter_results: null,
    created_at: now,
    updated_at: now,
    source_context: 'in_process',
    production_order_id: input.po.id,
    production_order_no: input.po.doc_no,
    production_confirmation_id: input.pc.id,
    material_issue_id: null,
    job_card_id: null,
    factory_id: input.po.production_site_id ?? null,
    machine_id: null,
    work_center_id: null,
  };

  list.push(record);
  writeInspections(input.pc.entity_id, list);
  return record;
}

// ─── Factory: MATERIAL ISSUE NOTE ─────────────────────────────────

export interface CreateQaInspectionFromMIInput {
  mi: MaterialIssueNote;
  inspector_user_id: string;
  inspection_location: string;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function createQaInspectionFromMI(input: CreateQaInspectionFromMIInput): QaInspectionRecord {
  const list = readInspections(input.mi.entity_id);
  const now = new Date().toISOString();

  const lines: QaInspectionLine[] = input.mi.lines.map((ml, i) => {
    const itemParams = input.itemQCParams.filter(p => p.item_id === ml.item_id);
    const itemPlans = input.qaPlans.filter(p => p.item_id === ml.item_id);
    const params = resolveQCParameters({
      itemId: ml.item_id,
      template: input.template,
      itemQCParams: itemParams,
      qaPlans: itemPlans,
    });
    return {
      id: `qal-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      bill_line_id: `min-line-${ml.id}`,
      item_id: ml.item_id,
      item_name: ml.item_name,
      qty_inspected: ml.issued_qty,
      qty_passed: 0,
      qty_failed: 0,
      failure_reason: null,
      inspection_parameters: buildEmptyParamsRecord(params),
      uom: ml.uom,
      batch_id: ml.batch_no ?? null,
    };
  });

  const record: QaInspectionRecord = {
    id: `qa-prod-${Date.now()}-${input.mi.id.slice(-6)}`,
    qa_no: nextQaNoForProduction(list),
    bill_id: `PROD-MI-${input.mi.id}`,
    bill_no: input.mi.doc_no,
    git_id: null,
    po_id: '',
    po_no: '',
    entity_id: input.mi.entity_id,
    branch_id: null,
    inspector_user_id: input.inspector_user_id,
    inspection_date: now.slice(0, 10),
    inspection_location: input.inspection_location,
    lines,
    status: 'pending' as QaInspectionStatus,
    notes: `Auto-created from MI ${input.mi.doc_no} on issue (Q45=c)`,
    inspection_type: 'incoming',
    parameter_results: null,
    created_at: now,
    updated_at: now,
    source_context: 'incoming_internal',
    production_order_id: input.mi.production_order_id,
    production_order_no: input.mi.production_order_no,
    production_confirmation_id: null,
    material_issue_id: input.mi.id,
    job_card_id: null,
    factory_id: null,
    machine_id: null,
    work_center_id: null,
  };

  list.push(record);
  writeInspections(input.mi.entity_id, list);
  return record;
}

// ─── Factory: JOB CARD ────────────────────────────────────────────

export interface CreateQaInspectionFromJCInput {
  jc: JobCard;
  po: ProductionOrder;
  inspector_user_id: string;
  inspection_location: string;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function createQaInspectionFromJC(input: CreateQaInspectionFromJCInput): QaInspectionRecord {
  const list = readInspections(input.jc.entity_id);
  const now = new Date().toISOString();

  const itemId = input.po.output_item_id;
  const itemParams = input.itemQCParams.filter(p => p.item_id === itemId);
  const itemPlans = input.qaPlans.filter(p => p.item_id === itemId);
  const params = resolveQCParameters({
    itemId,
    template: input.template,
    itemQCParams: itemParams,
    qaPlans: itemPlans,
  });

  const lines: QaInspectionLine[] = [{
    id: `qal-${Date.now()}-jc-${Math.random().toString(36).slice(2, 6)}`,
    bill_line_id: `jc-line-${input.jc.id}`,
    item_id: itemId,
    item_name: input.po.output_item_name,
    qty_inspected: input.jc.produced_qty,
    qty_passed: 0,
    qty_failed: 0,
    failure_reason: null,
    inspection_parameters: buildEmptyParamsRecord(params),
    uom: input.jc.uom,
    batch_id: null,
  }];

  const record: QaInspectionRecord = {
    id: `qa-prod-${Date.now()}-${input.jc.id.slice(-6)}`,
    qa_no: nextQaNoForProduction(list),
    bill_id: `PROD-JC-${input.jc.id}`,
    bill_no: input.jc.doc_no,
    git_id: null,
    po_id: '',
    po_no: '',
    entity_id: input.jc.entity_id,
    branch_id: null,
    inspector_user_id: input.inspector_user_id,
    inspection_date: now.slice(0, 10),
    inspection_location: input.inspection_location,
    lines,
    status: 'pending' as QaInspectionStatus,
    notes: `Auto-created from JC ${input.jc.doc_no} on completion (Q45=c)`,
    inspection_type: 'in_process',
    parameter_results: null,
    created_at: now,
    updated_at: now,
    source_context: 'in_process',
    production_order_id: input.po.id,
    production_order_no: input.po.doc_no,
    production_confirmation_id: null,
    material_issue_id: null,
    job_card_id: input.jc.id,
    factory_id: input.jc.factory_id,
    machine_id: input.jc.machine_id,
    work_center_id: input.jc.work_center_id,
  };

  list.push(record);
  writeInspections(input.jc.entity_id, list);
  return record;
}
