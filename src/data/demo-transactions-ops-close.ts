/**
 * @file        src/data/demo-transactions-ops-close.ts
 * @sprint      W1C-7c · T-W1C7c-Demo-Txns-Ops-Close · Wave-1 Close Arc
 * @purpose     Demo-seed sprint 3 of 3 — TRANSACTIONS for the ops/support
 *              cluster so every remaining card's register has rows and every
 *              report/print renders. Pairs with:
 *                W1C-7a · cc-config-seed.ts          (governance)
 *                W1C-7b · demo-transactions-finance-procurement.ts (finance)
 *
 *              METHOD (identical to 7b): each row is written to the EXACT
 *              storage key the card's register/engine reads, in a shape its
 *              read path understands. Every id is prefixed `demo-w1c7c-` so
 *              purgeDemoData clears the whole cluster.
 *
 *              ZERO new engines · ZERO new SIBLINGs. For card-domains that
 *              already had a partial demo seed (Dispatch · StoreHub ·
 *              RequestX · MaintainPro · SiteX · ServiceDesk · Projects),
 *              those seeds are reached via the existing demo-seed-orchestrator
 *              `seedEntityDemoData` invocation — this writer EXTENDS, not
 *              duplicates, by filling the remaining keys (NCR · CAPA ·
 *              QaInspection · ServiceTicket-portal · Logistic activity ·
 *              DocVault documents · EngineeringX BOM/drawings).
 *
 * [JWT]  Replace localStorage writes with REST POSTs against each card's
 *        canonical create endpoint (POST /api/qa/inspections, /api/ncr, ...).
 */

import { qaInspectionKey } from '@/types/qa-inspection';
import { ncrKey } from '@/types/ncr';
import { capaKey } from '@/types/capa';
import { serviceTicketKey } from '@/types/service-ticket';
import { amcRecordKey } from '@/types/servicedesk';
import { logisticActivityKey, lrAcceptancesKey } from '@/types/logistic-portal';
import { bomKey } from '@/types/bom';
import { equipmentKey, workOrderKey } from '@/types/maintainpro';
import { dispatchReceiptsKey } from '@/types/dispatch-receipt';
import { materialIndentsKey } from '@/types/material-indent';

const NOW = '2026-04-20T10:00:00.000Z';
const id = (suffix: string): string => `demo-w1c7c-${suffix}`;

/** Idempotent additive write — never overwrites an existing populated key. */
function safeSet(key: string, rows: unknown[]): void {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return;
    }
    localStorage.setItem(key, JSON.stringify(rows));
  } catch { /* quota / private mode — silent */ }
}

