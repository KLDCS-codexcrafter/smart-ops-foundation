/**
 * useJobCards.ts — read hook for Job Cards (D-584)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2
 *
 * [JWT] GET /api/plant-ops/job-cards
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { JobCard } from '@/types/job-card';
import { jobCardsKey } from '@/types/job-card';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useJobCards(filter?: {
  factoryId?: string;
  machineId?: string;
  date?: string;
  employeeId?: string;
  status?: JobCard['status'];
}): {
  jobCards: JobCard[];
  allJobCards: JobCard[];
  reload: () => void;
} {
  const { entityCode } = useEntityCode();
  const [jobCards, setJobCards] = useState<JobCard[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/plant-ops/job-cards?entityCode={entityCode}
      const raw = localStorage.getItem(jobCardsKey(entityCode));
      setJobCards(raw ? (JSON.parse(raw) as JobCard[]) : []);
    } catch { setJobCards([]); }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const filtered = useMemo(() => {
    let result = jobCards;
    if (filter?.factoryId) result = result.filter(jc => jc.factory_id === filter.factoryId);
    if (filter?.machineId) result = result.filter(jc => jc.machine_id === filter.machineId);
    if (filter?.employeeId) result = result.filter(jc => jc.employee_id === filter.employeeId);
    if (filter?.date) result = result.filter(jc => jc.scheduled_start.slice(0, 10) === filter.date);
    if (filter?.status) result = result.filter(jc => jc.status === filter.status);
    return result;
  }, [jobCards, filter]);

  return { jobCards: filtered, allJobCards: jobCards, reload };
}
