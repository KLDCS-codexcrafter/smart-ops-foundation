/**
 * demo-seed-orchestrator.ts — Single entry: seedEntityDemoData(entityCode, archetype)
 * Pure — no UI, no toasts. Caller handles messaging.
 * Additive-only — never overwrites existing data.
 * [JWT] POST /api/demo/seed-entity
 */
import {
  customersForArchetype, vendorsForArchetype, type DemoArchetype,
} from '@/data/demo-customers-vendors';
import { itemsForArchetype } from '@/data/demo-items-master';
import {
  DEMO_SAM_HIERARCHY, DEMO_SAM_PERSONS, DEMO_ENQUIRY_SOURCES,
  DEMO_CAMPAIGNS, DEMO_TARGETS, DEMO_ENQUIRIES, DEMO_QUOTATIONS,
  DEMO_OPPORTUNITIES, DEMO_COMMISSION_ENTRIES,
} from '@/data/demo-salesx-data';
import {
  DEMO_RECEIVX_CONFIG, DEMO_REMINDER_TEMPLATES,
  DEMO_COLLECTION_EXECS, DEMO_INCENTIVE_SCHEMES,
  DEMO_PTPS_TRADING, DEMO_PTPS_SERVICES, DEMO_PTPS_MFG,
  DEMO_COMM_LOG_TRADING, DEMO_COMM_LOG_SERVICES, DEMO_COMM_LOG_MFG,
} from '@/data/demo-receivx-data';
import { loadSalesXTransactions } from '@/data/demo-transactions-salesx';

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
