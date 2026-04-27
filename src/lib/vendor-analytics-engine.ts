/**
 * @file     vendor-analytics-engine.ts
 * @purpose  Pure-query analytics engine for vendor performance metrics with
 *           5-tier organizational slicing (Entity · Branch · BU · Division · Dept).
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.6-VendorAnalytics (Group B Sprint B.6)
 * @sprint   T-T8.6-VendorAnalytics
 * @phase    Phase 1 client-side · Phase 2 swap to backend with same query contract.
 * @whom     VendorAnalytics.tsx (operator dashboard)
 * @depends  voucher-org-tag-engine (B.0 · 5 query functions reused as-is) ·
 *           msme-43bh-engine (B.5 · getMSMEBreaches reused per-vendor) ·
 *           vendor master · voucher storage · AdvanceEntry storage.
 *
 * Per Q-BB (a) full 5-tier slicing using B.0 voucher-org-tag query API.
 * Per Q-CC (a) leverage existing infrastructure · NO duplicate schemas.
 *
 * IMPORTANT: This is a PURE QUERY engine · NO state mutations · NO localStorage writes.
 *   Just reads existing voucher + voucher-org-tag + vendor + advance data.
 *
 * [DEFERRED · Support & Back Office] scheduled email digests · vendor scorecard/
 *   grading · cross-entity consolidation analytics · configurable metric formulas.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capabilities 2, 5, 6.
 */

import {
  getVouchersByEntity,
  getVouchersByBranch,
  getVouchersByBusinessUnit,
  getVouchersByDivision,
  getVouchersByDepartment,
} from '@/lib/voucher-org-tag-engine';
import { vouchersKey } from '@/lib/finecore-engine';
import { getMSMEBreaches } from '@/lib/msme-43bh-engine';
import type { Voucher } from '@/types/voucher';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { VoucherOrgTag } from '@/types/voucher-org-tag';
import { VOUCHER_ORG_TAGS_KEY } from '@/types/voucher-org-tag';

// ── Schemas ─────────────────────────────────────────────────────

interface VendorRow {
  id: string;
  name: string;
  vendorCode?: string;
  msmeRegistered: boolean;
  msmeCategory: 'micro' | 'small' | 'medium' | null;
  creditDays: number;
  primary_division_id?: string;
  primary_department_id?: string;
}

export interface VendorSlice {
  entity_id: string;             // required
  branch_id?: string;
  business_unit_id?: string;
  division_id?: string;
  department_id?: string;
}

export interface VendorMetrics {
  vendor_id: string;
  vendor_name: string;
  vendor_code?: string;
  total_spend: number;
  invoice_count: number;
  avg_payment_cycle_days: number | null;  // null if no settled invoice
  advance_utilization_pct: number;        // 0-100
  msme_breach_rate_pct: number;           // 0-100 · 0 if not MSME
  tds_compliance_pct: number;             // 0-100
}

export interface TopVendorRow {
  vendor_id: string;
  vendor_name: string;
  total_spend: number;
  rank: number;
}

export interface DimensionDistribution {
  dimension_label: string;
  vendor_count: number;
  total_spend: number;
}

// ── Helpers (read-only) ────────────────────────────────────────

function loadVendors(): VendorRow[] {
  // [JWT] GET /api/masters/vendors
  try {
    const raw = localStorage.getItem('erp_group_vendor_master');
    return raw ? (JSON.parse(raw) as VendorRow[]) : [];
  } catch { return []; }
}

