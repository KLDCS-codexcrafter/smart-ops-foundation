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
 *
 * T-Phase-1.2.2: DEMO_BOM_HAPPY_PATH seeded · erp_bom_{entityCode}
 */
import { DEMO_BOM_HAPPY_PATH } from '@/data/demo-bom-data';
import { applyManufacturingModeToEntity } from '@/lib/entity-setup-service';
import {
  customersForArchetype, vendorsForArchetype, type DemoArchetype,
} from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';
import {
  DEMO_SAM_HIERARCHY, DEMO_SAM_PERSONS, DEMO_ENQUIRY_SOURCES,
  DEMO_CAMPAIGNS, DEMO_TARGETS, DEMO_ENQUIRIES, DEMO_QUOTATIONS,
  DEMO_OPPORTUNITIES, DEMO_COMMISSION_ENTRIES,
  DEMO_SUPPLY_REQUEST_MEMOS, DEMO_ORDERS,
  DEMO_EXHIBITIONS, DEMO_EXHIBITION_VISITORS,
  DEMO_WEBINARS, DEMO_WEBINAR_PARTICIPANTS,
  DEMO_LEADS, DEMO_WA_TEMPLATES,
  DEMO_AGENT_STATUSES, DEMO_AGENT_PROFILES, DEMO_POINTS_TRANSACTIONS,
  DEMO_QUALITY_CRITERIA, DEMO_CALL_REVIEWS, DEMO_COACHING_FEEDBACK,
  DEMO_DISTRIBUTION_CONFIG, DEMO_TELECALLER_CAPACITIES, DEMO_DISTRIBUTION_LOGS,
  DEMO_CAMPAIGN_TEMPLATES,
} from '@/data/demo-salesx-data';
import { DEMO_DELIVERY_MEMOS } from '@/data/demo-dispatch-data';
import { DEMO_INWARD_RECEIPTS } from '@/data/demo-inward-data';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import { DEMO_STOCK_ISSUES, DEMO_STOCK_RECEIPT_ACKS } from '@/data/demo-store-hub-data';
import { stockIssuesKey } from '@/types/stock-issue';
import { stockReceiptAcksKey } from '@/types/stock-receipt-ack';
import { DEMO_PROMOTED_INDENTS } from '@/data/demo-store-hub-workflow-data';
import { DEMO_REQUESTX_MOBILE_INDENTS } from '@/data/demo-requestx-mobile-data';
import { materialIndentsKey } from '@/types/material-indent';
import { getDemoProductionData } from '@/data/demo-production-data';
import { productionOrdersKey } from '@/types/production-order';
import { getDemoProductionPlans } from '@/data/demo-production-plan-data';
import { productionPlansKey } from '@/types/production-plan';
// Sprint T-Phase-1.3-3-PlantOps-pre-1
import { getDemoFactories, getDemoWorkCenters, getDemoMachines } from '@/data/demo-factory-data';
import { factoriesKey } from '@/types/factory';
import { workCentersKey } from '@/types/work-center';
import { machinesKey } from '@/types/machine';
import {
  getDemoMaterialIssues,
  getDemoProductionConfirmations,
  getDemoJobWorkOutOrders,
  getDemoJobWorkReceipts,
} from '@/data/demo-production-workflow-data';
import { materialIssueNotesKey } from '@/types/material-issue-note';
import { productionConfirmationsKey } from '@/types/production-confirmation';
import { jobWorkOutOrdersKey } from '@/types/job-work-out-order';
import { jobWorkReceiptsKey } from '@/types/job-work-receipt';
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
import { DEMO_ASSET_CENTRES } from '@/data/demo-asset-centres';
import { assetCentresKey, ASSET_CENTRE_SEQ_KEY } from '@/types/fincore/asset-centre';
import {
  DEMO_PROJECT_CENTRES, DEMO_PROJECTS,
  DEMO_PROJECT_MILESTONES, DEMO_PROJECT_RESOURCES,
  DEMO_TIME_ENTRIES, DEMO_PROJECT_INVOICE_SCHEDULES,
} from '@/data/demo-projects';
import { projectCentresKey, PROJECT_CENTRE_SEQ_KEY } from '@/types/projx/project-centre';
import { projectsKey, PROJECT_SEQ_KEY } from '@/types/projx/project';
import { projectMilestonesKey } from '@/types/projx/project-milestone';
import { projectResourcesKey } from '@/types/projx/project-resource';
import { timeEntriesKey } from '@/types/projx/time-entry';
import { projectInvoiceScheduleKey } from '@/types/projx/project-invoice-schedule';
import { quotationsKey } from '@/types/quotation';
import type { Quotation } from '@/types/quotation';

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
  safeSetArray(`erp_campaigns_${entityCode}`, DEMO_CAMPAIGNS.map(c => ({ ...c, entity_id: entityCode })));
  safeSetArray(`erp_exhibitions_${entityCode}`, DEMO_EXHIBITIONS.map(e => ({ ...e, entity_id: entityCode })));
  safeSetArray(`erp_exhibition_visitors_${entityCode}`, DEMO_EXHIBITION_VISITORS);
  safeSetArray(`erp_webinars_${entityCode}`, DEMO_WEBINARS.map(w => ({ ...w, entity_id: entityCode })));
  safeSetArray(`erp_webinar_participants_${entityCode}`, DEMO_WEBINAR_PARTICIPANTS);
  safeSetArray(`erp_leads_${entityCode}`, DEMO_LEADS.map(l => ({ ...l, entity_id: entityCode })));
  safeSetArray(`erp_wa_templates_${entityCode}`, DEMO_WA_TEMPLATES.map(t => ({ ...t, entity_id: entityCode })));
  safeSetArray(`erp_agent_status_${entityCode}`, DEMO_AGENT_STATUSES.map(a => ({ ...a, entity_id: entityCode })));
  safeSetArray(`erp_agent_profiles_${entityCode}`, DEMO_AGENT_PROFILES.map(a => ({ ...a, entity_id: entityCode })));
  safeSetArray(`erp_points_transactions_${entityCode}`, DEMO_POINTS_TRANSACTIONS.map(t => ({ ...t, entity_id: entityCode })));
  safeSetArray(`erp_quality_criteria_${entityCode}`, DEMO_QUALITY_CRITERIA.map(c => ({ ...c, entity_id: entityCode })));
  safeSetArray(`erp_call_reviews_${entityCode}`, DEMO_CALL_REVIEWS.map(r => ({ ...r, entity_id: entityCode })));
  safeSetArray(`erp_coaching_feedback_${entityCode}`, DEMO_COACHING_FEEDBACK.map(f => ({ ...f, entity_id: entityCode })));
  safeSetObj(`erp_distribution_config_${entityCode}`, { ...DEMO_DISTRIBUTION_CONFIG, entity_id: entityCode });
  safeSetArray(`erp_telecaller_capacities_${entityCode}`, DEMO_TELECALLER_CAPACITIES.map(c => ({ ...c, entity_id: entityCode })));
  safeSetArray(`erp_distribution_logs_${entityCode}`, DEMO_DISTRIBUTION_LOGS.map(l => ({ ...l, entity_id: entityCode })));
  safeSetArray(`erp_campaign_templates_${entityCode}`, DEMO_CAMPAIGN_TEMPLATES.map(t => ({ ...t, entity_id: entityCode })));
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

  // Card #6 Inward Logistic FOUNDATION (Sprint T-Phase-1.2.6f-d-2-card6-6-pre-1 · Block F)
  const irData = DEMO_INWARD_RECEIPTS.map(r => ({ ...r, entity_id: entityCode }));
  safeSetArray(inwardReceiptsKey(entityCode), irData);

  // Card #7 Store Hub FOUNDATION (Sprint T-Phase-1.2.6f-d-2-card7-7-pre-1 · Block H · D-383)
  const siData = DEMO_STOCK_ISSUES.map(s => ({ ...s, entity_id: entityCode }));
  safeSetArray(stockIssuesKey(entityCode), siData);
  const sraData = DEMO_STOCK_RECEIPT_ACKS.map(a => ({ ...a, entity_id: entityCode }));
  safeSetArray(stockReceiptAcksKey(entityCode), sraData);

  // Card #7 Store Hub WORKFLOW (Sprint T-Phase-1.2.6f-d-2-card7-7-pre-2 · Block I · D-393)
  try {
    const promotedIndents = DEMO_PROMOTED_INDENTS.map(i => ({ ...i, entity_id: entityCode }));
    const existingIndents = JSON.parse(localStorage.getItem(materialIndentsKey(entityCode)) || '[]');
    if (!Array.isArray(existingIndents) || existingIndents.length === 0) {
      localStorage.setItem(materialIndentsKey(entityCode), JSON.stringify(promotedIndents));
    } else {
      const have = new Set(existingIndents.map((i: { id: string }) => i.id));
      const merged = [...existingIndents, ...promotedIndents.filter(i => !have.has(i.id))];
      localStorage.setItem(materialIndentsKey(entityCode), JSON.stringify(merged));
    }
  } catch { /* silent */ }

  // Card #8 RequestX MOBILE demo seeds (Sprint 8-pre-1 · Block G · D-409 · idempotency dedup matches D-393)
  try {
    const mobileIndents = DEMO_REQUESTX_MOBILE_INDENTS.map(i => ({ ...i, entity_id: entityCode }));
    const existing = JSON.parse(localStorage.getItem(materialIndentsKey(entityCode)) || '[]');
    if (!Array.isArray(existing) || existing.length === 0) {
      localStorage.setItem(materialIndentsKey(entityCode), JSON.stringify(mobileIndents));
    } else {
      const have = new Set(existing.map((i: { id: string }) => i.id));
      const merged = [...existing, ...mobileIndents.filter(i => !have.has(i.id))];
      localStorage.setItem(materialIndentsKey(entityCode), JSON.stringify(merged));
    }
  } catch { /* silent */ }

  // Card 3a Production demo seeds (Sprint T-Phase-1.3-3a-pre-1 · Block I · D-509)
  safeSetArray(productionOrdersKey(entityCode), getDemoProductionData(entityCode));
  // Card 3a Production Plans (Sprint T-Phase-1.3-3a-pre-2.5-fix-1 · Block 4 · D-555)
  safeSetArray(productionPlansKey(entityCode), getDemoProductionPlans(entityCode));
  // Sprint T-Phase-1.3-3-PlantOps-pre-1 · Plant Operations seeds
  safeSetArray(factoriesKey(entityCode), getDemoFactories(entityCode));
  safeSetArray(workCentersKey(entityCode), getDemoWorkCenters(entityCode));
  safeSetArray(machinesKey(entityCode), getDemoMachines(entityCode));

  // Card 3a-pre-2 production workflow demo seeds (Block M · MIN/PC/JWO/JWR)
  safeSetArray(materialIssueNotesKey(entityCode), getDemoMaterialIssues(entityCode));
  safeSetArray(productionConfirmationsKey(entityCode), getDemoProductionConfirmations(entityCode));
  safeSetArray(jobWorkOutOrdersKey(entityCode), getDemoJobWorkOutOrders(entityCode));
  safeSetArray(jobWorkReceiptsKey(entityCode), getDemoJobWorkReceipts(entityCode));

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
      project_centre_id: null,
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
      project_centre_id: null,
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
    pending_expense_voucher: true, // Sprint T-Phase-1.1.1q · non-refundable seed
    created_at: nowSeed,
    updated_at: nowSeed,
  }];
  safeSetArray(`erp_sample_outward_memos_${entityCode}`, sampleSeed);
  // Sprint T-Phase-1.1.2-d: SOM doc-no generator now lives in generateDocNo('SOM', ...).
  // Storage key unchanged — sequence continues from this seed value.
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
    pending_expense_voucher: false, // Sprint T-Phase-1.1.1q · demo refundable by nature
    created_at: `${overdueStart}T10:00:00.000Z`,
    updated_at: nowSeed,
  }];
  safeSetArray(`erp_demo_outward_memos_${entityCode}`, demoSeed);
  // Sprint T-Phase-1.1.2-d: DOM doc-no generator now lives in generateDocNo('DOM', ...).
  // Storage key unchanged — sequence continues from this seed value.
  safeSetObj(`erp_doc_seq_DOM_${entityCode}`, 1);

  // Asset Centres (Sprint T-Phase-1.1.2-pre · D-218 two-master architecture)
  const acSeeded = safeSetArray(
    assetCentresKey(entityCode),
    DEMO_ASSET_CENTRES.map(ac => ({ ...ac, entity_id: entityCode })),
  );
  if (acSeeded > 0) {
    localStorage.setItem(ASSET_CENTRE_SEQ_KEY(entityCode), String(DEMO_ASSET_CENTRES.length));
  }

  // ProjX — Project Centres + Projects (Sprint T-Phase-1.1.2-a)
  const pcSeeded = safeSetArray(
    projectCentresKey(entityCode),
    DEMO_PROJECT_CENTRES.map(pc => ({ ...pc, entity_id: entityCode })),
  );
  if (pcSeeded > 0) {
    localStorage.setItem(PROJECT_CENTRE_SEQ_KEY(entityCode), String(DEMO_PROJECT_CENTRES.length));
  }
  const prjSeeded = safeSetArray(
    projectsKey(entityCode),
    DEMO_PROJECTS.map(p => ({ ...p, entity_id: entityCode })),
  );
  if (prjSeeded > 0) {
    localStorage.setItem(PROJECT_SEQ_KEY(entityCode), String(DEMO_PROJECTS.length));
  }

  // ProjX 1.1.2-b — Milestones, Resources, Time Entries, Invoice Schedules
  safeSetArray(projectMilestonesKey(entityCode),
    DEMO_PROJECT_MILESTONES.map(m => ({ ...m, entity_id: entityCode })));
  safeSetArray(projectResourcesKey(entityCode),
    DEMO_PROJECT_RESOURCES.map(r => ({ ...r, entity_id: entityCode })));
  safeSetArray(timeEntriesKey(entityCode),
    DEMO_TIME_ENTRIES.map(t => ({ ...t, entity_id: entityCode })));
  safeSetArray(projectInvoiceScheduleKey(entityCode),
    DEMO_PROJECT_INVOICE_SCHEDULES.map(s => ({ ...s, entity_id: entityCode })));

  // ProjX — Backfill 5 quotations with project_id linkage
  // (so "Convert from Quotation" UI has demo data on Day 1 showing both linked + unlinked)
  if (prjSeeded > 0 && quotations > 0) {
    const seededProjects = DEMO_PROJECTS.map(p => ({ ...p, entity_id: entityCode }));
    const stored = localStorage.getItem(quotationsKey(entityCode));
    if (stored) {
      try {
        const allQuotations: Quotation[] = JSON.parse(stored);
        let backfilled = 0;
        for (const proj of seededProjects) {
          if (backfilled >= 5) break;
          const idx = allQuotations.findIndex(q =>
            q.project_id === null &&
            q.customer_id === proj.customer_id
          );
          if (idx !== -1) {
            allQuotations[idx] = { ...allQuotations[idx], project_id: proj.id };
            backfilled++;
          }
        }
        if (backfilled > 0) {
          localStorage.setItem(quotationsKey(entityCode), JSON.stringify(allQuotations));
        }
      } catch {
        // ignore — backfill is best-effort
      }
    }
  }

  // Sprint T-Phase-1.2.2 · BOM demo data (required for consumption variance computation)
  safeSetArray(
    `erp_bom_${entityCode}`,
    DEMO_BOM_HAPPY_PATH.map(b => ({ ...b, entity_id: entityCode })),
  );

  // Sprint HK-6.T1 · §19 closure · 4 mock bank statements for Banking Reconciliation demo (55 transactions)
  // FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-bank-statements-seed-data.ts file.
  seedSinhaBankStatements(entityCode);

  // T-Phase-3.PROD-1 · ST10 · Sinha-anchor production seed (Q-LOCK-13)
  // FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-*-seed-data file.
  seedSinhaProductionEligibleSalesOrders(entityCode);
  seedSinhaOperatorSkills(entityCode);
  seedSinhaSkillOperationMappings(entityCode);

  // T-Phase-3.PROD-2 · ST13 · Sinha-anchor 6 leak scenarios (Q-LOCK-13)
  // FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-*-seed-data file.
  seedSinhaLeakScenarios(entityCode);

  // T-Phase-3.PROD-2.5 · ST10 · Q-LOCK-10 · 7 Sinha-anchor mfg-mode assignments
  // FR-86 ABSOLUTE preserved · inline · NO new sinha-mfg-mode-seed-data.ts file.
  seedSinhaAnchorMfgModes();

  // T-Phase-3.PROD-FIX-A · ST16 · Q-LOCK-13 · Sinha FY-close simulation
  seedSinhaFYCloseSimulation(entityCode);




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

