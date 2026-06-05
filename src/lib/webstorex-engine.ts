/**
 * @file        src/lib/webstorex-engine.ts
 * @realizes    WebStoreX PIM + Catalog · DP-WS-2/8/13/14/15/18 · publication wrapper
 *              (master READ-ONLY) · variant allocation guard · brands · categories · settings.
 * @reads-from  erp_inventory_items (Block-0 master surface · READ-ONLY) ·
 *              party-master-engine (READ-ONLY · price-list assignment lands S150) ·
 *              audit-trail-engine.
 * @sprint      Sprint 149 · T-WebStoreX-A11.1 · DP-WS-20 parity register
 * @[JWT]       P2BB: public rendering · SEO sitemap · live ETA.
 *
 * PIM CANON (DP-WS-2): the item/stock master is READ-ONLY. WebStoreItem WRAPS the master
 * by reference (itemRefId · itemRefName denormalized for display only). Updates to wrapper
 * fields NEVER mutate the master. Variant stockAllocation is an ALLOCATION of master qty
 * (DP-WS-14 guard: Σ active allocations ≤ master qty · over-allocation throws naming excess).
 * Reconciliation re-reads master live — drift surfaces when master qty moves under us.
 *
 * §H 0-DIFF: approval-workflow-engine · Comply360 · push-notification-bridge UNTOUCHED.
 */
import { logAudit } from '@/lib/audit-trail-engine';
import {
  type StoreSettings,
  type StoreVisibility,
  type VariantReconciliationRow,
  type WebStoreItem,
  type WsBrand,
  type WsCategory,
  type WsImage,
  type WsVariant,
  wsBrandsKey,
  wsCategoriesKey,
  wsItemsKey,
  wsSettingsKey,
  wsVariantsKey,
} from '@/types/webstorex';

