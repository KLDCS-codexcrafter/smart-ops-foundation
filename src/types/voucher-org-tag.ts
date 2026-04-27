/**
 * @file     voucher-org-tag.ts
 * @purpose  Derived metadata table for transaction-level org-tagging.
 *           Enables 5-tier slicing (Entity + Branch + BU + Division + Department)
 *           without modifying voucher.ts schema (D-128 preserved).
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.0-OrgTagFoundation (Group B Sprint B.0)
 * @sprint   T-T8.0-OrgTagFoundation
 * @phase    Phase 1 client-side (Phase 2 will swap to backend table · same join pattern)
 * @whom     voucher-org-tag-engine.ts · vendor-analytics-engine.ts (B.6) · all subsequent slicing reports
 * @depends  none (pure type)
 *
 * Locked per founder Q-Z (b) Hybrid · Q-AA (a) insert-before · Q-BB (a) full 5-tier
 */

/** Org-tag metadata for a single voucher.
 *  Persisted in localStorage at VOUCHER_ORG_TAGS_KEY · joined with voucher
 *  data at query time by the analytics engines.
 *
 *  Backward-compatible: existing untagged vouchers are not in this table ·
 *  reports show "Unassigned" for them · founder may run optional backfill later.
 */
export interface VoucherOrgTag {
  /** FK to Voucher.id — primary key of this metadata row. */
  voucher_id: string;
  /** Always present — operator's active entity at voucher save. */
  entity_id: string;
  /** Optional · operator's active branch (erp_branch_offices). */
  branch_id?: string;
  /** Optional · operator's active business unit (erp_group_business_unit_master). */
  business_unit_id?: string;
  /** Optional · operator's active division (erp_divisions). */
  division_id?: string;
  /** Optional · operator's active department (erp_departments).
   *  Note: voucher.ts already has department_id · this duplicates it for query speed
   *  + ensures consistency with the other 4 tiers. */
  department_id?: string;
  /** User id of the operator who saved the voucher. */
  tagged_by: string;
  /** ISO timestamp of tag write. */
  tagged_at: string;
}

/** localStorage key for VoucherOrgTag[] persistence.
 *  Phase 2 will swap to backend table · key reserved for migration script.
 *  [JWT] GET/POST /api/accounting/voucher-org-tags
 */
export const VOUCHER_ORG_TAGS_KEY = 'erp_voucher_org_tags';
