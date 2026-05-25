/**
 * @file        src/data/fa-universal-locations-seed-data.ts
 * @sprint      T-Phase-4.FAR-0 · Theme 1 · FAR-CAP-2
 */

export interface FALocation {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'bonded';
  description: string;
  example_assets: string[];
}

export const FA_UNIVERSAL_LOCATIONS: FALocation[] = [
  { id: 'loc-factory-floor', name: 'Factory Floor', type: 'internal', description: 'Primary production area', example_assets: ['CNC', 'Press', 'Lathe'] },
  { id: 'loc-warehouse', name: 'Warehouse', type: 'internal', description: 'Raw material / FG storage', example_assets: ['Forklift', 'Racking', 'Pallet'] },
  { id: 'loc-office', name: 'Office', type: 'internal', description: 'Head office workspace', example_assets: ['Desk', 'Server', 'Printer'] },
  { id: 'loc-branch-office', name: 'Branch Office', type: 'internal', description: 'Remote branch workspace', example_assets: ['Laptop', 'Furniture'] },
  { id: 'loc-site-external', name: 'Site (External)', type: 'external', description: 'Project / site office', example_assets: ['Generator', 'Site Hut'] },
  { id: 'loc-quarantine', name: 'Quarantine', type: 'internal', description: 'Disposal / quarantine area', example_assets: ['Disposed Equipment'] },
  { id: 'loc-workshop', name: 'Workshop', type: 'internal', description: 'Maintenance workshop', example_assets: ['Welding Set', 'Drill Press'] },
  { id: 'loc-bonded-warehouse', name: 'Bonded Warehouse', type: 'bonded', description: 'Customs-bonded storage', example_assets: ['Imported Machinery'] },
];

export const faUniversalLocationsKey = (entityCode: string): string =>
  `erp_fa_universal_locations_${entityCode}`;

// [JWT] GET /api/fa/universal/locations?entityCode=...
export function seedFAUniversalLocations(entityCode: string): void {
  const key = faUniversalLocationsKey(entityCode);
  if (!localStorage.getItem(key)) {
    // [JWT] POST /api/fa/universal/locations
    localStorage.setItem(key, JSON.stringify(FA_UNIVERSAL_LOCATIONS));
  }
}
