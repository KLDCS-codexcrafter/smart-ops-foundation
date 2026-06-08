/**
 * communication-engine.ts — Sprint B2 · T-B2-Comm-Outbox · sole engine credit
 *
 * @realizes B.2 · outbox + dual/triple sender + class-aware honest delivery
 *           PULSE-aligned (Wave-2: [PULSE] Relay drains queued_for_wave2 via
 *           SupabaseAdapter on India-resident backend · credentials AES-256-GCM
 *           server-side only) · Tally Alt+M parity.
 *
 * Iron rules enforced here:
 *   - NO password/credential/secret field anywhere (AC2).
 *   - Templates are CC-editable DATA rows · zero hardcoded message strings (AC6).
 *   - Department-class messages NEVER routed to mailto (would impersonate the
 *     dept id) — queued for Wave-2 + .eml fallback only.
 *   - PULSE alignment by SHAPE only — no PULSE imports (AC7).
 *
 * [JWT] Wave-2: PULSE Relay drains queued_for_wave2 messages.
 */

import { logAudit } from '@/lib/audit-trail-engine';
import { fyForDate } from '@/lib/fiscal-year-engine';
import type {
  SenderClass,
  DepartmentEmailRow,
  CompanyMailSettings,
  UserMailProfile,
  TemplateRow,
  OutboxMessage,
  ComposeDocumentInput,
  EnqueueEventInput,
} from '@/types/communication';
import {
  outboxKey,
  departmentEmailsKey,
  companyMailSettingsKey,
  userMailProfilesKey,
  templatesKey,
} from '@/types/communication';

// ─── Storage helpers ─────────────────────────────────────────────────────

function ls<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function lw(key: string, value: unknown): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── CC masters CRUD ─────────────────────────────────────────────────────

export function listDepartmentEmails(entityCode: string): DepartmentEmailRow[] {
  return ls<DepartmentEmailRow[]>(departmentEmailsKey(entityCode), []);
}
export function upsertDepartmentEmail(entityCode: string, row: Omit<DepartmentEmailRow, 'id'> & { id?: string }): DepartmentEmailRow {
  const list = listDepartmentEmails(entityCode);
  const id = row.id ?? newId('de');
  const next: DepartmentEmailRow = { ...row, id };
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = next; else list.push(next);
  lw(departmentEmailsKey(entityCode), list);
  try { logAudit({ action: row.id ? 'update' : 'create', recordType: 'comm_department_email' as never, recordId: id, entityId: entityCode, performedBy: 'system', details: { card_id: next.card_id } }); } catch { /* swallow */ }
  return next;
}
export function deleteDepartmentEmail(entityCode: string, id: string): boolean {
  const list = listDepartmentEmails(entityCode);
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  lw(departmentEmailsKey(entityCode), next);
  try { logAudit({ action: 'delete', recordType: 'comm_department_email' as never, recordId: id, entityId: entityCode, performedBy: 'system', details: {} }); } catch { /* swallow */ }
  return true;
}

