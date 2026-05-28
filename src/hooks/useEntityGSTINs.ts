/**
 * @file        src/hooks/useEntityGSTINs.ts
 * @purpose     Multi-GSTIN entity selector · returns gstRegs[] for current entity (parent/company/subsidiary)
 * @sprint      Sprint 70b · T-Phase-5.A.1.2-PASS-B · Block 8 · DP-S70-5
 * @decisions   DP-S70-5 (multi-GSTIN via useEntityGSTINs hook)
 * @iso         Reliability · Maintainability
 * @disciplines FR-13 · FR-43 unit tests · FR-100 RECG
 * @reads-from  localStorage (erp_parent_company · erp_companies · erp_subsidiaries · Phase-1)
 *              GSTReg type from src/components/company/GovernanceForm.tsx
 */
import { useState, useEffect, useCallback } from 'react';
import type { GSTReg } from '@/components/company/GovernanceForm';

export interface EntityGSTIN {
  gstin: string;
  state: string;
  state_code?: string;
  is_primary: boolean;
  registration_type: string;
  gstr1_periodicity: string;
  verified: boolean;
}

export function useEntityGSTINs(entity_id: string): {
  gstins: EntityGSTIN[];
  activeGSTIN: string;
  setActiveGSTIN: (gstin: string) => void;
  loading: boolean;
} {
  const [gstins, setGstins] = useState<EntityGSTIN[]>([]);
  const [activeGSTIN, setActiveGSTINState] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entity_id) {
      setGstins([]);
      setActiveGSTINState('');
      setLoading(false);
      return;
    }
    try {
      const raw = readEntityGSTRegs(entity_id);
      const mapped = raw.map((r, idx) => toEntityGSTIN(r, idx === 0));
      setGstins(mapped);
      setActiveGSTINState(mapped[0]?.gstin ?? '');
    } catch {
      setGstins([]);
      setActiveGSTINState('');
    } finally {
      setLoading(false);
    }
  }, [entity_id]);

  const setActiveGSTIN = useCallback((gstin: string) => {
    setActiveGSTINState(gstin);
  }, []);

  return { gstins, activeGSTIN, setActiveGSTIN, loading };
}

// ── Internal helpers ────────────────────────────────────────────────

// [JWT] GET /api/foundation/entities/<id>/gst-regs · Phase 2 migration
function readEntityGSTRegs(entity_id: string): GSTReg[] {
  if (entity_id === 'parent-root') {
    const raw = localStorage.getItem('erp_parent_company');
    if (raw) {
      try {
        const obj = JSON.parse(raw) as { gstRegs?: GSTReg[] };
        return Array.isArray(obj.gstRegs) ? obj.gstRegs : [];
      } catch { return []; }
    }
    return [];
  }
  const companies = readArray<{ id?: unknown; gstRegs?: GSTReg[] }>('erp_companies');
  const c = companies.find(x => String(x.id) === entity_id);
  if (c && Array.isArray(c.gstRegs)) return c.gstRegs;
  const subs = readArray<{ id?: unknown; gstRegs?: GSTReg[] }>('erp_subsidiaries');
  const s = subs.find(x => String(x.id) === entity_id);
  if (s && Array.isArray(s.gstRegs)) return s.gstRegs;
  return [];
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch { return []; }
}

function toEntityGSTIN(reg: GSTReg, isPrimary: boolean): EntityGSTIN {
  const state_code = reg.gstin && reg.gstin.length >= 2 ? reg.gstin.slice(0, 2) : undefined;
  return {
    gstin: reg.gstin,
    state: reg.state,
    state_code,
    is_primary: isPrimary,
    registration_type: reg.registrationType,
    gstr1_periodicity: reg.gstr1Periodicity,
    verified: reg.gstinVerified,
  };
}
