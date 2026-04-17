/**
 * useProspects.ts — Prospectus CRUD
 * Permanent records — never deleted.
 * [JWT] GET/POST/PUT /api/salesx/prospects
 */
import { useState, useMemo } from 'react';
import type { Prospectus } from '@/types/prospectus';
import { prospectsKey } from '@/types/prospectus';

function load(entityCode: string): Prospectus[] {
  try {
    // [JWT] GET /api/salesx/prospects?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(prospectsKey(entityCode)) || '[]');
  } catch { return []; }
}

export function useProspects(entityCode: string) {
  const [prospects, setProspects] = useState<Prospectus[]>(() => load(entityCode));

  const findByCompanyName = useMemo(
    () => (name: string): Prospectus[] => {
      if (!name || name.length < 2) return [];
      const q = name.toLowerCase();
      return prospects.filter(p => p.company_name.toLowerCase().includes(q));
    },
    [prospects],
  );

  const updateProspect = (id: string, patch: Partial<Prospectus>): void => {
    const all = load(entityCode);
    const updated = all.map(p =>
      p.id === id
        ? { ...p, ...patch, updated_at: new Date().toISOString() }
        : p
    );
    setProspects(updated);
    // [JWT] PUT /api/salesx/prospects/:id
    localStorage.setItem(prospectsKey(entityCode), JSON.stringify(updated));
  };

  return { prospects, findByCompanyName, updateProspect };
}
