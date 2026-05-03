/**
 * @file        useCapitalIndents.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Department-scoped reader for Capital Indents (SD-16).
 * @[JWT]       GET /api/requestx/capital-indents
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { useDepartmentVisibility } from './useDepartmentVisibility';
import { capitalIndentsKey, type CapitalIndent } from '@/types/capital-indent';

export function useCapitalIndents(): CapitalIndent[] {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('requestx');

  return useMemo(() => {
    try {
      const raw = localStorage.getItem(capitalIndentsKey(entityCode));
      const all = (raw ? JSON.parse(raw) : []) as CapitalIndent[];
      if (visibility.canViewAllDepartments) return all;
      if (!visibility.myDepartmentId) return [];
      return all.filter(i => i.originating_department_id === visibility.myDepartmentId);
    } catch {
      return [];
    }
  }, [entityCode, visibility]);
}
