/**
 * @file        src/lib/ecomx-engine.ts
 * @purpose     S153 · EcomX Channel Foundation · DP-EC-0…5 · rename ceremony complete (unicomm→ecomx)
 *              Marketplace registry · listings + kits · unmapped-SKU inbox · import templates ·
 *              parse-then-commit ingestion that creates REAL Sales Order vouchers via the existing
 *              ordersKey storage path (mirrors webstorex-order-engine.writeSalesOrderVoucher pattern
 *              — imports the helpers, copies the pattern, never imports webstorex-order-engine).
 * @sprint      Sprint 153 · EcomX Channel Foundation
 * @reads-from  webstorex-engine (CALL ONLY · PIM listStoreItems/getStoreItem/listVariants) ·
 *              party-master-engine (CALL ONLY · loadPartyMaster/findPartyByName/upsertParty/
 *              generatePartyCode) · fincore-engine.generateDocNo / fyForDate (CALL ONLY) ·
 *              audit-trail-engine.logAudit · @/types/order (Order/OrderLine + ordersKey).
 * @walls       §H 0-DIFF: webstorex-order-engine.ts · webstorex-engine.ts · webstorex-commerce-engine.ts ·
 *              party-master-engine.ts · fincore-engine.ts — NEVER edited. NO new runtime deps.
 *              NO settlement/recon/returns/claims (S154) · NO cockpit/evidence (S155).
 * @JWT         P2BB: real marketplace API ingestion · settlement reports · payment reconciliation.
 */
import type { Order, OrderLine } from '@/types/order';
import { ordersKey } from '@/types/order';
import { generateDocNo, fyForDate } from '@/lib/fincore-engine';
import { getStoreItem, listVariants } from '@/lib/webstorex-engine';
import {
  loadPartyMaster, findPartyByName, upsertParty,
} from '@/lib/party-master-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { publish as publishNotification } from '@/lib/notification-engine'; // P82 Block 2 · publisher #8 · ecomx.unmapped_sku_recorded · NEW-record branch ONLY
import type {
  EcMarketplace, EcMarketplaceType, EcPartyMode,
  EcListing, EcListingKind, EcKitComponent,
  EcUnmappedSku, EcColumnKey, EcImportTemplate,
  EcParseReport, EcParseRowError, EcStagedOrder,
  EcOrder, EcOrderLayer,
} from '@/types/ecomx';
import {
  ecMarketplacesKey, ecListingsKey, ecUnmappedKey, ecTemplatesKey,
  ecParseReportsKey, ecOrdersKey, ecStagedKey,
} from '@/types/ecomx';

