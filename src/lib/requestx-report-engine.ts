/**
 * @file        requestx-report-engine.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block A
 * @card        Card #3 · P2P arc · RequestX Reports
 * @purpose     Pure aggregation utilities consumed by 7 reports + Health Score.
 * @decisions   D-190 (reuses existing types) · D-218 (status machine)
 * @disciplines SD-13, SD-15
 */
import type { MaterialIndent, MaterialIndentLine } from '@/types/material-indent';
import type { ServiceRequest } from '@/types/service-request';
import type { CapitalIndent } from '@/types/capital-indent';
import type { IndentVoucherKind } from '@/types/requisition-common';
import { dAdd, round2 } from '@/lib/decimal-helpers';

export type AnyIndent = MaterialIndent | ServiceRequest | CapitalIndent;

// ── Aggregation ────────────────────────────────────────────────────────────

export interface DepartmentGroup<T> {
  department_id: string;
  department_name: string;
  count: number;
  total_value: number;
  rows: T[];
}

export function groupByDepartment<T extends AnyIndent>(rows: T[]): DepartmentGroup<T>[] {
  const map = new Map<string, DepartmentGroup<T>>();
  for (const r of rows) {
    const key = r.originating_department_id || 'unassigned';
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.total_value = round2(dAdd(existing.total_value, r.total_estimated_value));
      existing.rows.push(r);
    } else {
      map.set(key, {
        department_id: key,
        department_name: r.originating_department_name || 'Unassigned',
        count: 1,
        total_value: round2(r.total_estimated_value),
        rows: [r],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
}

export interface CategoryGroup {
  category: string;
  count: number;
  total_value: number;
}

export function groupByCategory(indents: MaterialIndent[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const r of indents) {
    const k = r.category;
    const existing = map.get(k);
    if (existing) {
      existing.count += 1;
      existing.total_value = round2(dAdd(existing.total_value, r.total_estimated_value));
    } else {
      map.set(k, { category: k, count: 1, total_value: round2(r.total_estimated_value) });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_value - a.total_value);
}

// ── Aging ──────────────────────────────────────────────────────────────────

export interface AgeingBuckets {
  '0-7': number;
  '8-15': number;
  '16-30': number;
  '30+': number;
}

const ageDays = (isoDate: string): number => {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
};

export function ageingBuckets(indents: AnyIndent[]): AgeingBuckets {
  const out: AgeingBuckets = { '0-7': 0, '8-15': 0, '16-30': 0, '30+': 0 };
  for (const r of indents) {
    const days = ageDays(r.date);
    if (days <= 7) out['0-7'] += 1;
    else if (days <= 15) out['8-15'] += 1;
    else if (days <= 30) out['16-30'] += 1;
    else out['30+'] += 1;
  }
  return out;
}

export const indentAgeDays = ageDays;

// ── PO linkage stub (Sprint 3-c will populate) ─────────────────────────────

export interface PoAgainstIndentRow {
  indent_id: string;
  voucher_no: string;
  kind: IndentVoucherKind;
  po_ids: string[];
  po_value: number;
  status: 'no_po' | 'po_raised' | 'po_closed';
}

export function poAgainstIndentSummary(indents: AnyIndent[] = []): PoAgainstIndentRow[] {
  // [JWT] GET /api/procure360/po-against-indent
  // Phase 1 stub · Sprint 3-c populates from real PO data.
  return indents.map(r => ({
    indent_id: r.id,
    voucher_no: r.voucher_no,
    kind: ('capital_sub_type' in r ? 'capital' : 'service_track' in r ? 'service' : 'material') as IndentVoucherKind,
    po_ids: [],
    po_value: 0,
    status: r.status === 'po_created' || r.status === 'partially_ordered'
      ? 'po_raised'
      : r.status === 'closed' ? 'po_closed' : 'no_po',
  }));
}

// ── OOB-4 · Health Score ───────────────────────────────────────────────────

export function computeIndentHealthScore(indent: MaterialIndent): number {
  let score = 100;
  const days = ageDays(indent.date);
  // Age penalty
  if (days > 7) score -= Math.min(30, (days - 7) * 1.5);
  // Bottleneck (stuck statuses)
  if (indent.status === 'pending_hod' && days > 2) score -= 15;
  if (indent.status === 'pending_purchase' && days > 5) score -= 15;
  if (indent.status === 'pending_finance' && days > 7) score -= 15;
  if (indent.status === 'rejected' || indent.status === 'cancelled') score -= 40;
  if (indent.status === 'short_supplied' || indent.status === 'quality_rejected_partial') score -= 20;
  // Vendor preference set?
  if (!indent.preferred_vendor_id) score -= 5;
  // Price drift proxy: zero estimated rates on lines
  const driftLines = indent.lines.filter(l => l.estimated_rate <= 0).length;
  if (driftLines > 0) score -= Math.min(10, driftLines * 3);
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── OOB-25 · Fulfillment confidence ────────────────────────────────────────

export interface FulfillmentScore {
  required: number;
  ordered: number;
  received: number;
  qc_accepted: number;
  final_pct: number;
}

export function computeFulfillmentScore(indent: MaterialIndent): FulfillmentScore {
  const required = indent.lines.reduce((acc, l) => acc + (l.qty || 0), 0);
  // Phase 1 stub · ordered/received/qc data lives in Procure360 (Sprint 3-c).
  // [JWT] GET /api/procure360/fulfillment?indent_id=...
  const ordered = indent.status === 'closed' ? required
    : indent.status === 'partially_ordered' || indent.status === 'po_created' ? required * 0.75
    : 0;
  const received = indent.status === 'closed' ? required : ordered * 0.85;
  const qc_accepted = received * 0.95;
  const final_pct = required > 0 ? Math.round((qc_accepted / required) * 100) : 0;
  return {
    required: round2(required),
    ordered: round2(ordered),
    received: round2(received),
    qc_accepted: round2(qc_accepted),
    final_pct,
  };
}

// ── OOB-35 · Lifecycle bottleneck ──────────────────────────────────────────

export interface PhaseBreakdown {
  phase: string;
  days: number;
  pct_of_total: number;
}

export interface LifecycleSummary {
  total_days: number;
  phase_breakdown: PhaseBreakdown[];
  bottleneck_phase: string;
}

export function lifecycleBottleneck(indent: MaterialIndent): LifecycleSummary {
  const events = indent.approval_history;
  const created = new Date(indent.created_at).getTime();
  const phases: PhaseBreakdown[] = [];
  let cursor = created;
  let total = 0;
  for (const ev of events) {
    const at = new Date(ev.acted_at).getTime();
    const days = Math.max(0, Math.round((at - cursor) / 86400000));
    total += days;
    phases.push({ phase: `${ev.approver_role} → ${ev.action}`, days, pct_of_total: 0 });
    cursor = at;
  }
  // Tail · pending current status
  const tailDays = Math.max(0, Math.round((Date.now() - cursor) / 86400000));
  if (tailDays > 0) {
    phases.push({ phase: `current: ${indent.status}`, days: tailDays, pct_of_total: 0 });
    total += tailDays;
  }
  for (const p of phases) p.pct_of_total = total > 0 ? Math.round((p.days / total) * 100) : 0;
  const bottleneck = phases.length > 0
    ? phases.reduce((a, b) => (a.days >= b.days ? a : b)).phase
    : 'no_data';
  return { total_days: total, phase_breakdown: phases, bottleneck_phase: bottleneck };
}

// ── OOB-45 · Splitting detection ───────────────────────────────────────────

export interface SplittingFlag {
  requester_id: string;
  requester_name: string;
  vendor_id: string | null;
  window_days: number;
  aggregate_value: number;
  would_have_been_tier: 1 | 2 | 3;
  flag: 'medium' | 'high';
  indent_ids: string[];
}

const tierFromValue = (v: number): 1 | 2 | 3 => (v <= 50000 ? 1 : v <= 500000 ? 2 : 3);

export function detectSplittingPattern(indents: AnyIndent[]): SplittingFlag[] {
  // Group by (requester, vendor) within rolling 7-day windows
  const flags: SplittingFlag[] = [];
  const byKey = new Map<string, AnyIndent[]>();
  for (const r of indents) {
    const vendorId = ('preferred_vendor_id' in r ? r.preferred_vendor_id : null)
      ?? ('vendor_id' in r ? r.vendor_id : null);
    const key = `${r.requested_by_user_id}::${vendorId ?? 'novendor'}`;
    const arr = byKey.get(key) ?? [];
    arr.push(r);
    byKey.set(key, arr);
  }
  for (const [key, group] of byKey) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i++) {
      const window: AnyIndent[] = [sorted[i]];
      for (let j = i + 1; j < sorted.length; j++) {
        const dDays = Math.abs(
          (new Date(sorted[j].date).getTime() - new Date(sorted[i].date).getTime()) / 86400000,
        );
        if (dDays <= 7) window.push(sorted[j]); else break;
      }
      if (window.length < 2) continue;
      const agg = window.reduce((acc, r) => dAdd(acc, r.total_estimated_value), 0);
      const wouldBe = tierFromValue(agg);
      const indSpread = window.map(r => tierFromValue(r.total_estimated_value));
      const escalates = indSpread.every(t => t < wouldBe);
      if (!escalates) continue;
      const [requesterPart] = key.split('::');
      const vendorPart = key.split('::')[1];
      flags.push({
        requester_id: requesterPart,
        requester_name: window[0].requested_by_name,
        vendor_id: vendorPart === 'novendor' ? null : vendorPart,
        window_days: 7,
        aggregate_value: round2(agg),
        would_have_been_tier: wouldBe,
        flag: window.length >= 4 || agg > 1000000 ? 'high' : 'medium',
        indent_ids: window.map(r => r.id),
      });
      break; // one flag per (requester,vendor) group
    }
  }
  return flags;
}

// ── Helpers ────────────────────────────────────────────────────────────────

export const inrFmt = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function lineItemsCount(rows: AnyIndent[]): number {
  return rows.reduce((acc, r) => acc + (r.lines as MaterialIndentLine[]).length, 0);
}