// ============================================================================
// Sprint HK-6.T1 · §19 closure · Mock Sinha bank statements (4 banks · 55 txns)
// FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-*-seed-data file
// ============================================================================
import {
  bankStatementsKey,
  type BankStatement,
  type BankStatementLine,
} from './bank-reconciliation-engine';

interface MiniTxn {
  d: string;            // day in March 2026
  desc: string;
  ref: string;
  cr?: number;          // credit (receipt)
  dr?: number;          // debit (payment)
}

function buildStatement(args: {
  id: string;
  bankAccountId: string;
  bankName: string;
  accountNumber: string;
  entityCode: string;
  opening: number;
  txns: MiniTxn[];
}): BankStatement {
  let bal = args.opening;
  const lines: BankStatementLine[] = args.txns.map((t, i) => {
    const credit = t.cr ?? 0;
    const debit = t.dr ?? 0;
    bal = bal + credit - debit;
    return {
      id: `${args.id}-l-${i + 1}`,
      statement_id: args.id,
      date: `2026-03-${t.d.padStart(2, '0')}`,
      description: t.desc,
      reference: t.ref,
      debit_amount: debit,
      credit_amount: credit,
      balance_after: bal,
      matched_voucher_id: null,
      match_status: 'unmatched',
      match_confidence: 0,
      matched_at: null,
      matched_by: null,
    };
  });
  return {
    id: args.id,
    entity_id: args.entityCode,
    bank_account_id: args.bankAccountId,
    bank_name: args.bankName,
    account_number: args.accountNumber,
    statement_period_from: '2026-03-01',
    statement_period_to: '2026-03-31',
    opening_balance: args.opening,
    closing_balance: bal,
    source_format: 'csv',
    uploaded_at: '2026-04-01T09:30:00Z',
    uploaded_by: 'demo-user',
    lines,
  };
}

