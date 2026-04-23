/**
 * demo-receivx-data.ts — Full ReceivX story (templates, execs, PTPs, comm log, config)
 * [JWT] Read by orchestrator → POST /api/receivx/*
 */
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

// Relative dates make the demo evergreen
function today(): Date { return new Date(); }
function daysFromNow(d: number): string {
  const t = today();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
}
function nowIso(): string { return new Date().toISOString(); }

// ─── ReceivX Config ─────────────────────────────────────────────────────
export const DEMO_RECEIVX_CONFIG = {
  entity_id: DEFAULT_ENTITY_SHORTCODE,
  wa_provider: 'wa_me_fallback' as const,
  wa_api_endpoint: 'https://app.messageautosender.com/api/send-message',
  wa_api_key: '',
  wa_webhook_url: '',
  wa_webhook_secret: '',
  wa_default_sender: '+919999000000',
  email_provider: 'mailto_fallback' as const,
  email_smtp_host: '', email_smtp_port: 587,
  email_smtp_user: '', email_smtp_pass: '',
  email_pixel_endpoint: '',
  email_from_name: 'Operix Collections',
  email_from_address: 'collections@operix.in',
  default_template_id: null,
  default_escalation_after_days: 15,
  auto_run_cadence: false,
  bad_debtor_age_days: 90,
  credit_hold_ratio: 1.0,
  created_at: nowIso(), updated_at: nowIso(),
};

// ─── Reminder Templates ─────────────────────────────────────────────────
export const DEMO_REMINDER_TEMPLATES = [
  {
    id: 'tpl-1', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'STANDARD-30', template_name: 'Standard 30-day Cadence',
    description: 'Professional reminders for B2B customers on net-30 terms',
    messages: [
      { step: 'D-3' as const, channel: 'whatsapp' as const, subject: null, body: 'Dear {customer}, gentle reminder: Invoice {voucher_no} of ₹{amount} due on {due_date}.', send_time: '10:00', is_active: true },
      { step: 'D+0' as const, channel: 'email' as const, subject: 'Payment due today', body: 'Dear {customer}, Invoice {voucher_no} of ₹{amount} is due today. Kindly arrange payment.', send_time: '11:00', is_active: true },
      { step: 'D+7' as const, channel: 'whatsapp' as const, subject: null, body: 'Dear {customer}, Invoice {voucher_no} of ₹{amount} is overdue by 7 days.', send_time: '11:00', is_active: true },
      { step: 'D+15' as const, channel: 'email' as const, subject: 'Final reminder before escalation', body: 'Dear {customer}, payment for Invoice {voucher_no} (₹{amount}) is overdue by 15 days.', send_time: '10:30', is_active: true },
      { step: 'D+30' as const, channel: 'email' as const, subject: 'Account on hold notice', body: 'Dear {customer}, your account is being placed on credit hold.', send_time: '10:00', is_active: true },
    ],
    escalation_after_days: 15, is_default: true, is_active: true,
    created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'tpl-2', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'AGGRESSIVE-15', template_name: 'Aggressive 15-day Cycle',
    description: 'Tighter cycle for risky customers',
    messages: [
      { step: 'D-3' as const, channel: 'whatsapp' as const, subject: null, body: 'Reminder: ₹{amount} due in 3 days', send_time: '09:00', is_active: true },
      { step: 'D+0' as const, channel: 'whatsapp' as const, subject: null, body: 'Payment due today', send_time: '09:30', is_active: true },
      { step: 'D+7' as const, channel: 'whatsapp' as const, subject: null, body: '7 days overdue — please pay immediately', send_time: '09:30', is_active: true },
      { step: 'D+15' as const, channel: 'email' as const, subject: 'Legal notice pending', body: 'Final notice', send_time: '10:00', is_active: true },
    ],
    escalation_after_days: 7, is_default: false, is_active: true,
    created_at: nowIso(), updated_at: nowIso(),
  },
  {
    id: 'tpl-3', entity_id: DEFAULT_ENTITY_SHORTCODE,
    template_code: 'SERVICE-NET-45', template_name: 'Services Net-45',
    description: 'Professional services default cadence',
    messages: [
      { step: 'D-3' as const, channel: 'email' as const, subject: 'Reminder', body: 'Dear {customer}, your invoice is due in 3 days', send_time: '10:00', is_active: true },
      { step: 'D+15' as const, channel: 'email' as const, subject: 'Overdue', body: 'Payment overdue', send_time: '11:00', is_active: true },
      { step: 'D+30' as const, channel: 'email' as const, subject: 'Escalation', body: 'Escalating to your finance contact', send_time: '11:00', is_active: true },
      { step: 'D+45' as const, channel: 'email' as const, subject: 'Final notice', body: 'Final notice before legal', send_time: '11:00', is_active: true },
    ],
    escalation_after_days: 30, is_default: false, is_active: true,
    created_at: nowIso(), updated_at: nowIso(),
  },
];

