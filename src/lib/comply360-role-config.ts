/**
 * @file        src/lib/comply360-role-config.ts
 * @purpose     Comply360 role → mega-menu visibility matrix · DP-S69-6
 * @sprint      Sprint 69 · T-Phase-5.A.1.1 · Cycle 2 Remediation · Block 6
 * @decisions   D-S69-1 (100% native) · DP-S69-6 (role-scoped sidebar)
 * @iso         Security · Maintainability
 * @disciplines FR-19 SIBLING-adjacent (config-as-code) · FR-43 unit-testable
 * @note        Consumed by Comply360Sidebar to filter mega-menus by role.
 *              Pure data + 2 pure functions · zero React dependency.
 */
import type { Comply360Module } from '@/pages/erp/comply360/Comply360Sidebar.types';

/** Roles relevant to Comply360 (subset of platform UserRole). */
export type Comply360Role =
  | 'super_admin'
  | 'tenant_admin'
  | 'finance'
  | 'compliance_officer'
  | 'auditor_external'
  | 'auditor_internal'
  | 'hr'
  | 'view_only';

/**
 * Role → allowed mega-menu module ids.
 * super_admin and tenant_admin always see everything (computed in canSeeModule).
 */
export const COMPLY360_ROLE_MATRIX: Record<Comply360Role, Comply360Module[]> = {
  super_admin: [],
  tenant_admin: [],
  finance: [
    'welcome', 'home', 'calendar', 'companies', 'tax-gst', 'payments',
    'challan-vault', 'roc', 'fixed-assets', 'finance-hub', 'reports', 'docs',
  ],
  compliance_officer: [
    'welcome', 'home', 'calendar', 'companies', 'tax-gst', 'payroll', 'payments',
    'challan-vault', 'roc', 'fixed-assets', 'internal-audit', 'external-audit',
    'exim', 'vendor', 'licenses', 'esg', 'legal', 'finance-hub', 'reports',
    'ai-center', 'docs', 'integrations', 'workflow',
  ],
  auditor_external: [
    'welcome', 'home', 'calendar', 'companies', 'tax-gst', 'roc',
    'external-audit', 'reports', 'docs',
  ],
  auditor_internal: [
    'welcome', 'home', 'calendar', 'companies', 'tax-gst', 'payroll',
    'roc', 'fixed-assets', 'internal-audit', 'reports', 'docs',
  ],
  hr: [
    'welcome', 'home', 'calendar', 'payroll', 'payments', 'challan-vault',
    'reports', 'docs',
  ],
  view_only: ['welcome', 'home', 'calendar', 'reports'],
};

/** True if role can access the given mega-menu module. Admin roles unconditional. */
export function canSeeModule(role: Comply360Role, module: Comply360Module): boolean {
  if (role === 'super_admin' || role === 'tenant_admin') return true;
  return COMPLY360_ROLE_MATRIX[role].includes(module);
}

/** Filter a list of module ids to those visible to the role. */
export function filterModulesByRole<T extends { id: Comply360Module }>(
  items: T[],
  role: Comply360Role,
): T[] {
  return items.filter((i) => canSeeModule(role, i.id));
}
