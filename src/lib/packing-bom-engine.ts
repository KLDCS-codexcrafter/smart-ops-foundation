/**
 * packing-bom-engine.ts — Pure functions to expand DLN -> material consumption
 * Sprint 15b. NO React, NO localStorage. All inputs explicit.
 */

import type { PackingBOM, PackingBOMActual } from '@/types/packing-bom';
import type { PackingMaterial, MaterialMovement } from '@/types/packing-material';
import type { Voucher, VoucherInventoryLine } from '@/types/voucher';

/** Find the BOM applicable for a given item on a given date. */
export function resolveActiveBOM(
  itemId: string,
  onDate: string,
  boms: PackingBOM[],
): PackingBOM | null {
  const candidates = boms.filter(b =>
    b.item_id === itemId &&
    b.active &&
    b.effective_from <= onDate &&
    (b.effective_to === null || b.effective_to >= onDate),
  );
  // Prefer most recent effective_from
  candidates.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  return candidates[0] ?? null;
}

export interface ExpandedMaterialLine {
  material_id: string;
  material_code: string;
  material_name: string;
  material_uom: string;
  qty: number;
  is_optional: boolean;
  source_item_id: string;
  source_item_code: string;
}

/** Expand one DLN inventory line into material requirements. */
export function expandDLNLine(
  line: VoucherInventoryLine,
  boms: PackingBOM[],
  onDate: string,
): ExpandedMaterialLine[] {
  const bom = resolveActiveBOM(line.item_id, onDate, boms);
  if (!bom) return [];
  return bom.lines.map(bl => ({
    material_id: bl.material_id,
    material_code: bl.material_code,
    material_name: bl.material_name,
    material_uom: bl.material_uom,
    qty: bl.qty_per_unit * line.qty,
    is_optional: bl.is_optional,
    source_item_id: line.item_id,
    source_item_code: line.item_code,
  }));
}

export interface DLNExpansion {
  materials: ExpandedMaterialLine[];
  itemsWithoutBOM: Array<{ item_id: string; item_code: string; item_name: string }>;
}

/** Expand an entire DLN into material requirements. */
export function expandDLN(
  dln: Voucher,
  boms: PackingBOM[],
): DLNExpansion {
  const lines = dln.inventory_lines ?? [];
  const onDate = dln.date;
  const materials: ExpandedMaterialLine[] = [];
  const itemsWithoutBOM: DLNExpansion['itemsWithoutBOM'] = [];
  const seenMissing = new Set<string>();

  for (const line of lines) {
    const expanded = expandDLNLine(line, boms, onDate);
    if (expanded.length === 0) {
      if (!seenMissing.has(line.item_id)) {
        seenMissing.add(line.item_id);
        itemsWithoutBOM.push({
          item_id: line.item_id,
          item_code: line.item_code,
          item_name: line.item_name,
        });
      }
      continue;
    }
    materials.push(...expanded);
  }

  return { materials, itemsWithoutBOM };
}

/** Compute total packing cost (paise) for a single BOM, given current material prices. */
export function computeBOMTotalCost(
  bom: PackingBOM,
  materials: PackingMaterial[],
): number {
  let total = 0;
  for (const line of bom.lines) {
    const mat = materials.find(m => m.id === line.material_id);
    if (!mat) continue;
    total += mat.cost_per_uom_paise * line.qty_per_unit;
  }
  return Math.round(total);
}

/** Build MaterialMovement records (negative qty, dln_consumption) for a DLN. */
export function buildDLNConsumptionMovements(
  dln: Voucher,
  boms: PackingBOM[],
  createdBy: string,
): { movements: MaterialMovement[]; itemsWithoutBOM: DLNExpansion['itemsWithoutBOM'] } {
  const { materials, itemsWithoutBOM } = expandDLN(dln, boms);

  // Aggregate by material_id
  const agg = new Map<string, ExpandedMaterialLine>();
  for (const m of materials) {
    const prev = agg.get(m.material_id);
    if (prev) {
      prev.qty += m.qty;
    } else {
      agg.set(m.material_id, { ...m });
    }
  }

  const now = new Date().toISOString();
  const movements: MaterialMovement[] = Array.from(agg.values()).map((m, idx) => ({
    id: `mm-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: dln.entity_id,
    material_id: m.material_id,
    material_code: m.material_code,
    kind: 'dln_consumption',
    qty: -Math.abs(m.qty),
    ref_type: 'dln',
    ref_id: dln.id,
    ref_label: dln.voucher_no,
    notes: `Auto-consumed from DLN ${dln.voucher_no}`,
    created_at: now,
    created_by: createdBy,
  }));

  return { movements, itemsWithoutBOM };
}

/** Compute variance (actual - standard) for a packer override. */
export function computeActualVariance(
  standardQty: number,
  actualQty: number,
): { variance_qty: number; variance_pct: number } {
  const variance_qty = actualQty - standardQty;
  const variance_pct = standardQty === 0 ? 0 : (variance_qty / standardQty) * 100;
  return {
    variance_qty: Math.round(variance_qty * 1000) / 1000,
    variance_pct: Math.round(variance_pct * 100) / 100,
  };
}

/** Re-export PackingBOMActual for engine consumers */
export type { PackingBOMActual };
