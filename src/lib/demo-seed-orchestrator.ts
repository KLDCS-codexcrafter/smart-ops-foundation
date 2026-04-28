/**
 * demo-seed-orchestrator.ts — Single entry: seedEntityDemoData(entityCode, archetype)
 * Pure — no UI, no toasts. Caller handles messaging.
 * Additive-only — never overwrites existing data.
 * [JWT] POST /api/demo/seed-entity
 *
 * STANDING RULE (Sprint T-Phase-SEED-1 · founder lock April 28, 2026):
 * Every future Phase 1 sprint that adds new schema fields OR new transaction types
 * MUST update the relevant demo-*.ts files in this same sprint to:
 *   1. Add the new field with backward-compat default to existing seed entries
 *   2. Add 2-3 NEW seed examples that exercise the new feature
 *   3. Ensure 'Load Demo Data' produces testable data for the new feature
 *
 * Example: When 1.1.1a added project_id to Quotation interface, this file's
 * DEMO_QUOTATIONS must keep project_id: null on existing entries and add at
 * least one entry with a non-null project_id to test ProjX hookpoint visibility.
 *
 * The sprint prompt template now includes a 'Seed/Mock Data Update' section
 * that lists what each sprint must add to seed data BEFORE Acceptance Criteria.
 */
import {
  customersForArchetype, vendorsForArchetype, type DemoArchetype,
} from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';
import {
  DEMO_SAM_HIERARCHY, DEMO_SAM_PERSONS, DEMO_ENQUIRY_SOURCES,
  DEMO_CAMPAIGNS, DEMO_TARGETS, DEMO_ENQUIRIES, DEMO_QUOTATIONS,
  DEMO_OPPORTUNITIES, DEMO_COMMISSION_ENTRIES,
  DEMO_SUPPLY_REQUEST_MEMOS, DEMO_ORDERS,
} from '@/data/demo-salesx-data';
import { DEMO_DELIVERY_MEMOS } from '@/data/demo-dispatch-data';
import {
  DEMO_RECEIVX_CONFIG, DEMO_REMINDER_TEMPLATES,
  DEMO_COLLECTION_EXECS, DEMO_INCENTIVE_SCHEMES,
  DEMO_PTPS_TRADING, DEMO_PTPS_SERVICES, DEMO_PTPS_MFG,
  DEMO_COMM_LOG_TRADING, DEMO_COMM_LOG_SERVICES, DEMO_COMM_LOG_MFG,
} from '@/data/demo-receivx-data';
import { loadSalesXTransactions } from '@/data/demo-transactions-salesx';
import {
  DEMO_TERRITORIES, DEMO_BEAT_ROUTES, DEMO_VISIT_LOGS, DEMO_SECONDARY_SALES,
} from '@/data/demo-field-force-data';
import type { StockReservation } from '@/types/stock-reservation';
import type { SampleOutwardMemo } from '@/types/sample-outward-memo';
import type { DemoOutwardMemo } from '@/types/demo-outward-memo';

export interface SeedResult {
  entityCode: string;
  archetype: DemoArchetype;
  customers: number; vendors: number; items: number;
  samPersons: number; enquiries: number; quotations: number;
  salesInvoices: number; receipts: number; creditNotes: number;
  outstanding: number;
  reminderTemplates: number; collectionExecs: number;
  ptps: number; commLog: number;
  commissions: number;
  skipped: boolean;
}

function safeSetArray(key: string, data: unknown[]): number {
  try {
    // [JWT] GET /api/entity/storage/:key
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(existing) && existing.length > 0) return 0;
    // [JWT] POST /api/entity/storage/:key
    localStorage.setItem(key, JSON.stringify(data));
    return data.length;
  } catch { return 0; }
}