// ─── storage helpers ─────────────────────────────────────────────────
function readJSON<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/webstorex/<resource>
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key: string, value: unknown): void {
  try {
    // [JWT] PUT /api/webstorex/<resource>
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}

const IMAGE_MAX_BYTES = 1_048_576;
function assertImageSize(dataUrl: string | null | undefined, label: string): void {
  if (!dataUrl) return;
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const bytes = Math.floor(b64.length * 3 / 4);
  if (bytes > IMAGE_MAX_BYTES) {
    throw new Error(`${label} too large (${bytes} bytes > ${IMAGE_MAX_BYTES} cap)`);
  }
}

function nowISO(): string { return new Date().toISOString(); }
function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── master surface (READ-ONLY) ─────────────────────────────────────
interface MasterSeed {
  id?: string;
  name?: string;
  itemName?: string;
  on_hand_qty?: number;
  openingStock?: number;
}

/** READ-ONLY · mirrors stock-reservation-engine.loadOnHandMap proxy.
 *  Master surface is `erp_inventory_items` (Block-0 confirmed). Never mutated. */
function loadMasterMap(): Map<string, { name: string; qty: number }> {
  try {
    // [JWT] GET /api/inventory/items
    const items: MasterSeed[] = JSON.parse(localStorage.getItem('erp_inventory_items') || '[]');
    const map = new Map<string, { name: string; qty: number }>();
    for (const it of items) {
      if (!it || !it.id) continue;
      const name = it.name ?? it.itemName ?? '';
      const qty = typeof it.on_hand_qty === 'number'
        ? it.on_hand_qty
        : typeof it.openingStock === 'number' ? it.openingStock : 0;
      map.set(it.id, { name, qty });
    }
    return map;
  } catch {
    return new Map();
  }
}

function getMasterOrThrow(itemRefId: string): { name: string; qty: number } {
  const m = loadMasterMap().get(itemRefId);
  if (!m) throw new Error(`Master item ${itemRefId} not found in erp_inventory_items`);
  return m;
}

// ─── audit helper ────────────────────────────────────────────────────
function audit(
  entityCode: string,
  action: 'create' | 'update' | 'cancel',
  recordId: string,
  recordLabel: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  reason: string,
): void {
  try {
    logAudit({
      entityCode, action, entityType: 'webstorex_event',
      recordId, recordLabel, beforeState: before, afterState: after,
      reason, sourceModule: 'webstorex',
    });
  } catch (e) {
    console.error('[webstorex audit]', e);
  }
}

// ─── store items: load/save ──────────────────────────────────────────
function loadItems(e: string): WebStoreItem[]   { return readJSON<WebStoreItem[]>(wsItemsKey(e), []); }
function saveItems(e: string, rows: WebStoreItem[]): void { writeJSON(wsItemsKey(e), rows); }
function loadVariants(e: string): WsVariant[]   { return readJSON<WsVariant[]>(wsVariantsKey(e), []); }
function saveVariants(e: string, rows: WsVariant[]): void { writeJSON(wsVariantsKey(e), rows); }
function loadBrands(e: string): WsBrand[]       { return readJSON<WsBrand[]>(wsBrandsKey(e), []); }
function saveBrands(e: string, rows: WsBrand[]): void { writeJSON(wsBrandsKey(e), rows); }
function loadCategories(e: string): WsCategory[] { return readJSON<WsCategory[]>(wsCategoriesKey(e), []); }
function saveCategories(e: string, rows: WsCategory[]): void { writeJSON(wsCategoriesKey(e), rows); }

export function listStoreItems(entityCode: string): WebStoreItem[] { return loadItems(entityCode); }
export function getStoreItem(entityCode: string, id: string): WebStoreItem | null {
  return loadItems(entityCode).find(i => i.id === id) ?? null;
}
export function listVariants(entityCode: string, storeItemId?: string): WsVariant[] {
  const all = loadVariants(entityCode);
  return storeItemId ? all.filter(v => v.storeItemId === storeItemId) : all;
}

// ─── publishItem ─────────────────────────────────────────────────────
export interface PublishInput {
  storeTitle?: string;
  listPrice?: number;
  brandId?: string | null;
  categoryId?: string | null;
}

export function publishItem(
  entityCode: string,
  itemRefId: string,
  userId: string,
  input?: PublishInput,
): WebStoreItem {
  const master = getMasterOrThrow(itemRefId);
  const items = loadItems(entityCode);
  const existing = items.find(i => i.itemRefId === itemRefId);
  if (existing) {
    throw new Error(`Item ${itemRefId} already published as ${existing.id} (one wrapper per master item)`);
  }
  const now = nowISO();
  const row: WebStoreItem = {
    id: genId('ws-item'),
    entityId: entityCode,
    itemRefId,
    itemRefName: master.name,
    visibility: 'draft',
    storeTitle: input?.storeTitle?.trim() || master.name || 'Untitled',
    seoName: null, metaTitle: null, metaDescription: null,
    searchKeywords: [],
    shortDescription: null, description: null,
    highlights: [], faqs: [], howToUse: null,
    specifications: [], warrantyText: null,
    returnable: true, countryOfOrigin: null, videoUrl: null,
    brandId: input?.brandId ?? null,
    categoryId: input?.categoryId ?? null,
    listPrice: typeof input?.listPrice === 'number' ? input.listPrice : 0,
    compareAtPrice: null, moq: null,
    weightKg: null, dimensionsCm: null,
    codAvailable: false, deliveryEtaText: null,
    crossSellIds: [], upsellIds: [], frequentlyBoughtIds: [],
    stockDisplayMode: 'badge', backorderAllowed: false,
    images: [], hasVariants: false,
    createdAt: now, createdByUserId: userId, updatedAt: now,
  };
  saveItems(entityCode, [row, ...items]);
  audit(entityCode, 'create', row.id, `publishItem · ${row.storeTitle}`,
    null, { itemRefId, storeTitle: row.storeTitle }, 'webstorex.publishItem');
  return row;
}

// Master-owned fields that updateStoreItem MUST ignore-and-flag.
const MASTER_OWNED_FIELDS = new Set<string>([
  'itemRefId', 'itemRefName', 'id', 'entityId', 'createdAt', 'createdByUserId',
]);

export function updateStoreItem(
  entityCode: string,
  id: string,
  patch: Partial<WebStoreItem>,
): WebStoreItem {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) throw new Error(`Store item ${id} not found`);
  const before = items[idx];
  const flagged: string[] = [];
  const safe: Partial<WebStoreItem> = {};
  for (const k of Object.keys(patch) as (keyof WebStoreItem)[]) {
    if (MASTER_OWNED_FIELDS.has(k as string)) {
      flagged.push(k as string);
      continue;
    }
    (safe as Record<string, unknown>)[k as string] = patch[k];
  }
  const next: WebStoreItem = { ...before, ...safe, updatedAt: nowISO() };
  items[idx] = next;
  saveItems(entityCode, items);
  audit(entityCode, 'update', id, `updateStoreItem · ${next.storeTitle}`,
    before as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>,
    flagged.length ? `webstorex.updateStoreItem · ignored-and-flagged: ${flagged.join(',')}` : 'webstorex.updateStoreItem');
  return next;
}

