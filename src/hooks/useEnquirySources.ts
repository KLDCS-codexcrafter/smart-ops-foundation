/**
 * useEnquirySources.ts — CRUD for enquiry source master
 * [JWT] /api/salesx/enquiry-sources
 */
import { useState, useCallback } from 'react';
import type { EnquirySource } from '@/types/enquiry-source';
import { enquirySourcesKey } from '@/types/enquiry-source';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.3 · Block 1b · salesx_master_event

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]');
  } catch { return []; }
}

export function useEnquirySources(entityCode: string) {
  const key = enquirySourcesKey(entityCode);
  const [sources, setSources] = useState<EnquirySource[]>(() => ls<EnquirySource>(key));

  const persist = useCallback((next: EnquirySource[]) => {
    // [JWT] POST /api/salesx/enquiry-sources
    localStorage.setItem(key, JSON.stringify(next));
    setSources(next);
  }, [key]);

  const saveSource = useCallback((data: Omit<EnquirySource, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
    const now = new Date().toISOString();
    const list = ls<EnquirySource>(key);
    if (data.id) {
      const idx = list.findIndex(s => s.id === data.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
      }
    } else {
      const rec = {
        ...data,
        id: `esrc-${Date.now()}`,
        created_at: now,
        updated_at: now,
      };
      list.push(rec);
      logAudit({
        entityCode, action: 'create', entityType: 'salesx_master_event',
        recordId: rec.id, recordLabel: `Enquiry Source · ${rec.source_name ?? rec.id}`,
        beforeState: null, afterState: rec as unknown as Record<string, unknown>,
        reason: 'enquiry_source_created', sourceModule: 'useEnquirySources',
      });
    }
    persist(list);
    return list;
  }, [key, persist, entityCode]);

  const deleteSource = useCallback((id: string) => {
    persist(ls<EnquirySource>(key).filter(s => s.id !== id));
  }, [key, persist]);

  return { sources, saveSource, deleteSource };
}