// ─── Collection Execs ───────────────────────────────────────────────────
export const DEMO_COLLECTION_EXECS = [
  { id: 'ce-1', entity_id: DEFAULT_ENTITY_SHORTCODE, exec_code: 'CE-T01', exec_name: 'Vinod Patil',     phone: '+919900100001', email: 'vinod@op.in',    territory_ids: ['TR-WEST'],  customer_category_ids: [], manager_id: null, max_active_tasks: 50, is_active: true, created_at: nowIso(), updated_at: nowIso() },
  { id: 'ce-2', entity_id: DEFAULT_ENTITY_SHORTCODE, exec_code: 'CE-T02', exec_name: 'Sangeeta Pawar',  phone: '+919900100002', email: 'sangeeta@op.in', territory_ids: ['TR-NORTH'], customer_category_ids: [], manager_id: null, max_active_tasks: 40, is_active: true, created_at: nowIso(), updated_at: nowIso() },
  { id: 'ce-3', entity_id: DEFAULT_ENTITY_SHORTCODE, exec_code: 'CE-T03', exec_name: 'Manoj Agarwal',   phone: '+919900100003', email: 'manoj@op.in',    territory_ids: ['TR-SOUTH'], customer_category_ids: [], manager_id: null, max_active_tasks: 45, is_active: true, created_at: nowIso(), updated_at: nowIso() },
];

// ─── Incentive Schemes ──────────────────────────────────────────────────
export const DEMO_INCENTIVE_SCHEMES = [
  { id: 'is-1', entity_id: DEFAULT_ENTITY_SHORTCODE, scheme_code: 'EARLY-PAY-2PCT', scheme_name: 'Early Payment 2%',
    applicable_to: 'all_customers' as const, customer_category_ids: [], specific_customer_ids: [],
    tiers: [{ pay_within_days: 5, discount_pct: 2 }, { pay_within_days: 10, discount_pct: 1 }],
    valid_from: daysFromNow(-90), valid_until: daysFromNow(180), is_active: true,
    created_at: nowIso(), updated_at: nowIso() },
  { id: 'is-2', entity_id: DEFAULT_ENTITY_SHORTCODE, scheme_code: 'QUICK-CLEAR-5PCT', scheme_name: 'Quick Clear 5%',
    applicable_to: 'all_customers' as const, customer_category_ids: [], specific_customer_ids: [],
    tiers: [{ pay_within_days: 3, discount_pct: 5 }],
    valid_from: daysFromNow(-30), valid_until: daysFromNow(60), is_active: true,
    created_at: nowIso(), updated_at: nowIso() },
];

// ─── PTPs (per archetype) ───────────────────────────────────────────────
function basePtp(idx: number): {
  id: string; entity_id: string; task_id: string; party_id: string; party_name: string;
  voucher_no: string; recorded_by: string; recorded_via: 'call' | 'whatsapp' | 'email' | 'meeting' | 'sms';
  notes: string; created_at: string; updated_at: string; evaluation_date: string | null;
  actual_receipt_voucher_no: string | null;
} {
  return {
    id: `ptp-${idx}`, entity_id: DEFAULT_ENTITY_SHORTCODE, task_id: `task-${idx}`,
    party_id: `cust-${idx}`, party_name: `Customer ${idx}`,
    voucher_no: `SI-${String(idx).padStart(4,'0')}`,
    recorded_by: 'collections', recorded_via: 'call', notes: '',
    created_at: nowIso(), updated_at: nowIso(),
    evaluation_date: null, actual_receipt_voucher_no: null,
  };
}

