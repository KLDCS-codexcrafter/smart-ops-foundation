/**
 * @file     useAdvanceRegister.ts
 * @purpose  Reads erp_advances_{entity} for the active entity, computes
 *           aging buckets via advance-aging.computeAgingReport(), and
 *           subscribes to the `storage` event so cross-tab adjustments
 *           refresh the widget automatically.
 * @sprint   T-H1.5-D-D5
 * @finding  CC-066
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AdvanceEntry } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import { useEntityCode } from '@/hooks/useEntityCode';
import { computeAgingReport, type AgingReport } from '../lib/advance-aging';

interface UseAdvanceRegisterReturn {
  entityCode: string;
  advances: AdvanceEntry[];
  aging: AgingReport;
  reload: () => void;
}

export function useAdvanceRegister(): UseAdvanceRegisterReturn {
  const { entityCode } = useEntityCode();
  const [advances, setAdvances] = useState<AdvanceEntry[]>([]);

  const reload = useCallback(() => {
    if (!entityCode) {
      setAdvances([]);
      return;
    }
    try {
      // [JWT] GET /api/compliance/advances?entityCode=...
      const raw = localStorage.getItem(advancesKey(entityCode));
      setAdvances(raw ? (JSON.parse(raw) as AdvanceEntry[]) : []);
    } catch {
      setAdvances([]);
    }
  }, [entityCode]);

  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => {
      if (!entityCode) return;
      if (e.key === advancesKey(entityCode)) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload, entityCode]);

  const aging = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return computeAgingReport(advances, today);
  }, [advances]);

  return { entityCode, advances, aging, reload };
}