export function listTemplates(entityCode: string): TemplateRow[] {
  const stored = ls<TemplateRow[]>(templatesKey(entityCode), []);
  if (stored.length > 0) return stored;
  // Seed Matrix/§3 defaults · CC-editable · DATA rows only · no hardcoded message strings in business code.
  const seed: TemplateRow[] = [
    { id: 'tpl-inv-memo',     object_type: 'invoice-memo',       channel: 'email', subject_tpl: 'Invoice {{doc_no}} from {{entity_name}}', body_tpl: 'Dear {{recipient_name}},\n\nPlease find attached invoice {{doc_no}} dated {{doc_date}} for {{amount}}.\n\nRegards,\n{{signature}}', lang: 'en', sender_class_default: 'user', active: true },
    { id: 'tpl-po',           object_type: 'po',                  channel: 'email', subject_tpl: 'Purchase Order {{doc_no}}', body_tpl: 'Dear {{recipient_name}},\n\nPlease confirm PO {{doc_no}} dated {{doc_date}}.\n\nRegards,\n{{signature}}', lang: 'en', sender_class_default: 'user', active: true },
    { id: 'tpl-delivery',     object_type: 'delivery-memo',       channel: 'email', subject_tpl: 'Delivery Memo {{doc_no}}', body_tpl: 'Dear {{recipient_name}},\n\nDelivery memo {{doc_no}} attached.\n\n{{signature}}', lang: 'en', sender_class_default: 'user', active: true },
    { id: 'tpl-payment-advice', object_type: 'payment-advice',    channel: 'email', subject_tpl: 'Payment Advice {{doc_no}}', body_tpl: 'Dear {{recipient_name}},\n\nPayment advice {{doc_no}} for {{amount}} attached.\n\n{{signature}}', lang: 'en', sender_class_default: 'department', department_card_id: 'payout', active: true },
    { id: 'tpl-grn',          object_type: 'grn',                 channel: 'email', subject_tpl: 'GRN {{doc_no}} Acknowledgement', body_tpl: 'Dear {{recipient_name}},\n\nGRN {{doc_no}} recorded.\n\n{{signature}}', lang: 'en', sender_class_default: 'user', active: true },
    { id: 'tpl-rfq',          object_type: 'rfq',                 channel: 'email', subject_tpl: 'RFQ {{doc_no}} — Quote requested', body_tpl: 'Dear {{recipient_name}},\n\nPlease quote against RFQ {{doc_no}}.\n\n{{signature}}', lang: 'en', sender_class_default: 'user', active: true },
    { id: 'tpl-approval',     object_type: 'approval.pending',    channel: 'email', subject_tpl: 'Approval pending: {{title}}', body_tpl: 'Hi {{recipient_name}},\n\n{{body}}\n\nOpen: {{deep_link}}\n\n— Operix', lang: 'en', sender_class_default: 'system', active: true },
    { id: 'tpl-reminders',    object_type: 'digest.my_reminders', channel: 'email', subject_tpl: 'Your reminders: {{count}} need attention', body_tpl: 'Hi {{recipient_name}},\n\n{{body}}\n\n— Operix', lang: 'en', sender_class_default: 'system', active: true },
  ];
  lw(templatesKey(entityCode), seed);
  return seed;
}
export function upsertTemplate(entityCode: string, row: Omit<TemplateRow, 'id'> & { id?: string }): TemplateRow {
  const list = listTemplates(entityCode);
  const id = row.id ?? newId('tpl');
  const next: TemplateRow = { ...row, id };
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = next; else list.push(next);
  lw(templatesKey(entityCode), list);
  try { logAudit({ action: row.id ? 'update' : 'create', recordType: 'comm_template' as never, recordId: id, entityId: entityCode, performedBy: 'system', details: { object_type: next.object_type } }); } catch { /* swallow */ }
  return next;
}

export function getCompanyMailSettings(entityCode: string): CompanyMailSettings {
  return ls<CompanyMailSettings>(companyMailSettingsKey(entityCode), {
    use_ssl: true, ssl_std_port: 465, from_name: 'Operix', default_format: 'pdf',
    credentials_state: 'not_configured',
  });
}
export function saveCompanyMailSettings(entityCode: string, s: CompanyMailSettings): CompanyMailSettings {
  // Defensive strip — refuse any password-like key if it ever appears at runtime.
  const allowed: CompanyMailSettings = {
    server_label: s.server_label,
    server_address: s.server_address,
    use_ssl: !!s.use_ssl,
    ssl_std_port: s.ssl_std_port,
    from_name: s.from_name,
    default_format: 'pdf',
    credentials_state: s.credentials_state === 'configured_at_wave2' ? 'configured_at_wave2' : 'not_configured',
  };
  lw(companyMailSettingsKey(entityCode), allowed);
  try { logAudit({ action: 'update', recordType: 'comm_mail_settings' as never, recordId: 'singleton', entityId: entityCode, performedBy: 'system', details: { credentials_state: allowed.credentials_state } }); } catch { /* swallow */ }
  return allowed;
}

