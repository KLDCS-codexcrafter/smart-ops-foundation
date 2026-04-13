import type { Division, Department, DivisionCategory } from '@/types/org-structure';

export interface OrgPresetPackage {
  id: string;
  name: string;
  description: string;
  icon: string;              // emoji icon for the card
  divisions: Omit<Division, "id"|"code"|"created_at"|"updated_at"|"entity_id">[];
  departments: Omit<Department, "id"|"code"|"created_at"|"updated_at"|"entity_id"> & { division_name?: string | null }[];
}

// Helper — department linked to division by division name (resolved at import time)
type PresetDept = {
  name: string;
  division_name: string | null;  // matched to division.name at import
  category: DivisionCategory;
  description: string;
};

const mkDiv = (
  name: string, category: DivisionCategory, description: string
): Omit<Division, "id"|"code"|"created_at"|"updated_at"|"entity_id"> => ({
  name, category, parent_division_id: null,
  head_name: '', head_email: '', location: '',
  status: 'active', description,
});

const mkDept = (
  name: string, divisionName: string | null, description: string
): any => ({
  name, division_id: null, division_name: divisionName,
  parent_department_id: null, head_name: '', head_email: '',
  location: '', budget: null, status: 'active', description,
});

// ── Preset 1 — Manufacturing Company ─────────────────────────────

const manufacturing: OrgPresetPackage = {
  id: 'manufacturing',
  name: 'Manufacturing Company',
  icon: '🏭',
  description: '3 Divisions · 14 Departments — Production, Quality, Commercial',
  divisions: [
    mkDiv('Operations Division', 'operations', 'Production, quality, maintenance and stores'),
    mkDiv('Commercial Division', 'commercial', 'Sales, export and customer service'),
    mkDiv('Corporate Division', 'corporate', 'Finance, HR, IT, legal, admin and procurement'),
  ],
  departments: [
    mkDept('Production', 'Operations Division', 'Manufacturing and assembly'),
    mkDept('Quality Assurance & Control', 'Operations Division', 'QA/QC processes'),
    mkDept('Plant Maintenance', 'Operations Division', 'Equipment upkeep'),
    mkDept('Stores & Inventory', 'Operations Division', 'Raw material and finished goods'),
    mkDept('Health, Safety & Environment', 'Operations Division', 'HSE compliance'),
    mkDept('Sales & Marketing', 'Commercial Division', 'Revenue generation'),
    mkDept('Export & International', 'Commercial Division', 'Foreign trade'),
    mkDept('Customer Service', 'Commercial Division', 'Post-sale support'),
    mkDept('Finance & Accounts', 'Corporate Division', 'Accounting and treasury'),
    mkDept('Human Resources', 'Corporate Division', 'People management'),
    mkDept('Information Technology', 'Corporate Division', 'IT infra and systems'),
    mkDept('Legal & Compliance', 'Corporate Division', 'Legal and regulatory'),
    mkDept('Administration', 'Corporate Division', 'Office management'),
    mkDept('Purchase & Procurement', 'Corporate Division', 'Vendor sourcing'),
  ],
};

// ── Preset 2 — Trading / Distribution ────────────────────────────

const trading: OrgPresetPackage = {
  id: 'trading',
  name: 'Trading / Distribution',
  icon: '📦',
  description: '2 Divisions · 10 Departments — Procurement, Warehouse, Sales',
  divisions: [
    mkDiv('Operations Division', 'operations', 'Procurement, warehouse and logistics'),
    mkDiv('Corporate Division', 'corporate', 'Sales, finance, HR and admin'),
  ],
  departments: [
    mkDept('Purchase & Sourcing', 'Operations Division', 'Vendor procurement'),
    mkDept('Warehouse & Logistics', 'Operations Division', 'Storage and dispatch'),
    mkDept('Import & Export', 'Operations Division', 'Cross-border trade'),
    mkDept('Inventory Control', 'Operations Division', 'Stock accuracy'),
    mkDept('Sales & Marketing', 'Corporate Division', 'Revenue and branding'),
    mkDept('Finance & Accounts', 'Corporate Division', 'Accounting and treasury'),
    mkDept('Human Resources', 'Corporate Division', 'People management'),
    mkDept('Customer Service', 'Corporate Division', 'Post-sale support'),
    mkDept('Administration', 'Corporate Division', 'Office management'),
    mkDept('Information Technology', 'Corporate Division', 'IT systems'),
  ],
};