function loadVouchers(entityCode: string): Voucher[] {
  // [JWT] GET /api/accounting/vouchers/:entity
  try {
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

function loadAdvances(entityCode: string): AdvanceEntry[] {
  // [JWT] GET /api/compliance/advances/:entity
  try {
    const raw = localStorage.getItem(advancesKey(entityCode));
    return raw ? (JSON.parse(raw) as AdvanceEntry[]) : [];
  } catch { return []; }
}

function loadOrgTags(): VoucherOrgTag[] {
  // [JWT] GET /api/accounting/voucher-org-tags  · read-only join source
  try {
    const raw = localStorage.getItem(VOUCHER_ORG_TAGS_KEY);
    return raw ? (JSON.parse(raw) as VoucherOrgTag[]) : [];
  } catch { return []; }
}

/** Compute the intersected voucher_id Set for a slice via B.0 query API.
 *  Entity required · other dimensions intersect the result. */
export function getVoucherIdsForSlice(slice: VendorSlice): Set<string> {
  let result = new Set<string>(getVouchersByEntity(slice.entity_id));

  if (slice.branch_id) {
    const branchSet = new Set(getVouchersByBranch(slice.branch_id));
    result = new Set([...result].filter(v => branchSet.has(v)));
  }
  if (slice.business_unit_id) {
    const buSet = new Set(getVouchersByBusinessUnit(slice.business_unit_id));
    result = new Set([...result].filter(v => buSet.has(v)));
  }
  if (slice.division_id) {
    const divSet = new Set(getVouchersByDivision(slice.division_id));
    result = new Set([...result].filter(v => divSet.has(v)));
  }
  if (slice.department_id) {
    const deptSet = new Set(getVouchersByDepartment(slice.department_id));
    result = new Set([...result].filter(v => deptSet.has(v)));
  }
  return result;
}

// ── Public API: per-vendor metric helpers ──────────────────────

/** Average days between Purchase Invoice and earliest matching against_ref Payment. */
export function getVendorPaymentCycleTime(
  entityCode: string,
  vendorId: string,
  vouchers?: Voucher[],
): number | null {
  const allVouchers = vouchers ?? loadVouchers(entityCode);
  const purchases = allVouchers.filter(v =>
    v.base_voucher_type === 'Purchase'
    && v.party_id === vendorId
    && v.status === 'posted',
  );
  if (purchases.length === 0) return null;

  let totalDays = 0;
  let settledCount = 0;
  for (const inv of purchases) {
    const settlements = allVouchers.filter(v =>
      v.base_voucher_type === 'Payment'
      && v.bill_references?.some(b => b.type === 'against_ref' && b.voucher_id === inv.id),
    );
    if (settlements.length === 0) continue;
    const earliest = settlements.reduce((a, b) => a.date < b.date ? a : b);
    const days = Math.round(
      (new Date(earliest.date).getTime() - new Date(inv.date).getTime()) / (1000 * 60 * 60 * 24),
    );
    totalDays += days;
    settledCount += 1;
  }
  return settledCount > 0 ? totalDays / settledCount : null;
}

/** Advance utilization % = (sum adjustments / sum advance_amount) × 100. */
export function getVendorAdvanceUtilization(
  entityCode: string,
  vendorId: string,
  advances?: AdvanceEntry[],
): number {
  const allAdvances = advances ?? loadAdvances(entityCode);
  const vendorAdvances = allAdvances.filter(
    a => a.party_type === 'vendor' && a.party_id === vendorId,
  );
  if (vendorAdvances.length === 0) return 0;

  const totalAdvance = vendorAdvances.reduce((s, a) => s + a.advance_amount, 0);
  if (totalAdvance === 0) return 0;

  const totalAdjusted = vendorAdvances.reduce(
    (s, a) => s + a.adjustments.reduce((s2, j) => s2 + j.amount_adjusted, 0),
    0,
  );
  return Math.min(100, Math.round((totalAdjusted / totalAdvance) * 100));
}

/** MSME 43B(h) breach rate per vendor — reuses B.5 engine output. */
export function getVendorMSMEBreachRate(
  entityCode: string,
  vendorId: string,
  breaches?: ReturnType<typeof getMSMEBreaches>,
  vouchers?: Voucher[],
): number {
  const allBreaches = breaches ?? getMSMEBreaches(entityCode);
  const vendorBreaches = allBreaches.filter(
    b => b.vendor_id === vendorId && b.status === 'breached',
  );
  if (vendorBreaches.length === 0) return 0;

  const allVouchers = vouchers ?? loadVouchers(entityCode);
  const totalInvoices = allVouchers.filter(
    v => v.base_voucher_type === 'Purchase' && v.party_id === vendorId,
  ).length;
  return totalInvoices > 0 ? Math.round((vendorBreaches.length / totalInvoices) * 100) : 0;
}

/** TDS deduction compliance %: (TDS-deducted Payments / TDS-applicable Payments) × 100.
 *  Vacuously 100 when no TDS-applicable payments exist. */
export function getVendorTDSCompliance(
  entityCode: string,
  vendorId: string,
  vouchers?: Voucher[],
): number {
  const allVouchers = vouchers ?? loadVouchers(entityCode);
  const tdsApplicable = allVouchers.filter(v =>
    v.base_voucher_type === 'Payment'
    && v.party_id === vendorId
    && !!v.tds_section,
  );
  if (tdsApplicable.length === 0) return 100;

  const tdsDeducted = tdsApplicable.filter(v => (v.tds_amount ?? 0) > 0).length;
  return Math.round((tdsDeducted / tdsApplicable.length) * 100);
}

// ── Public API: aggregate views ────────────────────────────────

/** Top-N vendors by total spend within slice (Purchase + Payment net_amount). */
export function getTopVendorsBySpend(
  entityCode: string,
  slice: VendorSlice,
  topN: number = 10,
): TopVendorRow[] {
  const voucherIds = getVoucherIdsForSlice(slice);
  const allVouchers = loadVouchers(entityCode);
  const vendors = loadVendors();
  const vendorMap = new Map(vendors.map(v => [v.id, v]));

  const spendByVendor = new Map<string, number>();
  for (const v of allVouchers) {
    if (!voucherIds.has(v.id)) continue;
    if (v.base_voucher_type !== 'Purchase' && v.base_voucher_type !== 'Payment') continue;
    if (!v.party_id || !vendorMap.has(v.party_id)) continue;
    spendByVendor.set(v.party_id, (spendByVendor.get(v.party_id) ?? 0) + (v.net_amount ?? 0));
  }

  const rows: TopVendorRow[] = [];
  let rank = 1;
  for (const [vendorId, spend] of [...spendByVendor.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)) {
    const vendor = vendorMap.get(vendorId);
    if (!vendor) continue;
    rows.push({ vendor_id: vendorId, vendor_name: vendor.name, total_spend: spend, rank });
    rank += 1;
  }
  return rows;
}

/** Per-vendor analytics for a slice · returns one row per vendor with all 5 metrics. */
export function getVendorAnalyticsForSlice(
  entityCode: string,
  slice: VendorSlice,
): VendorMetrics[] {
  const voucherIds = getVoucherIdsForSlice(slice);
  const allVouchers = loadVouchers(entityCode);
  const vendors = loadVendors();
  const advances = loadAdvances(entityCode);
  const breaches = getMSMEBreaches(entityCode);
  const vendorMap = new Map(vendors.map(v => [v.id, v]));

  const vendorIds = new Set<string>();
  for (const v of allVouchers) {
    if (!voucherIds.has(v.id)) continue;
    if (v.party_id && vendorMap.has(v.party_id)) vendorIds.add(v.party_id);
  }

  const result: VendorMetrics[] = [];
  for (const vid of vendorIds) {
    const vendor = vendorMap.get(vid);
    if (!vendor) continue;
    const vendorVouchers = allVouchers.filter(v => voucherIds.has(v.id) && v.party_id === vid);
    const purchases = vendorVouchers.filter(v => v.base_voucher_type === 'Purchase');
    const totalSpend = vendorVouchers
      .filter(v => v.base_voucher_type === 'Purchase' || v.base_voucher_type === 'Payment')
      .reduce((s, v) => s + (v.net_amount ?? 0), 0);

    result.push({
      vendor_id: vid,
      vendor_name: vendor.name,
      vendor_code: vendor.vendorCode,
      total_spend: totalSpend,
      invoice_count: purchases.length,
      avg_payment_cycle_days: getVendorPaymentCycleTime(entityCode, vid, allVouchers),
      advance_utilization_pct: getVendorAdvanceUtilization(entityCode, vid, advances),
      msme_breach_rate_pct: getVendorMSMEBreachRate(entityCode, vid, breaches, allVouchers),
      tds_compliance_pct: getVendorTDSCompliance(entityCode, vid, allVouchers),
    });
  }

  return result.sort((a, b) => b.total_spend - a.total_spend);
}

/** Vendor count + spend grouped by chosen org dimension (for pie chart).
 *  Joins voucher-org-tag (B.0) for branch/BU/division and uses voucher.department_id
 *  as fallback for department. */
export function getVendorCountByDimension(
  entityCode: string,
  dimension: 'department' | 'division' | 'branch' | 'business_unit',
  slice: Partial<VendorSlice>,
): DimensionDistribution[] {
  const allVouchers = loadVouchers(entityCode);
  const vendors = loadVendors();
  const vendorMap = new Map(vendors.map(v => [v.id, v]));

  // Build voucher_id → dimension-id map.
  // For branch/BU/division: read voucher-org-tag rows (B.0).
  // For department: prefer org-tag.department_id then voucher.department_id fallback.
  const tags = loadOrgTags();
  const tagMap = new Map<string, VoucherOrgTag>();
  for (const t of tags) tagMap.set(t.voucher_id, t);

  const dimensionFor = (v: Voucher): string => {
    const tag = tagMap.get(v.id);
    let dimVal: string | undefined;
    switch (dimension) {
      case 'department':
        dimVal = tag?.department_id ?? v.department_id;
        break;
      case 'division':
        dimVal = tag?.division_id;
        break;
      case 'branch':
        dimVal = tag?.branch_id;
        break;
      case 'business_unit':
        dimVal = tag?.business_unit_id;
        break;
    }
    return dimVal && dimVal.length > 0 ? dimVal : 'unassigned';
  };

  const buckets = new Map<string, { spend: number; vendors: Set<string> }>();
  for (const v of allVouchers) {
    if (slice.entity_id && v.entity_id !== slice.entity_id) continue;
    if (v.base_voucher_type !== 'Purchase' && v.base_voucher_type !== 'Payment') continue;
    if (!v.party_id || !vendorMap.has(v.party_id)) continue;

    const dim = dimensionFor(v);
    if (!buckets.has(dim)) buckets.set(dim, { spend: 0, vendors: new Set() });
    const entry = buckets.get(dim)!;
    entry.spend += v.net_amount ?? 0;
    entry.vendors.add(v.party_id);
  }

  return [...buckets.entries()]
    .map(([label, { spend, vendors: vSet }]) => ({
      dimension_label: label,
      vendor_count: vSet.size,
      total_spend: spend,
    }))
    .sort((a, b) => b.total_spend - a.total_spend);
}