export function listUserMailProfiles(entityCode: string): UserMailProfile[] {
  return ls<UserMailProfile[]>(userMailProfilesKey(entityCode), []);
}
export function upsertUserMailProfile(entityCode: string, p: UserMailProfile): UserMailProfile {
  const list = listUserMailProfiles(entityCode);
  const idx = list.findIndex((x) => x.user_name === p.user_name);
  if (idx >= 0) list[idx] = p; else list.push(p);
  lw(userMailProfilesKey(entityCode), list);
  try { logAudit({ action: idx >= 0 ? 'update' : 'create', recordType: 'comm_user_profile' as never, recordId: p.user_name, entityId: entityCode, performedBy: 'system', details: {} }); } catch { /* swallow */ }
  return p;
}

// ─── Template rendering with merge fields + signature ────────────────────

function applyMerge(tpl: string, data: Record<string, string | number | undefined | null>): string {
  return tpl.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_m, key: string) => {
    const v = data[key];
    return v == null ? '' : String(v);
  });
}

export function renderTemplate(
  objectType: string,
  mergeData: Record<string, string | number | undefined | null>,
  entityCode: string,
  senderClass?: SenderClass,
  currentUserName?: string,
): { subject: string; body_html: string; template?: TemplateRow } {
  const templates = listTemplates(entityCode).filter((t) => t.active && t.object_type === objectType);
  const tpl = templates[0];
  if (!tpl) return { subject: '', body_html: '' };

  let signature = '';
  const cls = senderClass ?? tpl.sender_class_default;
  if (cls === 'user' && currentUserName) {
    const prof = listUserMailProfiles(entityCode).find((p) => p.user_name === currentUserName);
    signature = prof?.signature_html ?? '';
  } else if (cls === 'department' && tpl.department_card_id) {
    const dept = listDepartmentEmails(entityCode).find((d) => d.active && d.card_id === tpl.department_card_id);
    signature = dept?.signature_html ?? '';
  } else {
    signature = '';
  }

  const merged = { ...mergeData, signature };
  return { subject: applyMerge(tpl.subject_tpl, merged), body_html: applyMerge(tpl.body_tpl, merged), template: tpl };
}

// ─── Sender resolution ──────────────────────────────────────────────────

export function resolveSender(
  objectType: string,
  currentUserName: string,
  entityCode: string,
): { sender_class: SenderClass; from_resolved: string } {
  const tpls = listTemplates(entityCode).filter((t) => t.active && t.object_type === objectType);
  const tpl = tpls[0];
  const cls: SenderClass = tpl?.sender_class_default ?? 'user';
  if (cls === 'user') {
    const prof = listUserMailProfiles(entityCode).find((p) => p.user_name === currentUserName);
    return { sender_class: 'user', from_resolved: prof?.email_id ?? '' };
  }
  if (cls === 'department' && tpl?.department_card_id) {
    const dept = listDepartmentEmails(entityCode).find((d) => d.active && d.card_id === tpl.department_card_id);
    return { sender_class: 'department', from_resolved: dept?.email_id ?? '' };
  }
  const settings = getCompanyMailSettings(entityCode);
  return { sender_class: 'system', from_resolved: `noreply@${settings.server_address ?? 'operix.local'}` };
}

// ─── Recipient resolution (READ-ONLY from party masters) ────────────────

interface PartyLike { id?: string; email?: string; contacts?: Array<{ email?: string; isPrimary?: boolean }>; }

