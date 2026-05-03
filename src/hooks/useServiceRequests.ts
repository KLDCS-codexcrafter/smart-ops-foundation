/**
 * @file        useServiceRequests.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Department-scoped reader for Service Requests (SD-16).
 * @[JWT]       GET /api/requestx/service-requests
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { useDepartmentVisibility } from './useDepartmentVisibility';
import { serviceRequestsKey, type ServiceRequest } from '@/types/service-request';

export function useServiceRequests(): ServiceRequest[] {
  const { entityCode } = useEntityCode();
  const visibility = useDepartmentVisibility('requestx');

  return useMemo(() => {
    try {
      const raw = localStorage.getItem(serviceRequestsKey(entityCode));
      const all = (raw ? JSON.parse(raw) : []) as ServiceRequest[];
      if (visibility.canViewAllDepartments) return all;
      if (!visibility.myDepartmentId) return [];
      return all.filter(i => i.originating_department_id === visibility.myDepartmentId);
    } catch {
      return [];
    }
  }, [entityCode, visibility]);
}