function seedSinhaBankStatements(entityCode: string): void {
  // Idempotent · skip if any bank statements already exist for entity
  try {
    const existing = localStorage.getItem(bankStatementsKey(entityCode));
    if (existing && JSON.parse(existing).length > 0) return;
  } catch { /* fall through */ }

  // ICICI Current A/c · primary · 20 transactions
  const icici = buildStatement({
    id: 'stmt-icici-2026-03', bankAccountId: 'BA-ICICI-001',
    bankName: 'ICICI Bank', accountNumber: '0001ICI23456789',
    entityCode, opening: 1250000,
    txns: [
      { d: '02', desc: 'NEFT INW ABC ENTERPRISES SI-2026-0142', ref: 'NEFTN20260302001', cr: 450000 },
      { d: '03', desc: 'IMPS XYZ INDUSTRIES SI-2026-0145', ref: 'IMPS260303001122', cr: 280000 },
      { d: '04', desc: 'CHQ PAID 100123 PRECISION STEEL', ref: 'CHQ100123', dr: 175000 },
      { d: '05', desc: 'NEFT OUT MAHAVIR LOGISTICS', ref: 'NEFTO20260305002', dr: 62000 },
      { d: '06', desc: 'RTGS INW SUNRISE TRADERS SI-2026-0148', ref: 'RTGS20260306N7788', cr: 925000 },
      { d: '08', desc: 'BANK CHARGES MAR-2026', ref: 'BCHG2603', dr: 1850 },
      { d: '09', desc: 'GST PAID CHALLAN 2603', ref: 'GST2603SINHA', dr: 248000 },
      { d: '10', desc: 'NEFT INW KIRTI ENTERPRISES SI-2026-0151', ref: 'NEFTN20260310009', cr: 365000 },
      { d: '11', desc: 'CHQ PAID 100124 SHREE METALS', ref: 'CHQ100124', dr: 120000 },
      { d: '12', desc: 'IMPS RAJ STEEL CO SI-2026-0153', ref: 'IMPS260312553311', cr: 210000 },
      { d: '14', desc: 'TDS PAYMENT 194Q MAR-2026', ref: 'TDS194Q2603', dr: 42500 },
      { d: '15', desc: 'INTEREST CREDIT QTR ENDED MAR', ref: 'INTQTR2603', cr: 4250 },
      { d: '17', desc: 'NEFT OUT PAYROLL BATCH MAR', ref: 'NEFTO20260317PAY', dr: 685000 },
      { d: '19', desc: 'NEFT INW TIRUPATI METALS SI-2026-0157', ref: 'NEFTN20260319033', cr: 540000 },
      { d: '20', desc: 'CHQ DEPOSIT 778812 ALPHA TRADERS', ref: 'CHQDEP778812', cr: 180000 },
      { d: '22', desc: 'RTGS OUT POWER GRID ELEC BILL', ref: 'RTGS20260322ELEC', dr: 87500 },
      { d: '24', desc: 'NEFT OUT TATA TELESERVICES', ref: 'NEFTO20260324TEL', dr: 18500 },
      { d: '26', desc: 'NEFT INW MM FORGINGS SI-2026-0162', ref: 'NEFTN20260326045', cr: 295000 },
      { d: '28', desc: 'CHQ PAID 100125 ACE TOOLS', ref: 'CHQ100125', dr: 64000 },
      { d: '30', desc: 'NEFT INW PATEL ENGG SI-2026-0166', ref: 'NEFTN20260330055', cr: 420000 },
    ],
  });

  // SBI Current A/c · 15 transactions
  const sbi = buildStatement({
    id: 'stmt-sbi-2026-03', bankAccountId: 'BA-SBI-001',
    bankName: 'SBI', accountNumber: '31234567890',
    entityCode, opening: 825000,
    txns: [
      { d: '03', desc: 'NEFT INW GANESH STEEL SI-2026-0143', ref: 'SBIN20260303I001', cr: 320000 },
      { d: '05', desc: 'CHQ PAID 200401 KAVERI METAL', ref: 'CHQ200401', dr: 145000 },
      { d: '07', desc: 'NEFT INW VEER INDUSTRIES SI-2026-0147', ref: 'SBIN20260307I003', cr: 215000 },
      { d: '09', desc: 'RTGS OUT VENKATESHWAR FORGE', ref: 'SBIN20260309R002', dr: 380000 },
      { d: '11', desc: 'BANK CHARGES + SMS MAR', ref: 'BCHG2603SBI', dr: 1250 },
      { d: '13', desc: 'NEFT INW SHARMA UDYOG SI-2026-0149', ref: 'SBIN20260313I007', cr: 285000 },
      { d: '15', desc: 'GST PAYMENT CGST 2603', ref: 'GSTCGST2603SBI', dr: 95000 },
      { d: '17', desc: 'CHQ DEPOSIT 882201 KRISHNA AGRO', ref: 'CHQDEP882201', cr: 175000 },
      { d: '19', desc: 'NEFT OUT VENDOR JINDAL SAW', ref: 'SBIN20260319O004', dr: 410000 },
      { d: '21', desc: 'IMPS INW SAMRAT FORGE SI-2026-0154', ref: 'SBIN20260321IMPS', cr: 92000 },
      { d: '23', desc: 'NEFT OUT TELEPHONE BSNL', ref: 'SBIN20260323O005', dr: 8500 },
      { d: '25', desc: 'CASH DEPOSIT BRANCH', ref: 'CASHDEP2503', cr: 50000 },
      { d: '27', desc: 'NEFT INW INDIRA METAL SI-2026-0160', ref: 'SBIN20260327I011', cr: 198000 },
      { d: '29', desc: 'TDS REMITTANCE 194C MAR', ref: 'TDS194C2603', dr: 28500 },
      { d: '31', desc: 'INTEREST QTR CR', ref: 'INTQTR2603SBI', cr: 2150 },
    ],
  });

  // HDFC Current A/c · 12 transactions
  const hdfc = buildStatement({
    id: 'stmt-hdfc-2026-03', bankAccountId: 'BA-HDFC-001',
    bankName: 'HDFC Bank', accountNumber: '00012345678901',
    entityCode, opening: 675000,
    txns: [
      { d: '04', desc: 'NEFT INW BHARAT METAL SI-2026-0144', ref: 'HDFC20260304N011', cr: 380000 },
      { d: '06', desc: 'NEFT OUT SHRI RAM TRANSPORT', ref: 'HDFC20260306N012', dr: 58000 },
      { d: '08', desc: 'CHQ PAID 300101 GUJARAT STEEL', ref: 'CHQ300101', dr: 220000 },
      { d: '11', desc: 'RTGS INW NATIONAL ENGG SI-2026-0150', ref: 'HDFC20260311R005', cr: 615000 },
      { d: '13', desc: 'BANK CHARGES MAR', ref: 'BCHG2603HDFC', dr: 1450 },
      { d: '16', desc: 'NEFT OUT MAHESH METAL SUPPLIES', ref: 'HDFC20260316N014', dr: 195000 },
      { d: '18', desc: 'NEFT INW ARJUN STEEL SI-2026-0152', ref: 'HDFC20260318N015', cr: 245000 },
      { d: '20', desc: 'IMPS OUT COURIER DTDC', ref: 'IMPS260320DTDC', dr: 12500 },
      { d: '23', desc: 'NEFT INW HARSHA INDS SI-2026-0156', ref: 'HDFC20260323N018', cr: 175000 },
      { d: '25', desc: 'TDS 194J PROFESSIONAL', ref: 'TDS194J2603HDFC', dr: 15000 },
      { d: '27', desc: 'RTGS OUT BAJAJ FINANCE EMI', ref: 'HDFC20260327REMI', dr: 125000 },
      { d: '30', desc: 'NEFT INW SAGAR FAB SI-2026-0165', ref: 'HDFC20260330N022', cr: 168000 },
    ],
  });

  // Cosmos Cooperative Bank · 8 transactions
  const cosmos = buildStatement({
    id: 'stmt-cosmos-2026-03', bankAccountId: 'BA-COSMOS-001',
    bankName: 'Cosmos Cooperative Bank', accountNumber: '12345-COOP-789',
    entityCode, opening: 185000,
    txns: [
      { d: '05', desc: 'NEFT INW DEEP UDYOG SI-2026-0146', ref: 'COOP2603D0501', cr: 85000 },
      { d: '09', desc: 'CHQ PAID C0001 RAJESH BROTHERS', ref: 'CHQC0001', dr: 42000 },
      { d: '13', desc: 'BANK CHARGES COOP MAR', ref: 'BCHG2603COOP', dr: 650 },
      { d: '16', desc: 'NEFT INW NAVDEEP STEEL SI-2026-0155', ref: 'COOP2603N1601', cr: 65000 },
      { d: '20', desc: 'CASH WITHDRAWAL PETTY', ref: 'CWDR2003COOP', dr: 15000 },
      { d: '24', desc: 'NEFT INW LOCAL CUST SI-2026-0159', ref: 'COOP2603N2401', cr: 38000 },
      { d: '27', desc: 'CHQ PAID C0002 LOCAL VENDOR', ref: 'CHQC0002', dr: 28000 },
      { d: '31', desc: 'INTEREST QTR COOP', ref: 'INTQTR2603COOP', cr: 1850 },
    ],
  });

  // Idempotent write via direct storage (insertStatement reads/writes per call · batch here)
  try {
    localStorage.setItem(
      bankStatementsKey(entityCode),
      JSON.stringify([icici, sbi, hdfc, cosmos]),
    );
  } catch { /* quota */ }
}

