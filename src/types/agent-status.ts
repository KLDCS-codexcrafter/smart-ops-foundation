/**
 * agent-status.ts — Telecaller live status tracking · Canvas Wave 4 (T-Phase-1.1.1h)
 * [JWT] GET/POST /api/salesx/agent-status
 *
 * 5-state machine for live monitoring:
 *   offline → available → on_call → wrap_up → available  (normal call cycle)
 *   available → break → available                         (break flow)
 *   any → offline                                         (logout)
 */

export type AgentState = 'offline' | 'available' | 'on_call' | 'break' | 'wrap_up';

export const AGENT_STATE_LABELS: Record<AgentState, string> = {
  offline:   'Offline',
  available: 'Available',
  on_call:   'On Call',
  break:     'On Break',
  wrap_up:   'Wrap-up',
};

export const AGENT_STATE_COLORS: Record<AgentState, string> = {
  offline:   'bg-muted text-muted-foreground border-border',
  available: 'bg-green-500/15 text-green-700 border-green-500/30',
  on_call:   'bg-orange-500/15 text-orange-700 border-orange-500/30 animate-pulse',
  break:     'bg-amber-500/15 text-amber-700 border-amber-500/30',
  wrap_up:   'bg-blue-500/15 text-blue-700 border-blue-500/30',
};

export const ALLOWED_TRANSITIONS: Record<AgentState, AgentState[]> = {
  offline:   ['available'],
  available: ['on_call', 'break', 'offline'],
  on_call:   ['wrap_up', 'available'],
  break:     ['available', 'offline'],
  wrap_up:   ['available', 'on_call'],
};

export interface AgentStatus {
  id: string;
  entity_id: string;
  telecaller_id: string;
  telecaller_name: string;
  state: AgentState;
  state_changed_at: string;
  current_session_id: string | null;
  current_dialer_id: string | null;
  break_reason: string | null;
  calls_today: number;
  on_call_seconds_today: number;
  break_seconds_today: number;
  wrap_seconds_today: number;
  available_seconds_today: number;
  last_login_at: string | null;
  last_logout_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentStatusEvent {
  id: string;
  entity_id: string;
  telecaller_id: string;
  from_state: AgentState | null;
  to_state: AgentState;
  changed_at: string;
  duration_in_prev_state_secs: number | null;
  reason: string | null;
  created_at: string;
}

export const agentStatusKey = (e: string) => `erp_agent_status_${e}`;
export const agentStatusEventsKey = (e: string) => `erp_agent_status_events_${e}`;