// ─── tiny LS helpers (matches the house ls/ss pattern) ───
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}
function nowIso(nowISO?: string): string { return nowISO ?? new Date().toISOString(); }
function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function safeAudit(
  entityCode: string, action: 'create' | 'update' | 'cancel',
  recordId: string, label: string,
  before: Record<string, unknown> | null, after: Record<string, unknown> | null,
  reason?: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'webstorex_event',
      recordId, recordLabel: label,
      beforeState: before, afterState: after,
      reason: reason ?? null, sourceModule: 'ecomx-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// MARKETPLACE REGISTRY
// ═══════════════════════════════════════════════════════════════════════
export function listMarketplaces(entityCode: string): EcMarketplace[] {
  return ls<EcMarketplace>(ecMarketplacesKey(entityCode));
}

export interface CreateMarketplaceInput {
  name: string;
  type: EcMarketplaceType;
  sellerId?: string;
  commissionPctDefault?: number;
  tds194oPct?: number;                // configurable — DP-EC-2 never hardcoded
  gstTcsPct?: number;
  partyMode?: EcPartyMode;            // default 'end_customer'
  facilityGodownId?: string | null;
  notes?: string;
  byUserId?: string;
}

/** Create marketplace · if partyMode='end_customer' ensures the consolidated B2C ledger party. */
export function createMarketplace(
  entityCode: string, input: CreateMarketplaceInput, nowISO?: string,
): EcMarketplace {
  if (!input.name?.trim()) throw new Error('marketplace name required');
  const ts = nowIso(nowISO);
  const partyMode: EcPartyMode = input.partyMode ?? 'end_customer';

  let consolidatedB2CPartyId: string | null = null;
  if (partyMode === 'end_customer') {
    consolidatedB2CPartyId = ensureConsolidatedB2CParty(
      entityCode, input.name.trim(), input.byUserId ?? 'ecomx-engine',
    );
  }

  const rec: EcMarketplace = {
    id: newId('mkt'),
    name: input.name.trim(),
    type: input.type,
    sellerId: (input.sellerId ?? '').trim(),
    commissionPctDefault: input.commissionPctDefault ?? 15,
    tds194oPct: input.tds194oPct ?? 0.1,          // DP-EC-2 default · configurable
    gstTcsPct: input.gstTcsPct ?? 1,
    partyMode,
    consolidatedB2CPartyId,
    facilityGodownId: input.facilityGodownId ?? null,
    isActive: true,
    createdAt: ts,
    notes: (input.notes ?? '').trim(),
  };
  const all = ls<EcMarketplace>(ecMarketplacesKey(entityCode));
  ss(ecMarketplacesKey(entityCode), [...all, rec]);
  safeAudit(entityCode, 'create', rec.id, `EcomX marketplace · ${rec.name}`,
    null, rec as unknown as Record<string, unknown>);
  return rec;
}

export function updateMarketplace(
  entityCode: string, id: string,
  patch: Partial<Omit<EcMarketplace, 'id' | 'createdAt'>>,
): EcMarketplace {
  const all = ls<EcMarketplace>(ecMarketplacesKey(entityCode));
  const idx = all.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error('marketplace not found');
  const before = { ...all[idx] };
  const updated: EcMarketplace = { ...all[idx], ...patch, id: all[idx].id, createdAt: all[idx].createdAt };
  all[idx] = updated;
  ss(ecMarketplacesKey(entityCode), all);
  safeAudit(entityCode, 'update', id, `EcomX marketplace · ${updated.name}`,
    before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

export function setMarketplaceActive(entityCode: string, id: string, isActive: boolean): EcMarketplace {
  return updateMarketplace(entityCode, id, { isActive });
}

/** Idempotent — returns existing partyId if "<Name> B2C Customers" already exists. */
function ensureConsolidatedB2CParty(entityCode: string, marketplaceName: string, byUserId: string): string {
  const partyName = `${marketplaceName} B2C Customers`;
  const existing = findPartyByName(entityCode, partyName);
  if (existing) return existing.id;
  const result = upsertParty({
    entity_id: entityCode,
    party_name: partyName,
    party_type: 'customer',
    gstin: null,
    state_code: null,
    created_via_quick_add: false,
    created_by: byUserId,
  });
  return result.party.id;
}

// ═══════════════════════════════════════════════════════════════════════
// LISTINGS
// ═══════════════════════════════════════════════════════════════════════
export function listListings(entityCode: string, marketplaceId?: string): EcListing[] {
  const all = ls<EcListing>(ecListingsKey(entityCode));
  return marketplaceId ? all.filter((l) => l.marketplaceId === marketplaceId) : all;
}

export interface CreateListingInput {
  marketplaceId: string;
  marketplaceSku: string;
  kind: EcListingKind;
  title: string;
  storeItemId?: string | null;
  variantId?: string | null;
  components?: EcKitComponent[];
}

export function createListing(entityCode: string, input: CreateListingInput, nowISO?: string): EcListing {
  if (!input.marketplaceId) throw new Error('marketplaceId required');
  if (!input.marketplaceSku?.trim()) throw new Error('marketplaceSku required');
  if (!input.title?.trim()) throw new Error('listing title required');

  // dedupe key (marketplaceId, marketplaceSku)
  const existing = listListings(entityCode, input.marketplaceId)
    .find((l) => l.marketplaceSku === input.marketplaceSku.trim());
  if (existing) throw new Error(`marketplaceSku already mapped: ${input.marketplaceSku}`);

  if (input.kind === 'simple') {
    if (!input.storeItemId) throw new Error('simple listing requires storeItemId');
    const item = getStoreItem(entityCode, input.storeItemId);
    if (!item) throw new Error(`Unknown store item: ${input.storeItemId}`);
    if (input.variantId) {
      const variants = listVariants(entityCode, input.storeItemId);
      if (!variants.some((v) => v.id === input.variantId)) {
        throw new Error(`Unknown variant: ${input.variantId}`);
      }
    }
  } else {
    const comps = input.components ?? [];
    if (comps.length < 1) throw new Error('kit listing requires ≥1 component (DP-EC-3)');
    for (const c of comps) {
      if (c.qty < 1) throw new Error(`kit component qty must be ≥1`);
      const it = getStoreItem(entityCode, c.storeItemId);
      if (!it) throw new Error(`kit component unknown store item: ${c.storeItemId}`);
      if (c.variantId) {
        const variants = listVariants(entityCode, c.storeItemId);
        if (!variants.some((v) => v.id === c.variantId)) {
          throw new Error(`kit component unknown variant: ${c.variantId}`);
        }
      }
    }
  }

  const ts = nowIso(nowISO);
  const rec: EcListing = {
    id: newId('lst'),
    marketplaceId: input.marketplaceId,
    marketplaceSku: input.marketplaceSku.trim(),
    kind: input.kind,
    storeItemId: input.kind === 'simple' ? (input.storeItemId ?? null) : null,
    variantId: input.kind === 'simple' ? (input.variantId ?? null) : null,
    components: input.kind === 'kit' ? (input.components ?? []) : [],
    status: 'live',
    title: input.title.trim(),
    createdAt: ts,
    updatedAt: ts,
  };
  const all = ls<EcListing>(ecListingsKey(entityCode));
  ss(ecListingsKey(entityCode), [...all, rec]);
  safeAudit(entityCode, 'create', rec.id, `EcomX listing · ${rec.marketplaceSku}`,
    null, rec as unknown as Record<string, unknown>);
  return rec;
}

export function updateListing(
  entityCode: string, id: string,
  patch: Partial<Pick<EcListing, 'status' | 'title' | 'storeItemId' | 'variantId' | 'components'>>,
  nowISO?: string,
): EcListing {
  const all = ls<EcListing>(ecListingsKey(entityCode));
  const idx = all.findIndex((l) => l.id === id);
  if (idx < 0) throw new Error('listing not found');
  const before = { ...all[idx] };
  const updated: EcListing = { ...all[idx], ...patch, updatedAt: nowIso(nowISO) };
  all[idx] = updated;
  ss(ecListingsKey(entityCode), all);
  safeAudit(entityCode, 'update', id, `EcomX listing · ${updated.marketplaceSku}`,
    before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>);
  return updated;
}

/** Map a marketplaceSku → listing for the importer. Returns null when unknown. */
export function resolveListing(
  entityCode: string, marketplaceId: string, marketplaceSku: string,
): EcListing | null {
  return listListings(entityCode, marketplaceId)
    .find((l) => l.marketplaceSku === marketplaceSku && l.status !== 'unmapped') ?? null;
}

// ═══════════════════════════════════════════════════════════════════════
// UNMAPPED SKU INBOX
// ═══════════════════════════════════════════════════════════════════════
export function listUnmappedSkus(entityCode: string): EcUnmappedSku[] {
  return ls<EcUnmappedSku>(ecUnmappedKey(entityCode));
}

export function recordUnmappedSku(
  entityCode: string, marketplaceId: string, marketplaceSku: string,
  sampleTitle: string, nowISO?: string,
): EcUnmappedSku {
  const all = ls<EcUnmappedSku>(ecUnmappedKey(entityCode));
  const existing = all.find((u) =>
    u.marketplaceId === marketplaceId && u.marketplaceSku === marketplaceSku && !u.resolvedListingId);
  const ts = nowIso(nowISO);
  if (existing) {
    existing.occurrences += 1;
    if (!existing.sampleTitle && sampleTitle) existing.sampleTitle = sampleTitle;
    ss(ecUnmappedKey(entityCode), all);
    return existing;
  }
  const rec: EcUnmappedSku = {
    id: newId('umsku'), marketplaceId, marketplaceSku,
    sampleTitle: sampleTitle ?? '', firstSeenAt: ts,
    occurrences: 1, resolvedListingId: null,
  };
  ss(ecUnmappedKey(entityCode), [...all, rec]);
  // P82 Block 2 · publisher #8 · ecomx.unmapped_sku_recorded · NEW-record branch ONLY (existing-increment branch above returns without publishing)
  publishNotification({
    eventKey: `ecomx:unmapped:${entityCode}:${rec.id}`,
    entityCode, targetUserId: '*', kind: 'ecomx.unmapped_sku_recorded',
    source: 'ecomx-engine', cardId: 'ecomx',
    severity: 'warning', title: `Unmapped SKU · ${marketplaceSku}`,
    body: sampleTitle || null,
    deepLink: '/erp/ecomx/unmapped', refType: 'unmapped_sku', refId: rec.id,
  });
  return rec;
}

export function resolveUnmappedSku(
  entityCode: string, unmappedId: string, listingInput: CreateListingInput, nowISO?: string,
): { listing: EcListing; unmapped: EcUnmappedSku } {
  const all = ls<EcUnmappedSku>(ecUnmappedKey(entityCode));
  const idx = all.findIndex((u) => u.id === unmappedId);
  if (idx < 0) throw new Error('unmapped sku not found');
  if (all[idx].resolvedListingId) throw new Error('already resolved');
  const listing = createListing(entityCode, listingInput, nowISO);
  all[idx].resolvedListingId = listing.id;
  ss(ecUnmappedKey(entityCode), all);
  return { listing, unmapped: all[idx] };
}

// ═══════════════════════════════════════════════════════════════════════
// TEMPLATES + COLUMN MAP HEURISTICS
// ═══════════════════════════════════════════════════════════════════════
export function listTemplates(entityCode: string, marketplaceId?: string): EcImportTemplate[] {
  const all = ls<EcImportTemplate>(ecTemplatesKey(entityCode));
  return marketplaceId ? all.filter((t) => t.marketplaceId === marketplaceId) : all;
}

export function saveTemplate(
  entityCode: string,
  input: { marketplaceId: string; name: string; columnMap: Record<string, EcColumnKey> },
  nowISO?: string,
): EcImportTemplate {
  if (!input.marketplaceId) throw new Error('marketplaceId required');
  if (!input.name?.trim()) throw new Error('template name required');
  const ts = nowIso(nowISO);
  const rec: EcImportTemplate = {
    id: newId('tmpl'),
    marketplaceId: input.marketplaceId,
    name: input.name.trim(),
    columnMap: { ...input.columnMap },
    createdAt: ts,
  };
  const all = ls<EcImportTemplate>(ecTemplatesKey(entityCode));
  ss(ecTemplatesKey(entityCode), [...all, rec]);
  return rec;
}

/** Heuristic header→semantic key suggestions per marketplace type. STARTING SUGGESTIONS only. */
export function suggestColumnMap(
  headers: string[], type: EcMarketplaceType,
): Record<string, EcColumnKey> {
  const map: Record<string, EcColumnKey> = {};
  for (const raw of headers) {
    const h = (raw ?? '').toLowerCase().trim();
    map[raw] = matchHeader(h, type);
  }
  return map;
}

function matchHeader(h: string, type: EcMarketplaceType): EcColumnKey {
  // Generic patterns first
  if (/(^|\b)(order[\s_-]*id|order[\s_-]*no|sub[\s_-]*order|order[\s_-]*number)\b/.test(h)) return 'order_id';
  if (/(order[\s_-]*date|purchase[\s_-]*date|date[\s_-]*ordered)/.test(h)) return 'order_date';
  if (/(buyer[\s_-]*gstin|customer[\s_-]*gstin|gstin|tax[\s_-]*registration[\s_-]*id)/.test(h)) return 'buyer_gstin';
  if (/(buyer[\s_-]*name|customer[\s_-]*name|ship[\s_-]*to[\s_-]*name)/.test(h)) return 'buyer_name';
  if (/(state|ship[\s_-]*state|buyer[\s_-]*state|customer[\s_-]*state)/.test(h)) return 'buyer_state';
  if (/(city|ship[\s_-]*city)/.test(h)) return 'ship_city';
  if (/(qty|quantity|units)/.test(h)) return 'qty';
  if (/(line[\s_-]*total|item[\s_-]*total|principal[\s_-]*amount|total[\s_-]*amount|amount)/.test(h)) return 'line_total';
  if (/(unit[\s_-]*price|selling[\s_-]*price|item[\s_-]*price|mrp|price)/.test(h)) return 'unit_price';

  // Marketplace-specific SKU heuristics
  if (type === 'amazon' && /(asin|sku|merchant[\s_-]*sku)/.test(h)) return 'sku';
  if (type === 'flipkart' && /(fsn|sku)/.test(h)) return 'sku';
  if (type === 'meesho' && /(sku|product[\s_-]*id)/.test(h)) return 'sku';
  if (/(sku|item[\s_-]*sku|product[\s_-]*sku)/.test(h)) return 'sku';

  return 'ignore';
}

// ═══════════════════════════════════════════════════════════════════════
// PARSE + COMMIT — the ingestion core (DP-EC-4 honest triad · DP-EC-5 dual layer)
// ═══════════════════════════════════════════════════════════════════════
const MAX_ERROR_ROWS = 200;

/** Pure parse → EcParseReport + sidecar staged orders. NO business writes. */
export function parseOrderFile(
  entityCode: string,
  marketplaceId: string,
  templateId: string,
  rows: Record<string, string>[],
  fileName: string,
  nowISO?: string,
): EcParseReport {
  if (!marketplaceId) throw new Error('marketplaceId required');
  const ts = nowIso(nowISO);
  const importId = newId('imp');

  const template = listTemplates(entityCode).find((t) => t.id === templateId);
  if (!template) throw new Error(`template not found: ${templateId}`);

  // Build header inverse: semantic key → first header carrying it
  const inv: Partial<Record<EcColumnKey, string>> = {};
  for (const [header, key] of Object.entries(template.columnMap)) {
    if (key !== 'ignore' && !inv[key]) inv[key] = header;
  }

  // Group by marketplaceOrderId
  const groups = new Map<string, EcStagedOrder>();
  const errors: EcParseRowError[] = [];
  let invalidRows = 0;
  let unknownSkuRows = 0;
  let validRows = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const get = (k: EcColumnKey): string => {
      const h = inv[k]; return h ? (r[h] ?? '').toString().trim() : '';
    };
    const orderId = get('order_id');
    const sku = get('sku');
    const qtyStr = get('qty');
    const qty = Number.parseFloat(qtyStr);
    if (!orderId || !sku || !qtyStr || !Number.isFinite(qty) || qty <= 0) {
      invalidRows += 1;
      if (errors.length < MAX_ERROR_ROWS) {
        errors.push({
          rowIndex: i,
          reason: !orderId ? 'missing order_id'
            : !sku ? 'missing sku'
            : !qtyStr || !Number.isFinite(qty) ? 'invalid qty'
            : 'qty must be > 0',
          raw: JSON.stringify(r),
        });
      }
      continue;
    }
    const unitPrice = parseFloat(get('unit_price') || '0') || 0;
    const lineTotal = parseFloat(get('line_total') || '0') || +(qty * unitPrice).toFixed(2);
    const gstinRaw = get('buyer_gstin');
    const gstin = gstinRaw ? gstinRaw.toUpperCase() : null;

    // Track unknown SKU rows (still valid for the staging step — resolved at commit)
    const mapped = resolveListing(entityCode, marketplaceId, sku);
    if (!mapped) {
      unknownSkuRows += 1;
      recordUnmappedSku(entityCode, marketplaceId, sku, get('buyer_name') || sku, ts);
      // do NOT stage — but do NOT count as invalid; counted as unknownSkuRows
      continue;
    }

    let g = groups.get(orderId);
    if (!g) {
      g = {
        marketplaceOrderId: orderId,
        orderDate: get('order_date') || ts.split('T')[0],
        buyerName: get('buyer_name'),
        buyerState: get('buyer_state'),
        buyerGstin: gstin,
        lines: [],
      };
      groups.set(orderId, g);
    }
    g.lines.push({ marketplaceSku: sku, qty, unitPrice, lineTotal });
    validRows += 1;
  }

  const report: EcParseReport = {
    importId, fileName,
    totalRows: rows.length,
    validRows, unknownSkuRows, invalidRows,
    errors, createdAt: ts,
  };
  const reports = ls<EcParseReport>(ecParseReportsKey(entityCode));
  ss(ecParseReportsKey(entityCode), [...reports, report]);

  // sidecar staged orders — consumed and cleared by commitImport
  const staged = Array.from(groups.values());
  ss(ecStagedKey(entityCode, importId), staged);
  return report;
}

export interface CommitResult {
  importId: string;
  booked: number;
  parked: number;
  skippedDuplicates: number;
}

/** Idempotent — re-run on same staged rows creates ZERO orders + ZERO vouchers. */
export function commitImport(
  entityCode: string, importId: string, byUserId = 'ecomx-engine', nowISO?: string,
): CommitResult {
  const reports = ls<EcParseReport>(ecParseReportsKey(entityCode));
  const report = reports.find((r) => r.importId === importId);
  if (!report) throw new Error(`parse report not found: ${importId}`);
  // marketplaceId is inferred from the first staged listing → marketplace lookup
  const staged = ls<EcStagedOrder>(ecStagedKey(entityCode, importId));

  const counters: CommitResult = { importId, booked: 0, parked: 0, skippedDuplicates: 0 };
  if (!staged.length) return counters;

  // Resolve marketplaceId via the first listing of the first row
  const first = staged[0]?.lines[0];
  if (!first) return counters;
  const allListings = ls<EcListing>(ecListingsKey(entityCode));
  const firstListing = allListings.find((l) => l.marketplaceSku === first.marketplaceSku);
  if (!firstListing) throw new Error('staged data orphaned — listing vanished between parse and commit');
  const marketplaceId = firstListing.marketplaceId;

  const marketplace = listMarketplaces(entityCode).find((m) => m.id === marketplaceId);
  if (!marketplace) throw new Error(`marketplace not found: ${marketplaceId}`);

  const existingEc = ls<EcOrder>(ecOrdersKey(entityCode));
  const dedupeSet = new Set(
    existingEc.filter((o) => o.marketplaceId === marketplaceId)
      .map((o) => o.marketplaceOrderId),
  );

  for (const stg of staged) {
    if (dedupeSet.has(stg.marketplaceOrderId)) { counters.skippedDuplicates += 1; continue; }
    const result = bookOrder(entityCode, marketplace, stg, importId, byUserId, nowISO);
    if (result.booked) counters.booked += 1;
    else counters.parked += 1;
    dedupeSet.add(stg.marketplaceOrderId);
  }

  // Clear the sidecar — re-run becomes a no-op (idempotency).
  ss(ecStagedKey(entityCode, importId), []);
  return counters;
}

/**
 * Single booking path shared by commitImport and resolveUnmatchedOrder (BLOCK 4).
 * Returns { booked:true } when SO written, { booked:false } when parked b2b_unmatched.
 */
function bookOrder(
  entityCode: string, marketplace: EcMarketplace, stg: EcStagedOrder,
  importId: string, byUserId: string, nowISO?: string,
  forcePartyId?: string,            // used by resolveUnmatchedOrder
): { booked: boolean; ecOrder: EcOrder } {
  // Resolve party layer per DP-EC-5
  let layer: EcOrderLayer;
  let partyId: string | null = null;
  let matchedPartyId: string | null = null;

  if (forcePartyId) {
    layer = 'b2b_matched';
    partyId = forcePartyId;
    matchedPartyId = forcePartyId;
  } else if (stg.buyerGstin) {
    const hit = loadPartyMaster(entityCode).find(
      (p) => (p.gstin ?? '').toUpperCase() === stg.buyerGstin!.toUpperCase());
    if (hit) {
      layer = 'b2b_matched'; partyId = hit.id; matchedPartyId = hit.id;
    } else {
      layer = 'b2b_unmatched';
    }
  } else {
    layer = 'b2c_consolidated';
    partyId = marketplace.consolidatedB2CPartyId;
    if (!partyId) throw new Error(
      `marketplace ${marketplace.name} has no consolidated B2C party (partyMode=${marketplace.partyMode})`);
  }

  // Explode listings into Order lines (kits expand)
  const expanded = expandLines(entityCode, marketplace.id, stg.lines);

  if (layer === 'b2b_unmatched') {
    // Park — NO voucher
    const ec = writeEcOrder(entityCode, {
      marketplace, stg, importId, layer,
      partyId: null, matchedPartyId: null,
      soVoucherId: null, soDocNo: null,
      grossAmount: stg.lines.reduce((s, l) => s + l.lineTotal, 0),
      lineCount: expanded.length,
      status: 'parked_unmatched',
      nowISO,
    });
    return { booked: false, ecOrder: ec };
  }

  // Book REAL SO
  const partyName = partyId
    ? (loadPartyMaster(entityCode).find((p) => p.id === partyId)?.party_name ?? '(unknown)')
    : '(unknown)';
  const order = writeSalesOrderVoucher(
    entityCode, partyName, partyId!, expanded, marketplace, stg, byUserId, nowISO);

  const ec = writeEcOrder(entityCode, {
    marketplace, stg, importId, layer,
    partyId, matchedPartyId,
    soVoucherId: order.id, soDocNo: order.order_no,
    grossAmount: order.gross_amount,
    lineCount: order.lines.length,
    status: 'booked',
    nowISO,
  });
  return { booked: true, ecOrder: ec };
}

interface ExpandedLine {
  storeItemId: string; variantId: string | null; qty: number; rate: number; itemName: string;
}

function expandLines(
  entityCode: string, marketplaceId: string,
  rawLines: EcStagedOrder['lines'],
): ExpandedLine[] {
  const out: ExpandedLine[] = [];
  for (const rl of rawLines) {
    const lst = resolveListing(entityCode, marketplaceId, rl.marketplaceSku);
    if (!lst) continue;  // dedup safety — parseOrderFile already filtered, but be safe
    if (lst.kind === 'simple' && lst.storeItemId) {
      const item = getStoreItem(entityCode, lst.storeItemId);
      out.push({
        storeItemId: lst.storeItemId,
        variantId: lst.variantId,
        qty: rl.qty,
        rate: rl.unitPrice,
        itemName: item?.storeTitle ?? lst.title,
      });
    } else {
      for (const c of lst.components) {
        const item = getStoreItem(entityCode, c.storeItemId);
        out.push({
          storeItemId: c.storeItemId,
          variantId: c.variantId,
          qty: c.qty * rl.qty,                  // kit explodes ×qty
          rate: 0,                              // kit component rate carried at parent level
          itemName: item?.storeTitle ?? c.storeItemId,
        });
      }
    }
  }
  return out;
}

/** Mirrors webstorex-order-engine.writeSalesOrderVoucher pattern · 0-DIFF on that file. */
function writeSalesOrderVoucher(
  entityCode: string, partyName: string, partyId: string,
  expanded: ExpandedLine[], marketplace: EcMarketplace, stg: EcStagedOrder,
  _byUserId: string, nowISO?: string,
): Order {
  const ts = nowIso(nowISO);
  const dateOnly = (stg.orderDate || ts).split('T')[0];
  const orderNo = generateDocNo('SO', entityCode);

  const lines: OrderLine[] = expanded.map((e, idx) => ({
    id: `ol-${Date.now()}-${idx + 1}`,
    item_id: e.storeItemId,
    item_code: e.storeItemId.slice(0, 20).toUpperCase(),
    item_name: e.itemName,
    hsn_sac_code: '',
    qty: e.qty, uom: 'NOS',
    rate: e.rate, discount_percent: 0,
    taxable_value: +(e.qty * e.rate).toFixed(2),
    gst_rate: 0,
    pending_qty: e.qty, fulfilled_qty: 0,
    status: 'open' as const,
  }));

  const grossAmount = lines.reduce((s, l) => s + Math.max(0, l.taxable_value), 0);
  const netAmount = stg.lines.reduce((s, l) => s + l.lineTotal, 0) || grossAmount;

  const order: Order = {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    order_no: orderNo,
    base_voucher_type: 'Sales Order',
    entity_id: entityCode,
    fiscal_year_id: `FY-20${fyForDate(dateOnly, entityCode)}`,
    date: dateOnly,
    party_id: partyId, party_name: partyName,
    place_of_supply: stg.buyerState || '',
    ref_no: stg.marketplaceOrderId, ref_date: dateOnly,
    quotation_id: null, quotation_no: null,
    lines,
    gross_amount: grossAmount,
    total_tax: 0,
    net_amount: netAmount,
    narration: `EcomX · ${marketplace.name} · ${stg.marketplaceOrderId}${stg.buyerName ? ` · ${stg.buyerName}` : ''}${stg.buyerState ? ` · ${stg.buyerState}` : ''}`,
    terms_conditions: '',
    status: 'open',
    created_at: ts, updated_at: ts,
  };

  // [JWT] POST /api/orders — same ordersKey storage useOrders writes to.
  const all = ls<Order>(ordersKey(entityCode));
  all.push(order);
  ss(ordersKey(entityCode), all);

  try {
    logAudit({
      entityCode, action: 'create', entityType: 'order',
      recordId: order.id, recordLabel: order.order_no,
      beforeState: null, afterState: { ...order } as unknown as Record<string, unknown>,
      sourceModule: 'ecomx-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }

  return order;
}

interface WriteEcOrderArgs {
  marketplace: EcMarketplace; stg: EcStagedOrder; importId: string; layer: EcOrderLayer;
  partyId: string | null; matchedPartyId: string | null;
  soVoucherId: string | null; soDocNo: string | null;
  grossAmount: number; lineCount: number; status: EcOrder['status'];
  nowISO?: string;
}

function writeEcOrder(entityCode: string, a: WriteEcOrderArgs): EcOrder {
  const ts = nowIso(a.nowISO);
  const ec: EcOrder = {
    id: newId('ecord'),
    marketplaceId: a.marketplace.id,
    marketplaceOrderId: a.stg.marketplaceOrderId,
    importId: a.importId,
    soVoucherId: a.soVoucherId, soDocNo: a.soDocNo,
    orderDate: a.stg.orderDate,
    layer: a.layer,
    endCustomerName: a.stg.buyerName, endCustomerState: a.stg.buyerState,
    buyerGstin: a.stg.buyerGstin,
    matchedPartyId: a.matchedPartyId,
    lineCount: a.lineCount, grossAmount: a.grossAmount,
    status: a.status,
    createdAt: ts,
  };
  const all = ls<EcOrder>(ecOrdersKey(entityCode));
  ss(ecOrdersKey(entityCode), [...all, ec]);
  safeAudit(entityCode, 'create', ec.id,
    `EcomX order · ${a.marketplace.name} · ${a.stg.marketplaceOrderId} · ${a.layer}`,
    null, ec as unknown as Record<string, unknown>);
  return ec;
}

// ═══════════════════════════════════════════════════════════════════════
// BLOCK 4 · B2B UNMATCHED INBOX RESOLUTION
// ═══════════════════════════════════════════════════════════════════════
export function resolveUnmatchedOrder(
  entityCode: string, ecOrderId: string, partyId: string,
  byUserId = 'ecomx-engine', nowISO?: string,
): { ecOrder: EcOrder; voucherId: string } {
  const all = ls<EcOrder>(ecOrdersKey(entityCode));
  const idx = all.findIndex((o) => o.id === ecOrderId);
  if (idx < 0) throw new Error('ecomx order not found');
  const target = all[idx];
  if (target.layer !== 'b2b_unmatched' || target.status !== 'parked_unmatched') {
    throw new Error('order is not parked b2b_unmatched');
  }
  const party = loadPartyMaster(entityCode).find((p) => p.id === partyId);
  if (!party) throw new Error('party not found');

  const marketplace = listMarketplaces(entityCode).find((m) => m.id === target.marketplaceId);
  if (!marketplace) throw new Error('marketplace not found');

  // Reconstruct staged shape from the EcOrder snapshot — lines aren't stored, but
  // we re-derive from the actual marketplace order: re-fetch listings would require
  // raw rows. Operator path: caller already has the original lines via the inbox UI.
  // For this path we re-book from a synthetic staged record using known fields only:
  // expanded lines were dropped → we book a single placeholder line using the
  // snapshot grossAmount, which preserves voucher truth (amount + party + ref).
  // DESIGN-DECISION-FLAG: parked orders re-book with a single ECOM-PARKED line
  // carrying the grossAmount. Detailed kit explosion happens at commitImport time
  // only — see §B-4 close summary.
  const ts = nowIso(nowISO);
  const dateOnly = (target.orderDate || ts).split('T')[0];
  const synthetic: ExpandedLine[] = [{
    storeItemId: 'ECOM-PARKED',
    variantId: null,
    qty: target.lineCount || 1,
    rate: target.lineCount ? +(target.grossAmount / target.lineCount).toFixed(2) : target.grossAmount,
    itemName: `EcomX parked order ${target.marketplaceOrderId}`,
  }];
  const stg: EcStagedOrder = {
    marketplaceOrderId: target.marketplaceOrderId,
    orderDate: dateOnly,
    buyerName: target.endCustomerName,
    buyerState: target.endCustomerState,
    buyerGstin: target.buyerGstin,
    lines: [{ marketplaceSku: 'ECOM-PARKED', qty: synthetic[0].qty, unitPrice: synthetic[0].rate, lineTotal: target.grossAmount }],
  };
  const order = writeSalesOrderVoucher(
    entityCode, party.party_name, partyId, synthetic, marketplace, stg, byUserId, nowISO);

  // Update the EcOrder in place
  const before = { ...target };
  all[idx] = {
    ...target,
    layer: 'b2b_matched',
    matchedPartyId: partyId,
    soVoucherId: order.id, soDocNo: order.order_no,
    status: 'booked',
  };
  ss(ecOrdersKey(entityCode), all);
  safeAudit(entityCode, 'update', target.id,
    `EcomX resolveUnmatched · ${target.marketplaceOrderId} → ${party.party_name}`,
    before as unknown as Record<string, unknown>,
    all[idx] as unknown as Record<string, unknown>);
  return { ecOrder: all[idx], voucherId: order.id };
}

// ═══════════════════════════════════════════════════════════════════════
// READERS
// ═══════════════════════════════════════════════════════════════════════
export function listEcOrders(
  entityCode: string,
  filter?: { marketplaceId?: string; layer?: EcOrderLayer; status?: EcOrder['status'] },
): EcOrder[] {
  let rows = ls<EcOrder>(ecOrdersKey(entityCode));
  if (filter?.marketplaceId) rows = rows.filter((o) => o.marketplaceId === filter.marketplaceId);
  if (filter?.layer) rows = rows.filter((o) => o.layer === filter.layer);
  if (filter?.status) rows = rows.filter((o) => o.status === filter.status);
  return rows;
}

export interface EcImportStats {
  marketplacesActive: number;
  listingsLive: number;
  unmappedInbox: number;
  ordersBooked: number;
  parkedB2B: number;
}

export function getImportStats(entityCode: string): EcImportStats {
  const mks = listMarketplaces(entityCode);
  const lst = listListings(entityCode);
  const unm = listUnmappedSkus(entityCode).filter((u) => !u.resolvedListingId);
  const eco = ls<EcOrder>(ecOrdersKey(entityCode));
  return {
    marketplacesActive: mks.filter((m) => m.isActive).length,
    listingsLive: lst.filter((l) => l.status === 'live').length,
    unmappedInbox: unm.length,
    ordersBooked: eco.filter((o) => o.status === 'booked').length,
    parkedB2B: eco.filter((o) => o.status === 'parked_unmatched').length,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// S154 · ONE PERMITTED ADDITIVE EXPORT (existing 19 exports 0-DIFF above)
// ═══════════════════════════════════════════════════════════════════════
/**
 * S154 · DP-EC-8 · flip an EcOrder status to 'returned'.
 * Called by ecomx-recon-engine when a settlement row's eventType='return' is committed.
 * Idempotent: re-marking a 'returned' order is a no-op (returns the row unchanged).
 */
export function markOrderReturned(entityCode: string, ecOrderId: string): EcOrder | null {
  const all = ls<EcOrder>(ecOrdersKey(entityCode));
  const idx = all.findIndex((o) => o.id === ecOrderId);
  if (idx < 0) return null;
  if (all[idx].status === 'returned') return all[idx];
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], status: 'returned' };
  ss(ecOrdersKey(entityCode), all);
  safeAudit(entityCode, 'update', all[idx].id,
    `EcomX markOrderReturned · ${all[idx].marketplaceOrderId}`,
    before as unknown as Record<string, unknown>,
    all[idx] as unknown as Record<string, unknown>);
  return all[idx];
}

// ═══════════════════════════════════════════════════════════════════════
// S155 · TWO PERMITTED ADDITIVE EXPORTS (existing 20 exports 0-DIFF above)
// DP-EC-11 · Packing Evidence — METADATA ONLY · binary clip NEVER persisted
// to localStorage (downloaded to the user's machine at capture time).
// In-app cloud video storage is a named [JWT] P2BB seam.
// ═══════════════════════════════════════════════════════════════════════
import type { EcPackingEvidence } from '@/types/ecomx';
import { ecPackingEvidenceKey } from '@/types/ecomx';
import { createDocument as docvaultCreate } from '@/lib/docvault-engine';

/**
 * S155.T1 · DP-EC-11 honesty banner — rendered VERBATIM near the capture
 * controls in the Orders evidence dialog. Asserted by sprint-155 evidence
 * test (string-constant check).
 */
export const PACKING_EVIDENCE_HONESTY_BANNER =
  'Clip saved to your downloads — keep it with your records. In-app cloud video storage is a Phase-2 upgrade.';

export interface RecordPackingEvidenceInput {
  ecOrderId: string;
  fileName: string;
  durationSec: number | null;
  sizeBytes: number;
  capturedVia: 'camera' | 'file_upload';
  note: string;
  uploadedBy: string;
  originatingDepartmentId: string;
}

export function recordPackingEvidence(
  entityCode: string,
  input: RecordPackingEvidenceInput,
  nowISO?: string,
): EcPackingEvidence {
  const order = ls<EcOrder>(ecOrdersKey(entityCode)).find((o) => o.id === input.ecOrderId);
  if (!order) throw new Error(`EcOrder not found: ${input.ecOrderId}`);
  const mp = listMarketplaces(entityCode).find((m) => m.id === order.marketplaceId);
  const mpName = mp?.name ?? order.marketplaceId;
  const ts = nowIso(nowISO);
  // DocVault metadata document — file_url intentionally empty (no binary persisted).
  // [JWT] P2BB · in-app cloud video storage — replace file_url with CDN URL.
  const doc = docvaultCreate(
    entityCode,
    {
      entity_id: entityCode,
      title: `Packing evidence · ${mpName} · ${order.marketplaceOrderId}`,
      description: input.note || undefined,
      document_type: 'other',
      tags: { custom_tags: ['ecomx', 'packing-evidence', order.marketplaceId] },
      originating_department_id: input.originatingDepartmentId,
      project_id: null, customer_id: null, vendor_id: null,
      equipment_id: null, nc_id: null, work_order_id: null,
    },
    {
      version_no: '1',
      file_url: '',                       // metadata only — no binary
      file_size_bytes: input.sizeBytes,
      uploaded_at: ts,
      uploaded_by: input.uploadedBy,
    },
    input.uploadedBy,
  );
  const row: EcPackingEvidence = {
    id: newId('ecpe'),
    ecOrderId: order.id,
    marketplaceId: order.marketplaceId,
    marketplaceOrderId: order.marketplaceOrderId,
    docVaultDocumentId: doc.id,
    fileName: input.fileName,
    durationSec: input.durationSec,
    sizeBytes: input.sizeBytes,
    capturedVia: input.capturedVia,
    note: input.note,
    createdAt: ts,
  };
  const all = ls<EcPackingEvidence>(ecPackingEvidenceKey(entityCode));
  all.push(row);
  ss(ecPackingEvidenceKey(entityCode), all);
  safeAudit(entityCode, 'create', row.id,
    `EcomX packing evidence · ${order.marketplaceOrderId}`,
    null, row as unknown as Record<string, unknown>);
  return row;
}

export function listPackingEvidence(
  entityCode: string,
  ecOrderId?: string,
): EcPackingEvidence[] {
  const all = ls<EcPackingEvidence>(ecPackingEvidenceKey(entityCode));
  return ecOrderId ? all.filter((r) => r.ecOrderId === ecOrderId) : all;
}


