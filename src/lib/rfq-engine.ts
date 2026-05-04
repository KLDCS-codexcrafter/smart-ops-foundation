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

// ============================================================
// Sprint T-Phase-1.2.6f-d-2 · Block E · per D-300 (Q6=A smart threshold · 3 triggers)
// NEW function added · existing rfq-engine functions UNCHANGED.
// Pure read-only computation · no writes · no side effects.
// ============================================================

export type PreCloseReason =
  | 'deadline_passed_with_quotes'   // Trigger 1: deadline AND ≥1 quote received
  | 'majority_quoted_early'         // Trigger 2: 75%-elapsed AND ≥1 quote
  | 'deadline_passed_low_response'  // Trigger 3: deadline AND 0 quotes (forced timeout)
  | 'not_eligible';

export interface PreCloseRecommendation {
  rfq_id: string;
  rfq_no: string;
  should_pre_close: boolean;
  reason: PreCloseReason;
  reason_text: string;
  vendors_invited: number;
  vendors_quoted: number;
  vendors_missing: string[];
  partial_response_count: number;
  timeout_at: string | null;
  pct_elapsed: number;
  recommended_action: string;
}

/**
 * Compute pre-close recommendation for an RFQ.
 *
 * Smart threshold logic (Q6=A · 3 triggers):
 *  1. Deadline passed AND ≥1 quote received  → pre-close (don't wait for laggards)
 *  2. 75%+ of timeout elapsed AND ≥1 quote   → early pre-close possible
 *  3. Deadline passed AND 0 quotes received  → forced pre-close (timeout / re-RFQ)
 *
 * Eligibility: only active sourcing states
 * (sent · received_by_vendor · opened · partial_quoted).
 * RFQs already awarded / cancelled / timeout / declined / quoted return not_eligible.
 *
 * Returns null if the RFQ id is unknown.
 */
export function computePreCloseRecommendation(
  rfqId: string,
  entityCode: string,
): PreCloseRecommendation | null {
  const rfq = getRfq(rfqId, entityCode);
  if (!rfq) return null;

  const activeStates: RFQStatus[] = ['sent', 'received_by_vendor', 'opened', 'partial_quoted'];
  if (!activeStates.includes(rfq.status)) {
    return buildResponse(rfq, false, 'not_eligible',
      `RFQ status "${rfq.status}" is not in active sourcing state.`,
      0, 'No action required.', 0);
  }

  const quotes = getQuotationsByRfq(rfqId, entityCode);
  const vendorsQuoted = quotes.length;

  const now = Date.now();
  const sentAt = rfq.sent_at ? new Date(rfq.sent_at).getTime() : null;
  const timeoutAt = rfq.timeout_at ? new Date(rfq.timeout_at).getTime() : null;
  let pctElapsed = 0;
  if (sentAt !== null && timeoutAt !== null && timeoutAt > sentAt) {
    pctElapsed = Math.max(0, Math.min(100, ((now - sentAt) / (timeoutAt - sentAt)) * 100));
  }
  const deadlinePassed = timeoutAt !== null && now > timeoutAt;

  // Trigger 1 · deadline passed AND ≥1 quote
  if (deadlinePassed && vendorsQuoted >= 1) {
    return buildResponse(rfq, true, 'deadline_passed_with_quotes',
      `Deadline passed · ${vendorsQuoted} quote(s) received · pre-close to award without further delay.`,
      vendorsQuoted,
      'Pre-close RFQ and proceed to comparison/award.',
      pctElapsed);
  }

  // Trigger 3 · deadline passed AND 0 quotes (check before Trigger 2 since deadline is decisive)
  if (deadlinePassed && vendorsQuoted === 0) {
    return buildResponse(rfq, true, 'deadline_passed_low_response',
      'Deadline passed · no quotes received · forced pre-close (timeout · trigger fallback or re-RFQ).',
      0,
      'Pre-close as timeout · trigger auto_fallback or create new RFQ to alternate vendor.',
      pctElapsed);
  }

  // Trigger 2 · 75%+ elapsed AND quote received
  if (pctElapsed >= 75 && vendorsQuoted >= 1) {
    return buildResponse(rfq, true, 'majority_quoted_early',
      `${pctElapsed.toFixed(0)}% of timeout window elapsed · ${vendorsQuoted} quote(s) received · early pre-close possible.`,
      vendorsQuoted,
      'Consider pre-closing if quote is competitive · saves wait time.',
      pctElapsed);
  }

  // Not eligible
  return buildResponse(rfq, false, 'not_eligible',
    `RFQ within timeout window (${pctElapsed.toFixed(0)}% elapsed) · ${vendorsQuoted} quote(s) received.`,
    vendorsQuoted,
    'Continue waiting for quotes.',
    pctElapsed);
}

function buildResponse(
  rfq: RFQ,
  shouldPreClose: boolean,
  reason: PreCloseReason,
  reasonText: string,
  partialCount: number,
  recommendedAction: string,
  pctElapsed: number,
): PreCloseRecommendation {
  return {
    rfq_id: rfq.id,
    rfq_no: rfq.rfq_no,
    should_pre_close: shouldPreClose,
    reason,
    reason_text: reasonText,
    vendors_invited: 1,
    vendors_quoted: partialCount,
    vendors_missing: shouldPreClose && partialCount === 0 ? [rfq.vendor_name] : [],
    partial_response_count: partialCount,
    timeout_at: rfq.timeout_at,
    pct_elapsed: Math.round(pctElapsed * 10) / 10,
    recommended_action: recommendedAction,
  };
}