// ── Preset 3 — Services / IT Company ─────────────────────────────

const services: OrgPresetPackage = {
  id: 'services',
  name: 'Services / IT Company',
  icon: '💻',
  description: '2 Divisions · 9 Departments — Delivery, BD, Finance, HR',
  divisions: [
    mkDiv('Delivery Division', 'technical', 'Project delivery and support'),
    mkDiv('Corporate Division', 'corporate', 'BD, finance, HR and admin'),
  ],
  departments: [
    mkDept('Projects & Delivery', 'Delivery Division', 'Client project execution'),
    mkDept('Technical Support', 'Delivery Division', 'L1/L2/L3 support'),
    mkDept('Quality & Testing', 'Delivery Division', 'QA and testing'),
    mkDept('Pre-Sales & Solutions', 'Delivery Division', 'Solution design'),
    mkDept('Business Development & Sales', 'Corporate Division', 'Revenue growth'),
    mkDept('Finance & Accounts', 'Corporate Division', 'Accounting and treasury'),
    mkDept('Human Resources', 'Corporate Division', 'People management'),
    mkDept('Administration', 'Corporate Division', 'Office management'),
    mkDept('Information Technology', 'Corporate Division', 'Internal IT'),
  ],
};

// ── Preset 4 — Retail Business ───────────────────────────────────

const retail: OrgPresetPackage = {
  id: 'retail',
  name: 'Retail Business',
  icon: '🛍️',
  description: '2 Divisions · 8 Departments — Store Ops, Buying, Finance',
  divisions: [
    mkDiv('Store Operations Division', 'operations', 'Retail operations and merchandising'),
    mkDiv('Support Division', 'corporate', 'Buying, supply chain, finance and HR'),
  ],
  departments: [
    mkDept('Retail Operations', 'Store Operations Division', 'Day-to-day store ops'),
    mkDept('Visual Merchandising', 'Store Operations Division', 'In-store display'),
    mkDept('Customer Experience', 'Store Operations Division', 'Customer satisfaction'),
    mkDept('Buying & Merchandising', 'Support Division', 'Product sourcing'),
    mkDept('Supply Chain & Logistics', 'Support Division', 'Distribution'),
    mkDept('Finance & Accounts', 'Support Division', 'Accounting and treasury'),
    mkDept('Human Resources', 'Support Division', 'People management'),
    mkDept('Marketing & Brand', 'Support Division', 'Brand and campaigns'),
  ],
};

// ── Preset 5 — Minimal Setup ─────────────────────────────────────

const minimal: OrgPresetPackage = {
  id: 'minimal',
  name: 'Minimal Setup',
  icon: '⚡',
  description: 'No Divisions · 5 Departments — Start simple, add more later',
  divisions: [],
  departments: [
    mkDept('Finance & Accounts', null, 'Accounting and treasury'),
    mkDept('Sales & Marketing', null, 'Revenue and branding'),
    mkDept('Operations', null, 'Day-to-day operations'),
    mkDept('Human Resources', null, 'People management'),
    mkDept('Administration', null, 'Office management'),
  ],
};

export const ORG_PRESETS: OrgPresetPackage[] = [
  manufacturing, trading, services, retail, minimal,
];

// Import helper — called by useOrgStructure.importPreset()
// Resolves division_name → actual division_id after divisions are created.
// Returns { divisions, departments } ready to save to localStorage.
export function resolvePreset(
  preset: OrgPresetPackage,
  now: string
): { divisions: Division[]; departments: Department[] } {
  const divs: Division[] = preset.divisions.map((d, i) => ({
    ...d, id: `div-${Date.now()}-${i}`,
    code: `DIV-${String(i + 1).padStart(4, '0')}`,
    entity_id: null, created_at: now, updated_at: now,
  }));
  const depts: Department[] = preset.departments.map((d: any, i) => {
    const matchedDiv = divs.find(v => v.name === d.division_name) ?? null;
    return {
      id: `dept-${Date.now()}-${i}`,
      code: `DEPT-${String(i + 1).padStart(4, '0')}`,
      name: d.name, division_id: matchedDiv?.id ?? null,
      parent_department_id: null, head_name: "", head_email: "",
      location: "", budget: null, status: "active" as const,
      description: d.description || "", entity_id: null,
      created_at: now, updated_at: now,
    };
  });
  return { divisions: divs, departments: depts };
}