export const DEMO_PTPS_TRADING = [
  { ...basePtp(1), promised_date: daysFromNow(3),  promised_amount: 85000,  status: 'active' as const,    actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(2), promised_date: daysFromNow(7),  promised_amount: 120000, status: 'active' as const,    actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(3), promised_date: daysFromNow(12), promised_amount: 45000,  status: 'active' as const,    actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(4), promised_date: daysFromNow(-5), promised_amount: 250000, status: 'kept' as const,      actual_receipt_date: daysFromNow(-4), actual_amount: 250000 },
  { ...basePtp(5), promised_date: daysFromNow(-8), promised_amount: 90000,  status: 'broken' as const,    actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(6), promised_date: daysFromNow(-6), promised_amount: 150000, status: 'partial' as const,   actual_receipt_date: daysFromNow(-5), actual_amount: 75000 },
  { ...basePtp(7), promised_date: daysFromNow(-12), promised_amount: 60000, status: 'broken' as const,    actual_receipt_date: null, actual_amount: 0 },
];

export const DEMO_PTPS_SERVICES = [
  { ...basePtp(11), promised_date: daysFromNow(5),  promised_amount: 180000, status: 'active' as const, actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(12), promised_date: daysFromNow(10), promised_amount: 220000, status: 'active' as const, actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(13), promised_date: daysFromNow(-7), promised_amount: 350000, status: 'kept' as const,   actual_receipt_date: daysFromNow(-5), actual_amount: 350000 },
  { ...basePtp(14), promised_date: daysFromNow(-10),promised_amount: 280000, status: 'kept' as const,   actual_receipt_date: daysFromNow(-9), actual_amount: 280000 },
];

export const DEMO_PTPS_MFG = [
  { ...basePtp(21), promised_date: daysFromNow(4),  promised_amount: 320000, status: 'active' as const,  actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(22), promised_date: daysFromNow(8),  promised_amount: 480000, status: 'active' as const,  actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(23), promised_date: daysFromNow(11), promised_amount: 220000, status: 'active' as const,  actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(24), promised_date: daysFromNow(15), promised_amount: 380000, status: 'active' as const,  actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(25), promised_date: daysFromNow(-6), promised_amount: 580000, status: 'kept' as const,    actual_receipt_date: daysFromNow(-5), actual_amount: 580000 },
  { ...basePtp(26), promised_date: daysFromNow(-9), promised_amount: 410000, status: 'kept' as const,    actual_receipt_date: daysFromNow(-8), actual_amount: 410000 },
  { ...basePtp(27), promised_date: daysFromNow(-7), promised_amount: 290000, status: 'broken' as const,  actual_receipt_date: null, actual_amount: 0 },
  { ...basePtp(28), promised_date: daysFromNow(-12),promised_amount: 360000, status: 'partial' as const, actual_receipt_date: daysFromNow(-10), actual_amount: 180000 },
];

// ─── Communication Log (per archetype) ──────────────────────────────────
function makeCommLog(prefix: string, count: number) {
  const channels = ['whatsapp', 'email', 'sms'] as const;
  const statuses = ['sent', 'delivered', 'read', 'replied', 'failed'] as const;
  const steps = ['D-3', 'D+0', 'D+7', 'D+15', 'D+30'] as const;
  return Array.from({ length: count }, (_, i) => ({
    id: `cl-${prefix}-${i+1}`, entity_id: DEFAULT_ENTITY_SHORTCODE,
    task_id: `task-${i+1}`, party_id: `cust-${i+1}`,
    party_name: `Customer ${prefix}${i+1}`,
    voucher_no: `SI-${prefix}-${String(i+1).padStart(4,'0')}`,
    channel: channels[i % channels.length],
    template_id: 'tpl-1', cadence_step: steps[i % steps.length],
    direction: 'outbound' as const,
    to_recipient: i % 2 === 0 ? '+919800000000' : 'cust@example.in',
    subject: i % 3 === 0 ? 'Payment reminder' : null,
    body: 'Reminder body',
    provider: 'wa_me_link' as const, provider_message_id: null,
    sent_at: new Date(Date.now() - (i * 6 * 3600 * 1000)).toISOString(),
    delivered_at: null, read_at: null, opened_at: null, replied_at: null,
    failed_at: null, failed_reason: null,
    status: statuses[i % statuses.length],
    sent_by_user: 'system',
    created_at: nowIso(), updated_at: nowIso(),
  }));
}

export const DEMO_COMM_LOG_TRADING = makeCommLog('T', 20);
export const DEMO_COMM_LOG_SERVICES = makeCommLog('S', 12);
export const DEMO_COMM_LOG_MFG = makeCommLog('M', 18);