function readPartyEmails(entityCode: string, storeKey: string, partyId?: string): string[] {
  if (!partyId) return [];
  try {
    const raw = localStorage.getItem(storeKey);
    if (!raw) return [];
    const list = JSON.parse(raw) as PartyLike[];
    const hit = list.find((p) => p.id === partyId);
    if (!hit) return [];
    const out: string[] = [];
    if (hit.email) out.push(hit.email);
    if (Array.isArray(hit.contacts)) {
      const primary = hit.contacts.find((c) => c.isPrimary && c.email);
      if (primary?.email) out.unshift(primary.email);
      for (const c of hit.contacts) if (c.email && !out.includes(c.email)) out.push(c.email);
    }
    return out;
  } catch { return []; }
  // entityCode parameter retained for future per-entity party store · currently legacy global keys.
  void entityCode;
}

export function resolveRecipients(
  objectType: string,
  sourceRecord: Record<string, unknown>,
  entityCode: string,
): string[] {
  const partyId = (sourceRecord.party_id ?? sourceRecord.partyId ?? sourceRecord.vendor_id ?? sourceRecord.customer_id ?? sourceRecord.transporter_id) as string | undefined;
  // try both legacy stores · honest empty when nothing found
  const fromVendor = readPartyEmails(entityCode, 'erp_group_vendor_master', partyId);
  if (fromVendor.length > 0) return fromVendor;
  const fromCustomer = readPartyEmails(entityCode, 'erp_group_customer_master', partyId);
  if (fromCustomer.length > 0) return fromCustomer;
  void objectType;
  return [];
}

// ─── Compose / build .eml / build mailto ───────────────────────────────

export function composeFromDocument(input: ComposeDocumentInput): OutboxMessage {
  const { subject, body_html } = renderTemplate(input.objectType, input.mergeData, input.entityCode, undefined, input.currentUserName);
  const sender = resolveSender(input.objectType, input.currentUserName, input.entityCode);
  const to = input.overrideRecipients && input.overrideRecipients.length > 0
    ? input.overrideRecipients
    : resolveRecipients(input.objectType, input.sourceRecord, input.entityCode);

  const msg: OutboxMessage = {
    id: newId('out'),
    entity_id: input.entityCode,
    fiscal_year_id: input.fiscalYearId,
    object_type: input.objectType,
    source_card: input.sourceCard,
    source_record_id: (input.sourceRecord.id as string | undefined) ?? undefined,
    sender_class: sender.sender_class,
    from_resolved: sender.from_resolved,
    to_resolved: to,
    subject,
    body_html,
    attachment_name: input.attachment?.name,
    attachment_b64: input.attachment?.base64,
    delivery_mode: 'queued_for_wave2',
    status: 'composed',
    created_by: input.currentUserName,
    retention_policy: 'operational_log_only',
    created_at: new Date().toISOString(),
  };
  return msg;
}

