/**
 * auto-send-rules-engine.ts — Sprint W1C-4 · T-W1C4-AutoSend-TierL
 *
 * Tally "auto-email after voucher entry" pattern, Tier-L honest:
 *   CC-editable rule rows → renderTemplate (existing) → enqueue on the
 *   existing outbox with delivery_mode='queued_for_wave2' → existing
 *   communication log. Pure orchestration — ZERO new delivery code,
 *   ZERO direct sends (no mailto / fetch / smtp in this file · grep-lock).
 *
 * Binding canons (Comm Pillar Master v1):
 *   - Rules are CC-editable DATA rows under the sole namespaced key
 *     auto-send-rules-engine writes to (autoSendRulesKey).
 *   - department / system messages QUEUE — never mailto-impersonation.
 *   - NO credentials client-side.
 *   - Templates consumed via the existing TemplateMaster shapes
 *     (renderTemplate from communication-engine).
 *   - PULSE-shaped by alignment · zero PULSE imports.
 *
 * Starter rules are seeded DISABLED-BY-DEFAULT and ONLY for events the
 * P8.2 notification spine (src/types/notification.ts NotificationKind)
 * actually emits AND for which a TemplateMaster row exists. The prompt's
 * suggested events that do NOT exist in the spine are recorded in
 * STARTER_RULES_UNAVAILABLE for the close summary:
 *   voucher-posted · po-approved · dln-created · sla-breach · payment-released
 *
 * [JWT] Wave-2: PULSE Relay drains queued_for_wave2 messages.
 */

import {
  renderTemplate,
  resolveRecipients,
  listDepartmentEmails,
  listUserMailProfiles,
  getCompanyMailSettings,
  listOutbox,
} from '@/lib/communication-engine';
import type { OutboxMessage, SenderClass, CommChannel } from '@/types/communication';
import { outboxKey } from '@/types/communication';
import { logAudit } from '@/lib/audit-trail-engine';

// ─── Types ──────────────────────────────────────────────────────────────

export type RecipientResolver = 'party' | 'department' | 'fixed';

export interface AutoSendRule {
  id: string;
  /** Spine NotificationKind string (e.g. 'approval.pending'). */
  event: string;
  enabled: boolean;
  /** Drives renderTemplate via the template's object_type lookup. */
  templateId: string;
  /** Template object_type — kept so renderTemplate can resolve without listing. */
  templateObjectType: string;
  recipientResolver: RecipientResolver;
  /** Email for 'fixed' · card_id for 'department' · party-id field name for 'party' (optional). */
  recipientValue?: string;
  senderClass: Extract<SenderClass, 'department' | 'system'>;
  channel: Extract<CommChannel, 'email'>;
  lang: 'en';
  description?: string;
}

export interface AutoSendPayload {
  /** Optional — falls back to system-derived entity. */
  entityCode: string;
  fiscalYearId?: string;
  /** Free-form merge data forwarded to renderTemplate. */
  mergeData?: Record<string, string | number | undefined | null>;
  /** When recipientResolver='party' the engine reads party_id / customer_id / vendor_id / transporter_id from this record. */
  sourceRecord?: Record<string, unknown>;
  sourceCard?: string;
  sourceRecordId?: string;
  /** Notification spine target — used as a fallback fixed recipient when known. */
  targetUserId?: string;
}

export interface EvaluateResult {
  matched: number;
  enqueued: OutboxMessage[];
  skipped: Array<{ ruleId: string; reason: string }>;
}

// ─── Storage (sole namespaced key) ──────────────────────────────────────

export const autoSendRulesKey = (entityCode: string): string =>
  entityCode ? `erp_auto_send_rules_${entityCode}` : 'erp_auto_send_rules_system';

function ls<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function lw(key: string, value: unknown): void {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}
function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Starter rules ──────────────────────────────────────────────────────

/**
 * Suggested-but-unavailable spine events (recorded for the close summary).
 * These were named in the W1C-4 prompt but the P8.2 NotificationKind union
 * does NOT emit them today. Per canon, we DO NOT seed rules for them.
 */
