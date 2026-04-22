/**
 * useBOM.ts — CRUD + versioning + validation for Bill of Materials
 *
 * Rules enforced:
 * - Only one active BOM per product at a time. Creating a new active version
 *   automatically marks existing active versions as inactive.
 * - Cyclic reference prevention: a BOM cannot have a component whose own BOM
 *   (transitively) contains the parent product. This check is conservative —
 *   runs on createBom / updateBom against currently stored BOMs.
 * - Date validation: valid_from must be <= valid_to if valid_to is set.
 *
 * [JWT] Replace with /api/bom GET/POST/PATCH/DELETE.
 */

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Bom } from '@/types/bom';
import { bomKey } from '@/types/bom';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/bom/:entityCode
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/bom/:entityCode
  localStorage.setItem(key, JSON.stringify(data));
}

/** Conservative cyclic-ref check: walks the component graph up to depth 10.
    Returns a problem string if a cycle is found, else null.
    Relies on sub_bom_id metadata stored on BomComponent. */
function detectCycle(
  candidate: Pick<Bom, 'id' | 'product_item_id' | 'components'>,
  allBoms: Bom[],
): string | null {
  const MAX_DEPTH = 10;

  function walk(bomId: string, productId: string, depth: number, seen: Set<string>): string | null {
    if (depth > MAX_DEPTH) return 'BOM dependency graph exceeds depth 10 (possible cycle)';
    if (seen.has(bomId)) return `Cyclic BOM reference detected at product ${productId}`;
    const bom = allBoms.find(b => b.id === bomId);
    if (!bom) return null;
    const nextSeen = new Set(seen); nextSeen.add(bomId);
    for (const c of bom.components) {
      if (c.item_id === candidate.product_item_id) {
        return `Cyclic reference: component ${c.item_name} ultimately references the parent product`;
      }
      if (c.sub_bom_id) {
        const err = walk(c.sub_bom_id, c.item_id, depth + 1, nextSeen);
        if (err) return err;
      }
    }
    return null;
  }

  // Check each component of the candidate itself
  const initSeen = new Set<string>();
  initSeen.add(candidate.id);
  for (const c of candidate.components) {
    if (c.item_id === candidate.product_item_id) {
      return `A product cannot have itself as a component (${c.item_name})`;
    }
    if (c.sub_bom_id) {
      const err = walk(c.sub_bom_id, c.item_id, 1, initSeen);
      if (err) return err;
    }
  }
  return null;
}

