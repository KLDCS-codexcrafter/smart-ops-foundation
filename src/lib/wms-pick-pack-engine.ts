/**
 * wms-pick-pack-engine.ts — WMS Pick & Pack engine (Sprint WMS1 · W1 of WMS-ARC)
 *
 * @realizes WMS-ARC W1 per WMS_ARC_Step1_Alignment_v1
 *
 * Single-Door canon: ALL order sources via `ordersKey` ONLY. The picker
 * NEVER touches `ecOrdersKey` / `wsStoreOrdersKey` (those are link+snapshot
 * mirrors per the EcOrder / WsStoreOrder canonical comments). Source
 * attribution comes from the Order record itself via the honest
 * `narration` prefix written by ecomx-engine.ts / webstorex-order-engine.ts.
 *
 * [JWT] Wave-2: server picklists + picker auth + camera barcode scan.
 *
 * Walls (0-DIFF): packing-bom-engine.ts (consumed) · packing-slip-engine.ts
 *                 (consumed) · BinLabel (READ-ONLY · Store Hub-owned) ·
 *                 hash-chain pair · logAudit entry-write · comply360
 *                 retention engine · P8.6 retention console · applications ·
 *                 entitlements.
 */

import type { Order } from '@/types/order';
import { ordersKey } from '@/types/order';
import type { BinLabel } from '@/types/bin-label';
import type { ItemPacking } from '@/types/item-packing';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { PackingBOM } from '@/types/packing-bom';
import type { PackingSlip } from '@/types/packing-slip';
import { packingSlipsKey } from '@/types/packing-slip';
import type {
  Picklist,
  PicklistLine,
  PicklistSourceSummary,
  PickBucketType,
  PickSource,
  PackGroup,
  PackGroupLine,
} from '@/types/wms-pick-pack';
import { picklistsKey, packGroupsKey } from '@/types/wms-pick-pack';
import { logAudit } from '@/lib/audit-trail-engine';
import { fyForDate } from '@/lib/fincore-engine';
import { resolveActiveBOM } from '@/lib/packing-bom-engine';
import { computePackingSlip } from '@/lib/packing-slip-engine';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';

// ── localStorage helpers (defensive, identical contract to other engines) ──
function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* swallow */
  }
}

function currentUserName(): string {
  try {
    if (typeof localStorage === 'undefined') return 'system';
    const raw = localStorage.getItem('erp_mock_auth_active');
    if (!raw) return 'system';
    const u = JSON.parse(raw);
    return u?.name ?? u?.id ?? 'system';
  } catch {
    return 'system';
  }
}

// ─── Source attribution · WMS2 rider: field-first, narration-sniff fallback ─
// Order.source (added in WMS2) is the honest birth-site tag written by
// ecomx-engine.ts (~675) and webstorex-order-engine.ts (~376). Legacy rows
// without `source` fall through to the original narration sniffer below.
// See §L disclosure in WMS2 close summary.
export function classifyOrderSource(order: Order): PickSource {
  if (order.source === 'ecomx' || order.source === 'webstorex' || order.source === 'salesx') {
    return order.source;
  }
  const n = order.narration ?? '';
  if (n.startsWith('EcomX')) return 'ecomx';
  if (n.startsWith('WebStoreX')) return 'webstorex';
  return 'salesx';
}

// ─── Pickable predicate ───────────────────────────────────────────────────
// Honest predicate (§L disclosure):
//   - status ∈ {'open', 'partial'}   (have pending qty)
//   - lines have at least one with pending_qty > 0
// (No fabricated 'picked'/'released' status — none exists in Order today.)
export function isOrderPickable(order: Order): boolean {
  if (order.status !== 'open' && order.status !== 'partial') return false;
  return (order.lines ?? []).some((l) => (l.pending_qty ?? 0) > 0);
}

export interface PickableOrder {
  order: Order;
  source: PickSource;
}

/** Single-Door read: ALL pickable orders, source-tagged. Reads ordersKey only. */
export function getOpenPickableOrders(entityCode: string): PickableOrder[] {
  const all = safeRead<Order[]>(ordersKey(entityCode), []);
  return all
    .filter((o) => o.base_voucher_type === 'Sales Order' && isOrderPickable(o))
    .map((order) => ({ order, source: classifyOrderSource(order) }));
}

