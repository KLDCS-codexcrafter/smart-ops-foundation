/**
 * @file        src/data/fa-universal-categories-seed-data.ts
 * @sprint      T-Phase-4.FAR-0 · Theme 1 · FAR-CAP-1
 * @disciplines FR-26 entity-scoped · additive
 */

export interface FACategory {
  id: string;
  name: string;
  it_act_block: string;
  schedule_ii_rate_wdv: number;
  schedule_ii_rate_slm: number;
  example_assets: string[];
}

export const FA_UNIVERSAL_CATEGORIES: FACategory[] = [
  { id: 'cat-plant-mach', name: 'Plant & Machinery', it_act_block: 'Plant & Machinery', schedule_ii_rate_wdv: 0.1518, schedule_ii_rate_slm: 0.0633, example_assets: ['CNC Machine', 'Lathe', 'Press Brake', 'Mold', 'Die'] },
  { id: 'cat-buildings', name: 'Buildings', it_act_block: 'Buildings', schedule_ii_rate_wdv: 0.10, schedule_ii_rate_slm: 0.0316, example_assets: ['Factory Building', 'Office Building', 'Warehouse'] },
  { id: 'cat-furniture', name: 'Furniture & Fixtures', it_act_block: 'Furniture & Fittings', schedule_ii_rate_wdv: 0.10, schedule_ii_rate_slm: 0.0633, example_assets: ['Desks', 'Chairs', 'Office Cabinets'] },
  { id: 'cat-vehicles', name: 'Motor Vehicles', it_act_block: 'Motor Vehicles', schedule_ii_rate_wdv: 0.15, schedule_ii_rate_slm: 0.0950, example_assets: ['Truck', 'Forklift', 'Company Car'] },
  { id: 'cat-office-equip', name: 'Office Equipment', it_act_block: 'Office Equipment', schedule_ii_rate_wdv: 0.15, schedule_ii_rate_slm: 0.0950, example_assets: ['Printer', 'Photocopier', 'AC'] },
  { id: 'cat-computers', name: 'Computers & Software', it_act_block: 'Computers', schedule_ii_rate_wdv: 0.40, schedule_ii_rate_slm: 0.3170, example_assets: ['Server', 'Workstation', 'ERP Software'] },
  { id: 'cat-intangibles', name: 'Intangible Assets', it_act_block: 'Intangibles', schedule_ii_rate_wdv: 0.25, schedule_ii_rate_slm: 0.1670, example_assets: ['Patent', 'Trademark', 'Software License'] },
  { id: 'cat-leased', name: 'Leased Assets', it_act_block: 'Leased Assets', schedule_ii_rate_wdv: 0.10, schedule_ii_rate_slm: 0.0633, example_assets: ['Leased Vehicle', 'Leased Equipment'] },
  { id: 'cat-electrical', name: 'Electrical Installation', it_act_block: 'Plant & Machinery', schedule_ii_rate_wdv: 0.10, schedule_ii_rate_slm: 0.0950, example_assets: ['Generator', 'Transformer', 'Switchgear'] },
  { id: 'cat-lab-equip', name: 'Laboratory Equipment', it_act_block: 'Plant & Machinery', schedule_ii_rate_wdv: 0.1518, schedule_ii_rate_slm: 0.0633, example_assets: ['HPLC', 'Spectrophotometer', 'Microscope'] },
  { id: 'cat-safety', name: 'Safety Equipment', it_act_block: 'Plant & Machinery', schedule_ii_rate_wdv: 0.1518, schedule_ii_rate_slm: 0.0633, example_assets: ['Fire Suppression', 'Safety Cage', 'PPE Station'] },
  { id: 'cat-mobile-comm', name: 'Mobile & Communication', it_act_block: 'Office Equipment', schedule_ii_rate_wdv: 0.15, schedule_ii_rate_slm: 0.0950, example_assets: ['Mobile Phone', 'Tablet', 'Radio'] },
];

export const faUniversalCategoriesKey = (entityCode: string): string =>
  `erp_fa_universal_categories_${entityCode}`;

// [JWT] GET /api/fa/universal/categories?entityCode=...
export function seedFAUniversalCategories(entityCode: string): void {
  const key = faUniversalCategoriesKey(entityCode);
  if (!localStorage.getItem(key)) {
    // [JWT] POST /api/fa/universal/categories
    localStorage.setItem(key, JSON.stringify(FA_UNIVERSAL_CATEGORIES));
  }
}