// ─── visibility (publish-readiness guard) ────────────────────────────
export function setVisibility(entityCode: string, id: string, visibility: StoreVisibility): WebStoreItem {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) throw new Error(`Store item ${id} not found`);
  const cur = items[idx];
  if (visibility === 'published') {
    const missing: string[] = [];
    if (!(cur.listPrice > 0)) missing.push('listPrice>0');
    if (!cur.images.some(im => im.kind === 'main')) missing.push('main image');
    if (!cur.categoryId) missing.push('category');
    if (missing.length) {
      throw new Error(`Cannot publish — missing: ${missing.join(', ')}`);
    }
  }
  const next = { ...cur, visibility, updatedAt: nowISO() };
  items[idx] = next;
  saveItems(entityCode, items);
  audit(entityCode, 'update', id, `setVisibility · ${visibility}`,
    { visibility: cur.visibility }, { visibility }, 'webstorex.setVisibility');
  return next;
}

// ─── images ──────────────────────────────────────────────────────────
export function addImage(
  entityCode: string, storeItemId: string,
  image: Omit<WsImage, 'id'>,
): WsImage {
  assertImageSize(image.dataUrl, 'Image');
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === storeItemId);
  if (idx < 0) throw new Error(`Store item ${storeItemId} not found`);
  const cur = items[idx];
  // exactly-one-main: if adding main, demote any existing main to gallery.
  let images = cur.images.slice();
  if (image.kind === 'main') {
    images = images.map(im => im.kind === 'main' ? { ...im, kind: 'gallery' as const } : im);
  }
  const created: WsImage = { ...image, id: genId('ws-img') };
  images.push(created);
  items[idx] = { ...cur, images, updatedAt: nowISO() };
  saveItems(entityCode, items);
  audit(entityCode, 'create', created.id, `addImage · ${image.kind}`,
    null, { kind: image.kind, storeItemId }, 'webstorex.addImage');
  return created;
}

export function removeImage(entityCode: string, storeItemId: string, imageId: string): void {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === storeItemId);
  if (idx < 0) throw new Error(`Store item ${storeItemId} not found`);
  const cur = items[idx];
  const before = cur.images.find(im => im.id === imageId);
  if (!before) return;
  items[idx] = { ...cur, images: cur.images.filter(im => im.id !== imageId), updatedAt: nowISO() };
  saveItems(entityCode, items);
  audit(entityCode, 'cancel', imageId, `removeImage`,
    before as unknown as Record<string, unknown>, null, 'webstorex.removeImage');
}

export function reorderImages(entityCode: string, storeItemId: string, orderedIds: string[]): void {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === storeItemId);
  if (idx < 0) throw new Error(`Store item ${storeItemId} not found`);
  const cur = items[idx];
  const byId = new Map(cur.images.map(im => [im.id, im]));
  const next: WsImage[] = [];
  orderedIds.forEach((id, i) => {
    const im = byId.get(id);
    if (im) { next.push({ ...im, sortOrder: i }); byId.delete(id); }
  });
  // append leftovers preserving prior order
  for (const im of byId.values()) next.push(im);
  items[idx] = { ...cur, images: next, updatedAt: nowISO() };
  saveItems(entityCode, items);
  audit(entityCode, 'update', storeItemId, 'reorderImages', null, { count: next.length }, 'webstorex.reorderImages');
}

// ─── relations (DP-WS-15) ────────────────────────────────────────────
export type RelationKind = 'crossSellIds' | 'upsellIds' | 'frequentlyBoughtIds';

