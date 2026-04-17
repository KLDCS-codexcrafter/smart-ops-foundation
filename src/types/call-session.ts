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
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const callSessionsKey = (e: string) => `erp_call_sessions_${e}`;
