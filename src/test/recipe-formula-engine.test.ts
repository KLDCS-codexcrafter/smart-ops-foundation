import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRecipe,
  approveRecipe,
  explodeRecipe,
  computeRecipeCost,
  compareRecipeVersions,
} from '@/lib/recipe-formula-engine';

describe('recipe-formula-engine · Sprint 60 PROD-3.5 ST4', () => {
  const E = 'TEST';

  beforeEach(() => {
    localStorage.clear();
  });

  it('createRecipe enforces semver format (Q-LOCK-4 A)', () => {
    expect(() => createRecipe({
      entity_id: E, recipe_code: 'R1', recipe_name: 'Test', version: '1.0',
      base_quantity: 1000, base_uom: 'kg', raw_materials: [], expected_yield_pct: 95,
      effective_from: '2026-01-01',
    })).toThrow(/semver/i);

    expect(() => createRecipe({
      entity_id: E, recipe_code: 'R1', recipe_name: 'Test', version: '1.0.0',
      base_quantity: 1000, base_uom: 'kg', raw_materials: [], expected_yield_pct: 95,
      effective_from: '2026-01-01',
    })).not.toThrow();
  });

  it('approveRecipe transitions draft → approved', () => {
    const r = createRecipe({
      entity_id: E, recipe_code: 'R2', recipe_name: 'Test', version: '1.0.0',
      base_quantity: 1000, base_uom: 'kg', raw_materials: [], expected_yield_pct: 95,
      effective_from: '2026-01-01',
    });
    const a = approveRecipe(E, r.id, { id: 'u1', name: 'Approver' });
    expect(a.status).toBe('approved');
    expect(a.approved_by).toBe('Approver');
  });

  it('explodeRecipe scales raw materials by batch qty', () => {
    const r = createRecipe({
      entity_id: E, recipe_code: 'R3', recipe_name: 'Test', version: '1.0.0',
      base_quantity: 1000, base_uom: 'kg',
      raw_materials: [
        { raw_material_id: 'rm1', raw_material_code: 'RM1', raw_material_name: 'Raw 1',
          ratio: 0.5, uom: 'kg', is_critical: true, substitution_allowed: false, vendor_lot_genealogy_required: true },
      ],
      expected_yield_pct: 95, effective_from: '2026-01-01',
    });
    const exploded = explodeRecipe(r, 2000);
    expect(exploded.scale_factor).toBe(2);
    expect(exploded.scaled_raw_materials[0].scaled_qty).toBe(1000);
  });

  it('computeRecipeCost applies physical allocation method (Q-LOCK-6 A)', () => {
    const r = createRecipe({
      entity_id: E, recipe_code: 'R4', recipe_name: 'Test', version: '1.0.0',
      base_quantity: 1000, base_uom: 'kg',
      raw_materials: [{ raw_material_id: 'rm1', raw_material_code: 'RM1', raw_material_name: 'Raw 1',
        ratio: 1, uom: 'kg', is_critical: false, substitution_allowed: true, vendor_lot_genealogy_required: false }],
      co_products: [{ item_id: 'cp1', item_code: 'CP1', item_name: 'Co 1',
        expected_yield_ratio: 0.6, cost_allocation_basis: 'physical' }],
      expected_yield_pct: 100, effective_from: '2026-01-01',
    });
    const cost = computeRecipeCost(r, 1000, [{ raw_material_id: 'rm1', price_per_uom: 10 }], 5000);
    expect(cost.raw_material_cost).toBe(10000);
    expect(cost.total_cost).toBe(15000);
    expect(cost.co_product_allocations[0].method).toBe('physical');
  });

  it('compareRecipeVersions detects raw material + yield changes', () => {
    const v1 = createRecipe({
      entity_id: E, recipe_code: 'R5', recipe_name: 'Test', version: '1.0.0',
      base_quantity: 1000, base_uom: 'kg',
      raw_materials: [{ raw_material_id: 'rm1', raw_material_code: 'RM1', raw_material_name: 'Raw',
        ratio: 0.5, uom: 'kg', is_critical: true, substitution_allowed: false, vendor_lot_genealogy_required: false }],
      expected_yield_pct: 95, effective_from: '2026-01-01',
    });
    const v2 = createRecipe({
      entity_id: E, recipe_code: 'R5', recipe_name: 'Test', version: '2.0.0',
      base_quantity: 1000, base_uom: 'kg',
      raw_materials: [{ raw_material_id: 'rm1', raw_material_code: 'RM1', raw_material_name: 'Raw',
        ratio: 0.6, uom: 'kg', is_critical: true, substitution_allowed: false, vendor_lot_genealogy_required: false }],
      expected_yield_pct: 88, effective_from: '2026-06-01',
    });
    const diff = compareRecipeVersions(v1, v2);
    expect(diff.raw_material_changes.length).toBe(1);
    expect(diff.yield_pct_change.delta).toBe(-7);
    expect(diff.is_major_change).toBe(true);
  });
});
