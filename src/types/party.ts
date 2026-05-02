/**
 * Party — unified customer/vendor master shape.
 * Sprint T-Phase-2.7-e · OOB-9 · centralizes lightweight seeds + extends with Q1-b fields.
 *
 * IMPORTANT: existing storage keys preserved:
 *   localStorage['erp_group_customer_master']
 *   localStorage['erp_group_vendor_master']
 *
 * Existing inline loaders in 12+ forms still work · they read minimal {id, partyName}
 * shape. New code reads/writes the full Party shape via party-master-engine.ts.
 *
 * [JWT] Phase 2: /api/masters/parties
 */

export type PartyType = 'customer' | 'vendor' | 'both';

export interface Party {
  id: string;
  entity_id: string;
  party_code: string;
  party_name: string;
  party_type: PartyType;

  gstin: string | null;
  state_code: string | null;

  /** OOB-9 audit flag (Q2-c) — true when minted via InlineQuickAddDialog. */
  created_via_quick_add: boolean;
  /** ISO when finance team confirmed/edited the quick-add record. */
  audit_flag_resolved_at: string | null;

  created_at: string;
  updated_at: string;
  created_by: string;
}

export const partyMasterKey = (entityCode: string): string =>
  `parties_v1_${entityCode}`;

/** Storage adapter keys for backward compat with existing form inline loaders. */
export const LEGACY_CUSTOMER_KEY = 'erp_group_customer_master';
export const LEGACY_VENDOR_KEY = 'erp_group_vendor_master';
