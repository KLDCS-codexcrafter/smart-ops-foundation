/**
 * useItemPreferredLocation — Resolves default godown + bin for an item.
 *
 * PURPOSE      Stock Transfer Dispatch / Stock Adjustment auto-fills rack/bin
 *              based on where the item normally lives. User can override.
 *
 * RESOLUTION ORDER:
 *   1. If item.preferred_bin_id exists and the BinLabel is found → use it.
 *   2. Else if any BinLabel.items_assigned[] contains item_id → first match.
 *   3. Else if item.preferred_godown_id exists → godown only (no bin).
 *   4. Else → null (caller must prompt user).
 *
 * INPUT        itemId, entityCode
 * OUTPUT       { godownId, godownName, binId?, binCode? } | null
 *
 * DEPENDENCIES reads erp_group_items_<entity>, erp_bin_labels,
 *              erp_group_godowns_<entity> via localStorage (Phase 1 pattern).
 *
 * SPEC DOC     Sprint T10-pre.1b — rack/bin auto-resolve per owner directive
 */
import { useMemo } from 'react';
import type { InventoryItem } from '@/types/inventory-item';
import type { BinLabel } from '@/types/bin-label';
import type { Godown } from '@/types/godown';

export interface PreferredLocation {
  godownId: string;
  godownName: string;
  binId?: string;
  binCode?: string;
}

function loadItems(entityCode: string): InventoryItem[] {
  try {
    // [JWT] GET /api/masters/items?entityCode=...
    const raw = localStorage.getItem(`erp_group_items_${entityCode}`)
      ?? localStorage.getItem('erp_group_items')
      ?? localStorage.getItem('erp_inventory_items');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadBinLabels(): BinLabel[] {
  try {
    // [JWT] GET /api/masters/bin-labels
    const raw = localStorage.getItem('erp_bin_labels');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function loadGodowns(entityCode: string): Godown[] {
  try {
    // [JWT] GET /api/masters/godowns?entityCode=...
    const raw = localStorage.getItem(`erp_group_godowns_${entityCode}`)
      ?? localStorage.getItem('erp_group_godowns');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useItemPreferredLocation(
  itemId: string | undefined,
  entityCode: string,
): PreferredLocation | null {
  return useMemo(() => {
    if (!itemId) return null;

    const items = loadItems(entityCode);
    const item = items.find(i => i.id === itemId);
    if (!item) return null;

    const binLabels = loadBinLabels();
    const godowns = loadGodowns(entityCode);

    // 1. Explicit preferred_bin_id on the item
    if (item.preferred_bin_id) {
      const bin = binLabels.find(b => b.id === item.preferred_bin_id);
      if (bin) {
        return {
          godownId: bin.godown_id,
          godownName: bin.godown_name,
          binId: bin.id,
          binCode: bin.location_code,
        };
      }
    }

    // 2. Find a BinLabel that has this item assigned
    const assigned = binLabels.find(b => (b.items_assigned ?? []).includes(itemId));
    if (assigned) {
      return {
        godownId: assigned.godown_id,
        godownName: assigned.godown_name,
        binId: assigned.id,
        binCode: assigned.location_code,
      };
    }

    // 3. Item has preferred_godown_id but no bin
    if (item.preferred_godown_id) {
      const g = godowns.find(x => x.id === item.preferred_godown_id);
      if (g) {
        return { godownId: g.id, godownName: g.name };
      }
    }

    // 4. Nothing resolved — caller must prompt.
    return null;
  }, [itemId, entityCode]);
}
