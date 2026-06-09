/**
 * @file     src/types/provisioning.ts
 * @sprint   SP.3 · T-SP3-Provisioning
 * @purpose  4-level account hierarchy + provision-request type model.
 *           super-admin → { direct Client | ChannelPartner → ClientOfPartner }
 *           Request lifecycle: requested → approved → provisioned → active → suspended
 * @canon    Provisioning = STATUS-TRACK ONLY (Tier-L). Real instance spin-up,
 *           entitlement enforcement, billing & per-account auth = Wave-2.
 * @[JWT]    Wave-2: real provisioning API + per-account auth.
 */

export type AccountNodeType =
  | 'super_admin'
  | 'channel_partner'
  | 'client'
  | 'client_of_partner';

export interface AccountNode {
  id: string;
  type: AccountNodeType;
  name: string;
  /** Parent node id. Null for super_admin root. */
  parent_id: string | null;
  /** For client_of_partner — the owning channel-partner node id. */
  partner_id: string | null;
  created_at: string;
}

export type ProvisionRequestType =
  | 'demo'
  | 'final_copy'
  | 'channel_partner'
  | 'client'
  | 'client_of_partner';

export type ProvisionRequestStatus =
  | 'requested'
  | 'approved'
  | 'provisioned'
  | 'active'
  | 'suspended';

export interface ProvisionRequest {
  id: string;
  type: ProvisionRequestType;
  requester_name: string;
  /** Linked AccountNode id once provisioned/active. */
  requester_account_id: string | null;
  /** Any published ProductVariant (Prudent360 ERP / edition / module / bundle). */
  assigned_variant_id: string | null;
  /** When routed via a channel partner. */
  partner_id: string | null;
  status: ProvisionRequestStatus;
  created_at: string;
  provisioned_at: string | null;
  notes: string;
}

/** Guarded status order — index defines forward-only progression (suspended is terminal-recoverable). */
export const PROVISION_STATUS_ORDER: ProvisionRequestStatus[] = [
  'requested',
  'approved',
  'provisioned',
  'active',
  'suspended',
];

export const PROVISION_REQUEST_TYPES: ProvisionRequestType[] = [
  'demo',
  'final_copy',
  'channel_partner',
  'client',
  'client_of_partner',
];

export const ACCOUNT_NODE_TYPES: AccountNodeType[] = [
  'super_admin',
  'channel_partner',
  'client',
  'client_of_partner',
];

/** Honest Wave-2 banner — single source of truth. */
export const PROVISIONING_HONESTY =
  'Provisioning is tracked here; real instance spin-up, entitlement enforcement, billing & per-account login arrive with Wave-2.';

// ── localStorage keys (entity-scoped) ──
export const accountHierarchyKey = (entity: string) =>
  `tower_account_hierarchy_${entity}`;
export const provisionRequestsKey = (entity: string) =>
  `tower_provision_requests_${entity}`;
