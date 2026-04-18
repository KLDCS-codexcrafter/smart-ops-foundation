/**
 * territory.ts — Sales-ops territory master
 * Sprint 7. A Territory is a named work zone assigned to one or more
 * salesmen. Distinct from geographic districts — two salesmen can
 * both work Pune with different customer sets.
 * [JWT] GET/POST/PUT/DELETE /api/salesx/territories
 */

export interface Territory {
  id: string;
  entity_id: string;
  territory_code: string;          // TER/MUM-WEST
  territory_name: string;          // "Mumbai West"
  parent_territory_id: string | null;  // for hierarchical territories
  assigned_salesman_ids: string[]; // SAMPerson.id refs (person_type='salesman')

  // Geographic coverage (reuse india-geography seed)
  state_codes: string[];           // ['27'] for Maharashtra
  district_codes: string[];        // multiple districts may belong
  city_codes: string[];            // optional finer-grained coverage

  // Metadata
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const territoriesKey = (e: string) => `erp_territories_${e}`;
