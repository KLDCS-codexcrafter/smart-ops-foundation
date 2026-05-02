/**
 * @file     pending-approvals-loader.ts — Shared loader for pending approvals
 * @sprint   T-Phase-2.7-b · Q4-c
 * @purpose  Single source for MobileApprovalsPage + ApprovalsPendingPage (web).
 *           Aggregates submitted records across 11 transaction types · filters
 *           by current user's roles · sorted by submitted_at desc.
 *
 *   [JWT] GET /api/approvals/pending?entityCode=:entityCode&userRoles=:roles
 */

import { findVoucherTypeById } from '@/lib/non-finecore-voucher-type-registry';

export type PendingApprovalRecordType =
  | 'grn' | 'rtv' | 'cycle_count' | 'consumption_entry'
  | 'quotation' | 'supply_request_memo' | 'invoice_memo'
  | 'sample_outward_memo' | 'demo_outward_memo' | 'delivery_memo'
  | 'secondary_sales';

export interface PendingApproval {
  record_id: string;
  record_type: PendingApprovalRecordType;
  record_no: string;
  record_date: string;
  party_name: string;
  total_amount: number;
  voucher_type_id: string | null;
  voucher_type_name: string | null;
  required_role: string | null;
  submitted_at: string;
  submitted_by: string;
}

export const STORAGE_KEYS_BY_TYPE: Record<PendingApprovalRecordType, (e: string) => string> = {
  grn: e => `erp_grns_${e}`,
  rtv: e => `erp_rtvs_${e}`,
  cycle_count: e => `erp_cycle_counts_${e}`,
  consumption_entry: e => `erp_consumption_entries_${e}`,
  quotation: e => `erp_quotations_${e}`,
  supply_request_memo: e => `erp_supply_request_memos_${e}`,
  invoice_memo: e => `erp_invoice_memos_${e}`,
  sample_outward_memo: e => `erp_sample_outward_memos_${e}`,
  demo_outward_memo: e => `erp_demo_outward_memos_${e}`,
  delivery_memo: e => `erp_delivery_memos_${e}`,
  secondary_sales: e => `erp_secondary_sales_${e}`,
};

export function loadAllPendingApprovals(entityCode: string, userRoles: string[]): PendingApproval[] {
  const all: PendingApproval[] = [];
  for (const recordType of Object.keys(STORAGE_KEYS_BY_TYPE) as PendingApprovalRecordType[]) {
    const keyFn = STORAGE_KEYS_BY_TYPE[recordType];
    try {
      // [JWT] GET /api/{record_type}?entityCode=:entityCode&status=submitted
      const raw = localStorage.getItem(keyFn(entityCode));
      if (!raw) continue;
      const records = JSON.parse(raw) as Array<Record<string, unknown>>;
      for (const r of records) {
        if (r.status !== 'submitted') continue;
        const vt = findVoucherTypeById(entityCode, String(r.voucher_type_id ?? ''));
        const requiredRole = vt?.approval_role ?? null;
        if (requiredRole && userRoles.length > 0 && !userRoles.includes(requiredRole)) continue;
        all.push({
          record_id: String(r.id),
          record_type: recordType,
          record_no: String(
            r.grn_no ?? r.rtv_no ?? r.memo_no ?? r.quotation_no ??
            r.cycle_count_no ?? r.consumption_no ?? r.delivery_memo_no ??
            r.sample_outward_no ?? r.demo_outward_no ?? r.id,
          ),
          record_date: String(r.receipt_date ?? r.memo_date ?? r.quotation_date ?? r.entry_date ?? r.created_at ?? ''),
          party_name: String(r.vendor_name ?? r.customer_name ?? r.distributor_name ?? r.recipient_name ?? '—'),
          total_amount: Number(r.total_amount ?? r.grand_total ?? 0),
          voucher_type_id: (r.voucher_type_id as string | null) ?? null,
          voucher_type_name: (r.voucher_type_name as string | null) ?? null,
          required_role: requiredRole,
          submitted_at: String(r.submitted_at ?? r.updated_at ?? ''),
          submitted_by: String(r.submitted_by ?? r.counter_name ?? r.created_by ?? '—'),
        });
      }
    } catch { /* skip invalid storage */ }
  }
  return all.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
}

/** Patch a record's status in localStorage · used by approve/reject one-click flows. */
export function patchPendingApprovalRecord(
  entityCode: string,
  recordType: PendingApprovalRecordType,
  recordId: string,
  patch: Record<string, unknown>,
): boolean {
  const keyFn = STORAGE_KEYS_BY_TYPE[recordType];
  try {
    const raw = localStorage.getItem(keyFn(entityCode));
    if (!raw) return false;
    const records = JSON.parse(raw) as Array<Record<string, unknown>>;
    const idx = records.findIndex(r => r.id === recordId);
    if (idx < 0) return false;
    records[idx] = { ...records[idx], ...patch, updated_at: new Date().toISOString() };
    // [JWT] PATCH /api/{record_type}/:id
    localStorage.setItem(keyFn(entityCode), JSON.stringify(records));
    return true;
  } catch {
    return false;
  }
}
