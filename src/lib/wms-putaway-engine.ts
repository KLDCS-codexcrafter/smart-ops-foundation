/**
 * wms-putaway-engine.ts — WMS ASN + Putaway + Shelf-View engine
 * Sprint WMS2 · W2 of WMS-ARC · SOLE new SIBLING this sprint.
 *
 * @realizes WMS-ARC W2 · ASN + putaway + shelf-view · Single-Door canon 5:
 *           EximX imports route through Dispatch inward (import stores
 *           READ-ONLY) · [JWT] Wave-2: server ASN feeds + supplier EDI.
 *
 * Walls (0-DIFF): ALL EximX files (importPOKey / billOfEntryKey READ-ONLY) ·
 *                 BinLabel · ItemLocation · godown (read-only) ·
 *                 inward-receipt (status union untouched) ·
 *                 packing-bom-engine · packing-slip-engine · wms-pick-pack
 *                 engine (the W1 pair) · hash-chain · logAudit · comply360
 *                 retention engine · RetentionConsolePage · applications ·
 *                 entitlements.
 *
 * Honest suggestion ladder (§L):
 *   ①  ItemLocation home bin for the item   (basis: item_location_home)
 *   ②  BinLabel.items_assigned includes the item (basis: bin_items_assigned)
 *   ③  Bins in receiving godown with capacity headroom (capacity null =
 *       unmeasured = SKIP) (basis: capacity_headroom)
 *   ④  none → empty list, basis: 'none' — NEVER fabricated.
 */

import type {
  AsnRecord,
  AsnSource,
  AsnLine,
  AsnStatus,
  BinPlacement,
  BinSuggestion,
  SuggestionBasis,
} from '@/types/wms-putaway';
import { asnRecordsKey, binPlacementsKey } from '@/types/wms-putaway';
import type { ImportPurchaseOrder } from '@/types/import-purchase-order';
import { importPOKey } from '@/types/import-purchase-order';
import type { BillOfEntry } from '@/types/bill-of-entry';
import { billOfEntryKey } from '@/types/bill-of-entry';
import type { BinLabel } from '@/types/bin-label';
import type { ItemLocation } from '@/types/item-location';
import { itemLocationsKey } from '@/types/item-location';
import type { Godown } from '@/types/godown';
import type { InwardReceipt } from '@/types/inward-receipt';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import { logAudit } from '@/lib/audit-trail-engine';
import { fyForDate } from '@/lib/fincore-engine';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';

// ── localStorage helpers ──────────────────────────────────────────────────
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

function nowIso(): string {
  return new Date().toISOString();
}

function fyFor(date: string, entityCode: string): string {
  return `FY-20${fyForDate(date, entityCode)}`;
}

// ── ID / number generators ────────────────────────────────────────────────
let asnCounter = 0;
function makeAsnNo(entityCode: string, source: AsnSource): string {
  asnCounter += 1;
  const tag = source === 'eximx_import' ? 'IM'
    : source === 'vendor_po' ? 'VP'
    : source === 'stock_transfer' ? 'ST'
    : 'MN';
  return `ASN-${tag}-${entityCode}-${Date.now()}-${asnCounter}`;
}

