/**
 * partner.ts — Distributor Portal types.
 * Sprint 10. Tier-priced catalog, partner JWT, partner-scoped session.
 *
 * Tiers: gold > silver > bronze. Each tier maps to a PriceList (Sprint 7).
 * `is_distributor` flag on CustomerMaster gates portal login.
 */

export type PartnerTier = 'gold' | 'silver' | 'bronze';

export type PartnerStatus = 'active' | 'suspended' | 'pending_kyc';

/**
 * Partner — extension of CustomerMaster for distributor portal access.
 * Persisted as `erp_partners_{entityCode}`.
 * Linked 1:1 with CustomerMaster row by `customer_id`.
 */
export interface Partner {
  id: string;
  customer_id: string;       // FK -> erp_group_customer_master
  legal_name: string;
  partner_code: string;      // human-readable, e.g. PRT-MUM-0042
  tier: PartnerTier;
  price_list_id: string | null;
  territory_id: string | null;
  credit_limit_paise: number;
  outstanding_paise: number;
  overdue_paise: number;
  monthly_target_paise: number;
  monthly_achieved_paise: number;
  status: PartnerStatus;
  contact_email: string;
  contact_mobile: string;
  gstin: string | null;
  state_code: string | null;
  full_address: string;
  is_distributor: true;      // tautology marker; rows here ARE distributors
  created_at: string;
  updated_at: string;
}

/**
 * PartnerSession — distributor JWT session (separate scope from internal ERP).
 * Stored in localStorage under `4ds_partner_token`.
 */
export interface PartnerSession {
  token: string;
  partner_id: string;
  customer_id: string;
  legal_name: string;
  partner_code: string;
  tier: PartnerTier;
  price_list_id: string | null;
  entity_code: string;       // which company they purchase from
  email: string;
  expires_at: string;        // ISO; mock 8h
}

/**
 * PartnerActivity — feed item rendered on the dashboard.
 * Persisted as `erp_partner_activity_{entityCode}`.
 */
export type PartnerActivityKind =
  | 'invoice_posted'
  | 'payment_received'
  | 'order_approved'
  | 'order_rejected'
  | 'broadcast_received'
  | 'credit_limit_changed';

export interface PartnerActivity {
  id: string;
  partner_id: string;
  kind: PartnerActivityKind;
  title: string;
  detail: string;
  amount_paise?: number | null;
  ref_type?: 'voucher' | 'order' | 'broadcast' | null;
  ref_id?: string | null;
  created_at: string;
}

// ── Storage keys (entity-scoped) ──
export const partnersKey = (e: string) => `erp_partners_${e}`;
export const partnerActivityKey = (e: string) => `erp_partner_activity_${e}`;
export const PARTNER_TOKEN_KEY = '4ds_partner_token';
export const PARTNER_SESSION_KEY = '4ds_partner_session';