// ─── Bucket classification (heuristic · §L disclosure) ────────────────────
// single_item : exactly 1 line with pending qty == 1
// b2b_bulk    : source === 'salesx' AND total pending qty >= 50
//                (B2B carbon: EcomX/WebStoreX are consumer channels)
// multi_item  : everything else
export function classifyBucket(order: Order, source: PickSource): PickBucketType {
  const pendingLines = (order.lines ?? []).filter((l) => (l.pending_qty ?? 0) > 0);
  const totalPending = pendingLines.reduce((s, l) => s + (l.pending_qty ?? 0), 0);
  if (pendingLines.length === 1 && totalPending === 1) return 'single_item';
  if (source === 'salesx' && totalPending >= 50) return 'b2b_bulk';
  return 'multi_item';
}

// ─── Bin hint resolver (honest · BinLabel READ-ONLY) ──────────────────────
function resolveBinHint(itemId: string, binLabels: BinLabel[]): string {
  // 1. BinLabel.items_assigned match
  for (const bl of binLabels) {
    if (bl.items_assigned && bl.items_assigned.includes(itemId)) {
      return [bl.godown_name, bl.location_code].filter(Boolean).join(' · ');
    }
  }
  // 2. No match — return blank. NEVER fabricate.
  return '';
}

// ─── Picklist generator ───────────────────────────────────────────────────
export interface GenerateOpts {
  bucket?: PickBucketType;
  godownId?: string;
}

let picklistCounter = 0;
function makePicklistNo(entityCode: string, bucket: PickBucketType): string {
  picklistCounter += 1;
  const tag = bucket === 'single_item' ? 'S' : bucket === 'multi_item' ? 'M' : 'B';
  return `PL-${tag}-${entityCode}-${Date.now()}-${picklistCounter}`;
}

function readBinLabels(entityCode: string): BinLabel[] {
  // Store Hub owns 'erp_bin_labels' (single global key) — read-only here.
  void entityCode;
  return safeRead<BinLabel[]>('erp_bin_labels', []);
}

/**
 * Generate picklists from currently pickable orders. Lines are grouped
 * item-first for an optimised walk (same item across multiple orders is
 * picked together — single trip to the bin).
 */
