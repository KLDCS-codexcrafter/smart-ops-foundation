/**
 * receivx.ts — ReceivX data model
 * [JWT] GET/POST/PUT/DELETE /api/receivx/*
 */

// ── OutstandingTask ─────────────────────────────────────────────
export type TaskStatus =
  | 'open' | 'in_progress' | 'promised' | 'partial'
  | 'disputed' | 'legal' | 'closed';

export type AgeBucket = '0-30' | '31-60' | '61-90' | '91-180' | '180+';

export interface OutstandingTask {
  id: string;
  entity_id: string;
  // Source document linkage:
  outstanding_id: string;
  voucher_id: string;
  voucher_no: string;
  voucher_date: string;
  due_date: string;
  party_id: string;
  party_name: string;
  // Snapshot of financial state:
  original_amount: number;
  pending_amount: number;
  age_days: number;
  age_bucket: AgeBucket;
  // Assignment:
  assigned_salesman_id: string | null;
  assigned_salesman_name: string | null;
  assigned_agent_id: string | null;
  assigned_agent_name: string | null;
  assigned_broker_id: string | null;
  assigned_broker_name: string | null;
  assigned_telecaller_id: string | null;
  assigned_telecaller_name: string | null;
  assigned_collection_exec_id: string | null;
  assigned_collection_exec_name: string | null;
  // Workflow state:
  status: TaskStatus;
  next_action_date: string | null;
  next_action: string | null;
  last_contact_at: string | null;
  last_contact_channel: 'whatsapp' | 'email' | 'sms' | 'call' | null;
  // Cadence tracking:
  last_cadence_step: string | null;
  escalation_level: 0 | 1 | 2 | 3;
  // Linked records:
  active_ptp_id: string | null;
  disputed_reason: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const receivxTasksKey = (e: string) => `erp_receivx_tasks_${e}`;

// ── ReminderTemplate ────────────────────────────────────────────
export type CadenceStep = 'D-3' | 'D+0' | 'D+7' | 'D+15' | 'D+30' | 'D+45' | 'D+60';

export interface CadenceMessage {
  step: CadenceStep;
  channel: 'whatsapp' | 'email' | 'sms';
  subject: string | null;
  body: string;
  send_time: string;
  is_active: boolean;
}

export interface ReminderTemplate {
  id: string;
  entity_id: string;
  template_code: string;
  template_name: string;
  description: string | null;
  messages: CadenceMessage[];
  escalation_after_days: number | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const receivxTemplatesKey = (e: string) => `erp_receivx_templates_${e}`;

// ── CommunicationLog ────────────────────────────────────────────
export type CommStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'replied';

export interface CommunicationLog {
  id: string;
  entity_id: string;
  task_id: string;
  party_id: string;
  party_name: string;
  voucher_no: string;
  channel: 'whatsapp' | 'email' | 'sms' | 'call';
  template_id: string | null;
  cadence_step: CadenceStep | 'manual';
  direction: 'outbound' | 'inbound';
  to_recipient: string;
  subject: string | null;
  body: string;
  // Provider metadata:
  provider: 'message_auto_sender' | 'smtp' | 'wa_me_link' | 'mailto_link' | 'manual';
  provider_message_id: string | null;
  // Tracking timestamps:
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  opened_at: string | null;
  replied_at: string | null;
  failed_at: string | null;
  failed_reason: string | null;
  status: CommStatus;
  sent_by_user: string;
  created_at: string;
  updated_at: string;
}

export const receivxCommLogKey = (e: string) => `erp_receivx_comm_log_${e}`;

// ── PTP (Promise to Pay) ────────────────────────────────────────
export type PTPStatus = 'active' | 'kept' | 'broken' | 'partial' | 'cancelled';

export interface PTP {
  id: string;
  entity_id: string;
  task_id: string;
  party_id: string;
  party_name: string;
  voucher_no: string;
  promised_date: string;
  promised_amount: number;
  actual_receipt_voucher_no: string | null;
  actual_receipt_date: string | null;
  actual_amount: number;
  status: PTPStatus;
  evaluation_date: string | null;
  recorded_by: string;
  recorded_via: 'call' | 'whatsapp' | 'email' | 'meeting' | 'sms';
  notes: string;
  created_at: string;
  updated_at: string;
}

export const receivxPTPsKey = (e: string) => `erp_receivx_ptps_${e}`;

// ── CollectionExec ──────────────────────────────────────────────
export interface CollectionExec {
  id: string;
  entity_id: string;
  exec_code: string;
  exec_name: string;
  phone: string;
  email: string;
  territory_ids: string[];
  customer_category_ids: string[];
  manager_id: string | null;
  max_active_tasks: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const receivxExecsKey = (e: string) => `erp_receivx_execs_${e}`;

// ── IncentiveScheme ─────────────────────────────────────────────
export interface IncentiveSchemeTier {
  pay_within_days: number;
  discount_pct: number;
}

export interface IncentiveScheme {
  id: string;
  entity_id: string;
  scheme_code: string;
  scheme_name: string;
  applicable_to: 'all_customers' | 'category' | 'specific_customers';
  customer_category_ids: string[];
  specific_customer_ids: string[];
  tiers: IncentiveSchemeTier[];
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const receivxSchemesKey = (e: string) => `erp_receivx_schemes_${e}`;

// ── ReceivXConfig — single record per entity ────────────────────
export interface ReceivXConfig {
  entity_id: string;
  // WhatsApp (Message Auto Sender):
  wa_provider: 'message_auto_sender' | 'wa_me_fallback';
  wa_api_endpoint: string;
  wa_api_key: string;
  wa_webhook_url: string;
  wa_webhook_secret: string;
  wa_default_sender: string;
  // Email:
  email_provider: 'smtp' | 'mailto_fallback';
  email_smtp_host: string;
  email_smtp_port: number;
  email_smtp_user: string;
  email_smtp_pass: string;
  email_pixel_endpoint: string;
  email_from_name: string;
  email_from_address: string;
  // Defaults:
  default_template_id: string | null;
  default_escalation_after_days: number;
  auto_run_cadence: boolean;
  // Credit risk thresholds:
  bad_debtor_age_days: number;
  credit_hold_ratio: number;
  created_at: string;
  updated_at: string;
}

export const receivxConfigKey = (e: string) => `erp_receivx_config_${e}`;
