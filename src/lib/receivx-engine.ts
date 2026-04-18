/**
 * receivx-engine.ts — Pure ReceivX helpers
 * No localStorage. No React. No toast.
 * Callers pass data in, get data out. Caller persists results.
 */
import type {
  OutstandingTask, CadenceStep, CommunicationLog,
  PTP, ReceivXConfig, AgeBucket,
} from '@/types/receivx';

/** Bucket for age in days */
export function bucketFor(ageDays: number): AgeBucket {
  if (ageDays <= 30) return '0-30';
  if (ageDays <= 60) return '31-60';
  if (ageDays <= 90) return '61-90';
  if (ageDays <= 180) return '91-180';
  return '180+';
}

/** Days between YYYY-MM-DD strings (b - a) */
function daysBetween(a: string, b: string): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  return Math.floor((db - da) / (1000 * 60 * 60 * 24));
}

/** Which cadence step fires today for a given due_date? */
export function computeCadenceStep(dueDate: string, today: string): CadenceStep | null {
  const diff = daysBetween(dueDate, today);
  if (diff === -3) return 'D-3';
  if (diff === 0) return 'D+0';
  if (diff === 7) return 'D+7';
  if (diff === 15) return 'D+15';
  if (diff === 30) return 'D+30';
  if (diff === 45) return 'D+45';
  if (diff === 60) return 'D+60';
  return null;
}

/** Interpolate {{var}} placeholders */
export function renderTemplate(body: string, vars: Record<string, string | number>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? '' : String(v);
  });
}

