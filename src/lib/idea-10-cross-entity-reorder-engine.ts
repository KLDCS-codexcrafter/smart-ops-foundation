/**
 * @file        src/lib/idea-10-cross-entity-reorder-engine.ts
 * @sibling     NEW @ Sprint 101 · 🏁 Arc 0 Capstone · 💡 Idea 10
 * @orchestrator Reads stock across all entities (per-entity inventory localStorage
 *              stores), suggests inter-entity transfer when a sibling holds surplus
 *              OR a consolidated reorder when no surplus exists. For actual
 *              procurement, executeReorderAsIndent USE-SITE CALLS
 *              reorder-indent-bridge.promoteReorderToIndent — it does NOT
 *              reimplement reorder/indent logic (FR-44 · 0-DIFF).
 * @reads-from  reorder-indent-bridge · mock-entities · store-hub-engine (ReorderSuggestion shape)
 * @audit       Shares `master_lifecycle_event` with idea-9/idea-12.
 *              Action discriminator: 'cross_entity_reorder'.
 * @sprint      T-Phase-6.A.0.6 · Block 3
 * [JWT] Phase 8: POST /api/cross-entity-reorder/suggest · POST /api/cross-entity-reorder/execute
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { loadEntities } from '@/data/mock-entities';
import {
  promoteReorderToIndent,
  type PromoteReorderToIndentInput,
} from '@/lib/reorder-indent-bridge';
import type { ReorderSuggestion } from '@/lib/store-hub-engine';

export const READS_FROM = {
  engines: ['reorder-indent-bridge', 'mock-entities', 'store-hub-engine'],
  storage_keys: ['erp_<entity>_stock_balances', 'erp_group_items_*'],
} as const;

export interface EntitySurplus {
  entity_code: string;
  available: number;
}

export interface CrossEntityReorderSuggestion {
  item_key: string;
  short_entity: string;
  short_qty: number;
  surplus_entities: EntitySurplus[];
  action: 'inter_entity_transfer' | 'consolidated_reorder';
  qty: number;
}

interface StockRow {
  item_id?: string; item_key?: string; item_code?: string; item_name?: string;
  available?: number; balance?: number; qty_balance?: number; current_balance?: number;
}

function readStock(entity_code: string): StockRow[] {
  if (typeof localStorage === 'undefined') return [];
  const candidates = [
    `erp_${entity_code}_stock_balances`,
    `erp_stock_balances_${entity_code}`,
    `erp_${entity_code}_inventory_stock`,
  ];
  for (const k of candidates) {
    const raw = localStorage.getItem(k);
    if (!raw) continue;
    try {
      const arr = JSON.parse(raw) as StockRow[];
      if (Array.isArray(arr)) return arr;
    } catch { /* ignore */ }
  }
  return [];
}

function itemKey(r: StockRow): string {
  return r.item_id ?? r.item_key ?? r.item_code ?? r.item_name ?? '';
}

function itemAvailable(r: StockRow): number {
  return Number(r.available ?? r.balance ?? r.qty_balance ?? r.current_balance ?? 0);
}

/**
 * Walk every entity and propose either:
 *   - inter_entity_transfer  → at least one sibling holds surplus ≥ shortfall
 *   - consolidated_reorder   → no sibling has surplus; book a consolidated
 *                              indent in the requesting entity
 *
 * Pure read for the survey step; the result is a SUGGESTION only (no writes).
 */
export function suggestCrossEntityReorder(input: {
  item_key: string;
  threshold_qty: number;
  requesting_entity?: string;
}): CrossEntityReorderSuggestion[] {
  const seeded = new Set<string>();
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const m = k.match(/^erp_([^_]+)_stock_balances$/) ?? k.match(/^erp_stock_balances_(.+)$/);
      if (m) seeded.add(m[1]);
    }
  }
  const entityCodes = new Set<string>([
    ...seeded,
    ...loadEntities().map((e) => e.shortCode),
  ]);
  if (input.requesting_entity) entityCodes.add(input.requesting_entity);
  const inventory = Array.from(entityCodes).map((entity_code) => {
    const rows = readStock(entity_code);
    const hit = rows.find((r) => itemKey(r) === input.item_key);
    return { entity_code, available: hit ? itemAvailable(hit) : 0 };
  });
  const requesting = input.requesting_entity ?? inventory[0]?.entity_code ?? '';
  const short = inventory.find((r) => r.entity_code === requesting && r.available < input.threshold_qty);
  if (!short) return [];
  const shortQty = input.threshold_qty - short.available;
  const surplus = inventory
    .filter((r) => r.entity_code !== short.entity_code && r.available > input.threshold_qty)
    .map<EntitySurplus>((r) => ({ entity_code: r.entity_code, available: r.available - input.threshold_qty }));
  const action: CrossEntityReorderSuggestion['action'] = surplus.length > 0
    ? 'inter_entity_transfer'
    : 'consolidated_reorder';
  return [{
    item_key: input.item_key,
    short_entity: short.entity_code,
    short_qty: shortQty,
    surplus_entities: surplus,
    action,
    qty: shortQty,
  }];
}

/**
 * Promote a cross-entity reorder suggestion to a real Material Indent by
 * USE-SITE calling reorder-indent-bridge.promoteReorderToIndent. The bridge
 * (Card #3 sibling) owns the indent voucher mechanics; this orchestrator just
 * shapes the input and routes the call.
 */
export function executeReorderAsIndent(input: {
  item_key: string;
  entity_code: string;
  qty: number;
  godown_id?: string;
  godown_name?: string;
  uom?: string;
  department_id?: string;
  department_name?: string;
  notes?: string;
  created_by?: string;
}): { indent_ref: string | null; ok: boolean; reason?: string } {
  const suggestion: ReorderSuggestion = {
    item_id: input.item_key,
    item_name: input.item_key,
    godown_id: input.godown_id ?? 'CROSS-ENTITY',
    godown_name: input.godown_name ?? 'Cross-Entity Pool',
    current_balance: 0,
    reorder_level: input.qty,
    reorder_qty: input.qty,
    shortfall: input.qty,
    uom: input.uom ?? 'NOS',
    urgency: 'normal',
    safety_stock: 0,
  };
  const bridgeInput: PromoteReorderToIndentInput = {
    suggestion,
    department_id: input.department_id ?? 'CROSS-ENTITY',
    department_name: input.department_name ?? 'Cross-Entity Procurement',
    notes: input.notes ?? `Cross-entity consolidated reorder for ${input.item_key}`,
    created_by: input.created_by ?? 'system',
  };
  // [JWT] orchestrator USE-SITE READ · 0-DIFF on reorder-indent-bridge (FR-44).
  const res = promoteReorderToIndent(bridgeInput, input.entity_code);
  logAudit({
    entityCode: input.entity_code,
    action: 'create',
    entityType: 'master_lifecycle_event',
    recordId: `cross-reorder|${input.item_key}|${input.entity_code}|${Date.now()}`,
    recordLabel: `Cross-entity reorder ${input.item_key} qty ${input.qty}`,
    beforeState: null,
    afterState: { action: 'cross_entity_reorder', ...input, indent_ref: res.voucher_no },
    reason: 'cross_entity_reorder',
    sourceModule: 'mca-roc',
  });
  return { indent_ref: res.voucher_no, ok: res.ok, reason: res.reason };
}
