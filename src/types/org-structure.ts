/**
 * org-structure.ts — Division & Department master types
 * ORG-1 · SSOT: erp_divisions + erp_departments
 * No cost centres here — cost centres are for Projects only (future).
 */

export type DivisionCategory = 'corporate' | 'operations' | 'commercial' | 'technical';

export const DIVISION_CATEGORY_LABELS: Record<DivisionCategory, string> = {
  corporate:  'Corporate & Support',
  operations: 'Operations',
  commercial: 'Commercial',
  technical:  'Technical & R&D',
};

export interface Division {
  id: string;
  code: string;                       // auto-gen: DIV-0001
  name: string;
  category: DivisionCategory;
  parent_division_id: string | null;  // optional sub-division nesting
  head_name: string;
  head_email: string;
  location: string;
  status: "active" | "inactive";
  description: string;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  code: string;                       // auto-gen: DEPT-0001
  name: string;
  division_id: string | null;         // optional — can exist without division
  parent_department_id: string | null;
  head_name: string;
  head_email: string;
  location: string;
  budget: number | null;
  status: "active" | "inactive";
  description: string;
  entity_id: string | null;
  created_at: string;
  updated_at: string;
}

export const DIVISIONS_KEY   = 'erp_divisions';
export const DEPARTMENTS_KEY = 'erp_departments';