let placementCounter = 0;
function makePlacementId(): string {
  placementCounter += 1;
  return `bp-${Date.now()}-${placementCounter}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── ASN create / load ─────────────────────────────────────────────────────
export interface CreateAsnInput {
  source: AsnSource;
  source_ref_id?: string;
  source_ref_no?: string;
  expected_date: string;
  godown_id?: string;
  lines: Array<{ item_id: string; item_name: string; qty_expected: number }>;
}

export function listAsns(entityCode: string): AsnRecord[] {
  return safeRead<AsnRecord[]>(asnRecordsKey(entityCode), []);
}

export function createAsn(entityCode: string, input: CreateAsnInput): AsnRecord {
  const now = nowIso();
  const lines: AsnLine[] = input.lines.map((l, i) => ({
    id: `asnl-${Date.now()}-${i}`,
    item_id: l.item_id,
    item_name: l.item_name,
    qty_expected: l.qty_expected,
  }));
  const asn: AsnRecord = {
    id: `asn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    asn_no: makeAsnNo(entityCode, input.source),
    entity_id: entityCode,
    fiscal_year_id: fyFor(input.expected_date, entityCode),
    source: input.source,
    source_ref_id: input.source_ref_id,
    source_ref_no: input.source_ref_no,
    expected_date: input.expected_date,
    godown_id: input.godown_id,
    status: 'expected',
    lines,
    created_by: currentUserName(),
    retention_policy: getDefaultPolicyForRecordType('asn'),
    created_at: now,
    updated_at: now,
  };
  const existing = listAsns(entityCode);
  safeWrite(asnRecordsKey(entityCode), [...existing, asn]);

  try {
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'dispatch_txn_event',
      recordId: asn.id,
      recordLabel: `ASN ${asn.asn_no} (${asn.source})`,
      beforeState: null,
      afterState: {
        asn_no: asn.asn_no,
        source: asn.source,
        source_ref_no: asn.source_ref_no ?? null,
        lines: asn.lines.length,
      } as unknown as Record<string, unknown>,
      reason: 'ASN created (WMS2)',
      sourceModule: 'wms-putaway-engine',
    });
  } catch {
    /* never block */
  }
  return asn;
}

/**
 * Canon-5 proof: generate an ASN from an EximX Import PO. READS importPOKey
 * (and best-effort billOfEntryKey for the BoE ref) — WRITES ZERO EximX keys.
 */
export function generateAsnFromImportPO(
  entityCode: string,
  importPoId: string,
): AsnRecord | null {
  const importPOs = safeRead<ImportPurchaseOrder[]>(importPOKey(entityCode), []);
  const po = importPOs.find((p) => p.id === importPoId);
  if (!po) return null;

  // Best-effort BoE lookup — purely READ.
  const boes = safeRead<BillOfEntry[]>(billOfEntryKey(entityCode), []);
  const boe = boes.find((b) => (b as unknown as { import_po_id?: string }).import_po_id === importPoId);

  const sourceRefNo = boe
    ? `${po.po_number} · BoE ${(boe as unknown as { boe_number?: string }).boe_number ?? boe.id}`
    : po.po_number;

  return createAsn(entityCode, {
    source: 'eximx_import',
    source_ref_id: po.id,
    source_ref_no: sourceRefNo,
    expected_date: po.expected_delivery ?? po.po_date,
    lines: po.lines.map((l) => ({
      item_id: l.item_id,
      item_name: l.item_name,
      qty_expected: l.qty,
    })),
  });
}

function patchAsn(
  entityCode: string,
  asnId: string,
  patch: (a: AsnRecord) => AsnRecord | null,
  reason: string,
): AsnRecord | null {
  const all = listAsns(entityCode);
  const idx = all.findIndex((a) => a.id === asnId);
  if (idx < 0) return null;
  const before = { ...all[idx] };
  const next = patch(all[idx]);
  if (!next) return null;
  next.updated_at = nowIso();
  all[idx] = next;
  safeWrite(asnRecordsKey(entityCode), all);
  try {
    logAudit({
      entityCode,
      action: 'update',
      entityType: 'dispatch_txn_event',
      recordId: next.id,
      recordLabel: `ASN ${next.asn_no} → ${next.status}`,
      beforeState: { status: before.status, inward_receipt_id: before.inward_receipt_id ?? null },
      afterState: { status: next.status, inward_receipt_id: next.inward_receipt_id ?? null },
      reason,
      sourceModule: 'wms-putaway-engine',
    });
  } catch {
    /* never block */
  }
  return next;
}

export function markAsnArrived(entityCode: string, asnId: string): AsnRecord | null {
  return patchAsn(entityCode, asnId, (a) => {
    if (a.status !== 'expected') return null;
    return { ...a, status: 'arrived' as AsnStatus };
  }, 'ASN marked arrived (WMS2)');
}