// ──────────────────────────────────────────────────────────────────────
// 1) QualiCheck — QaInspection + NCR + CAPA rows
// ──────────────────────────────────────────────────────────────────────
function buildQaInspections(entityCode: string): unknown[] {
  return [
    {
      id: id('qa-1'), qa_no: 'QA/26-27/0001',
      bill_id: 'demo-w1c7b-bp-1', bill_no: 'BP/26-27/0001',
      git_id: null, po_id: 'demo-w1c7b-po-1', po_no: 'PO/26-27/0001',
      entity_id: entityCode, branch_id: null,
      inspector_user_id: 'demo-user-qa-1',
      inspection_date: '2026-04-12',
      inspection_location: 'Main Plant · IQC Bay',
      lines: [{
        id: id('qa-1-l1'), bill_line_id: 'demo-w1c7b-bp-1-l1',
        item_id: id('item-steel-coil'), item_name: 'CR Steel Coil 1.2mm',
        qty_inspected: 5000, qty_passed: 4950, qty_failed: 50,
        failure_reason: 'Surface rust on coil edges',
        inspection_parameters: { thickness: '1.20mm', tensile: '410 MPa' },
      }],
      status: 'passed', notes: 'Demo seed · IQC pass with minor reject.',
      inspection_type: 'incoming',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

function buildNcrs(entityCode: string): unknown[] {
  return [
    {
      id: 'NCR-DEMO-W1C7C-1', entity_id: entityCode, branch_id: null,
      source: 'iqc', severity: 'minor', status: 'capa_pending',
      raised_at: NOW, raised_by: 'demo-user-qa-1',
      related_qa_plan_id: null, related_qa_spec_id: null,
      related_voucher_id: 'demo-w1c7b-grn-1', related_voucher_kind: 'grn',
      related_party_id: id('vendor-delta'), related_party_name: 'Delta Suppliers Pvt Ltd',
      item_id: id('item-steel-coil'), item_name: 'CR Steel Coil 1.2mm',
      qty_affected: 50,
      description: 'Surface rust on coil edges · 1% reject in IQC sample.',
      immediate_action: 'Quarantined 50kg · informed vendor.',
      capa_id: 'CAPA-DEMO-W1C7C-1',
      audit_log: [{ at: NOW, by: 'demo-user-qa-1', action: 'raise', note: 'Demo seed.' }],
    },
  ];
}

function buildCapas(entityCode: string): unknown[] {
  return [
    {
      id: 'CAPA-DEMO-W1C7C-1', entity_id: entityCode, branch_id: null,
      source: 'ncr', severity: 'minor', status: 'actions_assigned',
      title: 'Vendor surface-rust prevention',
      description: 'Demo CAPA traced from NCR-DEMO-W1C7C-1.',
      raised_at: NOW, raised_by: 'demo-user-qa-1',
      related_ncr_id: 'NCR-DEMO-W1C7C-1',
      related_party_id: id('vendor-delta'),
      related_party_name: 'Delta Suppliers Pvt Ltd',
      eight_d_steps: [
        { step: 1, label: 'establish_team', status: 'complete' },
        { step: 2, label: 'define_problem', status: 'complete' },
        { step: 3, label: 'contain', status: 'in_progress' },
      ],
      actions: [{
        id: id('capa-a-1'), description: 'Add VCI paper at vendor packing.',
        type: 'corrective', owner_user_id: 'demo-user-qa-mgr',
        due_date: '2026-05-15', status: 'in_progress',
      }],
      verifications: [],
      audit_log: [{ at: NOW, by: 'demo-user-qa-1', action: 'raise' }],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 2) Dispatch — Dispatch Receipts (extends DEMO_DELIVERY_MEMOS from
//    demo-dispatch-data.ts which is loaded by the orchestrator).
// ──────────────────────────────────────────────────────────────────────
function buildDispatchReceipts(entityCode: string): unknown[] {
  return [
    {
      id: id('dr-1'), entity_id: entityCode,
      dispatch_no: 'DR/26-27/0001', dispatch_date: '2026-04-18',
      delivery_memo_id: 'dm-demo-1', delivery_memo_no: 'DM/25-26/0001',
      customer_id: id('cust-arc'), customer_name: 'Arc Metalworks Ltd',
      vehicle_no: 'MH-12-AB-4521', driver_name: 'Ramesh Patil',
      transporter_id: id('trans-blue'), transporter_name: 'Blueline Logistics',
      lr_no: 'LR/2026/0234', lr_date: '2026-04-18',
      pod_status: 'received', pod_received_at: '2026-04-20T11:00:00.000Z',
      total_value: 365800, status: 'delivered',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 3) Logistics — Logistic portal activities + LR acceptances
// ──────────────────────────────────────────────────────────────────────
function buildLogisticActivity(entityCode: string): unknown[] {
  return [
    {
      id: id('la-1'), entity_id: entityCode,
      kind: 'lr_accepted', actor_id: id('trans-blue'),
      actor_name: 'Blueline Logistics',
      at: NOW, note: 'LR/2026/0234 accepted by transporter.',
      lr_no: 'LR/2026/0234',
    },
    {
      id: id('la-2'), entity_id: entityCode,
      kind: 'pod_uploaded', actor_id: id('trans-blue'),
      actor_name: 'Blueline Logistics',
      at: '2026-04-20T11:00:00.000Z',
      note: 'POD uploaded for LR/2026/0234.',
      lr_no: 'LR/2026/0234',
    },
  ];
}

function buildLrAcceptances(entityCode: string): unknown[] {
  return [
    {
      id: id('lra-1'), entity_id: entityCode,
      lr_no: 'LR/2026/0234', lr_date: '2026-04-18',
      transporter_id: id('trans-blue'), transporter_name: 'Blueline Logistics',
      status: 'accepted', accepted_at: NOW,
      vehicle_no: 'MH-12-AB-4521', driver_name: 'Ramesh Patil',
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 4) ProjX — Milestones already seeded by orchestrator. Top up with one
//    additional milestone tagged demo-w1c7c so the capstone proves the
//    register continues to populate for this sprint's roster.
// ──────────────────────────────────────────────────────────────────────
function buildProjectMilestones(entityCode: string): unknown[] {
  return [
    {
      id: id('pm-1'), entity_id: entityCode,
      project_id: 'proj-demo-1', project_centre_id: 'pc-demo-1',
      milestone_no: 1, name: 'Kick-off & Site Survey',
      planned_date: '2026-04-01', actual_date: '2026-04-02',
      planned_value: 250000, earned_value: 250000,
      status: 'completed', is_billing_milestone: true,
      created_at: NOW, updated_at: NOW,
    },
    {
      id: id('pm-2'), entity_id: entityCode,
      project_id: 'proj-demo-1', project_centre_id: 'pc-demo-1',
      milestone_no: 2, name: 'Civil Foundation',
      planned_date: '2026-05-15', actual_date: null,
      planned_value: 625000, earned_value: 312500,
      status: 'in_progress', is_billing_milestone: true,
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 5) ServiceDesk — Service tickets + AMC records
// ──────────────────────────────────────────────────────────────────────
function buildServiceTickets(entityCode: string): unknown[] {
  return [
    {
      id: id('st-1'), ticket_no: 'TKT/26-27/0001',
      entity_id: entityCode, branch_id: 'br-main',
      customer_id: id('cust-arc'), amc_record_id: id('amc-1'),
      call_type_code: 'breakdown', channel: 'phone',
      severity: 'sev2_high', description: 'Compressor unit not starting.',
      sla_response_due_at: '2026-04-20T14:00:00.000Z',
      sla_resolution_due_at: '2026-04-21T18:00:00.000Z',
      flash_timer_minutes_remaining: 240, escalation_level: 0,
      assigned_engineer_id: 'demo-user-eng-1',
      raised_at: NOW, acked_at: '2026-04-20T10:15:00.000Z',
      started_at: '2026-04-20T11:00:00.000Z', on_hold_since: null,
      resolved_at: null, closed_at: null,
      reopened_count: 0, reopened_at: null,
      repair_route_id: null, standby_loan_id: null,
      customer_in_voucher_id: null, customer_out_voucher_id: null,
      happy_code_otp_verified: false, happy_code_feedback_id: null,
      spares_consumed: [], photos: [],
      status: 'in_progress',
      created_at: NOW, updated_at: NOW, created_by: 'demo-user-csr-1',
      audit_trail: [{ at: NOW, by: 'demo-user-csr-1', action: 'created', note: 'Demo seed.' }],
    },
  ];
}

function buildAmcRecords(entityCode: string): unknown[] {
  return [
    {
      id: id('amc-1'), amc_no: 'AMC/26-27/0001',
      entity_id: entityCode, branch_id: 'br-main',
      customer_id: id('cust-arc'), customer_name: 'Arc Metalworks Ltd',
      contract_start: '2026-04-01', contract_end: '2027-03-31',
      contract_value_paise: 12000000, status: 'active',
      coverage: 'comprehensive',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 6) DocVault — Document register (also feeds EngineeringX drawings,
//    which read the same `erp_documents_${entityCode}` store).
// ──────────────────────────────────────────────────────────────────────
function buildDocuments(entityCode: string): unknown[] {
  return [
    {
      id: id('doc-1'), entity_id: entityCode,
      document_type: 'po_contract', document_code: 'DOC-26-27-0001',
      title: 'Vendor MSA · Delta Suppliers',
      category: 'contract', confidentiality: 'internal',
      lifecycle_status: 'active',
      owner_id: 'demo-user-procmgr',
      created_by: 'demo-user-procmgr', created_at: NOW,
      effective_date: '2026-04-01', expiry_date: '2027-03-31',
      versions: [{
        id: id('doc-1-v1'), version_no: 1, status: 'published',
        uploaded_by: 'demo-user-procmgr', uploaded_at: NOW,
        file_name: 'msa-delta-v1.pdf', file_size_kb: 124,
      }],
      tags: [{ key: 'vendor', value: 'delta' }],
    },
    {
      id: id('doc-2'), entity_id: entityCode,
      document_type: 'engineering_drawing',
      document_code: 'DRG-26-27-0001',
      title: 'Bracket Assy Rev A · Drawing',
      category: 'engineering', confidentiality: 'internal',
      lifecycle_status: 'published',
      owner_id: 'demo-user-engmgr',
      created_by: 'demo-user-engmgr', created_at: NOW,
      versions: [{
        id: id('doc-2-v1'), version_no: 1, status: 'published',
        uploaded_by: 'demo-user-engmgr', uploaded_at: NOW,
        file_name: 'bracket-assy-rev-a.pdf', file_size_kb: 220,
      }],
      tags: [{ key: 'drawing_type', value: 'assembly' }],
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 7) EngineeringX — BOM rows on erp_bom_{entity}. Drawings live on
//    erp_documents_{entity} and are filled by buildDocuments above.
// ──────────────────────────────────────────────────────────────────────
function buildBoms(entityCode: string): unknown[] {
  return [
    {
      id: id('bom-1'), entity_id: entityCode,
      bom_code: 'BOM/26-27/0001',
      parent_item_id: id('item-bracket-assy'),
      parent_item_name: 'Bracket Assembly Rev A',
      uom: 'NOS', quantity_base: 1, version: 'A', is_active: true,
      components: [
        { id: id('bom-1-c1'), item_id: id('item-steel-coil'),
          item_name: 'CR Steel Coil 1.2mm', qty: 0.8, uom: 'KG',
          component_type: 'raw_material' },
        { id: id('bom-1-c2'), item_id: id('item-bolt-m10'),
          item_name: 'Bolt M10', qty: 4, uom: 'PCS',
          component_type: 'consumable' },
      ],
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 8) MaintainPro — Equipment + Work Orders (extends demo-maintainpro-data,
//    which only declares masters; this seeds operational rows).
// ──────────────────────────────────────────────────────────────────────
function buildEquipment(entityCode: string): unknown[] {
  return [
    {
      id: id('eq-1'), entity_id: entityCode,
      equipment_code: 'EQ/26-27/D001', equipment_name: 'Demo Compressor',
      equipment_class: 'machine', category: 'mechanical',
      make: 'Demo Make', model: 'D-100',
      operational_status: 'running', is_active: true,
      status: 'active',
      breakdown_count_12m: 0, uptime_pct_12m: 99,
      created_at: NOW, updated_at: NOW,
    },
  ];
}

function buildWorkOrders(entityCode: string): unknown[] {
  return [
    {
      id: id('wo-1'), entity_id: entityCode,
      work_order_no: 'WO/26-27/D001',
      equipment_id: id('eq-1'), equipment_name: 'Demo Compressor',
      wo_type: 'preventive', priority: 'normal',
      planned_start: '2026-05-01', planned_end: '2026-05-01',
      assigned_to_user_id: 'demo-user-maint-1',
      status: 'in_progress',
      created_at: NOW, updated_at: NOW,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// 9) RequestX — Material Indents (extends DEMO_REQUESTX_MOBILE_INDENTS
//    by writing entity-scoped rows for the default entity).
// ──────────────────────────────────────────────────────────────────────
function buildMaterialIndents(entityCode: string): unknown[] {
  return [
    {
      id: id('mi-1'), entity_id: entityCode,
      voucher_type_id: 'vt-material-indent',
      voucher_no: 'MI/26-27/D001', date: '2026-04-20',
      branch_id: 'br-main', division_id: '',
      originating_department_id: 'maintenance',
      originating_department_name: 'Maintenance',
      cost_center_id: 'cc-maint', category: 'spare',
      sub_type: 'general', priority: 'normal',
      requested_by_user_id: 'demo-user-store-1',
      requested_by_name: 'Demo Store User',
      hod_user_id: 'demo-user-hod-1',
      project_id: null, preferred_vendor_id: null, payment_terms: null,
      lines: [{
        id: id('mi-1-l1'), line_no: 1,
        item_id: id('item-bolt-m10'), item_name: 'Bolt M10',
        description: '', uom: 'PCS', qty: 100,
        current_stock_qty: 20, estimated_rate: 8, estimated_value: 800,
        required_date: '2026-04-25', schedule_qty: null, schedule_date: null,
        remarks: '', target_godown_id: 'gd-main',
        target_godown_name: 'Main Stores', is_stocked: true,
        stock_check_status: 'partial', store_action: null,
        store_actor_id: null, store_action_at: null,
        parent_indent_line_id: null, cascade_reason: null,
      }],
      total_estimated_value: 800, status: 'submitted',
      approval_tier: 1, pending_approver_user_id: 'demo-user-hod-1',
      approval_history: [],
      parent_indent_id: null, cascade_reason: null,
      created_at: NOW, created_by: 'demo-user-store-1',
      updated_at: NOW, updated_by: 'demo-user-store-1',
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────
// Top-level applier
// ──────────────────────────────────────────────────────────────────────
export interface OpsCloseSeedResult {
  qaInspections: number; ncrs: number; capas: number;
  dispatchReceipts: number; logisticActivities: number; lrAcceptances: number;
  projectMilestones: number; serviceTickets: number; amcRecords: number;
  documents: number; boms: number; equipment: number; workOrders: number;
  materialIndents: number;
}

export function seedOpsCloseTxnsForDemo(entityCode: string): OpsCloseSeedResult {
  const qa = buildQaInspections(entityCode);
  const ncrs = buildNcrs(entityCode);
  const capas = buildCapas(entityCode);
  const drs = buildDispatchReceipts(entityCode);
  const la = buildLogisticActivity(entityCode);
  const lra = buildLrAcceptances(entityCode);
  const pms = buildProjectMilestones(entityCode);
  const sts = buildServiceTickets(entityCode);
  const amcs = buildAmcRecords(entityCode);
  const docs = buildDocuments(entityCode);
  const boms = buildBoms(entityCode);
  const eq = buildEquipment(entityCode);
  const wos = buildWorkOrders(entityCode);
  const mis = buildMaterialIndents(entityCode);

  safeSet(qaInspectionKey(entityCode), qa);
  safeSet(ncrKey(entityCode), ncrs);
  safeSet(capaKey(entityCode), capas);
  safeSet(dispatchReceiptsKey(entityCode), drs);
  safeSet(logisticActivityKey(entityCode), la);
  safeSet(lrAcceptancesKey(entityCode), lra);
  // ProjX milestones writer
  safeSet(`erp_project_milestones_${entityCode}`, pms);
  safeSet(serviceTicketKey(entityCode), sts);
  safeSet(amcRecordKey(entityCode), amcs);
  safeSet(`erp_documents_${entityCode}`, docs);
  safeSet(bomKey(entityCode), boms);
  safeSet(equipmentKey(entityCode), eq);
  safeSet(workOrderKey(entityCode), wos);
  safeSet(materialIndentsKey(entityCode), mis);

  return {
    qaInspections: qa.length, ncrs: ncrs.length, capas: capas.length,
    dispatchReceipts: drs.length, logisticActivities: la.length,
    lrAcceptances: lra.length, projectMilestones: pms.length,
    serviceTickets: sts.length, amcRecords: amcs.length,
    documents: docs.length, boms: boms.length,
    equipment: eq.length, workOrders: wos.length,
    materialIndents: mis.length,
  };
}

/** Keys this seeder writes — surfaced for the demo loader's purge map. */
export function opsCloseDemoKeys(entityCode: string): string[] {
  return [
    qaInspectionKey(entityCode),
    ncrKey(entityCode),
    capaKey(entityCode),
    dispatchReceiptsKey(entityCode),
    logisticActivityKey(entityCode),
    lrAcceptancesKey(entityCode),
    `erp_project_milestones_${entityCode}`,
    serviceTicketKey(entityCode),
    amcRecordKey(entityCode),
    `erp_documents_${entityCode}`,
    bomKey(entityCode),
    equipmentKey(entityCode),
    workOrderKey(entityCode),
    materialIndentsKey(entityCode),
  ];
}
