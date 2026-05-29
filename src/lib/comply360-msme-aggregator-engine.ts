/**
 * @file        src/lib/comply360-msme-aggregator-engine.ts
 * @sibling     NEW @ Sprint 78a · Comply360 Main Arc 1.10 · Pass A · Q9 + OOB-8
 * @realizes    Cross-card MSME aggregator unifying msme-43bh-engine (vendor breaches,
 *              43B(h) disallowance) and comply360-msme-form1-engine (half-yearly
 *              Form 1 returns) into a single tenant-scoped view. Adds OOB-8
 *              assessApprovalRisk for Pay Hub future integration.
 * @reads-from  msme-43bh-engine (0-DIFF) · comply360-msme-form1-engine (0-DIFF)
 * @sprint      Sprint 78a · T-Phase-5.A.1.10-PASS-A
 * [JWT] Phase 8: GET /api/comply360/msme/aggregate · POST /api/comply360/msme/risk-check
 */
import {
  compute43BhSummary, getMSMEBreaches, disallowedAmountForFY,
  type MSME43BhSummary, type MSMEBreach,
} from './msme-43bh-engine';
import { MSME_DELAY_THRESHOLD_DAYS } from './comply360-msme-form1-engine';

// ── READS_FROM contract (Lesson 23 · S78a canon) ─────────────────────
export const READS_FROM = {
  engines: ['msme-43bh-engine', 'comply360-msme-form1-engine'],
  storage_keys: [],
} as const;

export type AgingBucket = '0-30' | '31-45' | '46+';

export interface MSMEVendorRow {
  vendor_id: string;
  vendor_name: string;
  msme_status: 'micro' | 'small' | 'medium' | 'not-msme' | null;
  aging_bucket: AgingBucket;
  outstanding_inr: number;
  disallowance_inr: number;
  days_overdue: number;
}

export interface MSMEAggregatedView {
  entity_code: string;
  fy: string;
  vendors: MSMEVendorRow[];
  total_disallowed_inr: number;
  total_breaches: number;
  form1_status: 'pending' | 'filed' | 'not-applicable';
  summary: MSME43BhSummary;
}

export interface MSMEApprovalRisk {
  risk_level: 'safe' | 'warning' | 'block';
  reason: string;
  days_to_breach: number;
}

function bucketFor(daysOverdue: number): AgingBucket {
  if (daysOverdue <= 30) return '0-30';
  if (daysOverdue <= MSME_DELAY_THRESHOLD_DAYS) return '31-45';
  return '46+';
}

function rowFromBreach(b: MSMEBreach): MSMEVendorRow {
  return {
    vendor_id: b.vendor_id,
    vendor_name: b.vendor_name,
    msme_status: b.vendor_msme_status,
    aging_bucket: bucketFor(b.days_overdue),
    outstanding_inr: b.outstanding_inr,
    disallowance_inr: b.disallowance_inr,
    days_overdue: b.days_overdue,
  };
}

/**
 * Aggregate MSME view for an entity/FY: vendor rows, disallowance totals,
 * Form 1 status (placeholder 'pending' · Phase-8 wires real Form 1 register).
 */
export function aggregateMSMEView(entity_code: string, fy: string): MSMEAggregatedView {
  const summary = compute43BhSummary(entity_code);
  const breaches = getMSMEBreaches(entity_code);
  const vendors = breaches.map(rowFromBreach);
  return {
    entity_code,
    fy,
    vendors,
    total_disallowed_inr: disallowedAmountForFY(entity_code, fy),
    total_breaches: breaches.length,
    form1_status: vendors.length > 0 ? 'pending' : 'not-applicable',
    summary,
  };
}

/**
 * OOB-8 · assessApprovalRisk — pure engine function (Pay Hub workflow
 * integration deferred to a later sprint per DP-S78-3).
 *
 * Risk levels:
 *  - block   · vendor already has an open §43B(h) breach OR payment date pushes
 *              days_overdue past the 45-day statutory ceiling.
 *  - warning · days_to_breach ≤ 7 calendar days.
 *  - safe    · otherwise.
 */
export function assessApprovalRisk(
  entity_code: string,
  vendor_id: string,
  _amount_inr: number,
  payment_date: string,
): MSMEApprovalRisk {
  const breaches = getMSMEBreaches(entity_code);
  const open = breaches.find((b) => b.vendor_id === vendor_id);
  if (open) {
    return {
      risk_level: 'block',
      reason: `Vendor ${vendor_id} has an open §43B(h) breach (${open.days_overdue}d overdue)`,
      days_to_breach: 0,
    };
  }
  // Days remaining until 45-day ceiling, measured from the proposed payment date.
  const payDate = new Date(payment_date);
  const today = new Date();
  const elapsed = Math.max(0, Math.floor((payDate.getTime() - today.getTime()) / 86_400_000));
  const days_to_breach = MSME_DELAY_THRESHOLD_DAYS - elapsed;
  if (days_to_breach < 0) {
    return {
      risk_level: 'block',
      reason: `Payment date pushes past 45-day MSMED ceiling`,
      days_to_breach,
    };
  }
  if (days_to_breach <= 7) {
    return {
      risk_level: 'warning',
      reason: `Payment is within 7 days of the §15 MSMED 45-day ceiling`,
      days_to_breach,
    };
  }
  return { risk_level: 'safe', reason: 'No §43B(h) exposure detected', days_to_breach };
}

/** Export an MSMEAggregatedView to a CSV string (tax officer / archival). */
export function exportMSMEViewCsv(view: MSMEAggregatedView): string {
  const header = [
    'Entity', 'FY', 'Vendor ID', 'Vendor Name', 'MSME Status',
    'Aging Bucket', 'Outstanding INR', 'Disallowance INR', 'Days Overdue',
  ].join(',');
  const rows = view.vendors.map((v) => [
    view.entity_code, view.fy, v.vendor_id,
    `"${v.vendor_name.replace(/"/g, '""')}"`,
    v.msme_status ?? '', v.aging_bucket,
    v.outstanding_inr, v.disallowance_inr, v.days_overdue,
  ].join(','));
  return [header, ...rows].join('\n');
}