export function cancelAsn(entityCode: string, asnId: string): AsnRecord | null {
  return patchAsn(entityCode, asnId, (a) => {
    if (a.status === 'received') return null;
    return { ...a, status: 'cancelled' as AsnStatus };
  }, 'ASN cancelled (WMS2)');
}

/**
 * Link an ASN to an existing inward-receipt (the receipt is created by the
 * existing inward flow — we never duplicate it here). Reads inward-receipt
 * store as READ-ONLY confirmation that the receipt exists.
 */
export function linkAsnToInwardReceipt(
  entityCode: string,
  asnId: string,
  inwardReceiptId: string,
): AsnRecord | null {
  const receipts = safeRead<InwardReceipt[]>(inwardReceiptsKey(entityCode), []);
  const ir = receipts.find((r) => r.id === inwardReceiptId);
  if (!ir) return null;
  return patchAsn(entityCode, asnId, (a) => ({
    ...a,
    inward_receipt_id: ir.id,
    inward_receipt_no: ir.receipt_no,
    status: 'received' as AsnStatus,
  }), 'ASN linked to inward receipt (no duplicate · WMS2)');
}

// ── Suggestion ladder (honest three-step) ─────────────────────────────────
function readBinLabels(): BinLabel[] {
  // Store Hub owns 'erp_bin_labels' (single global key) — read-only here.
  return safeRead<BinLabel[]>('erp_bin_labels', []);
}

function readItemLocations(entityCode: string): ItemLocation[] {
  return safeRead<ItemLocation[]>(itemLocationsKey(entityCode), []);
}

function readGodowns(): Godown[] {
  // Single global key 'erp_godowns' (read-only).
  return safeRead<Godown[]>('erp_godowns', []);
}

/**
 * Honest three-step suggestion ladder. NEVER fabricates a bin.
 * Returns at most one suggestion per basis level, ordered by priority.
 * If nothing matches, returns a single entry with basis='none'.
 */
export function suggestBins(
  entityCode: string,
  itemId: string,
  godownId?: string,
): BinSuggestion[] {
  const suggestions: BinSuggestion[] = [];
  const bins = readBinLabels();
  const itemLocs = readItemLocations(entityCode);
  const godowns = readGodowns();
  const godownById = new Map(godowns.map((g) => [g.id, g] as const));

  // ① ItemLocation home bin
  const home = itemLocs.find((l) =>
    l.item_id === itemId && !!l.bin_id && (!godownId || l.godown_id === godownId),
  );
  if (home && home.bin_id) {
    const bin = bins.find((b) => b.id === home.bin_id);
    suggestions.push({
      bin_label_id: home.bin_id,
      bin_location_code: bin?.location_code ?? home.bin_name ?? undefined,
      godown_id: home.godown_id ?? bin?.godown_id ?? '',
      godown_name: bin?.godown_name ?? godownById.get(home.godown_id ?? '')?.name ?? home.godown_name ?? undefined,
      basis: 'item_location_home',
      reason: 'Item-location home bin',
    });
  }

  // ② BinLabel.items_assigned match
  const assigned = bins.find((b) =>
    (b.items_assigned ?? []).includes(itemId) &&
    (!godownId || b.godown_id === godownId),
  );
  if (assigned && !suggestions.some((s) => s.bin_label_id === assigned.id)) {
    suggestions.push({
      bin_label_id: assigned.id,
      bin_location_code: assigned.location_code,
      godown_id: assigned.godown_id,
      godown_name: assigned.godown_name,
      basis: 'bin_items_assigned',
      reason: 'Bin lists this item as assigned',
    });
  }

  // ③ Capacity headroom (capacity null = SKIP · honest)
  if (godownId) {
    const placements = safeRead<BinPlacement[]>(binPlacementsKey(entityCode), []);
    const placedByBin = new Map<string, number>();
    for (const p of placements) {
      if (!p.bin_label_id) continue;
      placedByBin.set(p.bin_label_id, (placedByBin.get(p.bin_label_id) ?? 0) + p.qty_placed);
    }
    const headroomBin = bins.find((b) => {
      if (b.godown_id !== godownId) return false;
      if (b.capacity == null) return false; // unmeasured → skip
      if (suggestions.some((s) => s.bin_label_id === b.id)) return false; // skip bins already proposed
      const used = placedByBin.get(b.id) ?? 0;
      return used < b.capacity;
    });
    if (headroomBin) {
      suggestions.push({
        bin_label_id: headroomBin.id,
        bin_location_code: headroomBin.location_code,
        godown_id: headroomBin.godown_id,
        godown_name: headroomBin.godown_name,
        basis: 'capacity_headroom',
        reason: `Capacity headroom available (capacity ${headroomBin.capacity})`,
      });
    }
  }

  if (suggestions.length === 0) {
    return [{
      godown_id: godownId ?? '',
      basis: 'none' as SuggestionBasis,
      reason: 'No honest suggestion — pick a bin manually',
    }];
  }
  return suggestions;
}