/** RFC-822 .eml with embedded base64 MIME attachment (Tier-L). */
export function buildEml(message: OutboxMessage): string {
  const boundary = `=_op_${Date.now().toString(36)}`;
  const headers: string[] = [
    `From: ${message.from_resolved}`,
    `To: ${message.to_resolved.join(', ')}`,
    `Subject: ${message.subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
  ];
  const bodyPart = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 7bit',
    '',
    message.body_html,
    '',
  ];
  const attPart: string[] = [];
  if (message.attachment_b64 && message.attachment_name) {
    // Wrap base64 to 76-char lines per RFC 2045.
    const wrapped = message.attachment_b64.replace(/(.{76})/g, '$1\r\n');
    attPart.push(
      `--${boundary}`,
      `Content-Type: application/pdf; name="${message.attachment_name}"`,
      'Content-Transfer-Encoding: base64',
      `Content-Disposition: attachment; filename="${message.attachment_name}"`,
      '',
      wrapped,
      '',
    );
  }
  attPart.push(`--${boundary}--`, '');
  return [...headers, ...bodyPart, ...attPart].join('\r\n');
}

/** mailto: URL — note that mailto cannot carry attachments (honest disclosure). */
export function buildMailto(message: OutboxMessage): string {
  const to = encodeURIComponent(message.to_resolved.join(','));
  const subject = encodeURIComponent(message.subject);
  const note = message.attachment_name
    ? `\n\n(Please attach the downloaded file "${message.attachment_name}" — mailto cannot carry attachments.)`
    : '';
  const body = encodeURIComponent(message.body_html + note);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

// ─── Dispatch — class-aware honest delivery ─────────────────────────────

export interface DispatchResult {
  ok: true;
  message: OutboxMessage;
  mailto?: string;     // user-class only · their client = their identity
  eml?: string;        // any class · manual fallback with embedded attachment
}

export function dispatch(entityCode: string, message: OutboxMessage): DispatchResult {
  let next: OutboxMessage;
  let mailto: string | undefined;
  const eml = buildEml(message);

  if (message.sender_class === 'user') {
    next = { ...message, delivery_mode: 'sent_via_user_client', status: 'handed_off' };
    mailto = buildMailto(message);
  } else {
    // department / system — NEVER mailto (mailto would impersonate the dept id).
    next = { ...message, delivery_mode: 'queued_for_wave2', status: 'queued' };
  }

  // Persist to outbox log.
  const log = ls<OutboxMessage[]>(outboxKey(entityCode), []);
  log.unshift(next);
  // Bounded log (institutional pattern).
  lw(outboxKey(entityCode), log.slice(0, 500));

  try {
    logAudit({
      action: 'create' as never,
      recordType: 'outbox_message' as never,
      recordId: next.id,
      entityId: entityCode,
      performedBy: next.created_by ?? 'system',
      details: { delivery_mode: next.delivery_mode, sender_class: next.sender_class, object_type: next.object_type },
    });
  } catch { /* swallow */ }

  return { ok: true, message: next, mailto, eml };
}

export function listOutbox(entityCode: string): OutboxMessage[] {
  return ls<OutboxMessage[]>(outboxKey(entityCode), []);
}

// ─── First-customer hook (approval-rail · my-reminders) ─────────────────

export function enqueueFromEvent(input: EnqueueEventInput): OutboxMessage | null {
  try {
    const profile = listUserMailProfiles(input.entityCode).find((p) => p.user_name === input.recipientUserName);
    const to = profile?.email_id;
    if (!to) return null; // honest empty · no fabrication
    const fyId = fyForDate(new Date().toISOString().slice(0, 10), input.entityCode)?.id ?? 'FY-UNRESOLVED';
    const { subject, body_html } = renderTemplate(input.objectType, { ...input.mergeData, recipient_name: input.recipientUserName }, input.entityCode);
    if (!subject && !body_html) return null;
    const settings = getCompanyMailSettings(input.entityCode);
    const message: OutboxMessage = {
      id: newId('out'),
      entity_id: input.entityCode,
      fiscal_year_id: fyId,
      object_type: input.objectType,
      source_card: input.sourceCard,
      source_record_id: input.sourceRecordId,
      sender_class: 'system',
      from_resolved: `noreply@${settings.server_address ?? 'operix.local'}`,
      to_resolved: [to],
      subject,
      body_html,
      delivery_mode: 'queued_for_wave2',
      status: 'queued',
      created_by: 'system',
      retention_policy: 'operational_log_only',
      created_at: new Date().toISOString(),
    };
    const log = ls<OutboxMessage[]>(outboxKey(input.entityCode), []);
    log.unshift(message);
    lw(outboxKey(input.entityCode), log.slice(0, 500));
    try { logAudit({ action: 'create' as never, recordType: 'outbox_message' as never, recordId: message.id, entityId: input.entityCode, performedBy: 'system', details: { object_type: message.object_type, sender_class: 'system' } }); } catch { /* swallow */ }
    return message;
  } catch {
    return null;
  }
}
