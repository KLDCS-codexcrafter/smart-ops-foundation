/**
 * useOpportunities.ts — CRM Pipeline opportunity CRUD
 * [JWT] GET/POST/PUT/DELETE /api/salesx/opportunities
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { Opportunity } from '@/types/opportunity';
import { opportunitiesKey } from '@/types/opportunity';

function load(entityCode: string): Opportunity[] {
  try {
    // [JWT] GET /api/salesx/opportunities?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(opportunitiesKey(entityCode)) || '[]');
  } catch { return []; }
}

export function useOpportunities(entityCode: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => load(entityCode));

  const createOpportunity = (
    form: Omit<Opportunity, 'id' | 'opportunity_no' | 'entity_id' | 'created_at' | 'updated_at'>,
  ): Opportunity => {
    const all = load(entityCode);
    const seq = String(all.length + 1).padStart(4, '0');
    const fy = new Date().getFullYear();
    const opp: Opportunity = {
      ...form,
      id: `opp-${Date.now()}`,
      entity_id: entityCode,
      opportunity_no: `OPP/${fy}-${fy + 1}/${seq}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [...all, opp];
    setOpportunities(updated);
    // [JWT] POST /api/salesx/opportunities
    localStorage.setItem(opportunitiesKey(entityCode), JSON.stringify(updated));
    toast.success(`Opportunity ${opp.opportunity_no} created`);
    return opp;
  };

  const updateOpportunity = (id: string, patch: Partial<Opportunity>): void => {
    const all = load(entityCode);
    const updated = all.map(o =>
      o.id === id
        ? { ...o, ...patch, updated_at: new Date().toISOString() }
        : o
    );
    setOpportunities(updated);
    // [JWT] PATCH /api/salesx/opportunities/:id
    localStorage.setItem(opportunitiesKey(entityCode), JSON.stringify(updated));
    toast.success('Opportunity updated');
  };

  return { opportunities, createOpportunity, updateOpportunity };
}
