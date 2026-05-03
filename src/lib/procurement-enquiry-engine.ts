/**
 * procurement-enquiry-engine.ts — Procurement Enquiry CRUD + workflow
 * Sprint T-Phase-1.2.6f-a · per D-251
 * [JWT] POST/GET /api/procure360/enquiries
 */
import {
  procurementEnquiriesKey,
  type ProcurementEnquiry,
  type ProcurementEnquiryLine,
  type ProcurementEnquiryStatus,
  type VendorSelectionMode,
  type ItemVendorMatchPair,
} from '@/types/procurement-enquiry';
import { materialIndentsKey, type MaterialIndent } from '@/types/material-indent';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { publishProcurementPulse } from './procurement-pulse-stub';

function totalEnquiryValue(e: ProcurementEnquiry): number {
  return e.lines.reduce((s, l) => s + (l.estimated_value ?? 0), 0);
}

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readEnquiries(entityCode: string): ProcurementEnquiry[] {
  // [JWT] GET /api/procure360/enquiries
  try {
    const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
    return raw ? (JSON.parse(raw) as ProcurementEnquiry[]) : [];
  } catch {
    return [];
  }
}

function writeEnquiries(entityCode: string, list: ProcurementEnquiry[]): void {
  // [JWT] PUT /api/procure360/enquiries
  try {
    localStorage.setItem(procurementEnquiriesKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

export function listEnquiries(entityCode: string): ProcurementEnquiry[] {
  return readEnquiries(entityCode);
}

export function getEnquiry(id: string, entityCode: string): ProcurementEnquiry | null {
  return readEnquiries(entityCode).find((e) => e.id === id) ?? null;
}

function nextEnquiryNo(existing: ProcurementEnquiry[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  const seq = String(existing.length + 1).padStart(4, '0');
  return `PE/${ym}/${seq}`;
}

export interface CreateEnquiryInput {
  entity_id: string;
  branch_id: string | null;
  division_id: string | null;
  department_id: string | null;
  cost_center_id: string | null;
  source_indent_ids: string[];
  is_standalone: boolean;
  vendor_mode: VendorSelectionMode;
  lines: Omit<ProcurementEnquiryLine, 'id' | 'line_no' | 'status'>[];
  requested_by_user_id: string;
  notes?: string;
}

export function createEnquiry(input: CreateEnquiryInput, entityCode: string): ProcurementEnquiry {
  const list = readEnquiries(entityCode);
  const now = new Date().toISOString();
  const enquiry: ProcurementEnquiry = {
    id: newId('pe'),
    enquiry_no: nextEnquiryNo(list),
    enquiry_date: now.slice(0, 10),
    entity_id: input.entity_id,
    branch_id: input.branch_id,
    division_id: input.division_id,
    department_id: input.department_id,
    cost_center_id: input.cost_center_id,
    source_indent_ids: input.source_indent_ids,
    is_standalone: input.is_standalone,
    standalone_approval_tier: input.is_standalone ? 3 : null,
    vendor_mode: input.vendor_mode,
    selected_vendor_ids: [],
    vendor_overrides: [],
    item_vendor_matrix: [],
    matrix_overrides: [],
    lines: input.lines.map((l, idx) => ({
      ...l,
      id: newId('pel'),
      line_no: idx + 1,
      status: 'draft',
    })),
    requested_by_user_id: input.requested_by_user_id,
    hod_id: null,
    purchase_manager_id: null,
    director_id: null,
    approval_stage: input.is_standalone ? 'hod' : null,
    rfq_ids: [],
    awarded_quotation_ids: [],
    award_notes: '',
    awarded_at: null,
    awarded_by_user_id: null,
    notes: input.notes ?? '',
    status: 'draft',
    created_at: now,
    updated_at: now,
  };
  writeEnquiries(entityCode, [enquiry, ...list]);
  // FIX-1 · D-247 hash chain · D-262 fire-and-forget
  void appendAuditEntry({
    entityCode,
    entityId: input.entity_id,
    voucherId: enquiry.id,
    voucherKind: 'procurement_enquiry',
    action: 'enquiry.created',
    actorUserId: input.requested_by_user_id,
    payload: {
      enquiry_no: enquiry.enquiry_no,
      total_value: totalEnquiryValue(enquiry),
      vendor_mode: enquiry.vendor_mode,
      source_indent_ids: enquiry.source_indent_ids,
    },
  }).catch(() => { /* best-effort · forensic chain */ });
  // FIX-3 · D-248 procurement-pulse emit
  publishProcurementPulse({
    severity: 'info',
    message: `New procurement enquiry ${enquiry.enquiry_no} · ₹${totalEnquiryValue(enquiry).toLocaleString('en-IN')}`,
  });
  return enquiry;
}

export function promoteIndentToProcurementEnquiry(
  indentIds: string[],
  entityCode: string,
  requestedByUserId: string,
): ProcurementEnquiry | null {
  // [JWT] POST /api/procure360/enquiries/promote-from-indent
  try {
    const raw = localStorage.getItem(materialIndentsKey(entityCode));
    const indents = raw ? (JSON.parse(raw) as MaterialIndent[]) : [];
    const selected = indents.filter((i) => indentIds.includes(i.id));
    if (selected.length === 0) return null;
    const head = selected[0];
    const lines: CreateEnquiryInput['lines'] = selected.flatMap((ind) =>
      ind.lines.map((l) => ({
        source_indent_id: ind.id,
        source_indent_line_id: l.id,
        item_id: l.item_id,
        item_name: l.item_name,
        uom: l.uom,
        required_qty: l.qty,
        current_stock_qty: l.current_stock_qty,
        estimated_rate: l.estimated_rate,
        estimated_value: l.estimated_value,
        required_date: l.required_date,
        schedule_date: l.schedule_date ?? l.required_date,
        vendor_mode_override: null,
        override_reason: null,
        matched_vendor_ids: [],
        remarks: l.remarks,
      })),
    );
    return createEnquiry(
      {
        entity_id: head.entity_id,
        branch_id: head.branch_id,
        division_id: head.division_id,
        department_id: head.originating_department_id,
        cost_center_id: head.cost_center_id,
        source_indent_ids: indentIds,
        is_standalone: false,
        vendor_mode: 'scoring',
        lines,
        requested_by_user_id: requestedByUserId,
      },
      entityCode,
    );
  } catch {
    return null;
  }
}

export function updateEnquiry(
  id: string,
  partial: Partial<ProcurementEnquiry>,
  entityCode: string,
): ProcurementEnquiry | null {
  const list = readEnquiries(entityCode);
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...partial, updated_at: new Date().toISOString() };
  list[idx] = next;
  writeEnquiries(entityCode, list);
  return next;
}

export function transitionEnquiryStatus(
  id: string,
  status: ProcurementEnquiryStatus,
  entityCode: string,
  actorUserId: string = 'system',
): ProcurementEnquiry | null {
  const result = updateEnquiry(id, { status }, entityCode);
  if (result && status === 'approved') {
    // FIX-1 · D-247 hash chain · D-262 fire-and-forget
    void appendAuditEntry({
      entityCode,
      entityId: result.entity_id,
      voucherId: result.id,
      voucherKind: 'procurement_enquiry',
      action: 'enquiry.approved',
      actorUserId,
      payload: { approver_user_id: actorUserId, tier: result.standalone_approval_tier },
    }).catch(() => { /* best-effort · forensic chain */ });
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'info',
      message: `Enquiry ${result.enquiry_no} approved (Tier ${result.standalone_approval_tier ?? '—'})`,
    });
  }
  return result;
}

export function applyTier2Override(
  enquiryId: string,
  lineId: string,
  vendorId: string,
  reason: string,
  approverId: string,
  entityCode: string,
): ProcurementEnquiry | null {
  const enquiry = getEnquiry(enquiryId, entityCode);
  if (!enquiry) return null;
  const overrides = [
    ...enquiry.matrix_overrides,
    {
      line_id: lineId,
      vendor_id: vendorId,
      reason,
      approved_by_user_id: approverId,
      approved_at: new Date().toISOString(),
    },
  ];
  return updateEnquiry(enquiryId, { matrix_overrides: overrides }, entityCode);
}

export function awardQuotations(
  enquiryId: string,
  winningQuotationIds: string[],
  awardedByUserId: string,
  notes: string,
  entityCode: string,
): ProcurementEnquiry | null {
  const result = updateEnquiry(
    enquiryId,
    {
      awarded_quotation_ids: winningQuotationIds,
      award_notes: notes,
      awarded_at: new Date().toISOString(),
      awarded_by_user_id: awardedByUserId,
      status: 'awarded',
    },
    entityCode,
  );
  if (result) {
    // FIX-1 · D-247 hash chain · D-262 fire-and-forget
    void appendAuditEntry({
      entityCode,
      entityId: result.entity_id,
      voucherId: result.id,
      voucherKind: 'procurement_enquiry',
      action: 'enquiry.awarded',
      actorUserId: awardedByUserId,
      payload: { winning_quotation_ids: winningQuotationIds },
    }).catch(() => { /* best-effort · forensic chain */ });
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'info',
      message: `Enquiry ${result.enquiry_no} awarded · ${winningQuotationIds.length} quotations`,
    });
  }
  return result;
}

export function setItemVendorMatrix(
  enquiryId: string,
  matrix: ItemVendorMatchPair[],
  entityCode: string,
): ProcurementEnquiry | null {
  return updateEnquiry(enquiryId, { item_vendor_matrix: matrix }, entityCode);
}