export function generatePicklists(
  entityCode: string,
  opts: GenerateOpts = {},
): Picklist[] {
  const pickable = getOpenPickableOrders(entityCode);
  const binLabels = readBinLabels(entityCode);
  const now = new Date().toISOString();
  const fy = `FY-20${fyForDate(now.slice(0, 10), entityCode)}`;
  const user = currentUserName();

  // Group orders into buckets
  const grouped: Record<PickBucketType, PickableOrder[]> = {
    single_item: [],
    multi_item: [],
    b2b_bulk: [],
  };
  for (const po of pickable) {
    const b = classifyBucket(po.order, po.source);
    if (opts.bucket && opts.bucket !== b) continue;
    grouped[b].push(po);
  }

  const picklists: Picklist[] = [];
  for (const bucket of ['single_item', 'multi_item', 'b2b_bulk'] as PickBucketType[]) {
    const members = grouped[bucket];
    if (members.length === 0) continue;

    // Build lines · sort item-first (same item across orders is adjacent)
    const rawLines: PicklistLine[] = [];
    const summary: PicklistSourceSummary = { salesx: 0, ecomx: 0, webstorex: 0 };
    let lineSeq = 0;
    for (const { order, source } of members) {
      summary[source] += 1;
      for (const l of order.lines ?? []) {
        if ((l.pending_qty ?? 0) <= 0) continue;
        lineSeq += 1;
        rawLines.push({
          id: `pll-${Date.now()}-${lineSeq}`,
          order_id: order.id,
          order_no: order.order_no,
          source,
          item_id: l.item_id,
          item_name: l.item_name,
          qty_ordered: l.pending_qty,
          qty_picked: 0,
          bin_hint: resolveBinHint(l.item_id, binLabels),
          status: 'pending',
        });
      }
    }
    // Item-first walk grouping: stable sort by item_id
    rawLines.sort((a, b) => (a.item_id ?? '').localeCompare(b.item_id ?? ''));

    const picklist: Picklist = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${bucket}`,
      picklist_no: makePicklistNo(entityCode, bucket),
      entity_id: entityCode,
      fiscal_year_id: fy,
      godown_id: opts.godownId,
      bucket,
      status: 'open',
      lines: rawLines,
      source_summary: summary,
      created_by: user,
      retention_policy: getDefaultPolicyForRecordType('picklist'),
      created_at: now,
      updated_at: now,
    };
    picklists.push(picklist);
  }

  // Persist
  const existing = safeRead<Picklist[]>(picklistsKey(entityCode), []);
  safeWrite(picklistsKey(entityCode), [...existing, ...picklists]);

  for (const pl of picklists) {
    try {
      logAudit({
        entityCode,
        action: 'create',
        entityType: 'dispatch_txn_event',
        recordId: pl.id,
        recordLabel: `Picklist ${pl.picklist_no} (${pl.bucket})`,
        beforeState: null,
        afterState: { picklist_no: pl.picklist_no, bucket: pl.bucket, lines: pl.lines.length } as unknown as Record<string, unknown>,
        reason: 'Picklist generated (WMS1)',
        sourceModule: 'wms-pick-pack-engine',
      });
    } catch {
      /* never block on audit */
    }
  }

  return picklists;
}

// ─── Confirm pick (supports short-pick) ───────────────────────────────────
export function confirmPick(
  entityCode: string,
  picklistId: string,
  lineId: string,
  qtyPicked: number,
): Picklist | null {
  const all = safeRead<Picklist[]>(picklistsKey(entityCode), []);
  const idx = all.findIndex((p) => p.id === picklistId);
  if (idx < 0) return null;
  const pl = all[idx];
  const lineIdx = pl.lines.findIndex((l) => l.id === lineId);
  if (lineIdx < 0) return null;

  const line = pl.lines[lineIdx];
  const q = Math.max(0, qtyPicked);
  const updatedLine: PicklistLine = {
    ...line,
    qty_picked: q,
    status: q >= line.qty_ordered ? 'picked' : 'short',
  };
  pl.lines[lineIdx] = updatedLine;

  const anyPending = pl.lines.some((l) => l.status === 'pending');
  pl.status = anyPending ? 'in_progress' : 'completed';
  pl.updated_at = new Date().toISOString();
  all[idx] = pl;
  safeWrite(picklistsKey(entityCode), all);

  try {
    logAudit({
      entityCode,
      action: 'update',
      entityType: 'dispatch_txn_event',
      recordId: pl.id,
      recordLabel: `Pick confirmed · ${pl.picklist_no} · line ${line.id}`,
      beforeState: { qty_picked: line.qty_picked, status: line.status },
      afterState: { qty_picked: updatedLine.qty_picked, status: updatedLine.status, picklist_status: pl.status },
      reason: 'Picker confirmed line',
      sourceModule: 'wms-pick-pack-engine',
    });
  } catch {
    /* never block */
  }
  return pl;
}

// ─── Pack Group ───────────────────────────────────────────────────────────
let packGroupCounter = 0;
function makePackGroupNo(entityCode: string): string {
  packGroupCounter += 1;
  return `PG-${entityCode}-${Date.now()}-${packGroupCounter}`;
}

/**
 * Create a pack group from a completed picklist. Looks up an active
 * PackingBOM (consumed read-only) for each picked item where present.
 */
export function createPackGroup(
  entityCode: string,
  picklistId: string,
): PackGroup | null {
  const picklists = safeRead<Picklist[]>(picklistsKey(entityCode), []);
  const pl = picklists.find((p) => p.id === picklistId);
  if (!pl) return null;
  if (pl.status !== 'completed') return null;

  const now = new Date().toISOString();
  const fy = `FY-20${fyForDate(now.slice(0, 10), entityCode)}`;
  const user = currentUserName();

  const lines: PackGroupLine[] = pl.lines
    .filter((l) => l.qty_picked > 0)
    .map((l, i) => ({
      id: `pgl-${Date.now()}-${i}`,
      picklist_line_id: l.id,
      item_id: l.item_id,
      item_name: l.item_name,
      qty: l.qty_picked,
    }));

  // BOM resolution (read-only consume)
  const boms = safeRead<PackingBOM[]>(`erp_packing_boms_${entityCode}`, []);
  let bomApplied: string | undefined;
  for (const ln of lines) {
    const bom = resolveActiveBOM(ln.item_id, now.slice(0, 10), boms);
    if (bom) {
      bomApplied = bom.id;
      break;
    }
  }

  const pg: PackGroup = {
    id: `pg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    pack_group_no: makePackGroupNo(entityCode),
    entity_id: entityCode,
    fiscal_year_id: fy,
    picklist_id: pl.id,
    status: 'open',
    bom_applied: bomApplied,
    lines,
    created_by: user,
    retention_policy: getDefaultPolicyForRecordType('pack-group'),
    created_at: now,
    updated_at: now,
  };

  const existing = safeRead<PackGroup[]>(packGroupsKey(entityCode), []);
  safeWrite(packGroupsKey(entityCode), [...existing, pg]);

  try {
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'dispatch_txn_event',
      recordId: pg.id,
      recordLabel: `Pack Group ${pg.pack_group_no}`,
      beforeState: null,
      afterState: { pack_group_no: pg.pack_group_no, picklist_id: pl.id, lines: lines.length, bom_applied: bomApplied ?? null },
      reason: 'Pack group created (WMS1)',
      sourceModule: 'wms-pick-pack-engine',
    });
  } catch {
    /* never block */
  }
  return pg;
}