// ============================================================================
// T-Phase-3.PROD-1 · ST10 · Sinha-anchor Production seed (Q-LOCK-13)
// FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-*-seed-data file
// ============================================================================
import type { Order, OrderLine } from '@/types/order';
import { ordersKey } from '@/types/order';
import type { OperatorSkill, SkillOperationMapping } from './peoplepay-skill-engine';
import { operatorSkillsKey, skillOperationMappingKey } from './peoplepay-skill-engine';

function seedSinhaProductionEligibleSalesOrders(entityCode: string): void {
  try {
    const existing = localStorage.getItem(ordersKey(entityCode));
    if (existing) {
      const arr = JSON.parse(existing) as Order[];
      if (arr.some(o => o.order_no?.startsWith('SO/PROD-1/'))) return; // idempotent
    }
  } catch { /* fall through */ }

  const today = new Date();
  const daysAgo = (n: number): string => {
    const d = new Date(today.getTime() - n * 86400000);
    return d.toISOString().slice(0, 10);
  };
  const mkLine = (
    id: string,
    itemId: string,
    itemCode: string,
    itemName: string,
    qty: number,
    rate: number,
    delivery: string,
  ): OrderLine => {
    const taxable = qty * rate;
    return {
      id, item_id: itemId, item_code: itemCode, item_name: itemName,
      hsn_sac_code: '8428', qty, uom: 'NOS', rate,
      discount_percent: 0, taxable_value: taxable, gst_rate: 18,
      delivery_date: delivery, pending_qty: qty, fulfilled_qty: 0, status: 'open',
    };
  };

  // Sinha pattern: ETO turnkey + spares + export
  const sos: Order[] = [
    // 3 large turnkey
    {
      id: 'so-prod1-001', order_no: 'SO/PROD-1/0001', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(55),
      party_id: 'cust-ace-corp', party_name: 'Ace Cement Corp',
      lines: [
        mkLine('l1', 'it-m-1', 'MF-F001', 'Automotive Gear Assembly', 50, 8500, daysAgo(-15)),
        mkLine('l2', 'it-m-6', 'MF-F006', 'Hydraulic Cylinder', 30, 12500, daysAgo(-20)),
      ],
      gross_amount: 800000, total_tax: 144000, net_amount: 944000,
      narration: 'Turnkey belt conveyor system · 30 TPH',
      terms_conditions: '50% advance · balance against PI',
      status: 'open', created_at: daysAgo(55) + 'T10:00:00Z', updated_at: daysAgo(55) + 'T10:00:00Z',
    },
    {
      id: 'so-prod1-002', order_no: 'SO/PROD-1/0002', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(45),
      party_id: 'cust-bharat-steel', party_name: 'Bharat Steel Mills',
      lines: [
        mkLine('l1', 'it-m-7', 'MF-F007', 'Crankshaft Forged', 40, 18500, daysAgo(-25)),
      ],
      gross_amount: 740000, total_tax: 207200, net_amount: 947200,
      narration: 'Bucket elevator turnkey · 50m height',
      terms_conditions: '30% advance · balance LC sight',
      status: 'open', created_at: daysAgo(45) + 'T10:00:00Z', updated_at: daysAgo(45) + 'T10:00:00Z',
    },
    {
      id: 'so-prod1-003', order_no: 'SO/PROD-1/0003', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(35),
      party_id: 'cust-ganesh-poly', party_name: 'Ganesh Polymers Ltd',
      lines: [
        mkLine('l1', 'it-m-2', 'MF-F002', 'Pump Housing', 75, 4200, daysAgo(-10)),
        mkLine('l2', 'it-m-3', 'MF-F003', 'Motor Coil 3-Phase', 25, 6500, daysAgo(-10)),
      ],
      gross_amount: 477500, total_tax: 85950, net_amount: 563450,
      narration: 'Screw conveyor turnkey · pneumatic discharge',
      terms_conditions: '40% advance',
      status: 'open', created_at: daysAgo(35) + 'T10:00:00Z', updated_at: daysAgo(35) + 'T10:00:00Z',
    },
    // 4 spares
    {
      id: 'so-prod1-004', order_no: 'SO/PROD-1/0004', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(25),
      party_id: 'cust-deepak-min', party_name: 'Deepak Minerals',
      lines: [mkLine('l1', 'it-m-5', 'MF-F005', 'Bearing 6204', 200, 280, daysAgo(-5))],
      gross_amount: 56000, total_tax: 10080, net_amount: 66080,
      narration: 'Spare bearings · maintenance batch',
      terms_conditions: 'Net 30',
      status: 'open', created_at: daysAgo(25) + 'T10:00:00Z', updated_at: daysAgo(25) + 'T10:00:00Z',
    },
    {
      id: 'so-prod1-005', order_no: 'SO/PROD-1/0005', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(20),
      party_id: 'cust-eshwar-eng', party_name: 'Eshwar Engineering Works',
      lines: [mkLine('l1', 'it-m-4', 'MF-F004', 'Valve Body Brass', 50, 1850, daysAgo(-8))],
      gross_amount: 92500, total_tax: 16650, net_amount: 109150,
      narration: 'Replacement valves',
      terms_conditions: 'Net 15',
      status: 'open', created_at: daysAgo(20) + 'T10:00:00Z', updated_at: daysAgo(20) + 'T10:00:00Z',
    },
    {
      id: 'so-prod1-006', order_no: 'SO/PROD-1/0006', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(15),
      party_id: 'cust-falcon-auto', party_name: 'Falcon Auto Parts',
      lines: [
        mkLine('l1', 'it-m-8', 'MF-F008', 'Brake Disc', 60, 2800, daysAgo(-12)),
        mkLine('l2', 'it-m-9', 'MF-F009', 'Clutch Plate', 40, 1950, daysAgo(-12)),
      ],
      gross_amount: 246000, total_tax: 68880, net_amount: 314880,
      narration: 'Aftermarket spares batch',
      terms_conditions: 'Net 30',
      status: 'open', created_at: daysAgo(15) + 'T10:00:00Z', updated_at: daysAgo(15) + 'T10:00:00Z',
    },
    {
      id: 'so-prod1-007', order_no: 'SO/PROD-1/0007', base_voucher_type: 'Sales Order',
      entity_id: entityCode, date: daysAgo(10),
      party_id: 'cust-gulf-export', party_name: 'Gulf Trading FZE',
      lines: [mkLine('l1', 'it-m-10', 'MF-F010', 'Radiator Assembly', 25, 7200, daysAgo(-18))],
      gross_amount: 180000, total_tax: 0, net_amount: 180000,
      narration: 'Export · zero-rated · UAE',
      terms_conditions: 'LC at sight · CIF Jebel Ali',
      status: 'open', created_at: daysAgo(10) + 'T10:00:00Z', updated_at: daysAgo(10) + 'T10:00:00Z',
    },
  ];

  try {
    const existing = localStorage.getItem(ordersKey(entityCode));
    const arr: Order[] = existing ? JSON.parse(existing) : [];
    const have = new Set(arr.map(o => o.id));
    const merged = [...arr, ...sos.filter(s => !have.has(s.id))];
    localStorage.setItem(ordersKey(entityCode), JSON.stringify(merged));
  } catch { /* quota */ }
}

