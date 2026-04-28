/**
 * useWebinars.ts — CRUD for Webinar master + Participant register
 * [JWT] /api/salesx/webinars · /api/salesx/webinar-participants
 */
import { useState, useCallback } from 'react';
import type { Webinar, WebinarParticipant } from '@/types/webinar';
import { webinarsKey, webinarParticipantsKey } from '@/types/webinar';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]') as T[];
  } catch { return []; }
}

export function useWebinars(entityCode: string) {
  const wKey = webinarsKey(entityCode);
  const pKey = webinarParticipantsKey(entityCode);

  const [webinars, setWebinars] = useState<Webinar[]>(() => ls<Webinar>(wKey));
  const [participants, setParticipants] = useState<WebinarParticipant[]>(() => ls<WebinarParticipant>(pKey));

  const persistW = useCallback((next: Webinar[]) => {
    // [JWT] POST /api/salesx/webinars
    localStorage.setItem(wKey, JSON.stringify(next));
    setWebinars(next);
  }, [wKey]);

  const persistP = useCallback((next: WebinarParticipant[]) => {
    // [JWT] POST /api/salesx/webinar-participants
    localStorage.setItem(pKey, JSON.stringify(next));
    setParticipants(next);
  }, [pKey]);

  const saveWebinar = useCallback((
    data: Omit<Webinar, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<Webinar>(wKey);
    if (data.id) {
      const idx = list.findIndex(w => w.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `web-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistW(list);
    return list;
  }, [wKey, persistW]);

  const deleteWebinar = useCallback((id: string) => {
    persistW(ls<Webinar>(wKey).filter(w => w.id !== id));
    persistP(ls<WebinarParticipant>(pKey).filter(p => p.webinar_id !== id));
  }, [wKey, pKey, persistW, persistP]);

  const saveParticipant = useCallback((
    data: Omit<WebinarParticipant, 'id' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<WebinarParticipant>(pKey);
    if (data.id) {
      const idx = list.findIndex(p => p.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({ ...data, id: `par-${Date.now()}`, created_at: now, updated_at: now });
    }
    persistP(list);
    return list;
  }, [pKey, persistP]);

  const deleteParticipant = useCallback((id: string) => {
    persistP(ls<WebinarParticipant>(pKey).filter(p => p.id !== id));
  }, [pKey, persistP]);

  const participantsForWebinar = useCallback((webinarId: string) =>
    participants.filter(p => p.webinar_id === webinarId),
  [participants]);

  return {
    webinars, participants,
    saveWebinar, deleteWebinar,
    saveParticipant, deleteParticipant,
    participantsForWebinar,
  };
}
