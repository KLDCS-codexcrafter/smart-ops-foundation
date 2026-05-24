/**
 * @file     recipe.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS1 · ST2
 * @purpose  Recipe/formula master type definitions for process manufacturing.
 *           Q-LOCK-4 Option A · semver versioning (1.0.0 / 1.1.0 / 2.0.0).
 *           Q-LOCK-6 Option A · 3 cost allocation methods supported.
 *           Parallels Bom interface but ratio-based + co/by-products + yield %.
 */

export type RecipeStatus = 'draft' | 'approved' | 'obsolete';

export interface RecipeRawMaterial {
  raw_material_id: string;
  raw_material_code: string;
  raw_material_name: string;
  ratio: number;
  uom: string;
  is_critical: boolean;
  substitution_allowed: boolean;
  vendor_lot_genealogy_required: boolean;
}

export interface RecipeCoProduct {
  item_id: string;
  item_code: string;
  item_name: string;
  expected_yield_ratio: number;
  cost_allocation_basis: 'physical' | 'sales_value' | 'split_off';
}

export interface RecipeByProduct {
  item_id: string;
  item_code: string;
  item_name: string;
  expected_yield_ratio: number;
  revenue_credit_per_uom: number;
}

export interface RecipeProcessParameter {
  parameter: string;
  target_value: number;
  acceptable_range: [number, number];
  unit: string;
  critical: boolean;
}

export interface RecipeQCSpec {
  parameter: string;
  test_method: string;
  acceptance_criteria: string;
  frequency: 'every_batch' | 'periodic' | 'release_only';
}

/** Recipe master (parallels Bom · ratio-based + co/by-products + yield %). */
export interface Recipe {
  id: string;
  entity_id: string;
  recipe_code: string;
  recipe_name: string;
  version: string;
  status: RecipeStatus;
  base_quantity: number;
  base_uom: string;
  raw_materials: RecipeRawMaterial[];
  co_products: RecipeCoProduct[];
  by_products: RecipeByProduct[];
  expected_yield_pct: number;
  process_parameters: RecipeProcessParameter[];
  qc_specs: RecipeQCSpec[];
  approved_by: string;
  approved_at: string;
  obsoleted_at: string | null;
  obsoletion_reason: string | null;
  created_at: string;
  updated_at: string;
  effective_from: string;
  effective_to: string | null;
}

/** Storage key for recipes (FR-26 entity-scoped). */
export const recipesKey = (entityCode: string): string =>
  `recipes_${entityCode}`;