// ─── Mark Packed · generates packing slip via EXISTING engine ─────────────
export function markPacked(
  entityCode: string,
  packGroupId: string,
): { packGroup: PackGroup; packingSlip: PackingSlip } | null {
  const packGroups = safeRead<PackGroup[]>(packGroupsKey(entityCode), []);
  const idx = packGroups.findIndex((p) => p.id === packGroupId);
  if (idx < 0) return null;
  const pg = packGroups[idx];
  if (pg.status === 'packed') return null;

  // Synthesize a minimal DLN-shaped voucher so computePackingSlip can run.
  // We never write this voucher anywhere — it is a transient input only.
  const now = new Date().toISOString();
  const inventoryLines: VoucherInventoryLine[] = pg.lines.map((l, i) => ({
    id: `dln-line-${l.id}`,
    item_id: l.item_id,
    item_code: l.item_id,
    item_name: l.item_name,
    hsn_sac_code: '',
    qty: l.qty,
    uom: 'NOS',
    rate: 0,
    discount_percent: 0,
    taxable_value: 0,
    gst_rate: 0,
    godown_id: '',
    batch_id: null,
    serial_id: null,
    line_no: i + 1,
  } as unknown as VoucherInventoryLine));

  const transientDLN: Voucher = {
    id: `wms1-dln-transient-${pg.id}`,
    voucher_no: pg.pack_group_no,
    base_voucher_type: 'Delivery Note',
    entity_id: entityCode,
    date: now.slice(0, 10),
    party_id: '',
    party_name: '',
    inventory_lines: inventoryLines,
    narration: `WMS1 Pack Group ${pg.pack_group_no}`,
  } as unknown as Voucher;

  const itemPackings = safeRead<ItemPacking[]>(`erp_item_packings_${entityCode}`, []);

  const slip = computePackingSlip({
    dln: transientDLN,
    itemPackings,
    shipToAddress: '',
    shipToCity: '',
    shipToState: '',
    shipToPincode: '',
    generatedBy: currentUserName(),
    entityCode,
  });

  // Persist into the EXISTING packing-slips store (same key the rest of
  // the app reads). We do NOT write a parallel slip engine.
  const existingSlips = safeRead<PackingSlip[]>(packingSlipsKey(entityCode), []);
  safeWrite(packingSlipsKey(entityCode), [...existingSlips, slip]);

  pg.status = 'packed';
  pg.packing_slip_id = slip.id;
  pg.updated_at = now;
  packGroups[idx] = pg;
  safeWrite(packGroupsKey(entityCode), packGroups);

  try {
    logAudit({
      entityCode,
      action: 'update',
      entityType: 'dispatch_txn_event',
      recordId: pg.id,
      recordLabel: `Pack Group ${pg.pack_group_no} → packed`,
      beforeState: { status: 'open' },
      afterState: { status: 'packed', packing_slip_id: slip.id },
      reason: 'Mark packed · packing slip generated via existing packing-slip-engine',
      sourceModule: 'wms-pick-pack-engine',
    });
  } catch {
    /* never block */
  }
  return { packGroup: pg, packingSlip: slip };
}

// ─── Console summary ──────────────────────────────────────────────────────
export interface PickPackSummary {
  openOrders: { total: number; salesx: number; ecomx: number; webstorex: number };
  picklists: { open: number; in_progress: number; completed: number; cancelled: number };
  packGroups: { open: number; packed: number };
}

export function getPickPackSummary(entityCode: string): PickPackSummary {
  const pickable = getOpenPickableOrders(entityCode);
  const ord = { total: pickable.length, salesx: 0, ecomx: 0, webstorex: 0 };
  for (const p of pickable) ord[p.source] += 1;

  const picklists = safeRead<Picklist[]>(picklistsKey(entityCode), []);
  const pls = { open: 0, in_progress: 0, completed: 0, cancelled: 0 };
  for (const p of picklists) pls[p.status] += 1;

  const packGroups = safeRead<PackGroup[]>(packGroupsKey(entityCode), []);
  const pgs = { open: 0, packed: 0 };
  for (const p of packGroups) pgs[p.status] += 1;

  return { openOrders: ord, picklists: pls, packGroups: pgs };
}

// ─── Test/dev helpers (no production use) ─────────────────────────────────
export function _resetCounters(): void {
  picklistCounter = 0;
  packGroupCounter = 0;
}
