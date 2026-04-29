/**
 * project-centre.ts — Project Centre master (cost-tagging master for project transactions)
 * Sprint T-Phase-1.1.2-a · Sister to AssetCentre (D-218)
 *
 * The voucher schema field project_centre_id?: string | null already exists on
 * JournalEntry + OutstandingEntry (added in 1.1.2-pre). This master populates it.
 *
 * Single source of truth = Command Center → Project Masters group (NEW).
 * Replica = ProjX card sidebar via shared Panel re-export.
 */

export type ProjectCentreCategory =
  | 'product_implementation'
  | 'turnkey'
  | 'epc'
  | 'amc'
  | 'service'
  | 'consulting'
  | 'other';

export const PROJECT_CENTRE_CATEGORY_LABELS: Record<ProjectCentreCategory, string> = {
  product_implementation: 'Product Implementation',
  turnkey:                'Turnkey',
  epc:                    'EPC',
  amc:                    'AMC / Maintenance',
  service:                'Service',
  consulting:             'Consulting',
  other:                  'Other',
};

export interface ProjectCentre {
  id: string;
  code: string;                              // PCT-NNNN auto-gen (4-digit zero-padded)
  name: string;
  category: ProjectCentreCategory;
  parent_project_centre_id: string | null;   // for sub-projects (1.5.7 builds full hierarchy)
  division_id: string | null;                // FK to Division (cross-cut reporting)
  department_id: string | null;              // FK to Department
  customer_id: string | null;                // FK to GroupCustomer (project's owning customer)
  customer_name: string | null;              // denormalized for display
  status: 'active' | 'inactive';
  description: string;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export const projectCentresKey = (entityCode: string): string =>
  `erp_project_centres_${entityCode}`;
export const PROJECT_CENTRE_SEQ_KEY = (entityCode: string): string =>
  `erp_doc_seq_PCT_${entityCode}`;
