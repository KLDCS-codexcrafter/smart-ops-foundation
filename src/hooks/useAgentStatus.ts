/**
 * useAgentStatus.ts — Live agent state tracking + transition logging
 * [JWT] /api/salesx/agent-status · /api/salesx/agent-status-events
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { AgentState, AgentStatus, AgentStatusEvent } from '@/types/agent-status';
import { agentStatusKey, agentStatusEventsKey, ALLOWED_TRANSITIONS } from '@/types/agent-status';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

const todayISO = () => new Date().toISOString().split('T')[0];

export function useAgentStatus(entityCode: string) {
  const sKey = agentStatusKey(entityCode);
  const eKey = agentStatusEventsKey(entityCode);

  const [statuses, setStatuses] = useState<AgentStatus[]>(() => ls<AgentStatus>(sKey));
  const [events, setEvents] = useState<AgentStatusEvent[]>(() => ls<AgentStatusEvent>(eKey));

  const persistStatuses = useCallback((next: AgentStatus[]) => {
    // [JWT] POST /api/salesx/agent-status
    localStorage.setItem(sKey, JSON.stringify(next));
    setStatuses(next);
  }, [sKey]);

  const persistEvents = useCallback((next: AgentStatusEvent[]) => {
    // [JWT] POST /api/salesx/agent-status-events
    localStorage.setItem(eKey, JSON.stringify(next));
    setEvents(next);
  }, [eKey]);

  const ensureStatus = useCallback((
    telecallerId: string,
    telecallerName: string,
  ): AgentStatus => {
    const list = ls<AgentStatus>(sKey);
    const today = todayISO();
    const existing = list.find(s =>
      s.telecaller_id === telecallerId && s.created_at.split('T')[0] === today,
    );
    if (existing) return existing;
    const now = new Date().toISOString();
    const fresh: AgentStatus = {
      id: `as-${Date.now()}-${telecallerId}`,
      entity_id: entityCode,
      telecaller_id: telecallerId, telecaller_name: telecallerName,
      state: 'offline',
      state_changed_at: now,
      current_session_id: null, current_dialer_id: null, break_reason: null,
      calls_today: 0,
      on_call_seconds_today: 0, break_seconds_today: 0,
      wrap_seconds_today: 0, available_seconds_today: 0,
      last_login_at: null, last_logout_at: null,
      is_active: true, created_at: now, updated_at: now,
    };
    persistStatuses([...list, fresh]);
    return fresh;
  }, [sKey, entityCode, persistStatuses]);

  const transitionTo = useCallback((
    telecallerId: string,
    telecallerName: string,
    nextState: AgentState,
    reason?: string,
  ): boolean => {
    const list = ls<AgentStatus>(sKey);
    const idx = list.findIndex(s =>
      s.telecaller_id === telecallerId && s.created_at.split('T')[0] === todayISO(),
    );
    let row: AgentStatus;
    if (idx < 0) {
      row = ensureStatus(telecallerId, telecallerName);
    } else {
      row = list[idx];
    }
    const allowed = ALLOWED_TRANSITIONS[row.state];
    if (!allowed.includes(nextState)) {
      toast.error(`Cannot transition from ${row.state} to ${nextState}`);
      return false;
    }
    const now = new Date().toISOString();
    const prevSecs = Math.floor((Date.now() - new Date(row.state_changed_at).getTime()) / 1000);
    const updated: AgentStatus = { ...row };
    if (row.state === 'on_call') updated.on_call_seconds_today += prevSecs;
    else if (row.state === 'break') updated.break_seconds_today += prevSecs;
    else if (row.state === 'wrap_up') updated.wrap_seconds_today += prevSecs;
    else if (row.state === 'available') updated.available_seconds_today += prevSecs;
    updated.state = nextState;
    updated.state_changed_at = now;
    updated.updated_at = now;
    if (nextState === 'available' && row.state === 'offline') updated.last_login_at = now;
    if (nextState === 'offline') updated.last_logout_at = now;
    if (nextState === 'break') updated.break_reason = reason ?? null;
    if (nextState !== 'break') updated.break_reason = null;

    const newList = idx < 0
      ? [...ls<AgentStatus>(sKey).filter(s => s.id !== updated.id), updated]
      : list.map(s => s.id === updated.id ? updated : s);
    persistStatuses(newList);

    const event: AgentStatusEvent = {
      id: `ase-${Date.now()}`,
      entity_id: entityCode,
      telecaller_id: telecallerId,
      from_state: row.state,
      to_state: nextState,
      changed_at: now,
      duration_in_prev_state_secs: prevSecs,
      reason: reason ?? null,
      created_at: now,
    };
    persistEvents([...ls<AgentStatusEvent>(eKey), event]);
    return true;
  }, [sKey, eKey, entityCode, ensureStatus, persistStatuses, persistEvents]);

  const incrementCallCount = useCallback((telecallerId: string) => {
    const list = ls<AgentStatus>(sKey);
    const today = todayISO();
    const updated = list.map(s =>
      s.telecaller_id === telecallerId && s.created_at.split('T')[0] === today
        ? { ...s, calls_today: s.calls_today + 1, updated_at: new Date().toISOString() }
        : s,
    );
    persistStatuses(updated);
  }, [sKey, persistStatuses]);

  return {
    statuses, events,
    ensureStatus, transitionTo, incrementCallCount,
  };
}
