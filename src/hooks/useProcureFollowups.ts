/**
 * @file        useProcureFollowups.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-4
 * @purpose     Reactive read of all RFQ follow-ups across all RFQs (flattened).
 * @[JWT]       GET /api/procure360/followups
 */
import { useMemo } from 'react';
import { useEntityCode } from './useEntityCode';
import { rfqsKey, type RFQ } from '@/types/rfq';
import type { RFQFollowUp } from '@/types/procure-followup';

export function useProcureFollowups(): RFQFollowUp[] {
  const { entityCode } = useEntityCode();
  return useMemo(() => {
    try {
      const raw = localStorage.getItem(rfqsKey(entityCode));
      const rfqs = raw ? (JSON.parse(raw) as RFQ[]) : [];
      return rfqs.flatMap((r) => r.follow_ups);
    } catch {
      return [];
    }
  }, [entityCode]);
}