export const STARTER_RULES_UNAVAILABLE: ReadonlyArray<string> = [
  'voucher-posted', 'po-approved', 'dln-created', 'sla-breach', 'payment-released',
];

/**
 * REAL P8.2 spine events that ALSO have a matching TemplateMaster row.
 * Seeded DISABLED — CC admins toggle on after recipient resolver is set.
 */
function buildStarterRules(): AutoSendRule[] {
  return [
    {
      id: 'rule-approval-pending',
      event: 'approval.pending',
      enabled: false,
      templateId: 'tpl-approval',
      templateObjectType: 'approval.pending',
      recipientResolver: 'fixed',
      recipientValue: '',
      senderClass: 'system',
      channel: 'email',
      lang: 'en',
      description: 'When an approval is awaiting decision, queue an email to the assignee (system class).',
    },
    {
      id: 'rule-digest-my-reminders',
      event: 'digest.my_reminders',
      enabled: false,
      templateId: 'tpl-reminders',
      templateObjectType: 'digest.my_reminders',
      recipientResolver: 'fixed',
      recipientValue: '',
      senderClass: 'system',
      channel: 'email',
      lang: 'en',
      description: 'On-open per-user reminders digest — queue a recap email to the recipient.',
    },
  ];
}

// ─── Rule CRUD ──────────────────────────────────────────────────────────

export function listAutoSendRules(entityCode: string): AutoSendRule[] {
  const existing = ls<AutoSendRule[]>(autoSendRulesKey(entityCode), []);
  if (existing.length > 0) return existing;
  const seed = buildStarterRules();
  lw(autoSendRulesKey(entityCode), seed);
  return seed;
}

export function upsertAutoSendRule(
  entityCode: string,
  rule: Omit<AutoSendRule, 'id'> & { id?: string },
): AutoSendRule {
  const list = listAutoSendRules(entityCode);
  const id = rule.id ?? newId('rule');
  const next: AutoSendRule = { ...rule, id };
  const idx = list.findIndex((r) => r.id === id);
  if (idx >= 0) list[idx] = next; else list.push(next);
  lw(autoSendRulesKey(entityCode), list);
  try {
    logAudit({
      entityCode,
      action: rule.id ? 'update' : 'create',
      entityType: 'taskflow_event' as never,
      recordId: id,
      recordLabel: 'auto_send_rule',
      beforeState: null,
      afterState: null,
      sourceModule: 'auto-send-rules-engine',
    });
  } catch { /* D-AUDIT-SAFE */ }
  return next;
}

export function deleteAutoSendRule(entityCode: string, id: string): boolean {
  const list = listAutoSendRules(entityCode);
  const next = list.filter((r) => r.id !== id);
  if (next.length === list.length) return false;
  lw(autoSendRulesKey(entityCode), next);
  return true;
}

// ─── Recipient resolution (consumes existing masters · zero new reads) ──

function resolveRule(
  rule: AutoSendRule,
  payload: AutoSendPayload,
): string[] {
  const { entityCode } = payload;
  if (rule.recipientResolver === 'fixed') {
    const v = rule.recipientValue?.trim();
    if (v) return [v];
    // Fallback: if payload carries a known targetUserId, look up their mail profile.
    if (payload.targetUserId) {
      const prof = listUserMailProfiles(entityCode).find((p) => p.user_name === payload.targetUserId);
      if (prof?.email_id) return [prof.email_id];
    }
    return [];
  }
  if (rule.recipientResolver === 'department') {
    const cardId = rule.recipientValue;
    if (!cardId) return [];
    const dept = listDepartmentEmails(entityCode).find((d) => d.active && d.card_id === cardId);
    return dept?.email_id ? [dept.email_id] : [];
  }
  if (rule.recipientResolver === 'party') {
    if (!payload.sourceRecord) return [];
    return resolveRecipients(rule.templateObjectType, payload.sourceRecord, entityCode);
  }
  return [];
}

// ─── evaluateAutoSend (orchestration only) ──────────────────────────────

