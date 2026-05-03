/**
 * @file        useRfqs.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-4
 * @[JWT]       GET /api/procure360/rfqs
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { rfqsKey, type RFQ } from '@/types/rfq';

export function useRfqs(): RFQ[] {
  const { entityCode } = useEntityCode();
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(rfqsKey(entityCode));
      return raw ? (JSON.parse(raw) as RFQ[]) : [];
    } catch {
      return [];
    }
  }, [entityCode]);
}
