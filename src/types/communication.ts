/**
 * communication.ts — Communication outbox + dual/triple sender types
 *
 * Sprint B2 · T-B2-Comm-Outbox · Pillar-B B.2 · ~200 LOC
 * PULSE-aligned (Wave-2 Relay target · alignment by SHAPE only · NO PULSE imports)
 *
 * Iron rules:
 *   - NO password/secret/smtp_pass field ANYWHERE. `credentials_state` placeholder only.
 *     Real credentials live server-side AES-256-GCM at Wave-2 (PULSE Relay).
 *   - Three sender classes: 'user' (sends via user's own mail client today),
 *     'department' (queued for Wave-2; mailto would IMPERSONATE the dept id — forbidden),
 *     'system' (queued for Wave-2 noreply).
 *   - Templates / registry / settings are CC-editable DATA rows · zero hardcoded message strings.
 *   - OutboxMessage is FY-stamped under the P8.6 floor.
 *
 * [JWT] Wave-2: PULSE Relay drains queued_for_wave2 via SupabaseAdapter on India-resident backend
 */

export type SenderClass = 'user' | 'department' | 'system';

export type DeliveryMode =
  | 'sent_via_user_client'   // user-class: their client = their identity, real send TODAY
  | 'eml_exported'            // tier-L manual fallback with embedded attachment
  | 'queued_for_wave2';       // department/system-class: waits for PULSE Relay

export type OutboxStatus = 'draft' | 'composed' | 'handed_off' | 'queued';

/** Department mailbox row — CC Communication "Department Email Registry" tab. */
export interface DepartmentEmailRow {
  id: string;
  card_id: string;                              // e.g. 'payout', 'salesx', 'receivx'
  department_label: string;                     // human label
  email_id: string;                             // accounts@acme.in
  display_name: string;                         // "Acme Accounts"
  reply_to_mode: 'department' | 'triggering_user';
  signature_html?: string;                      // dept signature merged via {{signature}}
  active: boolean;
}

/**
 * Company-level mail settings — NO PASSWORD FIELD, EVER.
 * `credentials_state` is the only auth-shaped field; the real secret is stored
 * server-side AES-256-GCM at Wave-2 (PULSE).
 */
export interface CompanyMailSettings {
  server_label?: string;                        // human label e.g. "Hostinger SMTP"
  server_address?: string;                      // hostname only, NEVER password
  use_ssl: boolean;
  ssl_std_port: number;                         // 465 / 587 (informational)
  from_name: string;                            // company display name
  default_format: 'pdf';
  credentials_state: 'configured_at_wave2' | 'not_configured';
}

/** Per-user mail profile (per-browser today · Wave-2 auth-bound). */
export interface UserMailProfile {
  user_name: string;                            // matches currentUserName free-text today
  email_id?: string;
  display_name?: string;
  signature_html?: string;
  /** Department card_ids the user is permitted to "send-as" (admin-granted). */
  send_as_department_grants?: string[];
}

/** PULSE TemplateMaster-shaped. Merge fields are `{{...}}` incl. `{{signature}}`. */
export interface TemplateRow {
  id: string;
  object_type: string;                          // 'invoice-memo' | 'po' | 'approval.pending' | 'reminder.digest' | ...
  channel: 'email';                             // WhatsApp/SMS land with B.3
  subject_tpl: string;
  body_tpl: string;
  lang: 'en';                                   // Hindi templates land later
  sender_class_default: SenderClass;
  department_card_id?: string;                  // when sender_class_default === 'department'
  active: boolean;
}

/** PULSE CommunicationLog-compatible. FY-stamped under the P8.6 floor. */
export interface OutboxMessage {
  id: string;
  entity_id: string;
  fiscal_year_id: string;
  object_type: string;
  source_card: string;                          // 'fincore', 'taskflow', 'payout', ...
  source_record_id?: string;
  sender_class: SenderClass;
  from_resolved: string;                        // resolved email-id at compose time
  to_resolved: string[];
  subject: string;
  body_html: string;
  attachment_name?: string;
  attachment_b64?: string;                      // base64 of PDF/payload bytes
  delivery_mode: DeliveryMode;
  status: OutboxStatus;
  created_by?: string;
  retention_policy?: 'operational_log_only';
  created_at: string;
}

/** Input shape for engine.composeFromDocument — caller supplies the print payload. */
export interface ComposeDocumentInput {
  entityCode: string;
  fiscalYearId: string;
  objectType: string;
  sourceCard: string;
  sourceRecord: Record<string, unknown> & { id?: string };
  mergeData: Record<string, string | number | undefined | null>;
  /** Caller-supplied PDF/payload bytes as base64 (DocSendBar reuses existing print payload). */
  attachment?: { name: string; base64: string };
  /** Manual override · falls back to engine resolver. */
  overrideRecipients?: string[];
  currentUserName: string;
}

/** Input for enqueueFromEvent (approval-rail / my-reminders first customers). */
export interface EnqueueEventInput {
  entityCode: string;
  fiscalYearId: string;
  objectType: 'approval.pending' | 'digest.my_reminders' | string;
  sourceCard: string;
  sourceRecordId?: string;
  recipientUserName: string;
  mergeData: Record<string, string | number | undefined | null>;
}

// ─── Storage keys (entity-scoped per multi-tenant key-scoping canon) ───────

export const outboxKey = (entityCode: string): string =>
  entityCode ? `erp_outbox_${entityCode}` : 'erp_outbox_system';

export const departmentEmailsKey = (entityCode: string): string =>
  entityCode ? `erp_dept_emails_${entityCode}` : 'erp_dept_emails_system';

export const companyMailSettingsKey = (entityCode: string): string =>
  entityCode ? `erp_mail_settings_${entityCode}` : 'erp_mail_settings_system';

export const userMailProfilesKey = (entityCode: string): string =>
  entityCode ? `erp_user_mail_profiles_${entityCode}` : 'erp_user_mail_profiles_system';

export const templatesKey = (entityCode: string): string =>
  entityCode ? `erp_comm_templates_${entityCode}` : 'erp_comm_templates_system';