function seedSinhaOperatorSkills(entityCode: string): void {
  try {
    const existing = localStorage.getItem(operatorSkillsKey(entityCode));
    if (existing && JSON.parse(existing).length > 0) return;
  } catch { /* fall through */ }
  const seed: OperatorSkill[] = [
    { id: 'os-001', operator_id: 'emp-001', operator_name: 'Ramesh Kumar',
      skill_codes: ['cnc-turning', 'fitting', 'inspection'],
      certified_machines: ['mc-cnc-01', 'mc-cnc-02'], certification_expiry: '2027-03-31' },
    { id: 'os-002', operator_id: 'emp-002', operator_name: 'Suresh Patil',
      skill_codes: ['welding', 'fitting'],
      certified_machines: ['mc-weld-01'], certification_expiry: '2026-12-31' },
    { id: 'os-003', operator_id: 'emp-003', operator_name: 'Mahesh Joshi',
      skill_codes: ['grinding', 'polishing', 'inspection'],
      certified_machines: ['mc-grind-01'], certification_expiry: null },
    { id: 'os-004', operator_id: 'emp-004', operator_name: 'Dinesh Pawar',
      skill_codes: ['pickling', 'painting'],
      certified_machines: ['mc-paint-01'], certification_expiry: '2026-09-30' },
    { id: 'os-005', operator_id: 'emp-005', operator_name: 'Vinod Shinde',
      skill_codes: ['packing', 'inspection'],
      certified_machines: [], certification_expiry: null },
    { id: 'os-006', operator_id: 'emp-006', operator_name: 'Anil Deshmukh',
      skill_codes: ['cnc-turning', 'welding', 'fitting'],
      certified_machines: ['mc-cnc-01', 'mc-weld-01'], certification_expiry: '2027-06-30' },
    { id: 'os-007', operator_id: 'emp-007', operator_name: 'Prakash Gawade',
      skill_codes: ['fitting', 'inspection', 'packing'],
      certified_machines: [], certification_expiry: null },
  ];
  try {
    localStorage.setItem(operatorSkillsKey(entityCode), JSON.stringify(seed));
  } catch { /* quota */ }
}

