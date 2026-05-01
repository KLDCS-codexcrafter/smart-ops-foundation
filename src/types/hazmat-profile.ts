/**
 * hazmat-profile.ts — Dangerous Goods classification for inventory items.
 * Sprint T-Phase-1.2.5 · Card #2 sub-sprint 5/6
 *
 * Reference standards:
 * - UN Recommendations on Transport of Dangerous Goods
 * - GHS (Globally Harmonized System) for safety data
 * - Indian Petroleum Rules + Static & Mobile Pressure Vessels Rules
 */

/** UN DG class 1-9 */
export type DGClass = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** Sub-class for finer categorization (e.g., 4.1, 4.2, 4.3) */
export type DGSubClass = string;

/** UN Packing Group */
export type PackingGroup = 'I' | 'II' | 'III';

export interface HazmatProfile {
  id: string;
  entity_id: string;
  profile_name: string;

  // UN Classification
  dg_class: DGClass | null;
  dg_sub_class: DGSubClass | null;
  un_number: string | null;
  packing_group: PackingGroup | null;
  proper_shipping_name: string | null;

  // Physical hazards
  flash_point_celsius: number | null;
  boiling_point_celsius: number | null;
  is_oxidizer: boolean;
  is_water_reactive: boolean;
  is_corrosive: boolean;
  is_toxic: boolean;
  is_carcinogenic: boolean;

  // Safety / Compliance
  msds_document_url: string | null;
  msds_document_filename: string | null;
  msds_uploaded_at: string | null;
  msds_revision_no: string | null;
  emergency_contact_no: string | null;
  emergency_contact_name: string | null;

  // Storage requirements
  max_storage_temperature_celsius: number | null;
  min_storage_temperature_celsius: number | null;
  ventilation_required: boolean;
  segregation_notes: string | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const hazmatProfilesKey = (entityCode: string): string =>
  `erp_hazmat_profiles_${entityCode}`;

export const DG_CLASS_LABELS: Record<DGClass, string> = {
  '1': 'Class 1 — Explosives',
  '2': 'Class 2 — Gases',
  '3': 'Class 3 — Flammable Liquids',
  '4': 'Class 4 — Flammable Solids / Self-Reactive',
  '5': 'Class 5 — Oxidizing / Organic Peroxides',
  '6': 'Class 6 — Toxic / Infectious',
  '7': 'Class 7 — Radioactive',
  '8': 'Class 8 — Corrosive',
  '9': 'Class 9 — Miscellaneous Dangerous',
};

/** DG class compatibility matrix — entry b in array of a means a+b can be co-stored. */
export const DG_COMPATIBILITY_MATRIX: Record<DGClass, DGClass[]> = {
  '1': [],
  '2': ['9'],
  '3': ['9'],
  '4': ['9'],
  '5': ['9'],
  '6': ['8', '9'],
  '7': ['9'],
  '8': ['6', '9'],
  '9': ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
};

export function areDgClassesCompatible(a: DGClass | null, b: DGClass | null): boolean {
  if (!a || !b) return true;
  if (a === b) return true;
  return DG_COMPATIBILITY_MATRIX[a]?.includes(b) ?? false;
}
