/**
 * call-session.ts — Telecaller call session
 * [JWT] GET/POST/PUT/DELETE /api/salesx/call-sessions
 */

export type CallDisposition =
  | 'interested' | 'not_interested' | 'callback'
  | 'no_answer' | 'wrong_number' | 'dnd' | 'converted';

export interface CallSession {
  id: string;
  entity_id: string;
  session_no: string;
  call_date: string;
  telecaller_id: string;
  telecaller_name: string;
  enquiry_id: string | null;
  enquiry_no: string | null;
  contact_name: string | null;
  phone_number: string;
  call_type: 'outbound' | 'inbound' | 'callback';
  disposition: CallDisposition;
  duration_seconds: number;
  notes: string;
  follow_up_date: string | null;
  follow_up_time: string | null;
  // Recording (Phase 1 stub — actual capture in Phase 2)
  recording_url: string | null;
  recording_duration_secs: number | null;
  recording_consent: boolean;
  // Auto-dialer
  dialer_session_id: string | null;
  dialer_position: number | null;
  // WhatsApp follow-up
  wa_template_sent: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const callSessionsKey = (e: string) => `erp_call_sessions_${e}`;

// ─── Auto-dialer session (groups multiple sequential calls) ─────────
export interface DialerSession {
  id: string;
  entity_id: string;
  started_at: string;
  ended_at: string | null;
  total_targets: number;
  calls_made: number;
  successful_dispositions: number;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  filter_label: string;
  created_at: string;
  updated_at: string;
}

export const dialerSessionsKey = (e: string) => `erp_dialer_sessions_${e}`;
