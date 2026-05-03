/**
 * vendor-rfq-notify.ts — Notify vendors on RFQ events
 * Sprint T-Phase-1.2.6f-a · mirrors distributor-whatsapp-notify pattern
 * Per D-254: per-vendor channel preference
 * Per D-255: token-based public form URL (STUB)
 * [JWT] POST /api/mas/whatsapp/send · POST /api/mas/email/send
 */
import type { RFQ, RFQSendChannel } from '@/types/rfq';

export interface CommunicationLogEntry {
  id: string;
  entity_id: string;
  party_id: string;
  party_name: string;
  channel: RFQSendChannel | 'sms';
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  ref_rfq_no?: string;
  wa_fallback_url?: string;
  token_url?: string;
  sent_at: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'failed';
}

export const communicationLogKey = (entityCode: string): string =>
  `erp_communication_log_${entityCode}`;

export interface VendorNotifyTarget {
  id: string;
  name: string;
  contact_email?: string;
  contact_mobile?: string;
}

function readLog(entityCode: string): CommunicationLogEntry[] {
  // [JWT] GET /api/mas/communication-log
  try {
    const raw = localStorage.getItem(communicationLogKey(entityCode));
    return raw ? (JSON.parse(raw) as CommunicationLogEntry[]) : [];
  } catch {
    return [];
  }
}

function appendLog(entityCode: string, entries: CommunicationLogEntry[]): void {
  // [JWT] POST /api/mas/communication-log
  try {
    const all = readLog(entityCode);
    localStorage.setItem(
      communicationLogKey(entityCode),
      JSON.stringify([...entries, ...all]),
    );
  } catch {
    /* quota silent */
  }
}

export function generateRFQTokenUrl(rfqId: string, entityCode: string): string {
  const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/vendor-portal/rfq/${rfqId}?token=${token}&entity=${entityCode}`;
}

export async function notifyVendorRFQ(
  rfq: RFQ,
  vendor: VendorNotifyTarget,
  channels: RFQSendChannel[],
  entityCode: string,
): Promise<{ success: boolean; logged: CommunicationLogEntry[] }> {
  const tokenUrl = rfq.token_url ?? generateRFQTokenUrl(rfq.id, entityCode);
  const now = new Date().toISOString();
  const subject = `RFQ ${rfq.rfq_no} — Quotation requested`;
  const body =
    `Dear ${vendor.name},\n\nPlease submit your quotation for RFQ ${rfq.rfq_no}.\n` +
    `Submit via portal: ${tokenUrl}\n\nThank you.`;

  const logged: CommunicationLogEntry[] = channels.map((ch) => ({
    id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${ch}`,
    entity_id: entityCode,
    party_id: vendor.id,
    party_name: vendor.name,
    channel: ch,
    direction: 'outbound',
    subject,
    body,
    ref_rfq_no: rfq.rfq_no,
    token_url: tokenUrl,
    sent_at: now,
    status: 'queued',
  }));

  appendLog(entityCode, logged);
  // STUB: real provider wired in Phase 1.4
  return { success: true, logged };
}

export function getCommLogForRFQ(rfqId: string, entityCode: string): CommunicationLogEntry[] {
  // RFQ-no equality kept simple — sprint 3-a stores rfq_no
  return readLog(entityCode).filter((e) => e.ref_rfq_no && e.ref_rfq_no.includes(rfqId));
}
