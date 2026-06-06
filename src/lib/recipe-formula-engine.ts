/**
 * @file     recipe-formula-engine.ts
 * @sprint   T-Phase-3.PROD-3.5.PASS1 · ST4 · 33rd SIBLING ⭐
 * @purpose  Recipe/formula master engine for process manufacturing.
 *           Q-LOCK-4 Option A · semver versioning (1.0.0 / 1.1.0 / 2.0.0).
 *           Q-LOCK-6 Option A · 3 cost allocation methods (physical · sales_value · split_off).
 *           Moat 16 · Process Costing with Co/By-Product Auto-Allocation.
 *           Moat 18 · Recipe Version Control with ECN Cascade (foundation · full ECN bridge in PASS 3).
 *           Parallels engineeringx-bom-engine pattern · ratio-based BOM.
 * @reuses   None (greenfield)
 * @[JWT]    Phase 2: POST /api/recipe/create + PATCH /api/recipe/approve
 */
import type {
  Recipe,
  RecipeRawMaterial,
  RecipeCoProduct,
  RecipeByProduct,
  RecipeProcessParameter,
  RecipeQCSpec,
} from '@/types/recipe';
import { recipesKey } from '@/types/recipe';

const lsRead = <T>(key: string, def: T): T => {
  try {
    // [JWT] GET /api/recipe/list
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : def;
  } catch {
    return def;
  }
};
const lsWrite = <T>(key: string, value: T): void => {
  try {
    // [JWT] PUT /api/recipe/persist
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

// ============================================================================
// CRUD · CREATE / APPROVE / OBSOLETE
// ============================================================================

export interface CreateRecipeInput {
  entity_id: string;
  recipe_code: string;
  recipe_name: string;
  version: string;
  base_quantity: number;
  base_uom: string;
  raw_materials: RecipeRawMaterial[];
  co_products?: RecipeCoProduct[];
  by_products?: RecipeByProduct[];
  expected_yield_pct: number;
  process_parameters?: RecipeProcessParameter[];
  qc_specs?: RecipeQCSpec[];
  effective_from: string;
}

export function createRecipe(input: CreateRecipeInput): Recipe {
  // Q-LOCK-4 Option A · semver format validation
  if (!/^\d+\.\d+\.\d+$/.test(input.version)) {
    throw new Error(`Recipe version must be semver (e.g. '1.0.0'): got '${input.version}'`);
  }
  const coRatioSum = (input.co_products ?? []).reduce((s, c) => s + c.expected_yield_ratio, 0);
  if (coRatioSum > 1.0) {
    throw new Error(`Co-product yield ratios sum (${coRatioSum}) exceeds 1.0`);
  }

  const now = new Date().toISOString();
  const recipe: Recipe = {
    id: `rcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: input.entity_id,
    recipe_code: input.recipe_code,
    recipe_name: input.recipe_name,
    version: input.version,
    status: 'draft',
    base_quantity: input.base_quantity,
    base_uom: input.base_uom,
    raw_materials: input.raw_materials,
    co_products: input.co_products ?? [],
    by_products: input.by_products ?? [],
    expected_yield_pct: input.expected_yield_pct,
    process_parameters: input.process_parameters ?? [],
    qc_specs: input.qc_specs ?? [],
    approved_by: '',
    approved_at: '',
    obsoleted_at: null,
    obsoletion_reason: null,
    created_at: now,
    updated_at: now,
    effective_from: input.effective_from,
    effective_to: null,
  };

  const all = lsRead<Recipe[]>(recipesKey(input.entity_id), []);
  all.unshift(recipe);
  lsWrite(recipesKey(input.entity_id), all);

  logAudit({
    entityCode: input.entity_id,
    action: 'create',
    entityType: 'production_event' as unknown as AuditEntityType,
    recordId: recipe.id,
    recordLabel: `Recipe ${recipe.recipe_code} v${recipe.version}`,
    beforeState: null,
    afterState: { recipe_code: recipe.recipe_code, version: recipe.version, status: recipe.status },
    sourceModule: 'production',
    reason: 'recipe_master_created',
  });

  return recipe;
}

export function approveRecipe(
  entityCode: string,
  recipeId: string,
  approver: { id: string; name: string },
): Recipe {
  const recipe = getRecipe(entityCode, recipeId);
  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`);
  if (recipe.status !== 'draft') {
    throw new Error(`Cannot approve recipe in status: ${recipe.status}`);
  }
  const now = new Date().toISOString();
  const approved: Recipe = {
    ...recipe,
    status: 'approved',
    approved_by: approver.name,
    approved_at: now,
    updated_at: now,
  };
  persistRecipe(entityCode, approved);
  return approved;
}

export function obsoleteRecipe(
  entityCode: string,
  recipeId: string,
  reason: string,
): Recipe {
  const recipe = getRecipe(entityCode, recipeId);
  if (!recipe) throw new Error(`Recipe not found: ${recipeId}`);
  if (recipe.status !== 'approved') {
    throw new Error(`Cannot obsolete recipe in status: ${recipe.status}`);
  }
  const now = new Date().toISOString();
  const obsoleted: Recipe = {
    ...recipe,
    status: 'obsolete',
    obsoleted_at: now,
    obsoletion_reason: reason,
    effective_to: now,
    updated_at: now,
  };
  persistRecipe(entityCode, obsoleted);
  return obsoleted;
}

// ============================================================================
// READ HELPERS
// ============================================================================

export function listRecipes(entityCode: string): Recipe[] {
  return lsRead<Recipe[]>(recipesKey(entityCode), []);
}

export function getRecipe(entityCode: string, recipeId: string): Recipe | null {
  return listRecipes(entityCode).find(r => r.id === recipeId) ?? null;
}

export function getActiveRecipeVersion(
  entityCode: string,
  recipeCode: string,
): Recipe | null {
  const today = new Date().toISOString().slice(0, 10);
  const all = listRecipes(entityCode);
  const candidates = all
    .filter(
      r =>
        r.recipe_code === recipeCode &&
        r.status === 'approved' &&
        r.effective_from <= today &&
        (r.effective_to === null || r.effective_to > today),
    )
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  return candidates[0] ?? null;
}

export function listRecipesByCode(entityCode: string, recipeCode: string): Recipe[] {
  return listRecipes(entityCode)
    .filter(r => r.recipe_code === recipeCode)
    .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
}

// ============================================================================
// EXPLODE RECIPE · scale raw materials + outputs to target batch qty
// ============================================================================

export interface ExplodedRecipe {
  recipe_id: string;
  recipe_version: string;
  target_batch_qty: number;
  target_uom: string;
  scale_factor: number;
  scaled_raw_materials: Array<{
    raw_material_id: string;
    raw_material_code: string;
    raw_material_name: string;
    scaled_qty: number;
    uom: string;
    is_critical: boolean;
  }>;
  expected_co_products: Array<{ item_id: string; expected_qty: number; uom: string }>;
  expected_by_products: Array<{ item_id: string; expected_qty: number; uom: string }>;
  expected_total_output: number;
}

export function explodeRecipe(recipe: Recipe, targetBatchQty: number): ExplodedRecipe {
  const scale_factor = recipe.base_quantity > 0 ? targetBatchQty / recipe.base_quantity : 0;
  const expected_total_output = targetBatchQty * (recipe.expected_yield_pct / 100);

  return {
    recipe_id: recipe.id,
    recipe_version: recipe.version,
    target_batch_qty: targetBatchQty,
    target_uom: recipe.base_uom,
    scale_factor,
    scaled_raw_materials: recipe.raw_materials.map(rm => ({
      raw_material_id: rm.raw_material_id,
      raw_material_code: rm.raw_material_code,
      raw_material_name: rm.raw_material_name,
      scaled_qty: rm.ratio * scale_factor * recipe.base_quantity,
      uom: rm.uom,
      is_critical: rm.is_critical,
    })),
    expected_co_products: recipe.co_products.map(cp => ({
      item_id: cp.item_id,
      expected_qty: expected_total_output * cp.expected_yield_ratio,
      uom: 'kg',
    })),
    expected_by_products: recipe.by_products.map(bp => ({
      item_id: bp.item_id,
      expected_qty: expected_total_output * bp.expected_yield_ratio,
      uom: 'kg',
    })),
    expected_total_output,
  };
}

// ============================================================================
// COMPUTE COST · Q-LOCK-6 Option A · 3 allocation methods (Moat 16)
// ============================================================================

export interface RecipeCost {
  recipe_id: string;
  target_batch_qty: number;
  raw_material_cost: number;
  process_cost: number;
  total_cost: number;
  by_product_revenue_credit: number;
  net_batch_cost: number;
  co_product_allocations: Array<{
    item_id: string;
    method: 'physical' | 'sales_value' | 'split_off';
    allocated_cost: number;
    allocation_pct: number;
  }>;
}

export interface MaterialPrice {
  raw_material_id: string;
  price_per_uom: number;
}

export interface CoProductSalesValue {
  item_id: string;
  sales_value_per_uom: number;
}

export function computeRecipeCost(
  recipe: Recipe,
  targetBatchQty: number,
  materialPrices: MaterialPrice[],
  processCost: number,
  coProductSalesValues?: CoProductSalesValue[],
): RecipeCost {
  const exploded = explodeRecipe(recipe, targetBatchQty);

  const raw_material_cost = exploded.scaled_raw_materials.reduce((sum, rm) => {
    const price = materialPrices.find(p => p.raw_material_id === rm.raw_material_id);
    return sum + rm.scaled_qty * (price?.price_per_uom ?? 0);
  }, 0);

  const by_product_revenue_credit = recipe.by_products.reduce((sum, bp) => {
    const qty = exploded.expected_total_output * bp.expected_yield_ratio;
    return sum + qty * bp.revenue_credit_per_uom;
  }, 0);

  const total_cost = raw_material_cost + processCost;
  const net_batch_cost = total_cost - by_product_revenue_credit;

  // Q-LOCK-6 Option A · 3 allocation methods (physical / sales_value / split_off)
  const co_product_allocations = recipe.co_products.map(cp => {
    const expectedQty = exploded.expected_total_output * cp.expected_yield_ratio;
    let allocated_cost = 0;
    let allocation_pct = 0;

    if (cp.cost_allocation_basis === 'physical') {
      allocation_pct = cp.expected_yield_ratio;
      allocated_cost = net_batch_cost * allocation_pct;
    } else if (cp.cost_allocation_basis === 'sales_value') {
      const sv = coProductSalesValues?.find(s => s.item_id === cp.item_id);
      const myValue = expectedQty * (sv?.sales_value_per_uom ?? 0);
      const totalValue = recipe.co_products.reduce((sum, c) => {
        const csv = coProductSalesValues?.find(s => s.item_id === c.item_id);
        return (
          sum +
          exploded.expected_total_output * c.expected_yield_ratio * (csv?.sales_value_per_uom ?? 0)
        );
      }, 0);
      allocation_pct = totalValue > 0 ? myValue / totalValue : 0;
      allocated_cost = net_batch_cost * allocation_pct;
    } else {
      // split_off · simplified equal split among co-products
      allocation_pct = recipe.co_products.length > 0 ? 1 / recipe.co_products.length : 0;
      allocated_cost = net_batch_cost * allocation_pct;
    }

    return {
      item_id: cp.item_id,
      method: cp.cost_allocation_basis,
      allocated_cost,
      allocation_pct,
    };
  });

  return {
    recipe_id: recipe.id,
    target_batch_qty: targetBatchQty,
    raw_material_cost,
    process_cost: processCost,
    total_cost,
    by_product_revenue_credit,
    net_batch_cost,
    co_product_allocations,
  };
}

// ============================================================================
// COMPARE RECIPE VERSIONS · ECN cascade foundation (Moat 18)
// ============================================================================

export interface RecipeDiff {
  v1_id: string;
  v2_id: string;
  v1_version: string;
  v2_version: string;
  raw_material_changes: Array<{
    raw_material_id: string;
    change: 'added' | 'removed' | 'ratio_changed';
    v1_ratio?: number;
    v2_ratio?: number;
  }>;
  yield_pct_change: { from: number; to: number; delta: number };
  process_parameter_changes: Array<{
    parameter: string;
    change: 'added' | 'removed' | 'target_changed';
  }>;
  is_major_change: boolean;
}

export function compareRecipeVersions(v1: Recipe, v2: Recipe): RecipeDiff {
  const v1Mat = new Map(v1.raw_materials.map(rm => [rm.raw_material_id, rm]));
  const v2Mat = new Map(v2.raw_materials.map(rm => [rm.raw_material_id, rm]));
  const raw_material_changes: RecipeDiff['raw_material_changes'] = [];

  for (const [id, rm] of v2Mat) {
    const old = v1Mat.get(id);
    if (!old) {
      raw_material_changes.push({ raw_material_id: id, change: 'added', v2_ratio: rm.ratio });
    } else if (old.ratio !== rm.ratio) {
      raw_material_changes.push({
        raw_material_id: id,
        change: 'ratio_changed',
        v1_ratio: old.ratio,
        v2_ratio: rm.ratio,
      });
    }
  }
  for (const [id, rm] of v1Mat) {
    if (!v2Mat.has(id)) {
      raw_material_changes.push({ raw_material_id: id, change: 'removed', v1_ratio: rm.ratio });
    }
  }

  const yieldDelta = v2.expected_yield_pct - v1.expected_yield_pct;

  const v1Params = new Set(v1.process_parameters.map(p => p.parameter));
  const v2Params = new Set(v2.process_parameters.map(p => p.parameter));
  const process_parameter_changes: RecipeDiff['process_parameter_changes'] = [];
  for (const p of v2Params) {
    if (!v1Params.has(p)) process_parameter_changes.push({ parameter: p, change: 'added' });
  }
  for (const p of v1Params) {
    if (!v2Params.has(p)) process_parameter_changes.push({ parameter: p, change: 'removed' });
  }

  const criticalChanged = raw_material_changes.some(c => {
    const rm = v2.raw_materials.find(r => r.raw_material_id === c.raw_material_id);
    return rm?.is_critical;
  });
  const is_major_change = Math.abs(yieldDelta) > 5 || criticalChanged;

  return {
    v1_id: v1.id,
    v2_id: v2.id,
    v1_version: v1.version,
    v2_version: v2.version,
    raw_material_changes,
    yield_pct_change: { from: v1.expected_yield_pct, to: v2.expected_yield_pct, delta: yieldDelta },
    process_parameter_changes,
    is_major_change,
  };
}

// ============================================================================
// PERSIST HELPER
// ============================================================================

export function persistRecipe(entityCode: string, recipe: Recipe): void {
  const all = lsRead<Recipe[]>(recipesKey(entityCode), []);
  const idx = all.findIndex(r => r.id === recipe.id);
  if (idx >= 0) {
    all[idx] = recipe;
  } else {
    all.unshift(recipe);
  }
  lsWrite(recipesKey(entityCode), all);
}

// ============================================================================
// SPRINT 62 PROD-4.5 · Theme D · CFR-11 SHIM · Q-LOCK-8 A · ADDITIVE
// ============================================================================

import { appendAuditTrailEntry as cfrAppendAuditTrailEntry } from '@/lib/cfr-part-11-engine';
import type { CFRPart11AuditEntry, CFRPart11SignatureInput } from '@/types/cfr-part-11';
import { logAudit } from "@/lib/audit-trail-engine"; // P8.4 · Block 1a-i
import type { AuditEntityType } from "@/types/audit-trail";

export function logRecipeActionWithCFRSig(
  entityCode: string,
  recipeId: string,
  actionType: 'recipe_create' | 'recipe_modify' | 'recipe_approve',
  description: string,
  signature: CFRPart11SignatureInput & { user_id: string; user_name: string },
): CFRPart11AuditEntry {
  return cfrAppendAuditTrailEntry(
    entityCode,
    actionType,
    'recipe',
    recipeId,
    'info',
    description,
    signature,
  );
}