export function setRelations(
  entityCode: string, storeItemId: string, kind: RelationKind, targetIds: string[],
): WebStoreItem {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === storeItemId);
  if (idx < 0) throw new Error(`Store item ${storeItemId} not found`);
  if (targetIds.includes(storeItemId)) {
    throw new Error(`Self-reference not allowed in ${kind}`);
  }
  const ids = new Set(items.map(i => i.id));
  for (const t of targetIds) {
    if (!ids.has(t)) throw new Error(`Relation target ${t} is not a store item`);
  }
  const cur = items[idx];
  const next = { ...cur, [kind]: Array.from(new Set(targetIds)), updatedAt: nowISO() } as WebStoreItem;
  items[idx] = next;
  saveItems(entityCode, items);
  audit(entityCode, 'update', storeItemId, `setRelations · ${kind}`,
    { [kind]: cur[kind] } as Record<string, unknown>,
    { [kind]: next[kind] } as Record<string, unknown>,
    'webstorex.setRelations');
  return next;
}

// ─── variants (DP-WS-14 GUARD) ───────────────────────────────────────
function sumActiveAllocations(variants: WsVariant[], storeItemId: string, excludeVariantId?: string): number {
  return variants
    .filter(v => v.storeItemId === storeItemId && v.isActive && v.id !== excludeVariantId)
    .reduce((s, v) => s + (v.stockAllocation || 0), 0);
}

export interface VariantInput {
  sku: string;
  axes: { name: string; value: string }[];
  priceOverride?: number | null;
  stockAllocation: number;
  isActive?: boolean;
}

export function addVariant(entityCode: string, storeItemId: string, input: VariantInput): WsVariant {
  const items = loadItems(entityCode);
  const item = items.find(i => i.id === storeItemId);
  if (!item) throw new Error(`Store item ${storeItemId} not found`);
  if (input.stockAllocation < 0) throw new Error('stockAllocation must be ≥ 0');
  const variants = loadVariants(entityCode);
  const sku = input.sku.trim();
  if (!sku) throw new Error('SKU is required');
  if (variants.some(v => v.sku === sku)) throw new Error(`Duplicate SKU ${sku}`);
  // Allocation guard: re-read master live.
  const master = getMasterOrThrow(item.itemRefId);
  const isActive = input.isActive ?? true;
  const projected = sumActiveAllocations(variants, storeItemId) + (isActive ? input.stockAllocation : 0);
  if (projected > master.qty) {
    const excess = projected - master.qty;
    throw new Error(`Over-allocation by ${excess} (projected ${projected} > master ${master.qty})`);
  }
  const now = nowISO();
  const row: WsVariant = {
    id: genId('ws-var'), entityId: entityCode, storeItemId,
    sku, axes: input.axes.slice(),
    priceOverride: input.priceOverride ?? null,
    stockAllocation: input.stockAllocation,
    isActive,
    createdAt: now, updatedAt: now,
  };
  saveVariants(entityCode, [row, ...variants]);
  if (!item.hasVariants) {
    const idx = items.findIndex(i => i.id === storeItemId);
    items[idx] = { ...item, hasVariants: true, updatedAt: now };
    saveItems(entityCode, items);
  }
  audit(entityCode, 'create', row.id, `addVariant · ${sku}`,
    null, { sku, storeItemId, stockAllocation: row.stockAllocation }, 'webstorex.addVariant');
  return row;
}

