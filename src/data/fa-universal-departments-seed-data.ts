/**
 * @file        src/data/fa-universal-departments-seed-data.ts
 * @sprint      T-Phase-4.FAR-0 · Theme 1 · FAR-CAP-2
 */

export interface FADepartment {
  id: string;
  name: string;
  description: string;
  example_assets: string[];
}

export const FA_UNIVERSAL_DEPARTMENTS: FADepartment[] = [
  { id: 'dept-production', name: 'Production', description: 'Manufacturing operations', example_assets: ['CNC', 'Press'] },
  { id: 'dept-maintenance', name: 'Maintenance', description: 'Plant upkeep', example_assets: ['Welding Set', 'Tools'] },
  { id: 'dept-qc', name: 'QC', description: 'Quality control + lab', example_assets: ['HPLC', 'Microscope'] },
  { id: 'dept-rnd', name: 'R&D', description: 'Research & development', example_assets: ['Prototype Rig'] },
  { id: 'dept-admin', name: 'Admin', description: 'General administration', example_assets: ['Desk', 'AC'] },
  { id: 'dept-sales', name: 'Sales', description: 'Sales & marketing', example_assets: ['Vehicle', 'Mobile'] },
  { id: 'dept-it', name: 'IT', description: 'IT infrastructure', example_assets: ['Server', 'Switch'] },
  { id: 'dept-hr', name: 'HR', description: 'Human resources', example_assets: ['Printer'] },
  { id: 'dept-finance', name: 'Finance', description: 'Finance & accounts', example_assets: ['Safe', 'Workstation'] },
  { id: 'dept-stores', name: 'Stores', description: 'Stores & inventory', example_assets: ['Forklift', 'Pallet'] },
];

export const faUniversalDepartmentsKey = (entityCode: string): string =>
  `erp_fa_universal_departments_${entityCode}`;

// [JWT] GET /api/fa/universal/departments?entityCode=...
export function seedFAUniversalDepartments(entityCode: string): void {
  const key = faUniversalDepartmentsKey(entityCode);
  if (!localStorage.getItem(key)) {
    // [JWT] POST /api/fa/universal/departments
    localStorage.setItem(key, JSON.stringify(FA_UNIVERSAL_DEPARTMENTS));
  }
}
