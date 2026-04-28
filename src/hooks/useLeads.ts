/**
 * useLeads.ts — Lead Aggregation CRUD + convert-to-enquiry
 * [JWT] /api/salesx/leads
 */
import { useState, useCallback } from 'react';
import type { Lead, LeadImportRow, LeadPlatform } from '@/types/lead';
import { leadsKey } from '@/types/lead';

function ls<T>(k: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(k) || '[]') as T[];
  } catch { return []; }
}

function genLeadNo(entityCode: string, existing: Lead[]): string {
  const fy = new Date().getFullYear();
  const seq = String(existing.length + 1).padStart(4, '0');
  return `LEAD/${entityCode}/${fy}-${String(fy + 1).slice(-2)}/${seq}`;
}

export function useLeads(entityCode: string) {
  const key = leadsKey(entityCode);
  const [leads, setLeads] = useState<Lead[]>(() => ls<Lead>(key));

  const persist = useCallback((next: Lead[]) => {
    // [JWT] POST /api/salesx/leads
    localStorage.setItem(key, JSON.stringify(next));
    setLeads(next);
  }, [key]);

  const reload = useCallback(() => {
    setLeads(ls<Lead>(key));
  }, [key]);

  const saveLead = useCallback((
    data: Omit<Lead, 'id' | 'lead_no' | 'created_at' | 'updated_at'> & { id?: string },
  ) => {
    const now = new Date().toISOString();
    const list = ls<Lead>(key);
    if (data.id) {
      const idx = list.findIndex(l => l.id === data.id);
      if (idx >= 0) list[idx] = { ...list[idx], ...data, id: data.id, updated_at: now };
    } else {
      list.push({
        ...data,
        id: `lead-${Date.now()}`,
        lead_no: genLeadNo(entityCode, list),
        created_at: now, updated_at: now,
      });
    }
    persist(list);
    return list;
  }, [key, entityCode, persist]);

  const deleteLead = useCallback((id: string) => {
    persist(ls<Lead>(key).filter(l => l.id !== id));
  }, [key, persist]);

  const markDuplicate = useCallback((id: string, originalId: string) => {
    const list = ls<Lead>(key).map(l =>
      l.id === id
        ? { ...l, is_duplicate: true, duplicate_of_lead_id: originalId,
            status: 'duplicate' as const, updated_at: new Date().toISOString() }
        : l,
    );
    persist(list);
  }, [key, persist]);

  const convertToEnquiry = useCallback((id: string, enquiryId: string) => {
    const list = ls<Lead>(key).map(l =>
      l.id === id
        ? { ...l, status: 'converted' as const, converted_enquiry_id: enquiryId,
            converted_at: new Date().toISOString(), updated_at: new Date().toISOString() }
        : l,
    );
    persist(list);
  }, [key, persist]);

  const bulkImport = useCallback((
    rows: LeadImportRow[],
    platform: LeadPlatform,
  ): { added: number; duplicates: number } => {
    const list = ls<Lead>(key);
    let added = 0; let duplicates = 0;
    const now = new Date().toISOString();
    rows.forEach(row => {
      const isDup = list.some(l =>
        (!!row.phone && l.phone === row.phone) ||
        (!!row.email && l.email === row.email),
      );
      const lead: Lead = {
        id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        entity_id: entityCode,
        lead_no: genLeadNo(entityCode, [...list]),
        lead_date: new Date().toISOString().split('T')[0],
        platform,
        status: isDup ? 'duplicate' : 'new',
        contact_name: row.contact_name,
        company_name: row.company_name ?? null,
        phone: row.phone ?? null,
        email: row.email ?? null,
        city: row.city ?? null,
        state: null,
        product_interest: row.product_interest ?? null,
        estimated_value: null,
        priority: 'medium',
        assigned_salesman_id: null,
        assigned_salesman_name: null,
        assigned_telecaller_id: null,
        platform_meta: row.portal_query ? { portal_query: row.portal_query } : null,
        is_duplicate: isDup,
        duplicate_of_lead_id: isDup
          ? (list.find(l =>
              (!!row.phone && l.phone === row.phone) ||
              (!!row.email && l.email === row.email),
            )?.id ?? null)
          : null,
        next_follow_up: null,
        notes: null,
        converted_enquiry_id: null,
        converted_at: null,
        campaign_code: null,
        is_active: true,
        created_at: now,
        updated_at: now,
      };
      list.push(lead);
      if (isDup) duplicates++; else added++;
    });
    persist(list);
    return { added, duplicates };
  }, [key, entityCode, persist]);

  return {
    leads, saveLead, deleteLead,
    markDuplicate, convertToEnquiry, bulkImport, reload,
  };
}
