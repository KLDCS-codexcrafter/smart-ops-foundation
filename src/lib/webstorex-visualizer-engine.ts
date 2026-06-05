/**
 * @file        src/lib/webstorex-visualizer-engine.ts
 * @realizes    Visualizer math + compositions (DP-WS-12 · product-agnostic · §O honesty)
 *              + store stats aggregation
 * @reads-from  webstorex-engine (cutouts · dims · READ-ONLY) ·
 *              ws_store_orders + commerce stores (READ-ONLY)
 * @sprint      Sprint 152 · T-WebStoreX-A11.4 · ARC CLOSER
 * @walls       webstorex-engine.ts + webstorex-commerce-engine.ts +
 *              webstorex-order-engine.ts ZERO-DIFF.
 * [JWT] P2BB+: AI try-on · 3D/AR placement (DP-WS-20 register).
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { getCatalog, getStoreItem } from '@/lib/webstorex-engine';
import type {
  WebStoreItem,
  VisualizerPlacement, VisualizerComposition, StoreStats,
  WsStoreOrder, WsPointsEntry, WsScheme, WsQuoteRequest,
} from '@/types/webstorex';
import {
  wsCompositionsKey, wsStoreOrdersKey, wsPointsKey,
  wsSchemesKey, wsQuoteRequestsKey,
} from '@/types/webstorex';

// ─── tiny LS helpers ────────────────────────────────────────────────
function ls<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}
function nowIso(nowISO?: string): string { return nowISO ?? new Date().toISOString(); }
function newId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`; }

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
      reason: reason ?? null, sourceModule: 'webstorex-visualizer-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

// ═══════════════════════════════════════════════════════════════════════
// REFERENCE-SCALE MATH (pure · fully tested · DP-WS-12)
// ═══════════════════════════════════════════════════════════════════════

/** lineLengthPx / realLengthCm. Throws on zero/negative realLength. */
export function computePxPerCm(referenceLine: {
  x1: number; y1: number; x2: number; y2: number; realLengthCm: number;
}): number {
  if (!referenceLine || referenceLine.realLengthCm <= 0) {
    throw new Error('Reference line realLengthCm must be > 0');
  }
  const dx = referenceLine.x2 - referenceLine.x1;
  const dy = referenceLine.y2 - referenceLine.y1;
  const lineLengthPx = Math.sqrt(dx * dx + dy * dy);
  return lineLengthPx / referenceLine.realLengthCm;
}

/** Scale that renders item at true width given calibrated photo. */
export function suggestedScaleFor(
  item: Pick<WebStoreItem, 'dimensionsCm'>,
  pxPerCm: number,
  cutoutNaturalWidthPx: number,
): number | null {
  if (!item?.dimensionsCm || !item.dimensionsCm.w) return null;       // §O honesty
  if (pxPerCm <= 0 || cutoutNaturalWidthPx <= 0) return null;
  const targetWidthPx = item.dimensionsCm.w * pxPerCm;
  return targetWidthPx / cutoutNaturalWidthPx;
}

/** Honest dimensions chip text — never invents. */
export function dimensionChipText(item: Pick<WebStoreItem, 'dimensionsCm'>): string {
  const d = item?.dimensionsCm;
  if (!d || d.l == null || d.w == null || d.h == null) return 'dimensions not on record';
  return `${d.l}×${d.w}×${d.h} cm`;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPOSITIONS — CRUD (storage: ws_compositions_<entity>)
// ═══════════════════════════════════════════════════════════════════════

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

function approxDataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(',');
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  // base64 length → bytes (rough, sufficient for ≤2MB throw)
  return Math.floor((b64.length * 3) / 4);
}

export function listCompositions(entityCode: string): VisualizerComposition[] {
  return ls<VisualizerComposition>(wsCompositionsKey(entityCode));
}

