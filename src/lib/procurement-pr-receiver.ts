/**
 * procurement-pr-receiver.ts — Read RequestX indents pending purchase
 * Sprint T-Phase-1.2.6f-a · per D-241
 * [JWT] GET /api/procure360/pending-purchase-indents
 */
import type { MaterialIndent } from '@/types/material-indent';
import { materialIndentsKey } from '@/types/material-indent';
import { procurementEnquiriesKey, type ProcurementEnquiry } from '@/types/procurement-enquiry';

export interface PendingPurchaseIndent {
  indent_id: string;
  indent_no: string;
  indent_date: string;
  category: string;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical_shutdown';
  total_value: number;
  line_count: number;
  matched_vendor_count: number;
  originating_branch_id: string;
  originating_division_id: string;
  originating_department_id: string;
  originating_department_name: string;
  requested_by_user_name: string;
  days_pending: number;
  is_urgent: boolean;
}

function readIndents(entityCode: string): MaterialIndent[] {
  // [JWT] GET /api/requestx/material-indents
  try {
    const raw = localStorage.getItem(materialIndentsKey(entityCode));
    return raw ? (JSON.parse(raw) as MaterialIndent[]) : [];
  } catch {
    return [];
  }
}

function readEnquiries(entityCode: string): ProcurementEnquiry[] {
  try {
    const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
    return raw ? (JSON.parse(raw) as ProcurementEnquiry[]) : [];
  } catch {
    return [];
  }
}

export function computeMatchedVendorCount(indent: MaterialIndent): number {
  // Sprint 3-a: lightweight count placeholder. Sprint 3-c will compute via item-vendor SSOT.
  return Math.max(1, Math.min(5, indent.lines.length));
}

export function isAlreadyEnquiryLinked(indentId: string, entityCode: string): boolean {
  const enquiries = readEnquiries(entityCode);
  return enquiries.some(e => e.source_indent_ids.includes(indentId));
}

export function getPendingPurchaseIndents(entityCode: string): PendingPurchaseIndent[] {
  const indents = readIndents(entityCode);
  const today = Date.now();
  return indents
    .filter(i => i.status === 'pending_purchase')
    .filter(i => !isAlreadyEnquiryLinked(i.id, entityCode))
    .map<PendingPurchaseIndent>(i => {
      const total = i.lines.reduce((s, l) => s + (l.estimated_value || 0), 0);
      const days = Math.max(0, Math.floor((today - new Date(i.date).getTime()) / 86400000));
      return {
        indent_id: i.id,
        indent_no: i.voucher_no,
        indent_date: i.date,
        category: i.category,
        priority: i.priority,
        total_value: total,
        line_count: i.lines.length,
        matched_vendor_count: computeMatchedVendorCount(i),
        originating_branch_id: i.branch_id,
        originating_division_id: i.division_id,
        originating_department_id: i.originating_department_id,
        originating_department_name: i.originating_department_name,
        requested_by_user_name: i.requested_by_name,
        days_pending: days,
        is_urgent: ['urgent', 'critical_shutdown'].includes(i.priority) || days > 7,
      };
    });
}
