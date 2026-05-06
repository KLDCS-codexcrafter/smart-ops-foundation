/**
 * useDailyWorkRegister.ts — read hook for DWR (D-584)
 * Sprint T-Phase-1.3-3-PlantOps-pre-2
 *
 * [JWT] GET /api/plant-ops/daily-work-register
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import type { DailyWorkRegisterEntry } from '@/types/daily-work-register';
import { dailyWorkRegisterKey } from '@/types/daily-work-register';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';

export function useDailyWorkRegister(filter?: {
  factoryId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  shiftId?: string;
  employeeId?: string;
  machineId?: string;
  flaggedOnly?: boolean;
}): {
  entries: DailyWorkRegisterEntry[];
  allEntries: DailyWorkRegisterEntry[];
  reload: () => void;
} {
  const { entityCode } = useEntityCode();
  const [entries, setEntries] = useState<DailyWorkRegisterEntry[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/plant-ops/daily-work-register?entityCode={entityCode}
      const raw = localStorage.getItem(dailyWorkRegisterKey(entityCode));
      setEntries(raw ? (JSON.parse(raw) as DailyWorkRegisterEntry[]) : []);
    } catch { setEntries([]); }
  }, [entityCode]);

  useEffect(() => { reload(); }, [reload]);
  useEntityChangeEffect(reload, [reload]);

  const filtered = useMemo(() => {
    let result = entries;
    if (filter?.factoryId) result = result.filter(e => e.factory_id === filter.factoryId);
    if (filter?.date) result = result.filter(e => e.date === filter.date);
    if (filter?.dateFrom) result = result.filter(e => e.date >= filter.dateFrom!);
    if (filter?.dateTo) result = result.filter(e => e.date <= filter.dateTo!);
    if (filter?.shiftId) result = result.filter(e => e.shift_id === filter.shiftId);
    if (filter?.employeeId) result = result.filter(e => e.employee_id === filter.employeeId);
    if (filter?.machineId) result = result.filter(e => e.machine_id === filter.machineId);
    if (filter?.flaggedOnly) result = result.filter(e => e.has_breakdown || e.has_quality_issue || e.has_wastage);
    return result;
  }, [entries, filter]);

  return { entries: filtered, allEntries: entries, reload };
}
