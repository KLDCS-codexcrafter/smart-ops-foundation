/**
 * @file        useProcurementEnquiries.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-4
 * @[JWT]       GET /api/procure360/enquiries
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { procurementEnquiriesKey, type ProcurementEnquiry } from '@/types/procurement-enquiry';

export function useProcurementEnquiries(): ProcurementEnquiry[] {
  const { entityCode } = useEntityCode();
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(procurementEnquiriesKey(entityCode));
      return raw ? (JSON.parse(raw) as ProcurementEnquiry[]) : [];
    } catch {
      return [];
    }
  }, [entityCode]);
}