function safeSetObj(key: string, data: unknown): boolean {
  try {
    // [JWT] GET /api/entity/storage/:key
    if (localStorage.getItem(key)) return false;
    // [JWT] POST /api/entity/storage/:key
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function seedEntityDemoData(
  entityCode: string,
  archetype: DemoArchetype,
): SeedResult {
  // Masters
  const customers = safeSetArray('erp_group_customer_master', customersForArchetype(archetype));
  const vendors = safeSetArray('erp_group_vendor_master', vendorsForArchetype(archetype));
  const items = safeSetArray('erp_inventory_items', itemsForArchetype(archetype));

  // SalesX masters
  const samPersons = safeSetArray(
    `erp_sam_persons_${entityCode}`,
    DEMO_SAM_PERSONS.filter(p => p._archetype === archetype),
  );
  safeSetArray(`erp_sam_hierarchy_${entityCode}`, DEMO_SAM_HIERARCHY);
  safeSetArray(`erp_enquiry_sources_${entityCode}`, DEMO_ENQUIRY_SOURCES);
  safeSetArray(`erp_campaigns_${entityCode}`, DEMO_CAMPAIGNS);
  safeSetArray(`erp_sam_targets_${entityCode}`, DEMO_TARGETS);
  const enquiries = safeSetArray(
    `erp_enquiries_${entityCode}`,
    DEMO_ENQUIRIES.filter(e => e._archetype === archetype),
  );
  const quotations = safeSetArray(
    `erp_quotations_${entityCode}`,
    DEMO_QUOTATIONS.filter(q => q._archetype === archetype),
  );
  safeSetArray(
    `erp_opportunities_${entityCode}`,
    DEMO_OPPORTUNITIES.filter(o => o._archetype === archetype),
  );

  // SalesX transactions — writes to erp_group_vouchers + erp_outstanding
  const txnResult = loadSalesXTransactions(entityCode, archetype);

  // Commission entries
  const commissions = safeSetArray(
    `erp_commission_register_${entityCode}`,
    DEMO_COMMISSION_ENTRIES.filter(c => c._archetype === archetype),
  );

  // ReceivX config + masters
  safeSetObj(`erp_receivx_config_${entityCode}`, DEMO_RECEIVX_CONFIG);
  const reminderTemplates = safeSetArray(`erp_receivx_templates_${entityCode}`, DEMO_REMINDER_TEMPLATES);
  const collectionExecs = safeSetArray(`erp_receivx_execs_${entityCode}`, DEMO_COLLECTION_EXECS);
  safeSetArray(`erp_receivx_schemes_${entityCode}`, DEMO_INCENTIVE_SCHEMES);

  // ReceivX transactions
  const ptpsData = archetype === 'trading' ? DEMO_PTPS_TRADING
    : archetype === 'services' ? DEMO_PTPS_SERVICES : DEMO_PTPS_MFG;
  const commLogData = archetype === 'trading' ? DEMO_COMM_LOG_TRADING
    : archetype === 'services' ? DEMO_COMM_LOG_SERVICES : DEMO_COMM_LOG_MFG;
  const ptps = safeSetArray(`erp_receivx_ptps_${entityCode}`, ptpsData);
  const commLog = safeSetArray(`erp_receivx_comm_log_${entityCode}`, commLogData);

  // Field Force masters + transactions (Sprint 7)
  safeSetArray(`erp_territories_${entityCode}`, DEMO_TERRITORIES);
  safeSetArray(`erp_beat_routes_${entityCode}`, DEMO_BEAT_ROUTES);
  safeSetArray(`erp_visit_logs_${entityCode}`, DEMO_VISIT_LOGS);
  safeSetArray(`erp_secondary_sales_${entityCode}`, DEMO_SECONDARY_SALES);

  // Three Memo System (Sprint T-Phase-1.1.1n) — SRM + DM. IM created live.
  const srmData = DEMO_SUPPLY_REQUEST_MEMOS.map(m => ({ ...m, entity_id: entityCode }));
  safeSetArray(`erp_supply_request_memos_${entityCode}`, srmData);
  const dmData = DEMO_DELIVERY_MEMOS.map(m => ({ ...m, entity_id: entityCode }));
  safeSetArray(`erp_delivery_memos_${entityCode}`, dmData);

  // Sales Orders (Sprint T-Phase-1.1.1o) — anchor rows for Handoff Tracker.
  // Aligned to DEMO_SUPPLY_REQUEST_MEMOS.sales_order_no.
  const orderData = DEMO_ORDERS.map(o => ({ ...o, entity_id: entityCode }));
  safeSetArray(`erp_orders_${entityCode}`, orderData);

  // Stock Reservations (Sprint T-Phase-1.1.1m · D-186)
  // Seeds 2 demo reservations so QuotationEntry Avail column shows realistic data.
  // Item names match seeded inventory items (Demo Item A/C are conceptual labels —
  // we anchor to actual archetype item names so opening_stock minus reserved is meaningful).
  const itemSet = itemsForArchetype(archetype);
  const itemA = itemSet[0];
  const itemC = itemSet[2] ?? itemSet[1] ?? itemSet[0];
  const nowIso = new Date().toISOString();
  const demoReservations: StockReservation[] = [];
  if (itemA) {
    demoReservations.push({
      id: `res-demo-q-${entityCode}`,
      entity_id: entityCode,
      item_name: itemA.itemName,
      reserved_qty: 10,
      level: 'quote',
      status: 'active',
      source_type: 'quotation',
      source_id: 'q-demo-1',
      source_no: 'RFQ/25-26/0001',
      customer_name: 'Demo Customer A',
      salesman_name: 'Demo Salesman',
      reserved_at: nowIso,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      released_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }
  if (itemC) {
    demoReservations.push({
      id: `res-demo-o-${entityCode}`,
      entity_id: entityCode,
      item_name: itemC.itemName,
      reserved_qty: 20,
      level: 'order',
      status: 'active',
      source_type: 'sales_order',
      source_id: 'so-demo-1',
      source_no: 'SO/25-26/0001',
      customer_name: 'Demo Customer B',
      salesman_name: 'Demo Salesman',
      reserved_at: nowIso,
      expires_at: null,
      released_at: null,
      created_at: nowIso,
      updated_at: nowIso,
    });
  }
  safeSetArray(`erp_stock_reservations_${entityCode}`, demoReservations);

  // Sample & Demo Outward (Sprint T-Phase-1.1.1p · D-192 + D-193)
  const nowSeed = new Date().toISOString();
  const sampleSeed: SampleOutwardMemo[] = [{
    id: `som-demo-${entityCode}`,
    entity_id: entityCode,
    memo_no: `SOM/25-26/0001`,
    memo_date: nowSeed.split('T')[0],
    raised_by_person_id: 'sm-m1',
    raised_by_person_name: 'Manish Gupta',
    raised_by_person_type: 'salesman',
    recipient_name: 'Ar. Rajesh Khanna',
    recipient_company: 'Khanna Architects',
    recipient_phone: '+919811000888',
    recipient_address: 'Mumbai, Maharashtra',
    purpose: 'architect_trial',
    purpose_note: 'Trial sample for upcoming residential project',
    items: [{
      id: 'som-it-seed-1',
      item_name: itemA?.itemName ?? 'Demo Item A',
      description: 'Sample swatch',
      qty: 2,
      uom: 'NOS',
      unit_value: 0,
      amount: 0,
    }],
    expect_return: false,
    return_due_date: null,
    returned_at: null,
    attachments: [],
    status: 'dispatched',
    dispatched_at: nowSeed,
    completed_at: null,
    // Sprint T-Phase-1.1.1p-v2 — full party + dispatch issue fields seeded.
    customer_id: null,
    customer_name: 'Khanna Architects',
    salesman_id: 'sm-m1',
    salesman_name: 'Manish Gupta',
    agent_id: null, agent_name: null,
    broker_id: null, broker_name: null,
    engineer_emp_id: null, engineer_name: null,
    is_refundable: false,
    outward_godown_id: null, outward_godown_name: null,
    issued_by_dispatch: true,
    dispatch_issued_at: nowSeed,
    dispatch_issued_by: 'dispatch_user',
    unit_value: 0,
    total_value: 0,
    created_at: nowSeed,
    updated_at: nowSeed,
  }];
  safeSetArray(`erp_sample_outward_memos_${entityCode}`, sampleSeed);
  safeSetObj(`erp_doc_seq_SOM_${entityCode}`, 1);

  const overdueStart = '2026-02-19'; // 60+ days before today (Apr 28, 2026 + buffer)
  const demoSeed: DemoOutwardMemo[] = [{
    id: `dom-demo-${entityCode}`,
    entity_id: entityCode,
    memo_no: `DOM/25-26/0001`,
    memo_date: overdueStart,
    raised_by_person_id: 'sm-m1',
    raised_by_person_name: 'Manish Gupta',
    raised_by_person_type: 'salesman',
    recipient_name: 'Mr. Sandeep Verma',
    recipient_company: 'Verma Industries',
    recipient_phone: '+919811000999',
    recipient_address: 'Pune, Maharashtra',
    items: [{
      id: 'dom-it-seed-1',
      item_name: itemC?.itemName ?? 'Demo Item C',
      description: 'Full demo unit',
      qty: 1,
      uom: 'NOS',
      serial_no: 'SN-DEMO-0001',
      unit_value: itemC?.rate ?? 5000,
      amount: itemC?.rate ?? 5000,
    }],
    demo_period_days: 14,
    demo_start_date: overdueStart,
    demo_end_date: '2026-03-05',
    return_condition: null,
    returned_at: null,
    converted_so_no: null,
    converted_at: null,
    lost_reason: null,
    // [JWT] Phase 1.5.5d stub
    service_desk_ticket_id: null,
    attachments: [],
    status: 'overdue',
    dispatched_at: `${overdueStart}T10:00:00.000Z`,
    // Sprint T-Phase-1.1.1p-v2 — party + godown + dispatch fields seeded.
    customer_id: null,
    customer_name: 'Verma Industries',
    salesman_id: 'sm-m1',
    salesman_name: 'Manish Gupta',
    agent_id: null, agent_name: null,
    broker_id: null, broker_name: null,
    engineer_emp_id: null, engineer_name: null,
    outward_godown_id: null,
    outward_godown_name: 'Samples & Demos - Out with 3rd Party',
    issued_by_dispatch: true,
    dispatch_issued_at: '2026-02-19T10:00:00.000Z',
    dispatch_issued_by: 'dispatch_user',
    created_at: `${overdueStart}T10:00:00.000Z`,
    updated_at: nowSeed,
  }];
  safeSetArray(`erp_demo_outward_memos_${entityCode}`, demoSeed);
  safeSetObj(`erp_doc_seq_DOM_${entityCode}`, 1);

  return {
    entityCode, archetype,
    customers, vendors, items, samPersons, enquiries, quotations,
    salesInvoices: txnResult.invoices, receipts: txnResult.receipts,
    creditNotes: txnResult.creditNotes, outstanding: txnResult.outstanding,
    reminderTemplates, collectionExecs, ptps, commLog, commissions,
    skipped: false,
  };
}

export function detectArchetype(businessActivity: string): DemoArchetype {
  const a = (businessActivity || '').toLowerCase();
  if (a.includes('manufact')) return 'manufacturing';
  if (a.includes('service') || a.includes('it') || a.includes('consult')) return 'services';
  return 'trading';
}
