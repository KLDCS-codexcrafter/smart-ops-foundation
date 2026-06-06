/**
 * @file        src/lib/demo-seeders-p81.ts
 * @sprint      P8.1 · Block 2 · New domain seeders (archetype-level)
 * @purpose     Six new domain seeders that demo the SPINE of each engine
 *              by CALLING the existing engine exports · NEVER writing
 *              storage directly when an export exists. Every record gets
 *              tracked through the manifest so purgeDemoData is safe.
 *
 *   1. seedTaskFlowDemo      · TF spine: create→ack→reassign→due-date→evidence-close + 1 open task
 *   2. seedOperixChatDemo    · 1 thread · 3-4 messages · 1 FollowUp from a promoted message
 *   3. seedFrontDeskDemo     · 2 visitors (one checked-out) · 1 inward · 1 outward · 3 contacts
 *   4. seedWebStoreXDemo     · 4-5 published items · 1 campaign (strike-through demo) · 1 testimonial
 *   5. seedEcomXDemo         · the showcase: marketplace + listings + import + settle + recon + claim
 *   6. wireAllSeeders        · single entry called from seedEntityDemoData behind options
 *
 * All seeders are individually idempotent via hasSeederRun()/markSeederRun().
 */

import {
  recordDemoEntity, recordDemoEntities, recordDemoKey,
  hasSeederRun, markSeederRun,
} from '@/lib/demo-seed-manifest';

// ─── Engine exports (CALL-ONLY · ZERO diff on engines) ─────────────────
import {
  createTask, acknowledgeTask, reassignTask, changeDueDate, changeStatus,
} from '@/lib/taskflow-engine';
import { createEvidence } from '@/lib/taskflow-accountability-engine';
import {
  createConversation, sendMessage, createFollowUp,
} from '@/lib/operix-chat-engine';
import {
  checkInVisitor, checkOutVisitor, upsertPartyContact,
} from '@/lib/frontdesk-engine';
import {
  createInwardMail, createOutwardMail,
} from '@/lib/frontdesk-records-engine';
import { publishItem } from '@/lib/webstorex-engine';
import {
  createCampaign, createTestimonial,
} from '@/lib/webstorex-commerce-engine';
import {
  createMarketplace, createListing, saveTemplate,
  parseOrderFile, commitImport,
} from '@/lib/ecomx-engine';
import {
  saveSettlementTemplate, parseSettlementFile,
  commitSettlementImport, runRecon, listReconLines, createClaimFromLine,
} from '@/lib/ecomx-recon-engine';

// ─── Engine-owned storage keys (record-sweep targets) ──────────────────
const TF_TASKS_KEY = (e: string) => `tf_tasks_${e}`;
const TF_EVIDENCE_KEY = (e: string) => `tf_evidence_${e}`;
const CHAT_CONVS_KEY = (e: string) => `chat_conversations_${e}`;
const CHAT_MSGS_KEY = (e: string) => `chat_messages_${e}`;
const CHAT_FOLLOWUPS_KEY = (e: string) => `chat_followups_${e}`;
const FD_VISITORS_KEY = (e: string) => `fd_visitors_${e}`;
const FD_MAIL_KEY = (e: string) => `fd_mail_${e}`;
const FD_CONTACTS_KEY = (e: string) => `fd_party_contacts_${e}`;
const WS_ITEMS_KEY = (e: string) => `ws_items_${e}`;
const WS_CAMPAIGNS_KEY = (e: string) => `ws_campaigns_${e}`;
const WS_TESTIMONIALS_KEY = (e: string) => `ws_testimonials_${e}`;
const EC_MARKETPLACES_KEY = (e: string) => `ec_marketplaces_${e}`;
const EC_LISTINGS_KEY = (e: string) => `ec_listings_${e}`;
const EC_CLAIMS_KEY = (e: string) => `ec_claims_${e}`;

const SEED_USER = 'demo-seeder';

function safe<T>(fn: () => T, fallback: T | null = null): T | null {
  try { return fn(); } catch { return fallback; }
}

