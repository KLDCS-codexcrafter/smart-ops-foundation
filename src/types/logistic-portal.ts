/**
 * logistic-portal.ts — Transporter Portal session + activity types
 * Sprint 15c-2. Separate scope from internal ERP auth + distributor auth.
 * Linked to LogisticMasterDefinition by logistic_id.
 * [JWT] GET/POST /api/logistic/auth/* endpoints.
 */

export const LOGISTIC_SESSION_KEY = 'erp_logistic_portal_session';
export const LOGISTIC_TOKEN_KEY = 'erp_logistic_portal_token';

export interface LogisticPortalSession {
  logistic_id: string;             // FK -> LogisticMasterDefinition.id
  party_code: string;              // display
  party_name: string;
  logistic_type: string;           // 'gta' | 'courier' | ... from LogisticType
  entity_code: string;
  token: string;                   // mock JWT
  issued_at: string;
  expires_at: string;
  must_change_password: boolean;
}

export type LogisticActivityKind =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'invoice_submit'
  | 'lr_accept'
  | 'lr_reject'
  | 'dispute_response'
  | 'profile_update';

export interface LogisticActivity {
  id: string;
  logistic_id: string;
  entity_code: string;
  kind: LogisticActivityKind;
  ref_type?: 'invoice' | 'lr' | 'dispute' | 'profile';
  ref_id?: string;
  ref_label?: string;
  notes?: string;
  at: string;
  ip?: string;                     // best-effort only
}

export const logisticActivityKey = (e: string) => `erp_logistic_activity_${e}`;

/** LR acceptance: transporter confirms 'yes, I picked this up' BEFORE invoicing. */
export type LRAcceptanceStatus =
  | 'awaiting'          // LR created in ERP, transporter not yet seen
  | 'accepted'          // transporter confirmed pickup
  | 'rejected'          // transporter says 'not my LR'
  | 'invoiced';         // already on a submitted invoice

export interface LRAcceptance {
  id: string;
  logistic_id: string;
  entity_code: string;
  dln_voucher_id: string;          // FK -> Voucher (base_type='Delivery Note')
  dln_voucher_no: string;
  lr_no?: string | null;           // filled by transporter during acceptance if blank
  lr_date?: string | null;
  status: LRAcceptanceStatus;
  accepted_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const lrAcceptancesKey = (e: string) => `erp_lr_acceptances_${e}`;

/** Default credentials for fresh portal activation. */
export const DEFAULT_TEMP_PASSWORD = 'Welcome@123';
export const PASSWORD_MIN_LENGTH = 8;
export const SESSION_HOURS = 8;
