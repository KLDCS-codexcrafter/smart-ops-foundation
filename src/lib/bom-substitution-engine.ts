/**
 * @file     bom-substitution-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2.5 · Block D · D-543
 * @purpose  BOM line substitution engine. Two tiers:
 *           Tier 1 — Approved ItemSubstitute Master lookup (preferred).
 *           Tier 2 — Free-form fallback (any item · requires reason + notes).
 *           Recomputes cost variance and yield impact on the PO line.
 */

import type {
  ProductionOrder,
  ProductionOrderLine,
  SubstituteReason,
} from '@/types/production-order';
import type { ItemSubstitute } from '@/types/item-substitute';
import type { InventoryItem } from '@/types/inventory-item';
import { productionOrdersKey } from '@/types/production-order';

// ════════════════════════════════════════════════════════════════════
// Tier 1 · Approved master lookup
// ════════════════════════════════════════════════════════════════════

/**
 * Return approved + active substitutes effective for `primaryItemId` on `today`.
 * Pure function — does not touch storage.
 */
export function findApprovedSubstitutes(
  substitutes: ItemSubstitute[],
  primaryItemId: string,
  today: string = new Date().toISOString().slice(0, 10),
): ItemSubstitute[] {
  return substitutes.filter(s =>
    s.primary_item_id === primaryItemId &&
    s.is_active &&
    s.approval_status === 'approved' &&
    s.effective_from <= today &&
    (s.effective_until === null || s.effective_until >= today)
  );
}

// ════════════════════════════════════════════════════════════════════
// Substitution application
// ════════════════════════════════════════════════════════════════════

export interface ApplySubstitutionInput {
  line_id: string;
  reason: SubstituteReason;
  notes: string;
  /** Tier 1: pass an approved ItemSubstitute (preferred) */
  approved?: ItemSubstitute;
  /** Tier 2: free-form override (skip master) */
  freeForm?: {
    substitute_item_id: string;
    substitute_item_code: string;
    substitute_item_name: string;
    /** 1 primary = ratio substitute */
    ratio: number;
  };
  /** Optional yield impact (%) the operator records · default 0 */
  yield_impact_pct?: number;
}

export interface SubstitutionResult {
  order: ProductionOrder;
  line: ProductionOrderLine;
}

/**
 * Apply a substitution to one PO line. Throws if line not found, if PO is not
 * in a state that permits BOM edits (must be draft or released), or if neither
 * approved nor freeForm is supplied.
 *
 * Tier 1 (approved): increments `used_count` / `last_used_at` would normally
 * happen via useItemSubstitutes — this engine keeps that side-effect-free.
 */
