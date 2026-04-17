/**
 * useLeads.ts — Lead CRUD stub. Fully used in SalesX Sprint 2.
 * [JWT] GET/POST/PUT/DELETE /api/salesx/leads
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Lead } from '@/types/lead';
import { leadsKey } from '@/types/lead';

function load(entityCode: string): Lead[] {
  try {
    // [JWT] GET /api/salesx/leads?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(leadsKey(entityCode)) || '[]');
  } catch { return []; }
}

export function useLeads(entityCode: string) {
  const [leads, setLeads] = useState<Lead[]>(() => load(entityCode));

  const createLead = (
    form: Omit<Lead, 'id' | 'lead_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): Lead => {
    const all = load(entityCode);
    const fy = new Date().getFullYear();
    const seq = String(all.length + 1).padStart(4, '0');
    const lead: Lead = {
      ...form,
      id: `lead-${Date.now()}`,
      entity_id: entityCode,
      lead_no: `LEAD/${fy}-${fy + 1}/${seq}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...all, lead];
    setLeads(updated);
    // [JWT] POST /api/salesx/leads
    localStorage.setItem(leadsKey(entityCode), JSON.stringify(updated));
    toast.success(`Lead ${lead.lead_no} created`);
    return lead;
  };

  const updateLead = (id: string, patch: Partial<Lead>): void => {
    const all = load(entityCode);
    const updated = all.map(l =>
      l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l,
    );
    setLeads(updated);
    // [JWT] PATCH /api/salesx/leads/:id
    localStorage.setItem(leadsKey(entityCode), JSON.stringify(updated));
    toast.success('Lead updated');
  };

  return { leads, createLead, updateLead };
}
