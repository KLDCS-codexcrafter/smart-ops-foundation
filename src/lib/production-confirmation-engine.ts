/**
 * @file     production-confirmation-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block D · D-531
 * @purpose  Production Confirmation lifecycle: create / confirm / cancel.
 *           Routes FG to quarantine when outgoing QC enabled (D-515 stock-hold).
 *           Marks PO completed when actual_qty >= planned_qty.
 *
 * Corrections applied:
 *   C#1 · generateDocNo positional ('PC', entityCode)
 *   C#4 · LeakCategory 'process' (not 'production_yield')
 */
import type {
  ProductionConfirmation,
  ProductionConfirmationLine,
} from '@/types/production-confirmation';
import { productionConfirmationsKey } from '@/types/production-confirmation';
import type { ProductionOrder, ProductionOrderStatusEvent } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { generateDocNo } from '@/lib/finecore-engine';
import type { QualiCheckConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { resolveFGOutputGodown } from '@/lib/production-engine';
import { emitLeakEvent } from '@/lib/leak-register-engine';

export interface CreateProductionConfirmationInput {
  entity_id: string;
  production_order: ProductionOrder;
  confirmation_date: string;
  department_id: string;
  department_name: string;
  confirmed_by_user_id: string;
  confirmed_by_name: string;
  actual_qty: number;
  destination_godown_id: string;
  destination_godown_name: string;
  batch_no: string | null;
  serial_nos: string[];
  heat_no: string | null;
  remarks: string;
  notes: string;
}

export function createProductionConfirmation(
  input: CreateProductionConfirmationInput,
  qcConfig: QualiCheckConfig,
): ProductionConfirmation {
  if (
    input.production_order.status !== 'in_progress' &&
    input.production_order.status !== 'released'
  ) {
    throw new Error(
      `Cannot confirm production for PO in ${input.production_order.status} status`,
    );
  }
  if (input.actual_qty <= 0) throw new Error('Actual qty must be > 0');

  const doc_no = generateDocNo('PC', input.entity_id);

  const resolvedGodown = resolveFGOutputGodown(input.production_order, qcConfig);
  const routedToQuarantine = resolvedGodown !== input.production_order.output_godown_id;

  const planned = input.production_order.planned_qty;
  const actual = input.actual_qty;
  const yield_pct = planned > 0 ? (actual / planned) * 100 : 0;
  const qty_variance = actual - planned;

  const line: ProductionConfirmationLine = {
    id: `pc-line-${doc_no.replace(/\//g, '-')}-1`,
    line_no: 1,
    output_index: 0,
    output_item_id: input.production_order.output_item_id,
    output_item_code: input.production_order.output_item_code,
    output_item_name: input.production_order.output_item_name,
    planned_qty: planned,
    actual_qty: actual,
    uom: input.production_order.uom,
    destination_godown_id: resolvedGodown,
    destination_godown_name: routedToQuarantine
      ? 'Quarantine (auto-routed · QC pending)'
      : input.destination_godown_name,
    batch_no: input.batch_no,
    serial_nos: input.serial_nos,
    heat_no: input.heat_no,
    qc_required: input.production_order.qc_required,
    qc_scenario: input.production_order.qc_scenario,
    routed_to_quarantine: routedToQuarantine,
    yield_pct,
    qty_variance,
    remarks: input.remarks,
  };

  const now = new Date().toISOString();
  const pc: ProductionConfirmation = {
    id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    status: 'draft',
    confirmation_date: input.confirmation_date,
    production_order_id: input.production_order.id,
    production_order_no: input.production_order.doc_no,
    department_id: input.department_id,
    department_name: input.department_name,
    confirmed_by_user_id: input.confirmed_by_user_id,
    confirmed_by_name: input.confirmed_by_name,
    lines: [line],
    total_actual_qty: actual,
    total_planned_qty: planned,
    overall_yield_pct: yield_pct,
    marks_po_complete: actual >= planned,
    status_history: [
      {
        id: `pcs-${Date.now()}`,
        from_status: null,
        to_status: 'draft',
        changed_by_id: input.confirmed_by_user_id,
        changed_by_name: input.confirmed_by_name,
        changed_at: now,
        note: 'Production Confirmation created',
      },
    ],
    notes: input.notes,
    created_at: now,
    created_by: input.confirmed_by_name,
    updated_at: now,
    updated_by: input.confirmed_by_name,
    linked_test_report_ids: [],
  };

  // Emit leak if yield variance > 10% (FR-44 · 3a-pre-3 will config-drive threshold)
  if (Math.abs(yield_pct - 100) > 10) {
    emitLeakEvent({
      entity_id: input.entity_id,
      category: 'process',
      sub_kind: 'production_yield_variance',
      ref_label: `${pc.doc_no} · yield ${yield_pct.toFixed(1)}%`,
      variance_pct: yield_pct - 100,
      notes: `Yield deviated from plan (${planned} planned · ${actual} actual)`,
      emitted_by: input.confirmed_by_name,
    });
  }

  persist(input.entity_id, pc);
  return pc;
}

/**
 * Confirm: DRAFT → CONFIRMED · transitions PO to 'completed' when marks_po_complete.
 */
export function confirmProductionConfirmation(
  pc: ProductionConfirmation,
  user: { id: string; name: string },
): ProductionConfirmation {
  if (pc.status !== 'draft') throw new Error('Only DRAFT confirmations can be confirmed');

  if (pc.marks_po_complete) {
    transitionPOToCompleted(pc, user);
  }

  const now = new Date().toISOString();
  const updated: ProductionConfirmation = {
    ...pc,
    status: 'confirmed',
    status_history: [
      ...pc.status_history,
      {
        id: `pcs-${Date.now()}`,
        from_status: 'draft',
        to_status: 'confirmed',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: pc.marks_po_complete
          ? 'Confirmed · PO marked completed'
          : 'Confirmed · PO remains in_progress (partial)',
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persist(pc.entity_id, updated);
  return updated;
}

export function cancelProductionConfirmation(
  pc: ProductionConfirmation,
  user: { id: string; name: string },
  reason: string,
): ProductionConfirmation {
  if (pc.status !== 'draft') throw new Error('Only DRAFT confirmations can be cancelled');
  const now = new Date().toISOString();
  const updated: ProductionConfirmation = {
    ...pc,
    status: 'cancelled',
    status_history: [
      ...pc.status_history,
      {
        id: `pcs-${Date.now()}`,
        from_status: 'draft',
        to_status: 'cancelled',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: `Cancelled: ${reason}`,
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persist(pc.entity_id, updated);
  return updated;
}

export function listProductionConfirmations(entityCode: string): ProductionConfirmation[] {
  try {
    // [JWT] GET /api/production/confirmations?entityCode=...
    const raw = localStorage.getItem(productionConfirmationsKey(entityCode));
    return raw ? (JSON.parse(raw) as ProductionConfirmation[]) : [];
  } catch {
    return [];
  }
}

// ─── Private helpers ─────────────────────────────────────────────────

function persist(entityCode: string, pc: ProductionConfirmation): void {
  const all = listProductionConfirmations(entityCode);
  const idx = all.findIndex(x => x.id === pc.id);
  if (idx >= 0) all[idx] = pc;
  else all.push(pc);
  // [JWT] PUT /api/production/confirmations/:entityCode
  localStorage.setItem(productionConfirmationsKey(entityCode), JSON.stringify(all));
}

function transitionPOToCompleted(
  pc: ProductionConfirmation,
  user: { id: string; name: string },
): void {
  const key = productionOrdersKey(pc.entity_id);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all = JSON.parse(raw) as ProductionOrder[];
    const idx = all.findIndex(p => p.id === pc.production_order_id);
    if (idx < 0) return;
    const po = all[idx];
    if (po.status !== 'in_progress' && po.status !== 'released') return;

    const now = new Date().toISOString();
    const event: ProductionOrderStatusEvent = {
      id: `pose-${Date.now()}`,
      from_status: po.status,
      to_status: 'completed',
      changed_by_id: user.id,
      changed_by_name: user.name,
      changed_at: now,
      note: `Auto-completed via Production Confirmation ${pc.doc_no}`,
    };
    all[idx] = {
      ...po,
      status: 'completed',
      actual_completion_date: pc.confirmation_date,
      status_history: [...po.status_history, event],
      updated_at: now,
      updated_by: user.name,
    };
    // [JWT] PATCH /api/production-orders/:entityCode/:id
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* silent */
  }
}

// ════════════════════════════════════════════════════════════════════
// Sprint 3b-pre-1 · Block D · D-618 · Q45=c QC auto-create on PC confirm
// ════════════════════════════════════════════════════════════════════
import { createQaInspectionFromPC } from '@/lib/qa-inspection-production-bridge';
import type { ProductionConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { ManufacturingTemplate } from '@/config/manufacturing-templates';
import type { ItemQCParam } from '@/types/item-qc-param';
import type { QaPlan } from '@/types/qa-plan';

export interface ConfirmPCQCContext {
  productionConfig: ProductionConfig;
  parentPO: ProductionOrder;
  template?: ManufacturingTemplate;
  itemQCParams: ItemQCParam[];
  qaPlans: QaPlan[];
}

export function confirmProductionConfirmationWithQC(
  pc: ProductionConfirmation,
  user: { id: string; name: string },
  qcContext?: ConfirmPCQCContext,
): ProductionConfirmation {
  const confirmed = confirmProductionConfirmation(pc, user);
  if (!qcContext || !qcContext.productionConfig.enableProductionQC) return confirmed;
  const anyQC = confirmed.lines.some(l => l.qc_required);
  if (!anyQC) return confirmed;
  const mode = qcContext.productionConfig.qcAutoCreateMode ?? 'config_per_scenario';
  let shouldCreate = mode === 'always';
  if (mode === 'config_per_scenario') {
    const scen = qcContext.parentPO.qc_scenario;
    shouldCreate = scen === 'internal_dept' || scen === 'third_party_agency';
  }
  if (!shouldCreate) return confirmed;
  try {
    const insp = createQaInspectionFromPC({
      pc: confirmed, po: qcContext.parentPO,
      inspector_user_id: user.id, inspection_location: 'Production Floor',
      template: qcContext.template, itemQCParams: qcContext.itemQCParams, qaPlans: qcContext.qaPlans,
    });
    const updated = { ...confirmed, linked_test_report_ids: [...confirmed.linked_test_report_ids, insp.id] };
    persist(confirmed.entity_id, updated);
    return updated;
  } catch (e) { console.error('[pc-engine] QC auto-create failed', e); return confirmed; }
}