function seedSinhaSkillOperationMappings(entityCode: string): void {
  try {
    const existing = localStorage.getItem(skillOperationMappingKey(entityCode));
    if (existing && JSON.parse(existing).length > 0) return;
  } catch { /* fall through */ }
  const seed: SkillOperationMapping[] = [
    { id: 'som-001', operation_name: 'machining',
      required_skill_codes: ['cnc-turning'], machine_compatibility: ['mc-cnc-01', 'mc-cnc-02'] },
    { id: 'som-002', operation_name: 'fabrication',
      required_skill_codes: ['welding', 'fitting'], machine_compatibility: ['mc-weld-01'] },
    { id: 'som-003', operation_name: 'finishing',
      required_skill_codes: ['grinding', 'polishing'], machine_compatibility: ['mc-grind-01'] },
    { id: 'som-004', operation_name: 'coating',
      required_skill_codes: ['pickling', 'painting'], machine_compatibility: ['mc-paint-01'] },
    { id: 'som-005', operation_name: 'assembly',
      required_skill_codes: ['fitting', 'inspection'], machine_compatibility: [] },
    { id: 'som-006', operation_name: 'dispatch',
      required_skill_codes: ['packing', 'inspection'], machine_compatibility: [] },
  ];
  try {
    localStorage.setItem(skillOperationMappingKey(entityCode), JSON.stringify(seed));
  } catch { /* quota */ }
}

