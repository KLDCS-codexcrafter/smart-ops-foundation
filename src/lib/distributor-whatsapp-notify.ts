/**
 * distributor-whatsapp-notify.ts — Notify distributors on key events.
 * Sprint 10. Reuses Sprint 6A MAS WhatsApp infrastructure.
 * [JWT] POST /api/mas/whatsapp/send
 *
 * Best-effort: never throws. Always appends to the CommunicationLog so that
 * the Bridge / MAS audit screens can surface the outbound message even if the
 * provider is not configured.
 */
import type { Voucher } from '@/types/voucher';

interface DistributorRef {
  id: string;
  name: string;
  phone: string;
}

interface CommunicationLogEntry {
  id: string;
  entity_id: string;
  party_id: string;
  party_name: string;
  channel: 'whatsapp' | 'email' | 'sms';
  direction: 'outbound' | 'inbound';
  subject: string;
  body: string;
  ref_voucher_no?: string;
  wa_fallback_url?: string;
  sent_at: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
}

function appendLog(entityCode: string, entry: CommunicationLogEntry): void {
  try {
    const logKey = `erp_communication_log_${entityCode}`;
    // [JWT] GET /api/comm/log
    const raw = localStorage.getItem(logKey);
    const log: CommunicationLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    // [JWT] POST /api/comm/log
    localStorage.setItem(logKey, JSON.stringify(log));
  } catch {
    /* noop — best-effort */
  }
}

/**
 * Notify a distributor that a sales invoice has been posted.
 * Emits an entry to CommunicationLog with the wa.me deep link.
 */
export function notifyDistributorInvoicePosted(
  entityCode: string,
  distributor: DistributorRef,
  voucher: Voucher,
  portalLink: string,
): void {
  const amount = (voucher.net_amount ?? 0).toLocaleString('en-IN');
  const msg =
    `Hi ${distributor.name}, new invoice ${voucher.voucher_no} for INR ${amount} is ready.\n\n` +
    `View + Pay: ${portalLink}`;
  const phone = distributor.phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;

  try {
    // [JWT] POST /api/mas/whatsapp/send — uses Sprint 6A MAS if configured
    const masRaw = localStorage.getItem(`erp_receivx_config_${entityCode}`);
    const masConfig = masRaw ? (JSON.parse(masRaw) as { wa_provider?: string; wa_api_endpoint?: string }) : null;
    if (masConfig?.wa_provider === 'message_auto_sender' && masConfig.wa_api_endpoint) {
      // Real MAS provider call would fire here; stubbed for Sprint 10.
    }
  } catch {
    /* noop */
  }

  appendLog(entityCode, {
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    party_id: distributor.id,
    party_name: distributor.name,
    channel: 'whatsapp',
    direction: 'outbound',
    subject: `Invoice ${voucher.voucher_no}`,
    body: msg,
    ref_voucher_no: voucher.voucher_no,
    wa_fallback_url: waUrl,
    sent_at: new Date().toISOString(),
    status: 'queued',
  });
}

/**
 * Notify a distributor of a broadcast (bulk message).
 */
export function notifyDistributorBroadcast(
  entityCode: string,
  distributor: DistributorRef,
  subject: string,
  body: string,
): void {
  const phone = distributor.phone.replace(/\D/g, '');
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
  appendLog(entityCode, {
    id: `wa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity_id: entityCode,
    party_id: distributor.id,
    party_name: distributor.name,
    channel: 'whatsapp',
    direction: 'outbound',
    subject,
    body,
    wa_fallback_url: waUrl,
    sent_at: new Date().toISOString(),
    status: 'queued',
  });
}
