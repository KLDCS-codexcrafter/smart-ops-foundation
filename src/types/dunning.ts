/**
 * dunning.ts — Progressive escalation types
 * Sprint 8. 4 stages tied to days overdue: polite -> firm -> final -> legal.
 * [JWT] POST /api/receivx/dunning/send
 */

export type DunningStage = 'polite' | 'firm' | 'final' | 'legal';

export interface DunningTemplate {
  stage: DunningStage;
  subject: string;
  body: string;
  trigger_days_overdue: number;
  tone_hint: string;
}

export interface DunningEmail {
  id: string;
  entity_id: string;
  party_id: string;
  party_name: string;
  voucher_ids: string[];
  total_overdue: number;
  stage: DunningStage;
  subject: string;
  body_rendered: string;
  sent_to_email: string;
  sent_at: string;
  sent_by_user: string;
  delivery_status: 'sent' | 'failed' | 'opened' | 'replied';
  created_at: string;
}

export const dunningSentKey = (e: string) => `erp_dunning_sent_${e}`;

export const STAGE_LABELS: Record<DunningStage, string> = {
  polite: 'Polite Reminder',
  firm: 'Firm Reminder',
  final: 'Final Notice',
  legal: 'Legal Notice',
};

export const STAGE_COLOURS: Record<DunningStage, string> = {
  polite: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
  firm: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  final: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
  legal: 'bg-destructive/15 text-destructive border-destructive/30',
};

export const DEFAULT_DUNNING_TEMPLATES: DunningTemplate[] = [
  {
    stage: 'polite', trigger_days_overdue: 7,
    tone_hint: 'Friendly nudge, assumes oversight',
    subject: 'Gentle reminder — Invoice {voucher_nos} pending',
    body: 'Dear {party_name},\n\nJust a friendly reminder that invoice(s) {voucher_nos} totalling INR {total_overdue} are pending payment. We know how busy things can get. A gentle reminder in case this slipped through.\n\nPlease clear at your convenience. The pay link is {payment_link}.\n\nThank you,\n{sender_name}',
  },
  {
    stage: 'firm', trigger_days_overdue: 15,
    tone_hint: 'Direct, expects action this week',
    subject: 'Payment overdue — Invoice {voucher_nos}',
    body: 'Dear {party_name},\n\nInvoice {voucher_nos} for INR {total_overdue} is now {days_overdue} days past due. Please arrange payment this week to avoid further escalation.\n\nPayment link: {payment_link}\n\nIf you have already paid, please share the UTR so we can update our records.\n\nRegards,\n{sender_name}',
  },
  {
    stage: 'final', trigger_days_overdue: 30,
    tone_hint: 'Final notice before legal action',
    subject: 'FINAL NOTICE — Invoice {voucher_nos} — Immediate payment required',
    body: 'Dear {party_name},\n\nThis is a FINAL NOTICE for invoice {voucher_nos}, now {days_overdue} days overdue, amounting to INR {total_overdue}.\n\nUnless payment is received within 7 working days from this notice, we will have no option but to initiate recovery proceedings and suspend further supply.\n\nTo avoid this, please pay immediately via: {payment_link}\n\nRegards,\n{sender_name}',
  },
  {
    stage: 'legal', trigger_days_overdue: 60,
    tone_hint: 'Legal action initiated',
    subject: 'LEGAL NOTICE — Recovery proceedings initiated — {voucher_nos}',
    body: 'Dear {party_name},\n\nWe regret to inform you that despite repeated reminders, invoice {voucher_nos} totalling INR {total_overdue} remains unpaid after {days_overdue} days.\n\nOur legal department has been instructed to commence recovery proceedings. You will shortly receive a formal demand notice from our advocates. Further supply to your account stands suspended.\n\nTo settle this matter immediately and avoid legal costs, please pay in full using: {payment_link}\n\nRegards,\n{sender_name}',
  },
];