// ── Record placement ──────────────────────────────────────────────────────
export interface RecordPlacementInput {
  inward_receipt_id: string;
  item_id: string;
  item_name: string;
  qty_placed: number;
  godown_id: string;
  bin_label_id?: string;
  bin_location_code?: string;
  suggestion_basis: SuggestionBasis;
}

export function recordPlacement(
  entityCode: string,
  input: RecordPlacementInput,
): BinPlacement | null {
  // Validate inward receipt exists.
  const receipts = safeRead<InwardReceipt[]>(inwardReceiptsKey(entityCode), []);
  const ir = receipts.find((r) => r.id === input.inward_receipt_id);
  if (!ir) return null;

  // Validate bin belongs to the godown (if a bin is supplied).
  if (input.bin_label_id) {
    const bins = readBinLabels();
    const bin = bins.find((b) => b.id === input.bin_label_id);
    if (!bin) return null;
    if (bin.godown_id !== input.godown_id) return null;
  }

  const now = nowIso();
  const placement: BinPlacement = {
    id: makePlacementId(),
    entity_id: entityCode,
    fiscal_year_id: fyFor(now.slice(0, 10), entityCode),
    inward_receipt_id: ir.id,
    inward_receipt_no: ir.receipt_no,
    item_id: input.item_id,
    item_name: input.item_name,
    qty_placed: input.qty_placed,
    godown_id: input.godown_id,
    bin_label_id: input.bin_label_id,
    bin_location_code: input.bin_location_code,
    placed_by: currentUserName(),
    suggestion_basis: input.suggestion_basis,
    created_by: currentUserName(),
    retention_policy: getDefaultPolicyForRecordType('bin-placement'),
    created_at: now,
    updated_at: now,
  };

  const existing = safeRead<BinPlacement[]>(binPlacementsKey(entityCode), []);
  safeWrite(binPlacementsKey(entityCode), [...existing, placement]);

  try {
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'dispatch_txn_event',
      recordId: placement.id,
      recordLabel: `Bin Placement · ${placement.inward_receipt_no} · ${placement.item_name}`,
      beforeState: null,
      afterState: {
        inward_receipt_no: placement.inward_receipt_no,
        item_id: placement.item_id,
        qty_placed: placement.qty_placed,
        bin_label_id: placement.bin_label_id ?? null,
        suggestion_basis: placement.suggestion_basis,
      } as unknown as Record<string, unknown>,
      reason: 'Bin placement recorded (WMS2)',
      sourceModule: 'wms-putaway-engine',
    });
  } catch {
    /* never block */
  }
  return placement;
}

// ── Putaway queue ─────────────────────────────────────────────────────────
export interface PutawayQueueItem {
  inward_receipt_id: string;
  inward_receipt_no: string;
  godown_id: string;
  godown_name: string;
  item_id: string;
  item_code: string;
  item_name: string;
  qty_received: number;
  qty_placed: number;
  qty_pending: number;
}

