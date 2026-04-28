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
  DEMO_SUPPLY_REQUEST_MEMOS,
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