export function createComposition(
  entityCode: string,
  input: { name: string; roomPhotoDataUrl: string; createdByUserId: string },
  nowISO?: string,
): VisualizerComposition {
  if (!input.name || !input.name.trim()) throw new Error('Composition name is required');
  if (!input.roomPhotoDataUrl) throw new Error('Room photo is required');
  if (approxDataUrlBytes(input.roomPhotoDataUrl) > MAX_PHOTO_BYTES) {
    throw new Error('Room photo exceeds 2MB cap');
  }
  const at = nowIso(nowISO);
  const comp: VisualizerComposition = {
    id: newId('wcmp'), entityId: entityCode, name: input.name.trim(),
    roomPhotoDataUrl: input.roomPhotoDataUrl,
    placements: [],
    referenceLine: null, pxPerCm: null,
    honestyLabel: true,
    createdAt: at, createdByUserId: input.createdByUserId, updatedAt: at,
  };
  const all = listCompositions(entityCode);
  all.push(comp); ss(wsCompositionsKey(entityCode), all);
  safeAudit(entityCode, 'create', comp.id, `Composition: ${comp.name}`, null, { name: comp.name });
  return comp;
}

export function updateComposition(
  entityCode: string,
  compositionId: string,
  patch: Partial<Pick<VisualizerComposition, 'name' | 'placements' | 'referenceLine' | 'pxPerCm'>>,
  byUserId: string,
  nowISO?: string,
): VisualizerComposition {
  const all = listCompositions(entityCode);
  const idx = all.findIndex((c) => c.id === compositionId);
  if (idx < 0) throw new Error('Composition not found');
  const before = all[idx];
  const next: VisualizerComposition = {
    ...before,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.placements !== undefined ? { placements: patch.placements } : {}),
    ...(patch.referenceLine !== undefined ? { referenceLine: patch.referenceLine } : {}),
    ...(patch.pxPerCm !== undefined ? { pxPerCm: patch.pxPerCm } : {}),
    honestyLabel: true,
    updatedAt: nowIso(nowISO),
  };
  // recompute pxPerCm when referenceLine provided without explicit pxPerCm
  if (patch.referenceLine && patch.pxPerCm === undefined) {
    try { next.pxPerCm = computePxPerCm(patch.referenceLine); } catch { next.pxPerCm = null; }
  }
  all[idx] = next; ss(wsCompositionsKey(entityCode), all);
  safeAudit(entityCode, 'update', next.id, `Composition: ${next.name}`,
    { placements: before.placements.length },
    { placements: next.placements.length });
  void byUserId;
  return next;
}

export function deleteComposition(entityCode: string, compositionId: string): void {
  const all = listCompositions(entityCode);
  const before = all.find((c) => c.id === compositionId);
  const next = all.filter((c) => c.id !== compositionId);
  ss(wsCompositionsKey(entityCode), next);
  if (before) safeAudit(entityCode, 'cancel', before.id, `Composition: ${before.name}`, { name: before.name }, null);
}

/** Add placement · throws if item has no cutout image. */
export function addPlacement(
  entityCode: string, compositionId: string, storeItemId: string,
  opts?: { x?: number; y?: number; scale?: number; rotationDeg?: number; flipped?: boolean },
  nowISO?: string,
): VisualizerComposition {
  const item = getStoreItem(entityCode, storeItemId);
  if (!item) throw new Error('Store item not found');
  const cutout = item.images.find((i) => i.kind === 'cutout');
  if (!cutout) throw new Error('no cutout image on record');
  const all = listCompositions(entityCode);
  const idx = all.findIndex((c) => c.id === compositionId);
  if (idx < 0) throw new Error('Composition not found');
  const placement: VisualizerPlacement = {
    storeItemId, cutoutImageId: cutout.id,
    x: opts?.x ?? 400, y: opts?.y ?? 300,
    scale: opts?.scale ?? 1, rotationDeg: opts?.rotationDeg ?? 0,
    flipped: opts?.flipped ?? false,
  };
  const next: VisualizerComposition = {
    ...all[idx],
    placements: [...all[idx].placements, placement],
    honestyLabel: true,
    updatedAt: nowIso(nowISO),
  };
  all[idx] = next; ss(wsCompositionsKey(entityCode), all);
  safeAudit(entityCode, 'update', next.id, `Placement add: ${item.storeTitle}`, null, { storeItemId });
  return next;
}