export function updateVariant(
  entityCode: string, variantId: string, patch: Partial<VariantInput>,
): WsVariant {
  const variants = loadVariants(entityCode);
  const idx = variants.findIndex(v => v.id === variantId);
  if (idx < 0) throw new Error(`Variant ${variantId} not found`);
  const cur = variants[idx];
  const nextSku = (patch.sku ?? cur.sku).trim();
  if (!nextSku) throw new Error('SKU is required');
  if (nextSku !== cur.sku && variants.some(v => v.sku === nextSku)) {
    throw new Error(`Duplicate SKU ${nextSku}`);
  }
  const nextActive = patch.isActive ?? cur.isActive;
  const nextAlloc = patch.stockAllocation ?? cur.stockAllocation;
  if (nextAlloc < 0) throw new Error('stockAllocation must be ≥ 0');
  const items = loadItems(entityCode);
  const item = items.find(i => i.id === cur.storeItemId);
  if (!item) throw new Error(`Store item ${cur.storeItemId} not found`);
  const master = getMasterOrThrow(item.itemRefId);
  const projected = sumActiveAllocations(variants, cur.storeItemId, cur.id) + (nextActive ? nextAlloc : 0);
  if (projected > master.qty) {
    const excess = projected - master.qty;
    throw new Error(`Over-allocation by ${excess} (projected ${projected} > master ${master.qty})`);
  }
  const next: WsVariant = {
    ...cur, sku: nextSku, axes: patch.axes ?? cur.axes,
    priceOverride: patch.priceOverride !== undefined ? patch.priceOverride : cur.priceOverride,
    stockAllocation: nextAlloc, isActive: nextActive,
    updatedAt: nowISO(),
  };
  variants[idx] = next;
  saveVariants(entityCode, variants);
  audit(entityCode, 'update', variantId, `updateVariant · ${nextSku}`,
    cur as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>,
    'webstorex.updateVariant');
  return next;
}

export function setHasVariants(entityCode: string, storeItemId: string, hasVariants: boolean): WebStoreItem {
  const items = loadItems(entityCode);
  const idx = items.findIndex(i => i.id === storeItemId);
  if (idx < 0) throw new Error(`Store item ${storeItemId} not found`);
  const next = { ...items[idx], hasVariants, updatedAt: nowISO() };
  items[idx] = next;
  saveItems(entityCode, items);
  audit(entityCode, 'update', storeItemId, `setHasVariants · ${hasVariants}`,
    { hasVariants: items[idx].hasVariants }, { hasVariants }, 'webstorex.setHasVariants');
  return next;
}

export function buildReconciliationReport(entityCode: string): VariantReconciliationRow[] {
  const items = loadItems(entityCode);
  const variants = loadVariants(entityCode);
  const masterMap = loadMasterMap();
  const rows: VariantReconciliationRow[] = [];
  for (const it of items) {
    const m = masterMap.get(it.itemRefId);
    const masterQty = m ? m.qty : 0;
    const allocatedTotal = variants
      .filter(v => v.storeItemId === it.id && v.isActive)
      .reduce((s, v) => s + v.stockAllocation, 0);
    const drift = masterQty - allocatedTotal;
    rows.push({
      storeItemId: it.id,
      itemRefName: it.itemRefName,
      masterQty, allocatedTotal, drift,
      overAllocated: drift < 0,
    });
  }
  return rows;
}

// ─── categories (3-level tree · cycle throw) ─────────────────────────
export interface CategoryInput { name: string; parentCategoryId?: string | null; sortOrder?: number; }

function categoryDepth(cats: WsCategory[], id: string | null | undefined): number {
  if (!id) return 0;
  let depth = 1;
  let cur: WsCategory | undefined = cats.find(c => c.id === id);
  const seen = new Set<string>();
  while (cur && cur.parentCategoryId) {
    if (seen.has(cur.id)) throw new Error(`Cycle detected in category tree at ${cur.id}`);
    seen.add(cur.id);
    cur = cats.find(c => c.id === cur!.parentCategoryId);
    depth++;
    if (depth > 10) throw new Error('Category depth runaway');
  }
  return depth;
}

export function listCategories(entityCode: string): WsCategory[] { return loadCategories(entityCode); }

export function createCategory(entityCode: string, input: CategoryInput): WsCategory {
  const cats = loadCategories(entityCode);
  const parentDepth = input.parentCategoryId ? categoryDepth(cats, input.parentCategoryId) : 0;
  if (parentDepth + 1 > 3) throw new Error('Max category depth is 3');
  const row: WsCategory = {
    id: genId('ws-cat'), entityId: entityCode,
    name: input.name.trim(),
    parentCategoryId: input.parentCategoryId ?? null,
    sortOrder: input.sortOrder ?? 0, isActive: true,
  };
  if (!row.name) throw new Error('Category name required');
  saveCategories(entityCode, [...cats, row]);
  audit(entityCode, 'create', row.id, `createCategory · ${row.name}`, null, row as unknown as Record<string, unknown>, 'webstorex.createCategory');
  return row;
}

