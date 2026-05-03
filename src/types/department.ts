/**
 * @file        department.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Department type · seed template · visibility scope (D-234)
 * @decisions   D-232, D-233, D-234
 * @disciplines SD-15, SD-16
 * @[JWT]       erp_departments_<entityCode>
 */
import type { UserRole } from '@/types/card-entitlement';

export type VisibilityScope = 'own_dept' | 'all_depts';

export interface Department {
  id: string;
  entity_id: string;
  code: string;
  name: string;
  branch_id: string;
  division_id: string;
  cost_center_id: string;
  hod_user_id: string;
  budget_annual: number;
  is_active: boolean;
  visibility_scope: VisibilityScope;
  exception_roles: UserRole[];
  created_at: string;
  updated_at: string;
}

export const departmentKey = (entityCode: string) => `erp_departments_${entityCode}`;

export type DepartmentSeedTemplate = Omit<
  Department,
  'id' | 'entity_id' | 'branch_id' | 'division_id' | 'cost_center_id' | 'hod_user_id' | 'created_at' | 'updated_at'
>;

export const DEPARTMENT_SEEDS_TEMPLATE: DepartmentSeedTemplate[] = [
  { code: 'SALES',  name: 'Sales',           budget_annual: 5000000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
  { code: 'PUR',    name: 'Purchase',        budget_annual: 0,       is_active: true, visibility_scope: 'own_dept', exception_roles: ['operations'] },
  { code: 'STORES', name: 'Stores',          budget_annual: 500000,  is_active: true, visibility_scope: 'own_dept', exception_roles: ['operations'] },
  { code: 'PROD',   name: 'Production',      budget_annual: 8000000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
  { code: 'MAINT',  name: 'Maintenance',     budget_annual: 2000000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
  { code: 'ACCT',   name: 'Accounts',        budget_annual: 800000,  is_active: true, visibility_scope: 'own_dept', exception_roles: ['finance'] },
  { code: 'HR',     name: 'HR',              budget_annual: 600000,  is_active: true, visibility_scope: 'own_dept', exception_roles: ['hr'] },
  { code: 'ADMIN',  name: 'Admin',           budget_annual: 1500000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
  { code: 'IT',     name: 'IT',              budget_annual: 3000000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
  { code: 'QC',     name: 'Quality Control', budget_annual: 1200000, is_active: true, visibility_scope: 'own_dept', exception_roles: [] },
];