// ═══════════════════════════════════════════════════════════════════════
// STORE STATS (pure aggregation · READ-ONLY across surfaces)
// ═══════════════════════════════════════════════════════════════════════
export function buildStoreStats(entityCode: string, nowISO?: string): StoreStats {
  void nowIso(nowISO);
  const catalog = getCatalog(entityCode, {});
  const orders = ls<WsStoreOrder>(wsStoreOrdersKey(entityCode));
  const points = ls<WsPointsEntry>(wsPointsKey(entityCode));
  const schemesMaster = ls<WsScheme>(wsSchemesKey(entityCode));
  const quotes = ls<WsQuoteRequest>(wsQuoteRequestsKey(entityCode));

  // catalog partition
  const cat = {
    total: catalog.length,
    published: catalog.filter((i) => i.visibility === 'published').length,
    draft:     catalog.filter((i) => i.visibility === 'draft').length,
    hidden:    catalog.filter((i) => i.visibility === 'hidden').length,
    withVariants: catalog.filter((i) => i.hasVariants).length,
    withCutout:   catalog.filter((i) => i.images.some((im) => im.kind === 'cutout')).length,
  };

  // orders byVia + totals
  const byVia = { storefront: 0, quick_order: 0, reorder: 0 };
  let totalPayable = 0;
  for (const o of orders) {
    byVia[o.placedVia] = (byVia[o.placedVia] ?? 0) + 1;
    totalPayable += o.evaluation?.payable ?? 0;
  }

  // top items by ordered qty from snapshots
  const qtyMap = new Map<string, number>();
  for (const o of orders) {
    for (const ln of (o.evaluation?.lines ?? [])) {
      qtyMap.set(ln.storeItemId, (qtyMap.get(ln.storeItemId) ?? 0) + ln.qty);
    }
  }
  const titleOf = (id: string): string => catalog.find((c) => c.id === id)?.storeTitle ?? id;
  const topItems = Array.from(qtyMap.entries())
    .map(([storeItemId, orderedQty]) => ({ storeItemId, title: titleOf(storeItemId), orderedQty }))
    .sort((a, b) => b.orderedQty - a.orderedQty)
    .slice(0, 5);

  // scheme appliedCount from snapshots
  const schemeMap = new Map<string, number>();
  for (const o of orders) {
    for (const a of (o.evaluation?.appliedSchemes ?? [])) {
      schemeMap.set(a.schemeId, (schemeMap.get(a.schemeId) ?? 0) + 1);
    }
  }
  const schemes = Array.from(schemeMap.entries()).map(([schemeId, appliedCount]) => ({
    schemeId,
    name: schemesMaster.find((s) => s.id === schemeId)?.name ?? schemeId,
    appliedCount,
  })).sort((a, b) => b.appliedCount - a.appliedCount);

  // loyalty earned/redeemed (reversals exclude both sides)
  const reversedIds = new Set(
    points.filter((p) => p.kind === 'reversal' && p.reversesEntryId).map((p) => p.reversesEntryId!),
  );
  let totalEarned = 0, totalRedeemed = 0;
  for (const p of points) {
    if (p.kind === 'reversal') continue;
    if (reversedIds.has(p.id)) continue;
    if (p.kind === 'earn') totalEarned += p.points;
    else if (p.kind === 'redeem') totalRedeemed += p.points;
  }

  return {
    catalog: cat,
    orders: { count: orders.length, totalPayable: Math.round(totalPayable * 100) / 100, byVia },
    topItems,
    schemes,
    loyalty: { totalEarned, totalRedeemed },
    quotes: { count: quotes.length },
  };
}