export function updateCategory(entityCode: string, id: string, patch: Partial<CategoryInput> & { isActive?: boolean }): WsCategory {
  const cats = loadCategories(entityCode);
  const idx = cats.findIndex(c => c.id === id);
  if (idx < 0) throw new Error(`Category ${id} not found`);
  const cur = cats[idx];
  const nextParent = patch.parentCategoryId !== undefined ? patch.parentCategoryId : cur.parentCategoryId;
  // cycle prevention: walk up from nextParent and ensure we don't see `id`.
  if (nextParent) {
    let walker: WsCategory | undefined = cats.find(c => c.id === nextParent);
    const seen = new Set<string>();
    while (walker) {
      if (walker.id === id) throw new Error(`Category cycle: ${id} cannot be its own ancestor`);
      if (seen.has(walker.id)) break;
      seen.add(walker.id);
      walker = walker.parentCategoryId ? cats.find(c => c.id === walker!.parentCategoryId) : undefined;
    }
    // depth re-check with proposed parent
    const proposed: WsCategory[] = cats.map(c => c.id === id ? { ...c, parentCategoryId: nextParent } : c);
    if (categoryDepth(proposed, id) > 3) throw new Error('Max category depth is 3');
  }
  const next: WsCategory = {
    ...cur,
    name: patch.name?.trim() || cur.name,
    parentCategoryId: nextParent ?? null,
    sortOrder: patch.sortOrder ?? cur.sortOrder,
    isActive: patch.isActive ?? cur.isActive,
  };
  cats[idx] = next;
  saveCategories(entityCode, cats);
  audit(entityCode, 'update', id, `updateCategory · ${next.name}`, cur as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, 'webstorex.updateCategory');
  return next;
}

export function deleteCategory(entityCode: string, id: string): void {
  const cats = loadCategories(entityCode);
  if (cats.some(c => c.parentCategoryId === id)) {
    throw new Error('Cannot delete category with children');
  }
  const next = cats.filter(c => c.id !== id);
  saveCategories(entityCode, next);
  audit(entityCode, 'cancel', id, 'deleteCategory', null, null, 'webstorex.deleteCategory');
}

export interface CategoryTreeNode extends WsCategory { children: CategoryTreeNode[]; }
export function listCategoryTree(entityCode: string): CategoryTreeNode[] {
  const cats = loadCategories(entityCode);
  const byParent = new Map<string | null, WsCategory[]>();
  for (const c of cats) {
    const k = c.parentCategoryId ?? null;
    const arr = byParent.get(k) ?? []; arr.push(c); byParent.set(k, arr);
  }
  const build = (parent: string | null): CategoryTreeNode[] =>
    (byParent.get(parent) ?? [])
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
      .map(c => ({ ...c, children: build(c.id) }));
  return build(null);
}

// ─── brands ──────────────────────────────────────────────────────────
export interface BrandInput {
  name: string;
  logoDataUrl?: string | null;
  bannerDataUrl?: string | null;
  description?: string | null;
}

export function listBrands(entityCode: string): WsBrand[] { return loadBrands(entityCode); }

export function createBrand(entityCode: string, input: BrandInput): WsBrand {
  assertImageSize(input.logoDataUrl, 'Brand logo');
  assertImageSize(input.bannerDataUrl, 'Brand banner');
  const row: WsBrand = {
    id: genId('ws-brand'), entityId: entityCode,
    name: input.name.trim(),
    logoDataUrl: input.logoDataUrl ?? null,
    bannerDataUrl: input.bannerDataUrl ?? null,
    description: input.description ?? null,
    isActive: true, createdAt: nowISO(),
  };
  if (!row.name) throw new Error('Brand name required');
  const brands = loadBrands(entityCode);
  saveBrands(entityCode, [...brands, row]);
  audit(entityCode, 'create', row.id, `createBrand · ${row.name}`, null, { name: row.name }, 'webstorex.createBrand');
  return row;
}

