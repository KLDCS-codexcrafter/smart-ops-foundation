/**
 * useJobWorkReceipts.ts — read hook for Job Work Receipts
 * @sprint T-Phase-1.A.2.c-Job-Work-Tally-Parity
 * @[JWT] GET /api/production/job-work-receipts?entityCode=...
 */
import { useCallback, useEffect, useState } from 'react';
import { listJobWorkReceipts } from '@/lib/job-work-receipt-engine';
import type { JobWorkReceipt } from '@/types/job-work-receipt';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useJobWorkReceipts(entityCode: string): {
  receipts: JobWorkReceipt[];
  reload: () => void;
} {
  const [receipts, setReceipts] = useState<JobWorkReceipt[]>([]);
  const reload = useCallback(() => {
    setReceipts(listJobWorkReceipts(entityCode));
  }, [entityCode]);
  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);
  return { receipts, reload };
}