/** Send a WhatsApp message via Message Auto Sender. Falls back to wa.me. */
export async function sendWhatsApp(opts: {
  config: ReceivXConfig;
  task: OutstandingTask;
  toPhone: string;
  body: string;
  cadenceStep: CadenceStep | 'manual';
  sentByUser: string;
}): Promise<CommunicationLog> {
  const { config, task, toPhone, body, cadenceStep, sentByUser } = opts;
  const now = new Date().toISOString();
  const logBase: CommunicationLog = {
    id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: config.entity_id,
    task_id: task.id,
    party_id: task.party_id,
    party_name: task.party_name,
    voucher_no: task.voucher_no,
    channel: 'whatsapp',
    template_id: null,
    cadence_step: cadenceStep,
    direction: 'outbound',
    to_recipient: toPhone,
    subject: null,
    body,
    provider: config.wa_provider === 'message_auto_sender'
      ? 'message_auto_sender' : 'wa_me_link',
    provider_message_id: null,
    sent_at: null, delivered_at: null, read_at: null,
    opened_at: null, replied_at: null,
    failed_at: null, failed_reason: null,
    status: 'queued',
    sent_by_user: sentByUser,
    created_at: now,
    updated_at: now,
  };

  if (config.wa_provider === 'wa_me_fallback' || !config.wa_api_key) {
    const digits = toPhone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { ...logBase, provider: 'wa_me_link', status: 'sent', sent_at: now };
  }

  try {
    // [JWT] POST to Message Auto Sender; auth by apiKey
    const resp = await fetch(config.wa_api_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.wa_api_key}`,
      },
      body: JSON.stringify({
        to: toPhone,
        type: 'text',
        text: { body },
        from: config.wa_default_sender,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      return {
        ...logBase, status: 'failed', failed_at: now,
        failed_reason: data?.error || `HTTP ${resp.status}`,
      };
    }
    return {
      ...logBase,
      provider_message_id: data.message_id ?? data.id ?? null,
      status: 'sent',
      sent_at: now,
    };
  } catch (err) {
    return {
      ...logBase, status: 'failed', failed_at: now,
      failed_reason: (err as Error).message,
    };
  }
}

/** Send an email via SMTP or mailto fallback; appends pixel in SMTP mode. */
export async function sendEmail(opts: {
  config: ReceivXConfig;
  task: OutstandingTask;
  toEmail: string;
  subject: string;
  body: string;
  cadenceStep: CadenceStep | 'manual';
  sentByUser: string;
}): Promise<CommunicationLog> {
  const { config, task, toEmail, subject, body, cadenceStep, sentByUser } = opts;
  const now = new Date().toISOString();
  const msgId = `cl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pixel = config.email_pixel_endpoint
    ? `<img src="${config.email_pixel_endpoint}/${msgId}.png" width="1" height="1" alt="" />`
    : '';
  const fullBody = body + (config.email_provider === 'smtp' ? `\n${pixel}` : '');

  const logBase: CommunicationLog = {
    id: msgId,
    entity_id: config.entity_id,
    task_id: task.id,
    party_id: task.party_id,
    party_name: task.party_name,
    voucher_no: task.voucher_no,
    channel: 'email',
    template_id: null,
    cadence_step: cadenceStep,
    direction: 'outbound',
    to_recipient: toEmail,
    subject,
    body: fullBody,
    provider: config.email_provider === 'smtp' ? 'smtp' : 'mailto_link',
    provider_message_id: null,
    sent_at: null, delivered_at: null, read_at: null,
    opened_at: null, replied_at: null,
    failed_at: null, failed_reason: null,
    status: 'queued',
    sent_by_user: sentByUser,
    created_at: now,
    updated_at: now,
  };

  if (config.email_provider === 'mailto_fallback' || !config.email_smtp_host) {
    const url = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return { ...logBase, provider: 'mailto_link', status: 'sent', sent_at: now };
  }

  // [JWT] POST /api/receivx/send-email — SMTP relay through backend
  return { ...logBase, status: 'sent', sent_at: now };
}

/** Webhook handler: WhatsApp delivery status event */
export function markWhatsAppStatus(
  log: CommunicationLog,
  status: 'delivered' | 'read' | 'failed',
  timestamp: string,
  failReason?: string,
): CommunicationLog {
  if (status === 'delivered') return { ...log, status: 'delivered', delivered_at: timestamp, updated_at: timestamp };
  if (status === 'read')      return { ...log, status: 'read', read_at: timestamp, updated_at: timestamp };
  return { ...log, status: 'failed', failed_at: timestamp, failed_reason: failReason ?? null, updated_at: timestamp };
}

/** Webhook handler: email pixel hit */
export function markEmailOpened(log: CommunicationLog, openedAt: string): CommunicationLog {
  return { ...log, opened_at: openedAt, status: log.status === 'sent' ? 'read' : log.status, updated_at: openedAt };
}

/** Evaluate PTPs against receipts; flip kept / broken / partial */
export function evaluatePTPs(
  ptps: PTP[],
  receipts: Array<{ voucher_no: string; party_id: string; amount: number; date: string }>,
  today: string,
): PTP[] {
  return ptps.map(p => {
    if (p.status !== 'active') return p;
    const matching = receipts.filter(r =>
      r.party_id === p.party_id && r.date <= p.promised_date && r.date >= p.created_at.slice(0, 10),
    );
    const totalRecv = matching.reduce((s, r) => s + r.amount, 0);
    const lastReceipt = matching[matching.length - 1];
    if (totalRecv >= p.promised_amount) {
      return {
        ...p, status: 'kept',
        actual_amount: totalRecv,
        actual_receipt_voucher_no: lastReceipt?.voucher_no ?? null,
        actual_receipt_date: lastReceipt?.date ?? null,
        evaluation_date: today, updated_at: today,
      };
    }
    if (totalRecv > 0 && p.promised_date < today) {
      return {
        ...p, status: 'partial',
        actual_amount: totalRecv,
        actual_receipt_voucher_no: lastReceipt?.voucher_no ?? null,
        actual_receipt_date: lastReceipt?.date ?? null,
        evaluation_date: today, updated_at: today,
      };
    }
    if (p.promised_date < today) {
      return { ...p, status: 'broken', evaluation_date: today, updated_at: today };
    }
    return p;
  });
}

/** Days Sales Outstanding: (AR / total credit sales) * windowDays */
export function computeDSO(
  invoices: Array<{ date: string; amount: number }>,
  receipts: Array<{ date: string; amount: number }>,
  windowDays: number,
): number {
  const totalInv = invoices.reduce((s, i) => s + i.amount, 0);
  const totalRcv = receipts.reduce((s, r) => s + r.amount, 0);
  if (totalInv <= 0) return 0;
  const ar = Math.max(0, totalInv - totalRcv);
  return Math.round((ar / totalInv) * windowDays);
}

/** Promise-Kept ratio over a date range */
export function computePTPKeptRatio(
  ptps: PTP[],
  dateFrom: string,
  dateTo: string,
): { kept: number; broken: number; partial: number; pctKept: number } {
  const slice = ptps.filter(p => p.created_at >= dateFrom && p.created_at <= dateTo);
  const kept = slice.filter(p => p.status === 'kept').length;
  const broken = slice.filter(p => p.status === 'broken').length;
  const partial = slice.filter(p => p.status === 'partial').length;
  const total = kept + broken + partial;
  return { kept, broken, partial, pctKept: total > 0 ? Math.round((kept / total) * 100) : 0 };
}

/** Rebuild OutstandingTask list from erp_outstanding entries */
export function reconcileTasks(
  existingTasks: OutstandingTask[],
  outstanding: Array<{
    id: string; voucher_id: string; voucher_no: string; voucher_date: string;
    party_id: string; party_name: string; due_date: string;
    original_amount: number; pending_amount: number; status: string;
  }>,
  today: string,
  entityCode: string,
): OutstandingTask[] {
  const byOutstandingId = new Map(existingTasks.map(t => [t.outstanding_id, t]));
  const result: OutstandingTask[] = [];
  for (const o of outstanding) {
    if (o.status === 'settled' || o.status === 'cancelled') continue;
    const ageDays = Math.max(0, daysBetween(o.due_date, today));
    const existing = byOutstandingId.get(o.id);
    if (existing) {
      result.push({
        ...existing,
        pending_amount: o.pending_amount,
        age_days: ageDays,
        age_bucket: bucketFor(ageDays),
        updated_at: today,
      });
    } else {
      const now = new Date().toISOString();
      result.push({
        id: `tsk-${o.id}`,
        entity_id: entityCode,
        outstanding_id: o.id,
        voucher_id: o.voucher_id,
        voucher_no: o.voucher_no,
        voucher_date: o.voucher_date,
        due_date: o.due_date,
        party_id: o.party_id,
        party_name: o.party_name,
        original_amount: o.original_amount,
        pending_amount: o.pending_amount,
        age_days: ageDays,
        age_bucket: bucketFor(ageDays),
        assigned_salesman_id: null, assigned_salesman_name: null,
        assigned_agent_id: null, assigned_agent_name: null,
        assigned_broker_id: null, assigned_broker_name: null,
        assigned_telecaller_id: null, assigned_telecaller_name: null,
        assigned_collection_exec_id: null, assigned_collection_exec_name: null,
        status: 'open',
        next_action_date: null, next_action: null,
        last_contact_at: null, last_contact_channel: null,
        last_cadence_step: null,
        escalation_level: 0,
        active_ptp_id: null,
        disputed_reason: null,
        notes: '',
        created_at: now,
        updated_at: now,
      });
    }
  }
  return result;
}
