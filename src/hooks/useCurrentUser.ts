/**
 * @file        useCurrentUser.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Current user resolver · Phase 1 stub backed by localStorage.
 * @decisions   D-194, D-233
 * @disciplines SD-15, SD-16
 * @[JWT]       GET /api/auth/me
 */
import { useMemo } from 'react';
import type { UserRole } from '@/types/card-entitlement';

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  subrole: 'store_officer' | 'procurement_officer' | 'finance_officer' | null;
  department_id: string | null;
  department_code: string | null;
  default_godown_id: string | null;
  accessible_godown_ids: string[];
}

export function useCurrentUser(): CurrentUser | null {
  return useMemo(() => {
    try {
      // [JWT] GET /api/auth/me
      const raw = localStorage.getItem('4ds_current_user_profile');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CurrentUser>;
        return {
          id: parsed.id ?? 'demo-user',
          name: parsed.name ?? 'Demo User',
          role: parsed.role ?? 'operations',
          subrole: parsed.subrole ?? null,
          department_id: parsed.department_id ?? null,
          department_code: parsed.department_code ?? null,
          default_godown_id: parsed.default_godown_id ?? null,
          accessible_godown_ids: parsed.accessible_godown_ids ?? [],
        };
      }
      const id = JSON.parse(localStorage.getItem('4ds_login_credential') ?? '{}')?.value ?? 'demo-user';
      return {
        id,
        name: id,
        role: 'operations',
        subrole: null,
        department_id: null,
        department_code: null,
        default_godown_id: null,
        accessible_godown_ids: [],
      };
    } catch {
      return null;
    }
  }, []);
}
