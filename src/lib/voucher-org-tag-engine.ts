/**
 * @file     voucher-org-tag-engine.ts
 * @purpose  Auto-populate + query the erp_voucher_org_tags derived metadata table.
 *           Enables transaction-level 5-tier org slicing without voucher.ts schema change.
 * @sprint   T-T8.0-OrgTagFoundation
 * @phase    Phase 1 · localStorage · Phase 2 swap to backend with same join pattern
 *
 * Locked per founder Q-Z (b) Hybrid · D-128 preserved · 33-sprint zero-touch streak.
 */

import type { VoucherOrgTag } from '@/types/voucher-org-tag';
import { VOUCHER_ORG_TAGS_KEY } from '@/types/voucher-org-tag';
import { getCurrentUserId } from '@/lib/auth-helpers';

// ── Internal storage helpers ───────────────────────────────────────────

function loadAllTags(): VoucherOrgTag[] {
  try {
    // [JWT] GET /api/accounting/voucher-org-tags
    const raw = localStorage.getItem(VOUCHER_ORG_TAGS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAllTags(tags: VoucherOrgTag[]): void {
  try {
    // [JWT] POST /api/accounting/voucher-org-tags
    localStorage.setItem(VOUCHER_ORG_TAGS_KEY, JSON.stringify(tags));
  } catch (err) {
    console.error('Failed to save voucher org tags:', err);
  }
}

// ── Public API: Tag write ──────────────────────────────────────────────

/** Operator-context shape accepted by tagVoucher (subset of VoucherOrgTag). */
export type OperatorContext = Partial<
  Omit<VoucherOrgTag, 'voucher_id' | 'tagged_by' | 'tagged_at'>
>;

/** Write or replace org-tag for a voucher · idempotent · returns the saved tag. */
export function tagVoucher(
  voucherId: string,
  context: OperatorContext,
): VoucherOrgTag {
  const all = loadAllTags();
  const existing = all.findIndex(t => t.voucher_id === voucherId);
  const tag: VoucherOrgTag = {
    voucher_id: voucherId,
    entity_id: context.entity_id ?? '',
    branch_id: context.branch_id,
    business_unit_id: context.business_unit_id,
    division_id: context.division_id,
    department_id: context.department_id,
    tagged_by: getCurrentUserId(),
    tagged_at: new Date().toISOString(),
  };
  if (existing >= 0) all[existing] = tag;
  else all.push(tag);
  saveAllTags(all);
  return tag;
}

// ── Public API: Tag query ──────────────────────────────────────────────

export function getVoucherTags(voucherId: string): VoucherOrgTag | null {
  return loadAllTags().find(t => t.voucher_id === voucherId) ?? null;
}

export function getVouchersByEntity(entityId: string): string[] {
  return loadAllTags().filter(t => t.entity_id === entityId).map(t => t.voucher_id);
}

export function getVouchersByBranch(branchId: string): string[] {
  return loadAllTags().filter(t => t.branch_id === branchId).map(t => t.voucher_id);
}

export function getVouchersByBusinessUnit(businessUnitId: string): string[] {
  return loadAllTags().filter(t => t.business_unit_id === businessUnitId).map(t => t.voucher_id);
}

export function getVouchersByDivision(divisionId: string): string[] {
  return loadAllTags().filter(t => t.division_id === divisionId).map(t => t.voucher_id);
}

export function getVouchersByDepartment(departmentId: string): string[] {
  return loadAllTags().filter(t => t.department_id === departmentId).map(t => t.voucher_id);
}

// ── Public API: Operator context resolver ──────────────────────────────

/** Resolve current operator's active org context · used by voucher save engines.
 *  Phase 1: derives department from voucher · looks up division via erp_departments.
 *  Phase 2: reads from backend session including branch + BU per-user prefs.
 *
 *  IMPLEMENTATION NOTE: Non-React function (called from engines, not components).
 *  Currently only entity + department + division are auto-resolved.
 *  Branch and Business Unit will be added once per-user selectors ship.
 */
export function getOperatorContext(
  entityId: string,
  voucherDepartmentId?: string,
): OperatorContext {
  const ctx: OperatorContext = { entity_id: entityId };
  if (voucherDepartmentId) {
    ctx.department_id = voucherDepartmentId;
    // Lookup department → division via existing erp_departments hierarchy.
    try {
      // [JWT] GET /api/foundation/departments
      const depts: Array<{ id: string; division_id?: string | null }> =
        JSON.parse(localStorage.getItem('erp_departments') ?? '[]');
      const dept = depts.find(d => d.id === voucherDepartmentId);
      if (dept?.division_id) ctx.division_id = dept.division_id;
    } catch {
      /* graceful fallback · ctx still has entity + department */
    }
  }
  return ctx;
}

// ── Public API: Coverage badge for FoundationModule ───────────────────

/** Compute org-tag coverage % for the FoundationModule status card.
 *  Reads vouchers from all entity-scoped storage keys to give global coverage. */
export function getOrgTagCoverage(): { total: number; tagged: number; coveragePct: number } {
  const tags = loadAllTags();
  // Count vouchers across entity-scoped storage keys.
  // finecore-engine uses key pattern `erp_group_vouchers_{entityCode}`.
  let totalVouchers = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('erp_group_vouchers_')) {
      try {
        // [JWT] GET /api/accounting/vouchers/count
        const arr = JSON.parse(localStorage.getItem(key) ?? '[]');
        if (Array.isArray(arr)) totalVouchers += arr.length;
      } catch {
        /* skip malformed entries */
      }
    }
  }
  const tagged = tags.length;
  const coveragePct = totalVouchers === 0 ? 100 : Math.round((tagged / totalVouchers) * 100);
  return { total: totalVouchers, tagged, coveragePct };
}