/**
 * Putaway queue: released inward-receipt lines minus already-placed qty.
 * Quarantine lines are excluded (post-clear is enforced upstream in QA).
 */
export function getPutawayQueue(entityCode: string): PutawayQueueItem[] {
  const receipts = safeRead<InwardReceipt[]>(inwardReceiptsKey(entityCode), []);
  const placements = safeRead<BinPlacement[]>(binPlacementsKey(entityCode), []);
  const placedByLine = new Map<string, number>();
  for (const p of placements) {
    const key = `${p.inward_receipt_id}::${p.item_id}`;
    placedByLine.set(key, (placedByLine.get(key) ?? 0) + p.qty_placed);
  }
  const queue: PutawayQueueItem[] = [];
  for (const ir of receipts) {
    if (ir.status !== 'released') continue;
    for (const ln of ir.lines ?? []) {
      if (ln.routing_decision !== 'auto_release') continue;
      const key = `${ir.id}::${ln.item_id}`;
      const placed = placedByLine.get(key) ?? 0;
      const pending = (ln.received_qty ?? 0) - placed;
      if (pending <= 0) continue;
      queue.push({
        inward_receipt_id: ir.id,
        inward_receipt_no: ir.receipt_no,
        godown_id: ir.godown_id,
        godown_name: ir.godown_name,
        item_id: ln.item_id,
        item_code: ln.item_code,
        item_name: ln.item_name,
        qty_received: ln.received_qty,
        qty_placed: placed,
        qty_pending: pending,
      });
    }
  }
  return queue;
}

// ── Shelf View ────────────────────────────────────────────────────────────
export interface ShelfBin {
  bin_label_id: string;
  location_code: string;
  capacity: number | null;
  capacity_unit: string | null;
  placed_qty: number;
  placements_count: number;
  /** true when no placement has been recorded — honest "no recorded placements" state */
  empty: boolean;
  items: Array<{ item_id: string; item_name: string; qty: number }>;
}

export function getShelfView(entityCode: string, godownId: string): ShelfBin[] {
  const bins = readBinLabels().filter((b) => b.godown_id === godownId);
  const placements = safeRead<BinPlacement[]>(binPlacementsKey(entityCode), [])
    .filter((p) => p.godown_id === godownId);
  return bins.map((bin) => {
    const my = placements.filter((p) => p.bin_label_id === bin.id);
    const byItem = new Map<string, { item_id: string; item_name: string; qty: number }>();
    for (const p of my) {
      const cur = byItem.get(p.item_id) ?? { item_id: p.item_id, item_name: p.item_name, qty: 0 };
      cur.qty += p.qty_placed;
      byItem.set(p.item_id, cur);
    }
    const placed = my.reduce((s, p) => s + p.qty_placed, 0);
    return {
      bin_label_id: bin.id,
      location_code: bin.location_code,
      capacity: bin.capacity ?? null,
      capacity_unit: bin.capacity_unit ?? null,
      placed_qty: placed,
      placements_count: my.length,
      empty: my.length === 0,
      items: Array.from(byItem.values()),
    };
  });
}

// ── Console summary ───────────────────────────────────────────────────────
export interface PutawaySummary {
  asn: { expected: number; arrived: number; received: number; cancelled: number };
  putaway_pending_lines: number;
  placements_total: number;
}

export function getPutawaySummary(entityCode: string): PutawaySummary {
  const asns = listAsns(entityCode);
  const a = { expected: 0, arrived: 0, received: 0, cancelled: 0 };
  for (const x of asns) a[x.status] += 1;
  const queue = getPutawayQueue(entityCode);
  const placements = safeRead<BinPlacement[]>(binPlacementsKey(entityCode), []);
  return {
    asn: a,
    putaway_pending_lines: queue.length,
    placements_total: placements.length,
  };
}

export function listPlacements(entityCode: string): BinPlacement[] {
  return safeRead<BinPlacement[]>(binPlacementsKey(entityCode), []);
}
