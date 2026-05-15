/**
 * @file     ZoneProgressResolver.ts
 * @purpose  Map each Command Center zone to the set of master storage keys
 *           that define "configured" status, and compute a live progress
 *           percentage. Replaces hardcoded ZONE_CARDS values.
 * @sprint   T-H1.5-C-S2
 * @finding  CC-006
 */

export interface ZoneDefinition {
  zone: string;
  label: string;
  module: string;
  /** localStorage keys that, when populated, count toward this zone's progress. */
  masterKeys: string[];
}

export const ZONE_DEFINITIONS: ZoneDefinition[] = [
  {
    zone: 'Zone 1',
    label: 'Entity Core',
    module: 'foundation',
    masterKeys: [
      'erp_parent_company_saved',     // special: string 'true' = counted
      'erp_companies',
      'erp_branch_offices',
      'erp_divisions',
      'erp_departments',
    ],
  },
  {
    zone: 'Zone 2',
    label: 'Geography Masters',
    module: 'geography',
    masterKeys: [
      'erp_geography_countries',
      'erp_geography_states',
      'erp_geography_cities',
    ],
  },
  {
    zone: 'Zone 3',
    label: 'FinCore Masters',
    module: 'fincore-hub',
    masterKeys: [
      'erp_tax_rates',
      'erp_tds_sections',
      'erp_hsn_sac_codes',
      'erp_epf_esi_lwf',
      'erp_income_tax',
      'erp_statutory_registrations',
      'erp_gst_entity_config',
      'erp_comply360_config',
      'erp_currencies',
      'erp_finframe_groups',
      'erp_ledgers',
      'erp_voucher_types',
      'erp_transaction_templates',
      'erp_group_mode_of_payment',
      'erp_group_terms_of_payment',
      'erp_group_terms_of_delivery',
    ],
  },
  {
    zone: 'Zone 4',
    label: 'Procure / Inventory',
    module: 'overview',
    masterKeys: [
      'erp_inventory_items',
      'erp_warehouses',
      'erp_godowns',
      'erp_batches',
      'erp_serial_numbers',
    ],
  },
];

// Sprint Hardening-B Block 2C-i · Q3.1+Q3.2+Q3.3 SSOT migration:
// scoped-first read with legacy global fallback. For each base key we also
// scan localStorage for any `${baseKey}_<entityCode>` scoped variant so that
// per-entity stores count toward zone progress without requiring entity ctx.
const SCOPED_FAMILIES = new Set<string>([
  'erp_statutory_registrations',
  'erp_gst_entity_config',
  'erp_comply360_config',
  'erp_voucher_types',
  'erp_group_mode_of_payment',
  'erp_group_terms_of_payment',
  'erp_group_terms_of_delivery',
  'erp_mode_of_payment',
  'erp_terms_of_payment',
  'erp_terms_of_delivery',
]);

function hasContent(raw: string | null, key: string): boolean {
  if (!raw) return false;
  if (key === 'erp_parent_company_saved') return raw === 'true';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.length > 0;
    if (typeof parsed === 'object' && parsed !== null) return Object.keys(parsed).length > 0;
    return false;
  } catch { return false; }
}

export function isConfigured(key: string): boolean {
  try {
    // [JWT] GET /api/masters/:key/exists
    const direct = localStorage.getItem(key);
    if (hasContent(direct, key)) return true;
    if (SCOPED_FAMILIES.has(key)) {
      // Scoped fallback — any per-entity variant counts
      const prefix = `${key}_`;
      // For Q3.2 mode/terms — also check the new short helper key shape
      const altPrefix = key.startsWith('erp_group_')
        ? `${key.replace('erp_group_', 'erp_')}_`
        : null;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (k.startsWith(prefix) || (altPrefix && k.startsWith(altPrefix))) {
          if (hasContent(localStorage.getItem(k), k)) return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export interface ZoneProgress {
  zone: string;
  label: string;
  module: string;
  progress: number;       // 0-100, rounded
  status: 'Complete' | 'In Progress' | 'Not Started';
  configuredCount: number;
  totalKeys: number;
}

export function computeZoneProgress(zone: ZoneDefinition): ZoneProgress {
  const configuredCount = zone.masterKeys.filter(isConfigured).length;
  const totalKeys = zone.masterKeys.length;
  const progress = totalKeys === 0 ? 0 : Math.round((configuredCount / totalKeys) * 100);

  let status: ZoneProgress['status'];
  if (progress === 0) status = 'Not Started';
  else if (progress === 100) status = 'Complete';
  else status = 'In Progress';

  return { zone: zone.zone, label: zone.label, module: zone.module, progress, status, configuredCount, totalKeys };
}

export function computeAllZones(): ZoneProgress[] {
  return ZONE_DEFINITIONS.map(computeZoneProgress);
}