function getFirstInventoryItemIds(limit: number): string[] {
  try {
    const raw = localStorage.getItem('erp_inventory_items');
    if (!raw) return [];
    const arr = JSON.parse(raw) as Array<{ id?: string }>;
    return arr.slice(0, limit).map((i) => i?.id).filter((x): x is string => !!x);
  } catch { return []; }
}

function getFirstCustomerId(): string | null {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return null;
    const arr = JSON.parse(raw) as Array<{ id?: string }>;
    return arr[0]?.id ?? null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────
// 2.1 · TaskFlow spine
// ─────────────────────────────────────────────────────────────────────
export function seedTaskFlowDemo(entityCode: string): void {
  if (hasSeederRun(entityCode, 'taskflow')) return;
  const tomorrowISO = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
  const dayAfterISO = new Date(Date.now() + 2 * 86400_000).toISOString().slice(0, 10);

  // Spine task: created → acknowledged → reassigned (with reason) → due-date change → evidence close
  const spine = safe(() => createTask(entityCode, {
    title: 'Demo · Month-end GST reconciliation',
    description: 'Reconcile GSTR-2B vs purchase register and lock month-end.',
    priority: 'high', category: 'finance',
    assigneeId: 'emp-001', assigneeName: 'Anita Sharma', creatorId: SEED_USER,
    departmentId: null, dependencyIds: [], watcherIds: [],
    dueDate: tomorrowISO, tags: ['demo', 'gst'], entityId: entityCode,
  }));
  if (!spine) return;
  recordDemoEntity(entityCode, TF_TASKS_KEY(entityCode), spine.id);

  safe(() => acknowledgeTask(entityCode, spine.id, 'emp-001'));
  safe(() => reassignTask(entityCode, spine.id, {
    toUserId: 'emp-002', toUserName: 'Rajat Verma',
    reason: 'Anita on planned leave · reassigning to backup',
    byUserId: SEED_USER,
  }));
  safe(() => changeDueDate(entityCode, spine.id, {
    newDate: dayAfterISO, reason: 'Buffer for vendor invoice reconciliation', byUserId: SEED_USER,
  }));

  // Evidence-mandatory close: tiny text data URL artifact via DocVault metadata path
  const evidenceDataUrl = 'data:text/plain;base64,' +
    btoa('Demo evidence · GSTR-2B reconciliation summary · all matched.');
  const ev = safe(() => createEvidence(entityCode, {
    taskId: spine.id, type: 'file',
    fileUrl: evidenceDataUrl,
    fileName: 'gstr2b-recon-summary.txt', fileType: 'text/plain',
    notes: 'Demo evidence (text artifact) for evidence-mandatory close',
    uploadedBy: SEED_USER,
  }));
  if (ev) recordDemoEntity(entityCode, TF_EVIDENCE_KEY(entityCode), ev.id);
  safe(() => changeStatus(entityCode, spine.id, 'completed', SEED_USER));

  // Open task due tomorrow (cockpit visibility)
  const open = safe(() => createTask(entityCode, {
    title: 'Demo · Approve vendor payment batch · pending finance head',
    description: 'Routine payment release · awaiting approval.',
    priority: 'medium', category: 'finance',
    assigneeId: 'emp-003', assigneeName: 'Priya Iyer', creatorId: SEED_USER,
    departmentId: null, dependencyIds: [], watcherIds: [],
    dueDate: tomorrowISO, tags: ['demo'], entityId: entityCode,
  }));
  if (open) recordDemoEntity(entityCode, TF_TASKS_KEY(entityCode), open.id);

  markSeederRun(entityCode, 'taskflow');
}

// ─────────────────────────────────────────────────────────────────────
// 2.2 · OperixChat thread + promoted FollowUp
// ─────────────────────────────────────────────────────────────────────
export function seedOperixChatDemo(entityCode: string): void {
  if (hasSeederRun(entityCode, 'operix-chat')) return;

  const conv = safe(() => createConversation(entityCode, {
    channelType: 'direct',
    createdByUserId: 'emp-001',
    ownerId: 'emp-001',
    participantUserIds: ['emp-001', 'emp-002'],
    title: 'Demo · Q4 collections sync',
  } as Parameters<typeof createConversation>[1]));
  if (!conv) return;
  recordDemoEntity(entityCode, CHAT_CONVS_KEY(entityCode), conv.id);

  const msgIds: string[] = [];
  for (const [sender, body] of [
    ['emp-001', 'Pinging on the Acme Industries dues — any update?'],
    ['emp-002', 'Following up tomorrow · expect cheque by Friday.'],
    ['emp-001', 'Please log a PTP entry and attach the conversation snapshot.'],
    ['emp-002', 'Done · marking this thread for follow-up next Monday.'],
  ] as const) {
    const m = safe(() => sendMessage(entityCode, conv.id, {
      senderId: sender, type: 'text', content: body,
    } as Parameters<typeof sendMessage>[2]));
    if (m) { msgIds.push(m.id); }
  }
  recordDemoEntities(entityCode, CHAT_MSGS_KEY(entityCode), msgIds);

  // Promote the last message into a FollowUp
  const fu = msgIds.length > 0 ? safe(() => createFollowUp(entityCode, {
    conversationId: conv.id,
    messageId: msgIds[msgIds.length - 1],
    note: 'Confirm Acme cheque on Monday',
    assigneeId: 'emp-002',
    dueDate: new Date(Date.now() + 3 * 86400_000).toISOString().slice(0, 10),
    createdByUserId: 'emp-001',
  })) : null;
  if (fu) recordDemoEntity(entityCode, CHAT_FOLLOWUPS_KEY(entityCode), fu.id);

  markSeederRun(entityCode, 'operix-chat');
}

// ─────────────────────────────────────────────────────────────────────
// 2.3 · FrontDesk · 2 visitors · 1 inward · 1 outward · 3 contacts
// ─────────────────────────────────────────────────────────────────────
export function seedFrontDeskDemo(entityCode: string): void {
  if (hasSeederRun(entityCode, 'frontdesk')) return;

  // Visitors
  const v1 = safe(() => checkInVisitor(entityCode, SEED_USER, {
    name: 'Suresh Kumar', company: 'Apex Components',
    purpose: 'meeting', hostEmployeeId: 'emp-001', hostName: 'Anita Sharma',
  } as Parameters<typeof checkInVisitor>[2]));
  if (v1) {
    recordDemoEntity(entityCode, FD_VISITORS_KEY(entityCode), v1.id);
    safe(() => checkOutVisitor(entityCode, v1.id, SEED_USER));
  }
  const v2 = safe(() => checkInVisitor(entityCode, SEED_USER, {
    name: 'Meera Joshi', company: 'Bharat Logistics',
    purpose: 'delivery', hostEmployeeId: 'emp-002', hostName: 'Rajat Verma',
  } as Parameters<typeof checkInVisitor>[2]));
  if (v2) recordDemoEntity(entityCode, FD_VISITORS_KEY(entityCode), v2.id);

  // Mail · 1 inward (courier with AWB) + 1 outward
  const inward = safe(() => createInwardMail(entityCode, {
    kind: 'parcel', description: 'Courier · spare parts samples from Apex',
    courierName: 'Bluedart', awbDocketNo: 'BD-9182-001',
    toEmployeeId: 'emp-001', toEmployeeName: 'Anita Sharma',
    createdByUserId: SEED_USER, entityId: entityCode,
  }));
  if (inward) recordDemoEntity(entityCode, FD_MAIL_KEY(entityCode), inward.id);

  const outward = safe(() => createOutwardMail(entityCode, {
    kind: 'parcel', description: 'Outward · signed agreement copy to Bharat Logistics',
    courierName: 'DTDC', awbDocketNo: 'DT-7700-AA',
    toText: 'Bharat Logistics · Kolkata',
    createdByUserId: SEED_USER, entityId: entityCode,
  }));
  if (outward) recordDemoEntity(entityCode, FD_MAIL_KEY(entityCode), outward.id);

  // Party contacts · use a real customer if present
  const partyId = getFirstCustomerId() ?? 'cust-demo-anchor';
  const todayMD = new Date().toISOString().slice(5, 10); // MM-DD
  const contacts = [
    { name: 'Vikram Singh', designation: 'Procurement Head', birthday: todayMD },
    { name: 'Sneha Patil', designation: 'Accounts Manager', birthday: null },
    { name: 'Arjun Rao', designation: 'CFO', birthday: null },
  ];
  for (const c of contacts) {
    const created = safe(() => upsertPartyContact(entityCode, {
      partyId, name: c.name, designation: c.designation,
      birthday: c.birthday,
      createdByUserId: SEED_USER,
    }));
    if (created) recordDemoEntity(entityCode, FD_CONTACTS_KEY(entityCode), created.id);
  }

  markSeederRun(entityCode, 'frontdesk');
}

// ─────────────────────────────────────────────────────────────────────
// 2.4 · WebStoreX · publish from masters · 1 campaign · 1 testimonial
// ─────────────────────────────────────────────────────────────────────
export function seedWebStoreXDemo(entityCode: string): string[] {
  if (hasSeederRun(entityCode, 'webstorex')) return [];

  const masterIds = getFirstInventoryItemIds(5);
  const publishedIds: string[] = [];
  for (let i = 0; i < masterIds.length; i++) {
    const wsItem = safe(() => publishItem(entityCode, masterIds[i], SEED_USER, {
      storeTitle: undefined,
      listPrice: 999 + i * 100,
    }));
    if (wsItem) {
      publishedIds.push(wsItem.id);
      recordDemoEntity(entityCode, WS_ITEMS_KEY(entityCode), wsItem.id);
    }
  }

  // Live campaign · strike-through demo · ends 30 days out
  if (publishedIds.length > 0) {
    const start = new Date(Date.now() - 86400_000).toISOString();
    const end = new Date(Date.now() + 30 * 86400_000).toISOString();
    const campaign = safe(() => createCampaign(entityCode, {
      name: 'Demo · Festive Launch Offer',
      startsAt: start, endsAt: end,
      collectionItemIds: publishedIds,
      offerPrices: publishedIds.map((id, i) => ({
        storeItemId: id, offerPrice: 799 + i * 100,
      })),
      isActive: true,
    } as Parameters<typeof createCampaign>[1]));
    if (campaign) recordDemoEntity(entityCode, WS_CAMPAIGNS_KEY(entityCode), campaign.id);
  }

  // Testimonial
  const testimonial = safe(() => createTestimonial(entityCode, {
    customerName: 'Rohit Mehra', company: 'Mehra Traders',
    text: 'Quick fulfilment and clean invoicing. Highly recommended.',
    rating: 5, isPublished: true, createdByUserId: SEED_USER,
  } as Parameters<typeof createTestimonial>[1]));
  if (testimonial) recordDemoEntity(entityCode, WS_TESTIMONIALS_KEY(entityCode), testimonial.id);

  markSeederRun(entityCode, 'webstorex');
  return publishedIds;
}

// ─────────────────────────────────────────────────────────────────────
// 2.5 · EcomX showcase chain · the big one
// ─────────────────────────────────────────────────────────────────────
export function seedEcomXDemo(entityCode: string, publishedStoreItemIds: string[]): void {
  if (hasSeederRun(entityCode, 'ecomx')) return;
  if (publishedStoreItemIds.length < 2) return;

  // Marketplace (amazon-type, default rates)
  const mkt = safe(() => createMarketplace(entityCode, {
    name: 'Demo Amazon Storefront', type: 'amazon',
    sellerId: 'DEMOSELLER-001',
    commissionPctDefault: 15, tds194oPct: 0.1, gstTcsPct: 1,
    partyMode: 'end_customer',
    byUserId: SEED_USER,
  }));
  if (!mkt) { markSeederRun(entityCode, 'ecomx'); return; }
  recordDemoEntity(entityCode, EC_MARKETPLACES_KEY(entityCode), mkt.id);

  // Two simple listings + one kit listing
  const sku1 = 'DEMO-SKU-001', sku2 = 'DEMO-SKU-002', skuKit = 'DEMO-KIT-001';
  const l1 = safe(() => createListing(entityCode, {
    marketplaceId: mkt.id, marketplaceSku: sku1, kind: 'simple',
    storeItemId: publishedStoreItemIds[0], title: 'Demo Listing 1',
  } as Parameters<typeof createListing>[1]));
  const l2 = safe(() => createListing(entityCode, {
    marketplaceId: mkt.id, marketplaceSku: sku2, kind: 'simple',
    storeItemId: publishedStoreItemIds[1], title: 'Demo Listing 2',
  } as Parameters<typeof createListing>[1]));
  const kit = safe(() => createListing(entityCode, {
    marketplaceId: mkt.id, marketplaceSku: skuKit, kind: 'kit',
    title: 'Demo Kit (2 components)',
    components: [
      { storeItemId: publishedStoreItemIds[0], qty: 1 },
      { storeItemId: publishedStoreItemIds[1], qty: 1 },
    ],
  } as Parameters<typeof createListing>[1]));
  for (const l of [l1, l2, kit]) {
    if (l) recordDemoEntity(entityCode, EC_LISTINGS_KEY(entityCode), l.id);
  }

  // Template + synthesized order rows
  const tmpl = safe(() => saveTemplate(entityCode, {
    marketplaceId: mkt.id, name: 'Demo Amazon Template',
    columnMap: {
      'order_id': 'order_id', 'sku': 'sku', 'qty': 'qty',
      'unit_price': 'unit_price', 'line_total': 'line_total',
      'buyer_name': 'buyer_name', 'buyer_state': 'buyer_state',
      'buyer_gstin': 'buyer_gstin', 'order_date': 'order_date',
    },
  }));
  if (!tmpl) { markSeederRun(entityCode, 'ecomx'); return; }

  const today = new Date().toISOString().slice(0, 10);
  const orderRows = [
    // b2c
    { order_id: 'AMZ-1001', sku: sku1, qty: '1', unit_price: '999', line_total: '999',
      buyer_name: 'Vikas C', buyer_state: 'WB', buyer_gstin: '', order_date: today },
    // b2c
    { order_id: 'AMZ-1002', sku: sku2, qty: '2', unit_price: '1099', line_total: '2198',
      buyer_name: 'Priya N', buyer_state: 'MH', buyer_gstin: '', order_date: today },
    // b2b GSTIN-matched
    { order_id: 'AMZ-1003', sku: sku1, qty: '3', unit_price: '999', line_total: '2997',
      buyer_name: 'Acme Pvt Ltd', buyer_state: 'KA',
      buyer_gstin: '29AAACA1234A1Z5', order_date: today },
    // b2b unmatched (parked)
    { order_id: 'AMZ-1004', sku: sku2, qty: '1', unit_price: '1099', line_total: '1099',
      buyer_name: 'Unknown Buyer LLP', buyer_state: 'TN',
      buyer_gstin: '33ZZZZA9999Z9Z9', order_date: today },
    // kit
    { order_id: 'AMZ-1005', sku: skuKit, qty: '1', unit_price: '1899', line_total: '1899',
      buyer_name: 'Kit Customer', buyer_state: 'GJ', buyer_gstin: '', order_date: today },
  ];
  const parseReport = safe(() => parseOrderFile(
    entityCode, mkt.id, tmpl.id, orderRows, 'demo-orders.csv',
  ));
  if (!parseReport) { markSeederRun(entityCode, 'ecomx'); return; }
  safe(() => commitImport(entityCode, parseReport.importId, SEED_USER));

  // Settlement: short-pay on AMZ-1001
  const stTmpl = safe(() => saveSettlementTemplate(entityCode, {
    marketplaceId: mkt.id, name: 'Demo Amazon Settlement',
    columnMap: {
      'order_id': 'order_id', 'event_type': 'event_type',
      'gross': 'gross', 'commission': 'commission',
      'tds': 'tds_194o', 'tcs': 'gst_tcs',
      'net': 'net', 'settlement_date': 'settlement_date',
    },
  }));
  if (!stTmpl) { markSeederRun(entityCode, 'ecomx'); return; }

  const settlementRows = [
    { order_id: 'AMZ-1001', event_type: 'sale', gross: '999', commission: '150',
      tds: '1', tcs: '10', net: '700', settlement_date: today }, // short-pay vs 999
    { order_id: 'AMZ-1002', event_type: 'sale', gross: '2198', commission: '330',
      tds: '2.2', tcs: '22', net: '1843.8', settlement_date: today },
  ];
  const stParse = safe(() => parseSettlementFile(entityCode, mkt.id, stTmpl.id, {
    rows: settlementRows,
  } as Parameters<typeof parseSettlementFile>[3]));
  if (!stParse) { markSeederRun(entityCode, 'ecomx'); return; }
  safe(() => commitSettlementImport(entityCode, mkt.id, stParse.importId));

  // Recon for today's period
  safe(() => runRecon(entityCode, mkt.id, today, today));

  // Claim on first short-pay recon line
  const lines = safe(() => listReconLines(entityCode, mkt.id), []) ?? [];
  const shortPay = lines.find((l) => l.varianceClass === 'short_pay');
  if (shortPay) {
    const claim = safe(() => createClaimFromLine(
      entityCode, shortPay.id, 'Demo · auto-raised on short_pay',
    ));
    if (claim) recordDemoEntity(entityCode, EC_CLAIMS_KEY(entityCode), claim.id);
  }

  markSeederRun(entityCode, 'ecomx');
}

// ─────────────────────────────────────────────────────────────────────
// 2.6 · Wire all six (called from seedEntityDemoData behind options)
// ─────────────────────────────────────────────────────────────────────
export interface P81SeedOptions {
  includeTaskFlow?: boolean;
  includeOperixChat?: boolean;
  includeFrontDesk?: boolean;
  includeWebStoreX?: boolean;
  includeEcomX?: boolean;
}

const ALL_ON: Required<P81SeedOptions> = {
  includeTaskFlow: true, includeOperixChat: true, includeFrontDesk: true,
  includeWebStoreX: true, includeEcomX: true,
};

export function seedP81DomainPack(
  entityCode: string,
  options?: P81SeedOptions,
): void {
  const o = { ...ALL_ON, ...(options ?? {}) };

  // Mark every retrofit key as demo-owned (Block 1 retrofit path) — orchestrator
  // owns the entire key contents, so whole-key purge is correct.
  recordDemoKey(entityCode, `erp_sam_persons_${entityCode}`);
  recordDemoKey(entityCode, `erp_enquiries_${entityCode}`);
  recordDemoKey(entityCode, `erp_quotations_${entityCode}`);
  recordDemoKey(entityCode, `erp_opportunities_${entityCode}`);
  recordDemoKey(entityCode, `erp_campaigns_${entityCode}`);
  recordDemoKey(entityCode, `erp_leads_${entityCode}`);

  if (o.includeTaskFlow) seedTaskFlowDemo(entityCode);
  if (o.includeOperixChat) seedOperixChatDemo(entityCode);
  if (o.includeFrontDesk) seedFrontDeskDemo(entityCode);

  let publishedIds: string[] = [];
  if (o.includeWebStoreX) publishedIds = seedWebStoreXDemo(entityCode);
  if (o.includeEcomX) {
    // EcomX listings need published items; if WebStoreX was off, attempt minimal publish
    if (publishedIds.length < 2) publishedIds = seedWebStoreXDemo(entityCode);
    seedEcomXDemo(entityCode, publishedIds);
  }
}
