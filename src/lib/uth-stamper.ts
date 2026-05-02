/**
 * @file     uth-stamper.ts — Universal Transaction Header field stamping
 * @sprint   T-Phase-1.2.6d-hdr · D-228 UTH integration
 * @purpose  Standardized helpers any transaction save flow calls to populate
 *           UTH fields consistently. Reads from auth-helpers.getCurrentUser().
 *           Writes audit trail entry via audit-trail-engine.
 *
 * Pattern:
 *   const headerOnCreate = stampCreate(entityCode, 'grn', recordId, recordLabel);
 *   const record: GRN = { ...formData, ...headerOnCreate };
 *
 *   const headerOnUpdate = stampUpdate(entityCode, 'grn', recordId, recordLabel, existingRecord);
 *   const record: GRN = { ...existingRecord, ...formData, ...headerOnUpdate };
 *
 *   const headerOnPost = stampPost(record);
 *   const headerOnCancel = stampCancel(record, cancelReason);  // throws if reason < 10 chars
 *
 * [JWT] All audit writes go through audit-trail-engine which routes to backend in Phase 2.
 */

import { getCurrentUser } from '@/lib/auth-helpers';
import { logAudit } from '@/lib/audit-trail-engine';
import type { AuditEntityType } from '@/types/audit-trail';
import { computeVoucherHash } from '@/lib/voucher-hash';

export interface UTHCreateStamp {
  created_by: string;
  created_at: string;
  updated_at: string;
  currency_code: string;
  exchange_rate: number;
}

export interface UTHUpdateStamp {
  updated_by: string;
  updated_at: string;
}

export interface UTHPostStamp {
  posted_at: string;
  voucher_hash: string;
}

export interface UTHCancelStamp {
  cancelled_at: string;
  cancel_reason: string;
}

const nowISO = (): string => new Date().toISOString();

/**
 * Map UTH record-type slugs to AuditEntityType enum.
 * Falls back to 'voucher' for unknown slugs (still writes — D-3 audit non-skip).
 */
function toAuditEntityType(recordType: string): AuditEntityType {
  const map: Record<string, AuditEntityType> = {
    grn: 'grn',
    min: 'min',
    consumption_entry: 'consumption_entry',
    cycle_count: 'cycle_count',
    rtv: 'rtv',
    quotation: 'voucher',          // no dedicated audit type · grouped under voucher
    supply_request_memo: 'supply_request_memo',
    invoice_memo: 'invoice_memo',
    secondary_sales: 'voucher',
    sample_outward_memo: 'sample_outward_memo',
    demo_outward_memo: 'demo_outward_memo',
    delivery_memo: 'voucher',
    project: 'project',
    project_milestone: 'project_milestone',
    time_entry: 'time_entry',
  };
  return map[recordType] ?? 'voucher';
}

/** Stamp fields when a record is first created. */
export function stampCreate(
  entityCode: string,
  recordType: string,
  recordId: string,
  recordLabel: string,
  afterState: Record<string, unknown> = {},
): UTHCreateStamp {
  const u = getCurrentUser();
  const now = nowISO();
  logAudit({
    entityCode,
    action: 'create',
    entityType: toAuditEntityType(recordType),
    recordId,
    recordLabel,
    beforeState: null,
    afterState,
    sourceModule: recordType,
  });
  return {
    created_by: u.id,
    created_at: now,
    updated_at: now,
    currency_code: 'INR',
    exchange_rate: 1,
  };
}

/** Stamp fields when a record is updated · before_state captured for diff viewer (OOB-11). */
export function stampUpdate(
  entityCode: string,
  recordType: string,
  recordId: string,
  recordLabel: string,
  before: Record<string, unknown>,
  after: Record<string, unknown> = {},
): UTHUpdateStamp {
  const u = getCurrentUser();
  const now = nowISO();
  logAudit({
    entityCode,
    action: 'update',
    entityType: toAuditEntityType(recordType),
    recordId,
    recordLabel,
    beforeState: before,
    afterState: after,
    sourceModule: recordType,
  });
  return {
    updated_by: u.id,
    updated_at: now,
  };
}

/** Stamp fields when a record transitions to posted · computes voucher_hash (OOB-12). */
export function stampPost(record: Record<string, unknown>): UTHPostStamp {
  const now = nowISO();
  return {
    posted_at: now,
    voucher_hash: computeVoucherHash({ ...record, posted_at: now }),
  };
}

/** Stamp fields when a record is cancelled · cancel_reason mandatory (Q6-a). */
export function stampCancel(
  record: Record<string, unknown>,
  cancelReason: string,
): UTHCancelStamp {
  void record;
  if (!cancelReason || cancelReason.trim().length < 10) {
    throw new Error('Cancellation reason must be at least 10 characters');
  }
  return {
    cancelled_at: nowISO(),
    cancel_reason: cancelReason.trim(),
  };
}
