/**
 * partner.ts — Distributor Portal types.
 * Sprint 10. Tier-priced catalog, partner JWT, partner-scoped session.
 *
 * Tiers: gold > silver > bronze. Each tier maps to a PriceList (Sprint 7).
 * `is_distributor` flag on CustomerMaster gates portal login.
 */

export type DistributorTier = 'gold' | 'silver' | 'bronze';

export type DistributorStatus = 'active' | 'suspended' | 'pending_kyc';

/**
 * Distributor — extension of CustomerMaster for distributor portal access.
 * Persisted as `erp_distributors_{entityCode}`.
 * Linked 1:1 with CustomerMaster row by `customer_id`.
 */
export interface Distributor {
  id: string;
  customer_id: string;       // FK -> erp_group_customer_master
  legal_name: string;
  partner_code: string;      // human-readable, e.g. PRT-MUM-0042
  tier: DistributorTier;
  price_list_id: string | null;
  territory_id: string | null;
  credit_limit_paise: number;
  outstanding_paise: number;
  overdue_paise: number;
  monthly_target_paise: number;
  monthly_achieved_paise: number;
  status: DistributorStatus;
  contact_email: string;
  contact_mobile: string;
  gstin: string | null;
  state_code: string | null;
  full_address: string;
  is_distributor: true;      // tautology marker; rows here ARE distributors
  // Sprint 11a — hierarchy linkage (optional, backward-compatible)
  hierarchy_node_id?: string | null;
  upstream_customer_id?: string | null;
  hierarchy_role?: import('./distributor-hierarchy').HierarchyRole | null;
  created_at: string;
  updated_at: string;
}

/**
 * DistributorSession — distributor JWT session (separate scope from internal ERP).
 * Stored in localStorage under `4ds_distributor_token`.
 */
export interface DistributorSession {
  token: string;
  distributor_id: string;
  customer_id: string;
  legal_name: string;
  partner_code: string;
  tier: DistributorTier;
  price_list_id: string | null;
  entity_code: string;       // which company they purchase from
  email: string;
  expires_at: string;        // ISO; mock 8h
  // Sprint 11a — hierarchy context (optional, backward-compatible)
  hierarchy_node_id?: string | null;
  hierarchy_role?: import('./distributor-hierarchy').HierarchyRole | null;
}

/**
 * DistributorActivity — feed item rendered on the dashboard.
 * Persisted as `erp_distributor_activity_{entityCode}`.
 */
export type DistributorActivityKind =
  | 'invoice_posted'
  | 'payment_received'
  | 'order_approved'
  | 'order_rejected'
  | 'broadcast_received'
  | 'credit_limit_changed';

export interface DistributorActivity {
  id: string;
  distributor_id: string;
  kind: DistributorActivityKind;
  title: string;
  detail: string;
  amount_paise?: number | null;
  ref_type?: 'voucher' | 'order' | 'broadcast' | null;
  ref_id?: string | null;
  created_at: string;
}

// ── Storage keys (entity-scoped) ──
export const distributorsKey = (e: string) => `erp_distributors_${e}`;
export const distributorActivityKey = (e: string) => `erp_distributor_activity_${e}`;
export const DISTRIBUTOR_TOKEN_KEY = '4ds_distributor_token';
export const DISTRIBUTOR_SESSION_KEY = '4ds_distributor_session';
