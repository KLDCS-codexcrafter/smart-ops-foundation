/**
 * card-entitlement.ts — Card-level licensing + role-based access
 * Stage 3a. Each card is a product SKU. Tenant subscribes per card.
 * Role + plan + feature flags decide what the user can open.
 * [JWT] GET /api/tenant/entitlements
 */

export type CardId =
  | 'command-center' | 'salesx' | 'distributor-hub' | 'customer-hub'
  | 'finecore' | 'receivx' | 'peoplepay' | 'payout' | 'insightx'
  | 'procure360' | 'inventory-hub' | 'qulicheak' | 'gateflow'
  | 'production' | 'maintainpro' | 'requestx' | 'backoffice'
  | 'servicedesk'
  | 'dispatch-hub';

export type PlanTier = 'starter' | 'growth' | 'enterprise' | 'trial';

export type EntitlementStatus =
  | 'active'
  | 'trial'
  | 'locked'
  | 'expired'
  | 'add_on_available';

export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'finance'
  | 'sales'
  | 'operations'
  | 'hr'
  | 'support'
  | 'view_only';

/** Role -> default allowed cards map (starting point; per-user overrides possible). */
export const ROLE_DEFAULT_CARDS: Record<UserRole, CardId[]> = {
  super_admin: [],
  tenant_admin: [],
  finance: ['finecore', 'receivx', 'payout', 'insightx', 'command-center'],
  sales: ['salesx', 'distributor-hub', 'customer-hub', 'insightx'],
  operations: ['procure360', 'inventory-hub', 'production', 'qulicheak', 'gateflow',
    'maintainpro', 'requestx', 'dispatch-hub'],
  hr: ['peoplepay', 'insightx'],
  support: ['servicedesk'],
  view_only: ['insightx'],
};

export interface CardEntitlement {
  tenant_id: string;
  card_id: CardId;
  status: EntitlementStatus;
  plan_tier: PlanTier;
  effective_from: string;
  effective_until: string | null;
  trial_days_remaining: number | null;
  feature_flags: string[];
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface UserEntitlementProfile {
  user_id: string;
  tenant_id: string;
  role: UserRole;
  explicit_allow: CardId[];
  explicit_deny: CardId[];
  updated_at: string;
}

export const cardEntitlementsKey = (e: string) => `erp_card_entitlements_${e}`;
export const userEntitlementProfileKey = (e: string, uid: string) =>
  `erp_user_entitlement_${e}_${uid}`;

/**
 * Stage 4 — Action-level authorization (from Authorization Matrix Sheet 3).
 * Used by canPerformAction() and Shell item filtering.
 */
export type ActionVerb =
  // CRUD
  | 'view' | 'list' | 'create' | 'edit' | 'delete' | 'export' | 'import'
  // Voucher
  | 'voucher.draft' | 'voucher.post' | 'voucher.approve' | 'voucher.reject'
  | 'voucher.reverse' | 'voucher.amend' | 'voucher.lock_period'
  | 'voucher.unlock' | 'voucher.export_tally'
  // Master
  | 'master.view' | 'master.create' | 'master.edit' | 'master.deactivate'
  | 'master.merge' | 'master.opening_balance'
  // Admin
  | 'user.create' | 'user.edit_role' | 'user.deactivate' | 'user.reset_password'
  | 'user.impersonate' | 'tenant.config' | 'tenant.suspend' | 'policy.edit'
  | 'audit.view' | 'audit.export'
  // Report
  | 'report.view' | 'report.export' | 'report.schedule'
  | 'report.share' | 'report.share_external';

/** Scope context passed with every authorization check. */
export interface AuthScope {
  tenant_id: string;
  company_id?: string;
  branch_id?: string;
  territory_id?: string;
  godown_id?: string;
}
