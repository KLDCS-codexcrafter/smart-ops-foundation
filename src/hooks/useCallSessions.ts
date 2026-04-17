/**
 * useCallSessions.ts — Telecaller call session CRUD
 * [JWT] GET/POST/PUT /api/salesx/call-sessions
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { CallSession } from '@/types/call-session';
import { callSessionsKey } from '@/types/call-session';

export function useCallSessions(entityCode: string) {
  const [sessions, setSessions] = useState<CallSession[]>(() => {
    try {
      // [JWT] GET /api/salesx/call-sessions?entityCode={entityCode}
      return JSON.parse(localStorage.getItem(callSessionsKey(entityCode)) || '[]');
    } catch { return []; }
  });

  const createSession = (
    form: Omit<CallSession, 'id' | 'session_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): CallSession => {
    const all = sessions;
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
    setSessions(updated);
    // [JWT] POST /api/salesx/call-sessions
    localStorage.setItem(callSessionsKey(entityCode), JSON.stringify(updated));
    toast.success(`Call session ${s.session_no} saved`);
    return s;
  };

  return { sessions, createSession };
}