export function updateBrand(entityCode: string, id: string, patch: Partial<BrandInput> & { isActive?: boolean }): WsBrand {
  if (patch.logoDataUrl !== undefined) assertImageSize(patch.logoDataUrl, 'Brand logo');
  if (patch.bannerDataUrl !== undefined) assertImageSize(patch.bannerDataUrl, 'Brand banner');
  const brands = loadBrands(entityCode);
  const idx = brands.findIndex(b => b.id === id);
  if (idx < 0) throw new Error(`Brand ${id} not found`);
  const cur = brands[idx];
  const next: WsBrand = { ...cur, ...patch, name: patch.name?.trim() || cur.name } as WsBrand;
  brands[idx] = next;
  saveBrands(entityCode, brands);
  audit(entityCode, 'update', id, `updateBrand · ${next.name}`, cur as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>, 'webstorex.updateBrand');
  return next;
}

export function deleteBrand(entityCode: string, id: string): void {
  const brands = loadBrands(entityCode);
  saveBrands(entityCode, brands.filter(b => b.id !== id));
  audit(entityCode, 'cancel', id, 'deleteBrand', null, null, 'webstorex.deleteBrand');
}

// ─── settings ────────────────────────────────────────────────────────
const DEFAULT_GST_NOTE = 'GST invoice available on all orders';

export function getStoreSettings(entityCode: string, userId = 'system'): StoreSettings {
  const raw = readJSON<StoreSettings | null>(wsSettingsKey(entityCode), null);
  if (raw) {
    return {
      ...raw,
      policies: raw.policies ?? { shipping: null, returns: null, terms: null },
      gstInvoiceNote: raw.gstInvoiceNote ?? DEFAULT_GST_NOTE,
    };
  }
  return {
    entityId: entityCode,
    storeName: '', tagline: null, logoDataUrl: null,
    supportPhone: null, supportEmail: null, whatsappNumber: null,
    policies: { shipping: null, returns: null, terms: null },
    gstInvoiceNote: DEFAULT_GST_NOTE,
    updatedAt: nowISO(), updatedByUserId: userId,
  };
}

export function updateStoreSettings(entityCode: string, userId: string, patch: Partial<StoreSettings>): StoreSettings {
  if (patch.logoDataUrl !== undefined) assertImageSize(patch.logoDataUrl, 'Store logo');
  const cur = getStoreSettings(entityCode, userId);
  const next: StoreSettings = {
    ...cur, ...patch,
    policies: { ...cur.policies, ...(patch.policies ?? {}) },
    entityId: entityCode,
    updatedAt: nowISO(), updatedByUserId: userId,
  };
  writeJSON(wsSettingsKey(entityCode), next);
  audit(entityCode, 'update', entityCode, 'updateStoreSettings',
    cur as unknown as Record<string, unknown>,
    next as unknown as Record<string, unknown>,
    'webstorex.updateStoreSettings');
  return next;
}

// ─── catalog filter ──────────────────────────────────────────────────
export interface CatalogFilter {
  visibility?: StoreVisibility;
  categoryId?: string;
  brandId?: string;
  search?: string;
}

export function getCatalog(entityCode: string, filter: CatalogFilter = {}): WebStoreItem[] {
  let rows = loadItems(entityCode);
  if (filter.visibility) rows = rows.filter(r => r.visibility === filter.visibility);
  if (filter.categoryId) rows = rows.filter(r => r.categoryId === filter.categoryId);
  if (filter.brandId)    rows = rows.filter(r => r.brandId === filter.brandId);
  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(r =>
        r.storeTitle.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        r.searchKeywords.some(k => k.toLowerCase().includes(q)),
      );
    }
  }
  return rows;
}

// ─── master read passthrough (UI publish-from-master picker) ────────
export interface MasterPickerRow { id: string; name: string; qty: number; alreadyPublishedAs: string | null; }
export function listMasterCandidates(entityCode: string, search?: string): MasterPickerRow[] {
  const items = loadItems(entityCode);
  const wrappedBy = new Map<string, string>();
  for (const it of items) wrappedBy.set(it.itemRefId, it.id);
  const master = loadMasterMap();
  const rows: MasterPickerRow[] = [];
  const q = (search ?? '').trim().toLowerCase();
  for (const [id, m] of master.entries()) {
    if (q && !m.name.toLowerCase().includes(q) && !id.toLowerCase().includes(q)) continue;
    rows.push({ id, name: m.name, qty: m.qty, alreadyPublishedAs: wrappedBy.get(id) ?? null });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
