/**
 * whatsapp-channel-engine.ts — Sprint B3 · T-B3-WhatsApp-Channel · sole engine credit
 *
 * @realizes B.3 · WhatsApp channel via wa.me deep links
 *           PULSE BSP-aligned (Wave-2: [PULSE] Relay sends via WATI/Interakt/AiSensy
 *           with delivery receipts · BSP tokens AES-256-GCM server-side)
 *           reuses communication-engine.renderTemplate · NO BSP tokens client-side
 *
 * Iron rules:
 *   - NO BSP token / apikey / secret field ANYWHERE (AC2 grep = 0).
 *   - user-class WhatsApp → `wa.me` deep link (real today · user's own number = identity).
 *   - department / system-class → `queued_for_wave2` (NEVER wa.me · a personal number
 *     can't represent the dept · BSP send needs the backend).
 *   - phone normalization returns null on unparseable input — never fabricate (AC3).
 *   - WhatsApp templates are `channel:'whatsapp'` rows in the SAME CC Template Master.
 *   - PULSE BSP alignment by SHAPE only · NO PULSE imports.
 *   - Does NOT fork `distributor-whatsapp-notify.ts` (that file stays 0-DIFF).
 *
 * [JWT] Wave-2: PULSE Relay drains queued_for_wave2 WhatsApp messages via BSP API.
 */

import { logAudit } from '@/lib/audit-trail-engine';
import { readFiscalYears } from '@/lib/fiscal-year-engine';
import {
  listTemplates,
  listUserMailProfiles,
  listDepartmentEmails,
  getCompanyMailSettings,
  listOutbox,
} from '@/lib/communication-engine';
import type {
  OutboxMessage,
  SenderClass,
  EnqueueEventInput,
  TemplateRow,
} from '@/types/communication';
import { outboxKey } from '@/types/communication';

// ─── Constants ──────────────────────────────────────────────────────────

/** WhatsApp BSP norm — text messages capped at 1024 chars. */
export const WA_MAX_BODY_CHARS = 1024;

// ─── Helpers ────────────────────────────────────────────────────────────

