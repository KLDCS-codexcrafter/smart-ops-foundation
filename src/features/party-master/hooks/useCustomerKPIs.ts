/**
 * @file     useCustomerKPIs.ts
 * @purpose  Memoized KPI lookup for entire customer master on a given entity.
 *           Returns Map<partyId, CustomerKPI>. Invalidates on entity change.
 * @sprint   T-H1.5-C-S4.5
 */
import { useMemo } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { computeCustomerKPIs, type CustomerKPI } from '../lib/customer-kpi-engine';

interface CustomerRow { id: string }

export function useCustomerKPIs(customers: CustomerRow[]): Map<string, CustomerKPI> {
  const { entityCode } = useEntityCode();
  return useMemo(() => {
    const m = new Map<string, CustomerKPI>();
    if (!entityCode) return m;
    for (const c of customers) {
      m.set(c.id, computeCustomerKPIs(c.id, entityCode));
    }
    return m;
  }, [customers, entityCode]);
}
