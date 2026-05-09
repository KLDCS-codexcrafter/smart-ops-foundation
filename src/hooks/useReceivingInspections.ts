/**
 * @file src/hooks/useReceivingInspections.ts
 * @purpose Shared data hook for IQC receiving-inspection variants V1/V2/V3.
 * @who QA Manager · Receiving Inspector
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge · Block D
 * @iso ISO 9001:2015 Clause 8.4 (control of externally provided processes)
 * @whom Audit Owner
 * @decisions D-NEW-BW · D-NEW-CB (hook extracted from component file)
 * @disciplines FR-30 · FR-50
 * @reuses listQaInspections · useEntityCode · useEntityChangeEffect
 * @[JWT] reads via listQaInspections · localStorage erp_qa_inspections_${entityCode}
 */
import { useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityChangeEffect } from '@/hooks/useEntityChangeEffect';
import { listQaInspections } from '@/lib/qa-inspection-engine';
import type { QaInspectionRecord } from '@/types/qa-inspection';

export function useReceivingInspections(): {
  rows: QaInspectionRecord[];
  entityCode: string;
} {
  const { entityCode } = useEntityCode();
  const [version, setVersion] = useState(0);
  useEntityChangeEffect(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    const onFocus = (): void => setVersion((v) => v + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const rows = useMemo(() => {
    void version;
    return listQaInspections(entityCode).filter((r) => r.inspection_type === 'incoming');
  }, [entityCode, version]);

  return { rows, entityCode };
}