export function applySubstitution(
  order: ProductionOrder,
  input: ApplySubstitutionInput,
  itemMasters: InventoryItem[],
  user: { id: string; name: string },
): SubstitutionResult {
  if (order.status !== 'draft' && order.status !== 'released') {
    throw new Error(`Cannot substitute on PO in status "${order.status}"`);
  }
  if (!input.notes || !input.notes.trim()) {
    throw new Error('Substitution notes are required for audit trail');
  }
  if (!input.approved && !input.freeForm) {
    throw new Error('Either an approved ItemSubstitute or freeForm details required');
  }

  const lineIdx = order.lines.findIndex(l => l.id === input.line_id);
  if (lineIdx < 0) throw new Error(`PO line ${input.line_id} not found`);
  const line = order.lines[lineIdx];

  // Resolve substitute identity + ratio + master id
  const sub = input.approved
    ? {
        item_id: input.approved.substitute_item_id,
        item_code: input.approved.substitute_item_code,
        item_name: input.approved.substitute_item_name,
        ratio: input.approved.ratio,
        master_id: input.approved.id,
      }
    : {
        item_id: input.freeForm!.substitute_item_id,
        item_code: input.freeForm!.substitute_item_code,
        item_name: input.freeForm!.substitute_item_name,
        ratio: input.freeForm!.ratio,
        master_id: null as string | null,
      };

  if (!Number.isFinite(sub.ratio) || sub.ratio <= 0) {
    throw new Error('Substitute ratio must be a positive number');
  }

  // Resolve unit rates from item masters (std_cost_rate · 0 if unknown)
  const originalRate = itemMasters.find(i => i.id === line.original_bom_item_id)?.std_cost_rate ?? line.original_unit_rate ?? 0;
  const substituteRate = itemMasters.find(i => i.id === sub.item_id)?.std_cost_rate ?? 0;

  const newRequiredQty = line.original_bom_qty * sub.ratio;
  const originalCost = line.original_bom_qty * originalRate;
  const substitutedCost = newRequiredQty * substituteRate;
  const cost_variance_amount = substitutedCost - originalCost;
  const cost_variance_pct = originalCost > 0
    ? (cost_variance_amount / originalCost) * 100
    : 0;

  const updatedLine: ProductionOrderLine = {
    ...line,
    item_id: sub.item_id,
    item_code: sub.item_code,
    item_name: sub.item_name,
    required_qty: newRequiredQty,
    is_substituted: true,
    substitute_reason: input.reason,
    substitute_item_substitute_id: sub.master_id,
    substitute_notes: input.notes.trim(),
    substituted_by: user.name,
    substituted_at: new Date().toISOString(),
    original_unit_rate: originalRate,
    substituted_unit_rate: substituteRate,
    cost_variance_amount,
    cost_variance_pct,
    yield_impact_pct: input.yield_impact_pct ?? 0,
  };

  const updatedLines = [...order.lines];
  updatedLines[lineIdx] = updatedLine;

  const updatedOrder: ProductionOrder = {
    ...order,
    lines: updatedLines,
    updated_at: new Date().toISOString(),
    updated_by: user.name,
  };

  // Persist
  try {
    // [JWT] PUT /api/production-orders/:entityCode
    const raw = localStorage.getItem(productionOrdersKey(order.entity_id));
    const all = raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = updatedOrder;
    else all.push(updatedOrder);
    localStorage.setItem(productionOrdersKey(order.entity_id), JSON.stringify(all));
  } catch {
    // best-effort; engine still returns updated order
  }

  return { order: updatedOrder, line: updatedLine };
}

/**
 * Revert a previously substituted line back to its original BOM item / qty.
 */
export function revertSubstitution(
  order: ProductionOrder,
  lineId: string,
  itemMasters: InventoryItem[],
  user: { id: string; name: string },
): SubstitutionResult {
  if (order.status !== 'draft' && order.status !== 'released') {
    throw new Error(`Cannot revert on PO in status "${order.status}"`);
  }
  const lineIdx = order.lines.findIndex(l => l.id === lineId);
  if (lineIdx < 0) throw new Error(`PO line ${lineId} not found`);
  const line = order.lines[lineIdx];
  if (!line.is_substituted) return { order, line };

  const original = itemMasters.find(i => i.id === line.original_bom_item_id);
  const updatedLine: ProductionOrderLine = {
    ...line,
    item_id: line.original_bom_item_id,
    item_code: original?.code ?? line.item_code,
    item_name: original?.name ?? line.item_name,
    required_qty: line.original_bom_qty,
    is_substituted: false,
    substitute_reason: null,
    substitute_item_substitute_id: null,
    substitute_notes: '',
    substituted_by: null,
    substituted_at: null,
    substituted_unit_rate: 0,
    cost_variance_amount: 0,
    cost_variance_pct: 0,
    yield_impact_pct: 0,
  };
  const updatedLines = [...order.lines];
  updatedLines[lineIdx] = updatedLine;
  const updatedOrder: ProductionOrder = {
    ...order,
    lines: updatedLines,
    updated_at: new Date().toISOString(),
    updated_by: user.name,
  };

  try {
    // [JWT] PUT /api/production-orders/:entityCode
    const raw = localStorage.getItem(productionOrdersKey(order.entity_id));
    const all = raw ? (JSON.parse(raw) as ProductionOrder[]) : [];
    const idx = all.findIndex(o => o.id === order.id);
    if (idx >= 0) all[idx] = updatedOrder;
    else all.push(updatedOrder);
    localStorage.setItem(productionOrdersKey(order.entity_id), JSON.stringify(all));
  } catch {
    // best-effort
  }

  return { order: updatedOrder, line: updatedLine };
}
