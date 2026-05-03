/**
 * @file        useMaterialIndents.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Department-scoped reader for Material Indents (SD-16).
 * @decisions   D-194, D-218, D-232
 * @disciplines SD-15, SD-16
 * @[JWT]       GET /api/requestx/material-indents
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { useDepartmentVisibility } from './useDepartmentVisibility';
import { materialIndentsKey, type MaterialIndent } from '@/types/material-indent';

export function useMaterialIndents(): MaterialIndent[] {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('requestx');

  return useMemo(() => {
    try {
      const raw = localStorage.getItem(materialIndentsKey(entityCode));
      const all = (raw ? JSON.parse(raw) : []) as MaterialIndent[];
      if (visibility.canViewAllDepartments) return all;
      if (!visibility.myDepartmentId) return [];
      return all.filter(i => i.originating_department_id === visibility.myDepartmentId);
    } catch {
      return [];
    }
  }, [entityCode, visibility]);
}
