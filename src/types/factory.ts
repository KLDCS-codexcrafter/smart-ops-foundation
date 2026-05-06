/**
 * factory.ts — Factory / Plant / Unit Master (Q21=a · Q26=a · Q27=a · Q28=b)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1 · D-570 · D-571
 *
 * Multi-unit factory master · unlimited hierarchy via parent_factory_id (Q28=b).
 * 4 unit_types (Q26=a) · manufacturing_config inside record (Q27=a).
 *
 * [JWT] GET/POST/PUT/DELETE /api/plant-ops/factories
 */

export type FactoryStatus = 'active' | 'inactive' | 'planned' | 'decommissioned';

export type FactoryUnitType =
  | 'manufacturing'
  | 'job_work'
  | 'warehouse_only'
  | 'hybrid';

export type ManufacturingTemplateId = string;

export interface ManufacturingConfig {
  primary_template_id: ManufacturingTemplateId;
  secondary_template_id: ManufacturingTemplateId | null;
  industry_sector_template_id: ManufacturingTemplateId | null;
  enabled_modules: string[];
  compliance_standards: string[];
  costing_method: 'standard' | 'actual' | 'fifo' | 'lifo' | 'weighted_average';
  production_model: 'mto' | 'mts' | 'eto' | 'ato' | 'hybrid';
  configured_at: string;
  configured_by: string;
}

export interface Factory {
  id: string;
  entity_id: string;
  code: string;
  name: string;
  unit_type: FactoryUnitType;

  manufacturing_config: ManufacturingConfig | null;

  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;

  factory_license_no: string;
  pollution_clearance_no: string;
  fire_safety_certificate: string;
  factory_gstin: string;

  parent_factory_id: string | null;
  primary_godown_id: string | null;
  primary_fg_godown_id: string | null;

  department_ids: string[];

  status: FactoryStatus;
  notes: string;

  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export const factoriesKey = (entityCode: string): string =>
  `erp_factories_${entityCode}`;

export function buildFactoryAncestry(
  factories: Factory[],
  factoryId: string,
): Factory[] {
  const result: Factory[] = [];
  const byId = new Map(factories.map(f => [f.id, f]));
  let current = byId.get(factoryId);
  while (current) {
    result.unshift(current);
    if (!current.parent_factory_id) break;
    current = byId.get(current.parent_factory_id);
    if (result.length > 50) break;
  }
  return result;
}

export function buildFactoryDescendants(
  factories: Factory[],
  factoryId: string,
): Factory[] {
  const result: Factory[] = [];
  const queue: string[] = [factoryId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const children = factories.filter(f => f.parent_factory_id === currentId);
    result.push(...children);
    queue.push(...children.map(c => c.id));
    if (result.length > 1000) break;
  }
  return result;
}