export function evaluateAutoSend(
  event: string,
  payload: AutoSendPayload,
): EvaluateResult {
  const out: EvaluateResult = { matched: 0, enqueued: [], skipped: [] };
  const rules = listAutoSendRules(payload.entityCode).filter((r) => r.event === event);
  if (rules.length === 0) return out;
  out.matched = rules.length;

  for (const rule of rules) {
    if (!rule.enabled) { out.skipped.push({ ruleId: rule.id, reason: 'disabled' }); continue; }

    const to = resolveRule(rule, payload);
    if (to.length === 0) { out.skipped.push({ ruleId: rule.id, reason: 'no_recipient' }); continue; }

    const merge = { ...(payload.mergeData ?? {}) };
    const rendered = renderTemplate(rule.templateObjectType, merge, payload.entityCode, rule.senderClass);
    if (!rendered.subject && !rendered.body_html) {
      out.skipped.push({ ruleId: rule.id, reason: 'no_template' });
      continue;
    }

    const settings = getCompanyMailSettings(payload.entityCode);
    let from = `noreply@${settings.server_address ?? 'operix.local'}`;
    if (rule.senderClass === 'department' && rule.recipientResolver === 'department' && rule.recipientValue) {
      const dept = listDepartmentEmails(payload.entityCode).find((d) => d.active && d.card_id === rule.recipientValue);
      if (dept?.email_id) from = dept.email_id;
    }

    const message: OutboxMessage = {
      id: newId('out'),
      entity_id: payload.entityCode,
      fiscal_year_id: payload.fiscalYearId ?? 'FY-UNRESOLVED',
      object_type: rule.templateObjectType,
      source_card: payload.sourceCard ?? 'auto-send',
      source_record_id: payload.sourceRecordId,
      sender_class: rule.senderClass,
      from_resolved: from,
      to_resolved: to,
      subject: rendered.subject,
      body_html: rendered.body_html,
      // CANON: department / system class — NEVER mailto. Queue for Wave-2.
      delivery_mode: 'queued_for_wave2',
      status: 'queued',
      created_by: 'auto-send-rules-engine',
      retention_policy: 'operational_log_only',
      created_at: new Date().toISOString(),
    };

    // Enqueue on the existing outbox · no direct send.
    const key = outboxKey(payload.entityCode);
    const log = ls<OutboxMessage[]>(key, []);
    log.unshift(message);
    lw(key, log.slice(0, 500));

    try {
      logAudit({
        entityCode: payload.entityCode,
        action: 'create',
        entityType: 'taskflow_event' as never,
        recordId: message.id,
        recordLabel: 'auto_send_enqueue',
        beforeState: null,
        afterState: { ruleId: rule.id, event },
        sourceModule: 'auto-send-rules-engine',
      });
    } catch { /* D-AUDIT-SAFE */ }

    out.enqueued.push(message);
  }
  return out;
}

// ─── Per-rule last-5 enqueue log (read-only · derived from outbox) ──────

export function recentEnqueuesForRule(
  entityCode: string,
  ruleId: string,
  limit = 5,
): OutboxMessage[] {
  const rule = listAutoSendRules(entityCode).find((r) => r.id === ruleId);
  if (!rule) return [];
  return listOutbox(entityCode)
    .filter((m) => m.object_type === rule.templateObjectType && m.created_by === 'auto-send-rules-engine')
    .slice(0, limit);
}

/**
 * handleNotificationEvent — additive adapter for callers that already hold
 * a NotificationEvent. The P8.2 notification-engine.publish() path is 0-DIFF;
 * consumers may invoke this AFTER publish() to fan out the auto-send rules.
 */
export function handleNotificationEvent(evt: {
  kind: string;
  entityCode: string;
  targetUserId?: string;
  refType?: string | null;
  refId?: string | null;
  title?: string;
  body?: string | null;
}): EvaluateResult {
  return evaluateAutoSend(evt.kind, {
    entityCode: evt.entityCode,
    targetUserId: evt.targetUserId,
    sourceCard: 'notification-spine',
    sourceRecordId: evt.refId ?? undefined,
    mergeData: {
      recipient_name: evt.targetUserId ?? '',
      title: evt.title ?? '',
      body: evt.body ?? '',
    },
  });
}
