/**
 * useCallSessions.ts — Telecaller call session CRUD + dialer + recording stub
 * [JWT] GET/POST/PUT /api/salesx/call-sessions · /api/salesx/dialer-sessions
 */
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { CallSession, DialerSession } from '@/types/call-session';
import { callSessionsKey, dialerSessionsKey } from '@/types/call-session';

function ls<T>(k: string): T[] {
  try { return JSON.parse(localStorage.getItem(k) || '[]') as T[]; }
  catch { return []; }
}

export function useCallSessions(entityCode: string) {
  const csKey = callSessionsKey(entityCode);
  const dsKey = dialerSessionsKey(entityCode);

  const [sessions, setSessions] = useState<CallSession[]>(() => ls<CallSession>(csKey));
  const [dialerSessions, setDialerSessions] = useState<DialerSession[]>(() => ls<DialerSession>(dsKey));

  const persistCs = useCallback((next: CallSession[]) => {
    // [JWT] POST /api/salesx/call-sessions
    localStorage.setItem(csKey, JSON.stringify(next));
    setSessions(next);
  }, [csKey]);

  const persistDs = useCallback((next: DialerSession[]) => {
    // [JWT] POST /api/salesx/dialer-sessions
    localStorage.setItem(dsKey, JSON.stringify(next));
    setDialerSessions(next);
  }, [dsKey]);

  const createSession = useCallback((
    form: Omit<CallSession, 'id' | 'session_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): CallSession => {
    const all = ls<CallSession>(csKey);
    const seq = String(all.length + 1).padStart(4, '0');
    const fy = new Date().getFullYear();
    const s: CallSession = {
      ...form,
      id: `cs-${Date.now()}`,
      entity_id: entityCode,
      session_no: `CALL/${fy}-${fy + 1}/${seq}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...all, s];
    persistCs(updated);
    toast.success(`Call session ${s.session_no} saved`);
    return s;
  }, [csKey, entityCode, persistCs]);

  const startDialerSession = useCallback((
    targets: number,
    filterLabel: string,
  ): DialerSession => {
    const now = new Date().toISOString();
    const ds: DialerSession = {
      id: `ds-${Date.now()}`,
      entity_id: entityCode,
      started_at: now, ended_at: null,
      total_targets: targets, calls_made: 0, successful_dispositions: 0,
      status: 'active', filter_label: filterLabel,
      created_at: now, updated_at: now,
    };
    persistDs([...ls<DialerSession>(dsKey), ds]);
    return ds;
  }, [dsKey, entityCode, persistDs]);

  const incrementDialerSession = useCallback((
    dialerId: string,
    successfulDisposition: boolean,
  ) => {
    const list = ls<DialerSession>(dsKey).map(d =>
      d.id === dialerId
        ? {
            ...d,
            calls_made: d.calls_made + 1,
            successful_dispositions: d.successful_dispositions + (successfulDisposition ? 1 : 0),
            updated_at: new Date().toISOString(),
          }
        : d,
    );
    persistDs(list);
  }, [dsKey, persistDs]);

  const endDialerSession = useCallback((
    dialerId: string,
    status: 'completed' | 'cancelled' | 'paused',
  ) => {
    const now = new Date().toISOString();
    const list = ls<DialerSession>(dsKey).map(d =>
      d.id === dialerId
        ? { ...d, status, ended_at: status === 'paused' ? null : now, updated_at: now }
        : d,
    );
    persistDs(list);
  }, [dsKey, persistDs]);

  return {
    sessions, dialerSessions,
    createSession,
    startDialerSession, incrementDialerSession, endDialerSession,
  };
}