function safeAudit(opts: {
  entityCode: string;
  action: 'create' | 'update' | 'cancel';
  recordId: string;
  recordLabel: string;
}): void {
  try {
    logAudit({
      entityCode: opts.entityCode,
      action: opts.action,
      entityType: 'taskflow_event' as never,
      recordId: opts.recordId,
      recordLabel: opts.recordLabel,
      beforeState: null,
      afterState: null,
      sourceModule: 'whatsapp-channel-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
}

function resolveFyId(entityCode: string, isoDate: string): string {
  try {
    const years = readFiscalYears(entityCode);
    const d = isoDate.slice(0, 10);
    const hit = years.find((y) => d >= y.startDate && d <= y.endDate);
    return hit?.id ?? 'FY-UNRESOLVED';
  } catch { return 'FY-UNRESOLVED'; }
}

function lwOutbox(entityCode: string, log: OutboxMessage[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(outboxKey(entityCode), JSON.stringify(log.slice(0, 500)));
    }
  } catch { /* quota */ }
}

function newId(): string {
  return `wa-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function applyMerge(tpl: string, data: Record<string, string | number | undefined | null>): string {
  return tpl.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_m, key: string) => {
    const v = data[key];
    return v == null ? '' : String(v);
  });
}

// ─── E.164 phone normalization (honest · null over fabrication) ─────────

/**
 * Normalize a raw phone string to E.164 (default IN / +91).
 * Returns `null` when unparseable — never fabricates a number.
 *
 *   '+919876543210' → '+919876543210'
 *   '9876543210'    → '+919876543210'   (bare 10-digit Indian mobile)
 *   '+1 415 555 1212' → '+14155551212'
 *   ''              → null
 *   'abc'           → null
 *   '12345'         → null              (too short)
 */
export function normalizePhoneE164(raw: string | null | undefined, defaultCountry: 'IN' = 'IN'): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  if (hasPlus) {
    // International with explicit +CC — accept 8..15 digits per E.164.
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }
  // No leading + → infer from default country (only IN supported today · honest).
  if (defaultCountry === 'IN') {
    // Strip 0 prefix; accept bare 10-digit Indian mobiles 6-9 leading.
    const local = digits.replace(/^0+/, '');
    if (local.length === 10 && /^[6-9]/.test(local)) return `+91${local}`;
    if (local.length === 12 && local.startsWith('91') && /^91[6-9]/.test(local)) return `+${local}`;
    // 11-digit '091xxxxxxxxxx' style → already handled by strip
    return null;
  }
  return null;
}

// ─── Recipient resolution (READ-ONLY · honest empty over fabrication) ───

interface PartyLike {
  id?: string;
  phone?: string;
  mobile?: string;
  whatsapp?: string;
  contacts?: Array<{ phone?: string; mobile?: string; isPrimary?: boolean }>;
}

function readPartyPhone(storeKey: string, partyId?: string): string | null {
  if (!partyId) return null;
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(storeKey);
    if (!raw) return null;
    const list = JSON.parse(raw) as PartyLike[];
    const hit = list.find((p) => p.id === partyId);
    if (!hit) return null;
    const candidates: Array<string | undefined> = [];
    candidates.push(hit.whatsapp, hit.mobile, hit.phone);
    if (Array.isArray(hit.contacts)) {
      const primary = hit.contacts.find((c) => c.isPrimary);
      if (primary) candidates.unshift(primary.mobile, primary.phone);
      for (const c of hit.contacts) candidates.push(c.mobile, c.phone);
    }
    for (const raw2 of candidates) {
      const n = normalizePhoneE164(raw2);
      if (n) return n;
    }
    return null;
  } catch { return null; }
}

/** Resolve recipient WhatsApp phone (E.164) for a source record · null when honest-unknown. */
export function resolveWhatsAppRecipient(
  _objectType: string,
  sourceRecord: Record<string, unknown>,
  _entityCode: string,
): string | null {
  // Direct fields on the record win (callers may pass a manual phone).
  const direct = (sourceRecord.whatsapp ?? sourceRecord.mobile ?? sourceRecord.phone) as string | undefined;
  const directN = normalizePhoneE164(direct);
  if (directN) return directN;

  const partyId = (sourceRecord.party_id
    ?? sourceRecord.partyId
    ?? sourceRecord.vendor_id
    ?? sourceRecord.customer_id
    ?? sourceRecord.transporter_id) as string | undefined;
  if (!partyId) return null;

  return (
    readPartyPhone('erp_group_vendor_master', partyId)
    ?? readPartyPhone('erp_group_customer_master', partyId)
  );
}

// ─── Template rendering for WhatsApp (1024 cap · plain text only) ───────

function pickWhatsAppTemplate(entityCode: string, objectType: string): TemplateRow | undefined {
  return listTemplates(entityCode).find(
    (t) => t.active && t.object_type === objectType && t.channel === 'whatsapp',
  );
}

function resolveSignature(entityCode: string, tpl: TemplateRow, currentUserName?: string): string {
  if (tpl.sender_class_default === 'user' && currentUserName) {
    const prof = listUserMailProfiles(entityCode).find((p) => p.user_name === currentUserName);
    // Strip any HTML from email signatures · plain text on WhatsApp.
    return (prof?.signature_html ?? '').replace(/<[^>]*>/g, '').trim();
  }
  if (tpl.sender_class_default === 'department' && tpl.department_card_id) {
    const dept = listDepartmentEmails(entityCode).find((d) => d.active && d.card_id === tpl.department_card_id);
    return (dept?.signature_html ?? '').replace(/<[^>]*>/g, '').trim();
  }
  return '';
}

export interface RenderWhatsAppResult {
  body: string;
  template?: TemplateRow;
  truncated: boolean;
  hadHtml: boolean;
}

/** Render WhatsApp message — strip HTML (plain only) + cap at 1024 chars (honest truncation note). */
export function renderWhatsAppMessage(
  objectType: string,
  mergeData: Record<string, string | number | undefined | null>,
  entityCode: string,
  currentUserName?: string,
): RenderWhatsAppResult {
  const tpl = pickWhatsAppTemplate(entityCode, objectType);
  if (!tpl) return { body: '', truncated: false, hadHtml: false };
  const signature = resolveSignature(entityCode, tpl, currentUserName);
  const merged = applyMerge(tpl.body_tpl, { ...mergeData, signature });
  const hadHtml = /<[^>]+>/.test(merged);
  const plain = hadHtml ? merged.replace(/<[^>]*>/g, '') : merged;
  let body = plain;
  let truncated = false;
  if (body.length > WA_MAX_BODY_CHARS) {
    // Honest truncation: trim and append a clear note.
    const note = '… (truncated)';
    body = body.slice(0, WA_MAX_BODY_CHARS - note.length) + note;
    truncated = true;
  }
  return { body, template: tpl, truncated, hadHtml };
}

// ─── wa.me deep link builder ────────────────────────────────────────────

/** Build https://wa.me/<digits>?text=<encoded> from E.164 + message. */
export function buildWaMeLink(phoneE164: string, message: string): string {
  // wa.me wants digits only · drop the leading +.
  const digits = (phoneE164 || '').replace(/^\+/, '').replace(/\D/g, '');
  const text = encodeURIComponent(message ?? '');
  return `https://wa.me/${digits}?text=${text}`;
}

// ─── Dispatch — class-aware honest delivery ─────────────────────────────

export interface WhatsAppDispatchInput {
  entityCode: string;
  objectType: string;
  sourceCard: string;
  sourceRecord: Record<string, unknown> & { id?: string };
  mergeData: Record<string, string | number | undefined | null>;
  /** Manual override (CC editor) · falls back to engine resolver. */
  overrideRecipient?: string;
  currentUserName: string;
  /** Optional FY id — auto-resolved when absent. */
  fiscalYearId?: string;
  /** Optional attachment NAME only — wa.me cannot pre-attach; carrier note appended honestly. */
  attachmentName?: string;
}

export interface WhatsAppDispatchResult {
  ok: boolean;
  message?: OutboxMessage;
  waMeUrl?: string;        // user-class only · opens the operator's WhatsApp
  reason?: string;         // honest reason on ok:false
}

function resolveSenderClass(entityCode: string, objectType: string): SenderClass {
  const tpl = pickWhatsAppTemplate(entityCode, objectType);
  return tpl?.sender_class_default ?? 'user';
}

/**
 * Dispatch a WhatsApp message.
 *
 *   user-class       → builds wa.me link · log delivery_mode='opened_in_whatsapp' (Tier-L real).
 *   department/system → log delivery_mode='queued_for_wave2' · NEVER wa.me (mailto-equivalent
 *                       impersonation: a personal number can't represent the dept).
 */
export function dispatchWhatsApp(input: WhatsAppDispatchInput): WhatsAppDispatchResult {
  const cls = resolveSenderClass(input.entityCode, input.objectType);

  // Recipient: manual override wins, else resolver.
  const overrideN = input.overrideRecipient ? normalizePhoneE164(input.overrideRecipient) : null;
  const to = overrideN ?? resolveWhatsAppRecipient(input.objectType, input.sourceRecord, input.entityCode);

  // Render message.
  const rendered = renderWhatsAppMessage(input.objectType, input.mergeData, input.entityCode, input.currentUserName);
  if (!rendered.body) {
    return { ok: false, reason: 'no_whatsapp_template' };
  }

  // wa.me cannot pre-attach a file — append an honest line when caller supplied an attachment name.
  let body = rendered.body;
  if (input.attachmentName) {
    const note = `\n\n(attach the downloaded PDF: ${input.attachmentName})`;
    // Re-enforce 1024 cap.
    const cap = WA_MAX_BODY_CHARS;
    body = (body + note).slice(0, cap);
  }

  const fyId = input.fiscalYearId || resolveFyId(input.entityCode, new Date().toISOString());
  const settings = getCompanyMailSettings(input.entityCode);

  const baseMsg: OutboxMessage = {
    id: newId(),
    entity_id: input.entityCode,
    fiscal_year_id: fyId,
    object_type: input.objectType,
    source_card: input.sourceCard,
    source_record_id: (input.sourceRecord.id as string | undefined) ?? undefined,
    sender_class: cls,
    channel: 'whatsapp',
    from_resolved: cls === 'user'
      ? (input.currentUserName ?? 'operator')
      : `wa-${cls}@${settings.server_address ?? 'operix.local'}`,
    to_resolved: to ? [to] : [],
    subject: '',                // WhatsApp has no subject
    body_html: body,            // plain text · reused field
    delivery_mode: 'queued_for_wave2',
    status: 'queued',
    created_by: input.currentUserName,
    retention_policy: 'operational_log_only',
    created_at: new Date().toISOString(),
  };

  let waMeUrl: string | undefined;

  if (cls === 'user') {
    // User-class: wa.me real today · log honestly.
    if (!to) {
      return { ok: false, reason: 'no_recipient_phone' };
    }
    waMeUrl = buildWaMeLink(to, body);
    baseMsg.delivery_mode = 'opened_in_whatsapp';
    baseMsg.status = 'handed_off';
  } else {
    // department / system → queued_for_wave2 · NEVER wa.me.
    // (Personal phone link would misrepresent dept/system identity.)
    baseMsg.delivery_mode = 'queued_for_wave2';
    baseMsg.status = 'queued';
  }

  // Persist to the SAME outbox log (channel chip distinguishes WA from email).
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(outboxKey(input.entityCode)) : null;
    const log: OutboxMessage[] = raw ? (JSON.parse(raw) as OutboxMessage[]) : [];
    log.unshift(baseMsg);
    lwOutbox(input.entityCode, log);
  } catch { /* swallow · best-effort */ }

  safeAudit({ entityCode: input.entityCode, action: 'create', recordId: baseMsg.id, recordLabel: 'outbox_message_whatsapp' });

  return { ok: true, message: baseMsg, waMeUrl };
}

// ─── First-customer hook · reuses the B.2 EnqueueEventInput shape ───────

/**
 * WhatsApp variant of `enqueueFromEvent` — reminders + approvals call the SAME
 * communication-engine.enqueueFromEvent and pass `channel:'whatsapp'`. That entry-
 * point delegates here when channel='whatsapp'. Approval-rail + reminders engines
 * stay 0-DIFF (they never set channel themselves).
 */
export function enqueueWhatsAppFromEvent(input: EnqueueEventInput): OutboxMessage | null {
  // Resolve recipient phone from the user mail profile (best-effort).
  // Today profiles carry email_id only — Wave-2 will add wa_phone; until then
  // honest empty is correct (never fabricate a number).
  const profiles = listUserMailProfiles(input.entityCode);
  const prof = profiles.find((p) => p.user_name === input.recipientUserName) as
    | (typeof profiles[number] & { wa_phone?: string; phone?: string })
    | undefined;
  const phoneRaw = prof?.wa_phone ?? prof?.phone;
  const to = normalizePhoneE164(phoneRaw);
  if (!to) return null;

  const rendered = renderWhatsAppMessage(
    input.objectType,
    { ...input.mergeData, recipient_name: input.recipientUserName },
    input.entityCode,
  );
  if (!rendered.body) return null;

  const fyId = input.fiscalYearId || resolveFyId(input.entityCode, new Date().toISOString());
  const settings = getCompanyMailSettings(input.entityCode);

  const msg: OutboxMessage = {
    id: newId(),
    entity_id: input.entityCode,
    fiscal_year_id: fyId,
    object_type: input.objectType,
    source_card: input.sourceCard,
    source_record_id: input.sourceRecordId,
    sender_class: 'system',
    channel: 'whatsapp',
    from_resolved: `wa-system@${settings.server_address ?? 'operix.local'}`,
    to_resolved: [to],
    subject: '',
    body_html: rendered.body,
    delivery_mode: 'queued_for_wave2',  // system-class → BSP only at Wave-2
    status: 'queued',
    created_by: 'system',
    retention_policy: 'operational_log_only',
    created_at: new Date().toISOString(),
  };

  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(outboxKey(input.entityCode)) : null;
    const log: OutboxMessage[] = raw ? (JSON.parse(raw) as OutboxMessage[]) : [];
    log.unshift(msg);
    lwOutbox(input.entityCode, log);
  } catch { /* swallow */ }

  safeAudit({ entityCode: input.entityCode, action: 'create', recordId: msg.id, recordLabel: 'outbox_message_whatsapp' });
  return msg;
}

// ─── Read helpers (Outbox Monitor chip rendering) ───────────────────────

export function listWhatsAppOutbox(entityCode: string): OutboxMessage[] {
  return listOutbox(entityCode).filter((m) => m.channel === 'whatsapp');
}
