/**
 * rfq-engine.ts — RFQ lifecycle management
 * Sprint T-Phase-1.2.6f-a · per D-256 auto-fallback
 * [JWT] POST/GET /api/procure360/rfqs
 */
import { rfqsKey, type RFQ, type RFQSendChannel, type RFQStatus } from '@/types/rfq';
import { generateRFQTokenUrl, notifyVendorRFQ, type VendorNotifyTarget } from './vendor-rfq-notify';
import { appendAuditEntry } from './audit-trail-hash-chain';
import { publishProcurementPulse } from './procurement-pulse-stub';
import { getQuotationsByRfq } from './vendor-quotation-engine';

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function readRfqs(entityCode: string): RFQ[] {
  // [JWT] GET /api/procure360/rfqs
  try {
    const raw = localStorage.getItem(rfqsKey(entityCode));
    return raw ? (JSON.parse(raw) as RFQ[]) : [];
  } catch {
    return [];
  }
}

function writeRfqs(entityCode: string, list: RFQ[]): void {
  // [JWT] PUT /api/procure360/rfqs
  try {
    localStorage.setItem(rfqsKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

export function listRfqs(entityCode: string): RFQ[] {
  return readRfqs(entityCode);
}

export function getRfq(id: string, entityCode: string): RFQ | null {
  return readRfqs(entityCode).find((r) => r.id === id) ?? null;
}

function nextRfqNo(existing: RFQ[]): string {
  const ym = new Date().toISOString().slice(0, 7).replace('-', '');
  return `RFQ/${ym}/${String(existing.length + 1).padStart(4, '0')}`;
}

export interface CreateRfqInput {
  parent_enquiry_id: string;
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  line_item_ids: string[];
  send_channels: RFQSendChannel[];
  primary_channel: RFQSendChannel;
  auto_fallback_enabled?: boolean;
  timeout_days?: number;
}

export function createRfq(input: CreateRfqInput, entityCode: string): RFQ {
  const list = readRfqs(entityCode);
  const now = new Date().toISOString();
  const id = newId('rfq');
  const rfq: RFQ = {
    id,
    rfq_no: nextRfqNo(list),
    parent_enquiry_id: input.parent_enquiry_id,
    entity_id: input.entity_id,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    line_item_ids: input.line_item_ids,
    send_channels: input.send_channels,
    primary_channel: input.primary_channel,
    token_url: generateRFQTokenUrl(id, entityCode),
    token_expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    sent_at: null,
    received_by_vendor_at: null,
    opened_at: null,
    responded_at: null,
    auto_fallback_enabled: input.auto_fallback_enabled ?? true,
    timeout_days: input.timeout_days ?? 7,
    timeout_at: null,
    fallback_to_vendor_id: null,
    fallback_triggered_at: null,
    fallback_reason: null,
    declined_at: null,
    decline_reason: null,
    vendor_quotation_id: null,
    follow_ups: [],
    next_followup_due: null,
    followup_count_originating: 0,
    followup_count_purchase: 0,
    last_followup_at: null,
    is_overdue_followup: false,
    status: 'draft',
    created_at: now,
    updated_at: now,
  };
  writeRfqs(entityCode, [rfq, ...list]);
  return rfq;
}

export function updateRfq(id: string, partial: Partial<RFQ>, entityCode: string): RFQ | null {
  const list = readRfqs(entityCode);
  const idx = list.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const next = { ...list[idx], ...partial, updated_at: new Date().toISOString() };
  list[idx] = next;
  writeRfqs(entityCode, list);
  return next;
}

export function transitionRfq(id: string, status: RFQStatus, entityCode: string): RFQ | null {
  return updateRfq(id, { status }, entityCode);
}

export async function sendRfq(
  id: string,
  vendor: VendorNotifyTarget,
  channels: RFQSendChannel[],
  entityCode: string,
  actorUserId: string = 'system',
): Promise<RFQ | null> {
  const rfq = getRfq(id, entityCode);
  if (!rfq) return null;
  await notifyVendorRFQ(rfq, vendor, channels, entityCode);
  const now = new Date().toISOString();
  const result = updateRfq(
    id,
    {
      status: 'sent',
      sent_at: now,
      timeout_at: new Date(Date.now() + rfq.timeout_days * 86400000).toISOString(),
    },
    entityCode,
  );
  if (result) {
    // FIX-1 · D-247 hash chain · D-262 fire-and-forget
    void appendAuditEntry({
      entityCode,
      entityId: result.entity_id,
      voucherId: result.id,
      voucherKind: 'rfq',
      action: 'rfq.sent',
      actorUserId,
      payload: { rfq_no: result.rfq_no, vendor_id: result.vendor_id, channels },
    }).catch(() => { /* best-effort · forensic chain */ });
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'info',
      message: `RFQ ${result.rfq_no} sent to ${vendor.name}`,
    });
  }
  return result;
}

export function captureQuotation(
  id: string,
  vendorQuotationId: string,
  entityCode: string,
  actorUserId: string = 'system',
): RFQ | null {
  const result = updateRfq(
    id,
    { status: 'quoted', vendor_quotation_id: vendorQuotationId, responded_at: new Date().toISOString() },
    entityCode,
  );
  if (result) {
    // FIX-1 · D-247 hash chain · D-262 fire-and-forget
    void appendAuditEntry({
      entityCode,
      entityId: result.entity_id,
      voucherId: result.id,
      voucherKind: 'rfq',
      action: 'rfq.quoted',
      actorUserId,
      payload: { vendor_quotation_id: vendorQuotationId },
    }).catch(() => { /* best-effort · forensic chain */ });
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'info',
      message: `Quotation captured for RFQ ${result.rfq_no}`,
    });
  }
  return result;
}

export function declineRfq(
  id: string,
  reason: string,
  entityCode: string,
  actorUserId: string = 'system',
): RFQ | null {
  const result = updateRfq(
    id,
    { status: 'declined', declined_at: new Date().toISOString(), decline_reason: reason },
    entityCode,
  );
  if (result) {
    // FIX-1 · D-247 hash chain · D-262 fire-and-forget
    void appendAuditEntry({
      entityCode,
      entityId: result.entity_id,
      voucherId: result.id,
      voucherKind: 'rfq',
      action: 'rfq.declined',
      actorUserId,
      payload: { reason },
    }).catch(() => { /* best-effort · forensic chain */ });
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'warning',
      message: `RFQ ${result.rfq_no} declined by vendor · ${reason}`,
    });
  }
  return result;
}

export function timeoutRfq(id: string, entityCode: string): RFQ | null {
  const result = updateRfq(id, { status: 'timeout' }, entityCode);
  if (result) {
    // FIX-3 · D-248 procurement-pulse emit
    publishProcurementPulse({
      severity: 'warning',
      message: `RFQ ${result.rfq_no} timeout · auto-fallback ${result.fallback_triggered_at ? 'triggered' : 'skipped'}`,
    });
  }
  return result;
}

export function checkOverdueRfqs(entityCode: string): RFQ[] {
  const now = Date.now();
  return readRfqs(entityCode).filter(
    (r) => r.status === 'sent' && r.timeout_at && new Date(r.timeout_at).getTime() < now,
  );
}
