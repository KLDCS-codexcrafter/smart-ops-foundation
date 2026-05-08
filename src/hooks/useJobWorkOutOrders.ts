/**
 * useJobWorkOutOrders.ts — read hook for Job Work Out Orders
 * @sprint T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @[JWT] GET /api/production/job-work-out-orders?entityCode=...
 */
import { useCallback, useEffect, useState } from 'react';
import { listJobWorkOutOrders } from '@/lib/job-work-out-engine';
import type { JobWorkOutOrder } from '@/types/job-work-out-order';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useJobWorkOutOrders(entityCode: string): {
  jwos: JobWorkOutOrder[];
  reload: () => void;
} {
  const [jwos, setJwos] = useState<JobWorkOutOrder[]>([]);
  const reload = useCallback(() => {
    setJwos(listJobWorkOutOrders(entityCode));
  }, [entityCode]);
  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);
  return { jwos, reload };
}