// T-Phase-3.PROD-2 · ST13 · Sinha-anchor 6 leak scenarios (Q-LOCK-13)
// FR-86 ABSOLUTE preserved · inline · NO new sinha-*-seed-data file.
// Seeds the side-stores read by the 7 PROD-2 sub-helper engines so that the
// Command Center "Open Leaks Count" KPI surfaces realistic leak signals on first boot.
function seedSinhaLeakScenarios(entityCode: string): void {
  if (entityCode !== 'SINHA') return;
  const now = new Date().toISOString();
  const safeSeed = (key: string, value: unknown): void => {
    try {
      const raw = localStorage.getItem(key);
      if (raw && JSON.parse(raw).length > 0) return;
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* quota silent */ }
  };

  // Scenario 1 — JW shortage alert (LEAK-5)
  safeSeed(`erp_jw_shortage_alerts_${entityCode}`, [{
    id: `jwsh-seed-1`, jw_receipt_id: 'jwr-seed-1', jw_receipt_no: 'JWR/26/0007',
    jwo_id: 'jwo-seed-1', vendor_id: 'vend-001', vendor_name: 'Mahalaxmi Powder Coating',
    item_id: 'itm-mhf-002', item_name: 'MS Flange — Powder Coated',
    expected_qty: 500, received_qty: 462, shortage_qty: 38,
    shortage_pct: 7.6, shortage_value: 38_000, severity: 'warning',
    triggered_at: now, acknowledged_at: null, acknowledged_by: null,
    valuation_suggestion: 38_000,
  }]);

  // Scenario 2 — BOM drift alert (LEAK-7)
  safeSeed(`erp_bom_drift_alerts_${entityCode}`, [{
    id: 'bomd-seed-1', bom_id: 'bom-001',
    bom_name: 'Hydraulic Power Pack — 5 HP v3',
    parent_item_id: 'itm-hpp-005', parent_item_name: 'Hydraulic Power Pack — 5 HP',
    drift_item_id: 'itm-oil-iso68', drift_item_name: 'Hydraulic Oil ISO VG 68',
    bom_standard_qty: 12, actual_avg_qty: 13.56, drift_pct: 13,
    drift_severity: 'warning', sample_size: 5, detected_at: now, acknowledged_at: null,
  }]);

  // Scenario 3 — Factory licence cap (LEAK-10) · warning band
  safeSeed(`erp_factory_capacity_${entityCode}`, [
    { factory_id: 'fac-sinha-mum-01', installed_capacity_units: 10000,
      license_no: 'MH-FAC-2018-04412', uom: 'units' },
  ]);
  safeSeed(`erp_factory_license_alerts_${entityCode}`, [{
    id: 'flc-fac-sinha-mum-01-FY26', factory_id: 'fac-sinha-mum-01',
    factory_name: 'Sinha Mumbai Plant 1', utilisation_pct: 87.5,
    status: 'warning', fy_label: 'FY26', detected_at: now, acknowledged_at: null,
  }]);

  // Scenario 4 — Hazmat production cap (LEAK-11) · breach band
  safeSeed(`erp_hazmat_caps_${entityCode}`, [
    { dg_class: '3', monthly_cap_units: 2000, uom: 'litres' },
  ]);
  const monthLabel = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  safeSeed(`erp_hazmat_cap_alerts_${entityCode}`, [{
    id: `hzc-3-${monthLabel}`, dg_class: '3', utilisation_pct: 104.5,
    status: 'breach', month_label: monthLabel, detected_at: now, acknowledged_at: null,
  }]);

  // Scenario 5 — Wastage drift alert (LEAK-13)
  safeSeed(`erp_wastage_drift_alerts_${entityCode}`, [{
    id: 'wd-fac-sinha-mum-01-process_defects-seed',
    factory_id: 'fac-sinha-mum-01',
    category_12: 'process_defects', category_label: 'Process Defects',
    recent_avg_qty: 18.4, baseline_avg_qty: 12.1, drift_pct: 52.1,
    severity: 'critical', detected_at: now, acknowledged_at: null,
    sample_size_recent: 14, sample_size_baseline: 31,
  }]);

  // Scenario 6 — Tooling consumption near EOL (LEAK-14)
  safeSeed(`erp_tooling_register_${entityCode}`, [
    { tool_id: 'tool-cnc-insert-001', tool_name: 'CNC Turning Insert — DNMG 150608',
      machine_id: 'mc-cnc-01', expected_life_units: 8000, consumed_units: 7720,
      installed_at: now, last_reset_at: null },
  ]);
  safeSeed(`erp_tooling_consumption_alerts_${entityCode}`, [{
    id: 'tool-tool-cnc-insert-001', tool_id: 'tool-cnc-insert-001',
    tool_name: 'CNC Turning Insert — DNMG 150608', machine_id: 'mc-cnc-01',
    consumed_units: 7720, expected_life_units: 8000, consumption_pct: 96.5,
    severity: 'critical', detected_at: now, acknowledged_at: null,
  }]);
}

// ============================================================================
// T-Phase-3.PROD-2.5-T1 · ST1 · Sinha-anchor mfg-mode assignments (7 entities)
// FR-86 ABSOLUTE preserved · inline in orchestrator · NO new sinha-mfg-mode-seed-data.ts file.
// Q-LOCK-14 SAFE WRITE · only manufacturingMode field touched · no cascade.
// Strategy v2 §4.1 mapping: ABDOS=mixed_mode · BCPL/SHKPH=process · others=discrete.
// ============================================================================
function seedSinhaAnchorMfgModes(): void {
  applyManufacturingModeToEntity('SINHA', 'discrete');
  applyManufacturingModeToEntity('AMITH', 'discrete');
  applyManufacturingModeToEntity('CHRSE', 'discrete');
  applyManufacturingModeToEntity('SMRTP', 'discrete');
  applyManufacturingModeToEntity('BCPL',  'process');
  applyManufacturingModeToEntity('SHKPH', 'process');
  applyManufacturingModeToEntity('ABDOS', 'mixed_mode');
}
