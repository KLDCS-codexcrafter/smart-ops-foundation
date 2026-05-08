/**
 * @file        po-cross-dept-followup.ts
 * @purpose     Cross-department PO follow-up aggregator + Trident PO Party Status pivot.
 *              Consumes po-management-engine + bill-passing-engine · zero rewrites.
 * @who         Lovable · Procurement / Cross-dept ops
 * @when        2026-05-08
 * @sprint      T-Phase-1.A.3.c-Procure360-OOB-Polish-PEQ-FU
 * @iso         25010 · Functional Suitability + Compatibility (Trident pattern)
 * @whom        Procurement + originating departments
 * @decisions   D-NEW-AP (Cross-Dept aggregator + Party Status pivot · per FR-25 + FR-53 + Trident B12)
 * @disciplines FR-19 · FR-25 · FR-30 · FR-53
 * @reuses      po-management-engine (listPurchaseOrders · listOverduePos · computePoOverdueDays) ·
 *              bill-passing-engine (listBillPassing) · decimal-helpers
 * @[JWT]       n/a · pure compute
 */

import {
  listPurchaseOrders,
  listOverduePos,
  computePoOverdueDays,
} from './po-management-engine';
import { listBillPassing } from './bill-passing-engine';
import { dAdd, round2 } from './decimal-helpers';

export interface CrossDeptPoBucket {
  department_id: string;
  department_name: string;
  open_po_count: number;
  overdue_po_count: number;
  total_open_value: number;
  oldest_overdue_days: number;
  bills_pending_count: number;
  bills_pending_value: number;
}

const UNASSIGNED_DEPT_ID = 'unassigned';
const UNASSIGNED_DEPT_NAME = 'Unassigned';

/**
 * Aggregate open + overdue POs by department_id (canonical PurchaseOrderRecord field).
 * Joins bill-passing data to surface bills-pending dimension.
 *
 * NOTE · α-c: PurchaseOrderRecord exposes `department_id` only (no `department_name`).
 * Display layer can resolve via department master in α-d enhancement.
 */
export function aggregatePoByDepartment(entityCode: string): CrossDeptPoBucket[] {
  const allPos = listPurchaseOrders(entityCode);
  const overduePos = listOverduePos(entityCode);
  const bills = listBillPassing(entityCode);

  // Open POs · status not in (cancelled · closed)
  const openPos = allPos.filter(
    (p) => p.status !== 'cancelled' && p.status !== 'closed',
  );

  const overdueIds = new Set(overduePos.map((p) => p.id));
  const buckets = new Map<string, CrossDeptPoBucket>();

  for (const po of openPos) {
    const deptId = po.department_id ?? UNASSIGNED_DEPT_ID;
    // TODO(D-NEW-AP · α-d): resolve department_name via department master
    const deptName = deptId === UNASSIGNED_DEPT_ID ? UNASSIGNED_DEPT_NAME : deptId;

    if (!buckets.has(deptId)) {
      buckets.set(deptId, {
        department_id: deptId,
        department_name: deptName,
        open_po_count: 0,
        overdue_po_count: 0,
        total_open_value: 0,
        oldest_overdue_days: 0,
        bills_pending_count: 0,
        bills_pending_value: 0,
      });
    }
    const b = buckets.get(deptId)!;
    b.open_po_count += 1;
    b.total_open_value = round2(dAdd(b.total_open_value, po.total_after_tax ?? 0));

    if (overdueIds.has(po.id)) {
      b.overdue_po_count += 1;
      const days = computePoOverdueDays(po);
      if (days > b.oldest_overdue_days) b.oldest_overdue_days = days;
    }
  }

  // Bills pending dimension · join by po_id
  const pendingBillStatuses = new Set([
    'pending_match', 'matched_clean', 'matched_with_variance', 'awaiting_qa',
  ]);
  for (const bill of bills) {
    if (!pendingBillStatuses.has(bill.status)) continue;
    const po = allPos.find((p) => p.id === bill.po_id);
    if (!po) continue;
    const deptId = po.department_id ?? UNASSIGNED_DEPT_ID;
    const b = buckets.get(deptId);
    if (!b) continue;
    b.bills_pending_count += 1;
    b.bills_pending_value = round2(dAdd(b.bills_pending_value, bill.total_invoice_value ?? 0));
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.overdue_po_count - a.overdue_po_count,
  );
}

export interface PoPartyStatusRow {
  vendor_id: string;
  vendor_name: string;
  vendor_group: string | null;
  open_pos: number;
  overdue_pos: number;
  total_outstanding: number;
  oldest_open_days: number;
}

/**
 * Trident PO Party Status pivot (B12 enhancement).
 * NOTE · α-c: PurchaseOrderRecord has no `vendor_group` field at HEAD.
 * TODO(D-NEW-AP · α-d): join vendor master to surface vendor_group.
 */
export function aggregatePoByParty(entityCode: string): PoPartyStatusRow[] {
  const allPos = listPurchaseOrders(entityCode);
  const overduePos = listOverduePos(entityCode);
  const overdueIds = new Set(overduePos.map((p) => p.id));

  const buckets = new Map<string, PoPartyStatusRow>();

  for (const po of allPos) {
    if (po.status === 'cancelled') continue;
    const key = po.vendor_id;
    if (!buckets.has(key)) {
      buckets.set(key, {
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name ?? po.vendor_id,
        // TODO(D-NEW-AP · α-d): resolve vendor_group from vendor master
        vendor_group: null,
        open_pos: 0,
        overdue_pos: 0,
        total_outstanding: 0,
        oldest_open_days: 0,
      });
    }
    const b = buckets.get(key)!;
    b.open_pos += 1;
    b.total_outstanding = round2(dAdd(b.total_outstanding, po.total_after_tax ?? 0));
    if (overdueIds.has(po.id)) {
      b.overdue_pos += 1;
      const days = computePoOverdueDays(po);
      if (days > b.oldest_open_days) b.oldest_open_days = days;
    }
  }

  return Array.from(buckets.values()).sort(
    (a, b) => b.total_outstanding - a.total_outstanding,
  );
}