export function useBOM(entityCode: string) {
  const key = bomKey(entityCode);
  const [boms, setBoms] = useState<Bom[]>(() => ls<Bom>(key));

  const reload = useCallback(() => {
    const fresh = ls<Bom>(key);
    setBoms(fresh);
    return fresh;
  }, [key]);

  const listForProduct = useCallback((productItemId: string): Bom[] => {
    return boms
      .filter(b => b.product_item_id === productItemId)
      .sort((a, b) => b.version_no - a.version_no);
  }, [boms]);

  const getActiveBom = useCallback((productItemId: string, asOfDate: string): Bom | null => {
    const candidates = boms.filter(
      b => b.product_item_id === productItemId
        && b.is_active
        && b.valid_from <= asOfDate
        && (!b.valid_to || asOfDate <= b.valid_to),
    );
    if (candidates.length === 0) return null;
    // In case of multiple (shouldn't happen due to invariant), pick highest version
    return candidates.sort((a, b) => b.version_no - a.version_no)[0];
  }, [boms]);

  const createBom = useCallback((input: Omit<Bom, 'id' | 'version_no' | 'created_at' | 'updated_at'>): Bom | null => {
    // Validate dates
    if (input.valid_to && input.valid_from > input.valid_to) {
      toast.error('Valid-from must be on or before valid-to');
      return null;
    }
    if (input.output_qty <= 0) {
      toast.error('Output quantity must be positive');
      return null;
    }
    if (input.components.length === 0) {
      toast.error('BOM must have at least one component');
      return null;
    }

    const all = ls<Bom>(key);

    // Version numbering
    const prior = all.filter(b => b.product_item_id === input.product_item_id);
    const nextVersion = prior.length === 0 ? 1 : Math.max(...prior.map(b => b.version_no)) + 1;

    const now = new Date().toISOString();
    const bom: Bom = {
      ...input,
      id: `bom-${Date.now()}`,
      version_no: nextVersion,
      created_at: now,
      updated_at: now,
    };

    // Cyclic-ref check
    const cycleError = detectCycle(bom, all);
    if (cycleError) {
      toast.error(cycleError);
      return null;
    }

    // If new BOM is active, deactivate previous active versions for this product
    if (bom.is_active) {
      for (const b of all) {
        if (b.product_item_id === bom.product_item_id && b.is_active) {
          b.is_active = false;
          b.updated_at = now;
        }
      }
    }

    all.push(bom);
    ss(key, all);
    setBoms(all);
    toast.success(`BOM version ${bom.version_no} created for ${bom.product_item_name}`);
    return bom;
  }, [key]);

  const updateBom = useCallback((id: string, patch: Partial<Omit<Bom, 'id' | 'entity_id' | 'product_item_id' | 'version_no' | 'created_at'>>): boolean => {
    const all = ls<Bom>(key);
    const idx = all.findIndex(b => b.id === id);
    if (idx === -1) { toast.error('BOM not found'); return false; }

    const merged: Bom = { ...all[idx], ...patch, updated_at: new Date().toISOString() };

    // Re-validate
    if (merged.valid_to && merged.valid_from > merged.valid_to) {
      toast.error('Valid-from must be on or before valid-to');
      return false;
    }
    if (merged.output_qty <= 0) {
      toast.error('Output quantity must be positive');
      return false;
    }
    if (merged.components.length === 0) {
      toast.error('BOM must have at least one component');
      return false;
    }

    const cycleError = detectCycle(merged, all.filter(b => b.id !== id));
    if (cycleError) {
      toast.error(cycleError);
      return false;
    }

    // Active-uniqueness: if marking active, deactivate siblings
    if (merged.is_active && !all[idx].is_active) {
      for (const b of all) {
        if (b.id !== id && b.product_item_id === merged.product_item_id && b.is_active) {
          b.is_active = false;
          b.updated_at = merged.updated_at;
        }
      }
    }

    all[idx] = merged;
    ss(key, all);
    setBoms(all);
    toast.success('BOM updated');
    return true;
  }, [key]);

  const deleteBom = useCallback((id: string): boolean => {
    const all = ls<Bom>(key);
    const bom = all.find(b => b.id === id);
    if (!bom) { toast.error('BOM not found'); return false; }
    // Check no other BOM references this as sub_bom_id
    const referencedBy = all.filter(
      b => b.id !== id && b.components.some(c => c.sub_bom_id === id),
    );
    if (referencedBy.length > 0) {
      toast.error(`Cannot delete: ${referencedBy.length} BOM(s) reference this as a sub-BOM`);
      return false;
    }
    const filtered = all.filter(b => b.id !== id);
    ss(key, filtered);
    setBoms(filtered);
    toast.success('BOM deleted');
    return true;
  }, [key]);

  const cloneAsNewVersion = useCallback((sourceId: string): Bom | null => {
    const all = ls<Bom>(key);
    const source = all.find(b => b.id === sourceId);
    if (!source) { toast.error('Source BOM not found'); return null; }

    const clone: Omit<Bom, 'id' | 'version_no' | 'created_at' | 'updated_at'> = {
      entity_id: source.entity_id,
      product_item_id: source.product_item_id,
      product_item_code: source.product_item_code,
      product_item_name: source.product_item_name,
      output_qty: source.output_qty,
      output_uom: source.output_uom,
      valid_from: new Date().toISOString().slice(0, 10),
      valid_to: null,
      is_active: false,  // user manually activates after editing
      components: source.components.map(c => ({ ...c, id: `bcomp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })),
      byproducts: source.byproducts.map(b => ({ ...b, id: `bbp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` })),
      overhead_ledger_id: source.overhead_ledger_id,
      overhead_ledger_name: source.overhead_ledger_name,
      notes: source.notes,
    };

    return createBom(clone);
  }, [key, createBom]);

  /** Metadata helper for UI: does this item (by item_id) have an active BOM?
      Used by BomComponent "has sub-BOM" indicator. */
  const hasActiveBom = useCallback((itemId: string): boolean => {
    return boms.some(b => b.product_item_id === itemId && b.is_active);
  }, [boms]);

  const findActiveBomId = useCallback((itemId: string): string | null => {
    const b = boms.find(x => x.product_item_id === itemId && x.is_active);
    return b?.id ?? null;
  }, [boms]);

  return {
    boms,
    reload,
    listForProduct,
    getActiveBom,
    createBom,
    updateBom,
    deleteBom,
    cloneAsNewVersion,
    hasActiveBom,
    findActiveBomId,
  };
}
