/**
 * @file        src/lib/cth-history-engine.ts
 * @purpose     Customs Revaluation Audit history engine · Moat #15 anchor foundation
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q10=a history array on each row
 * @disciplines FR-30 · FR-50
 */
import type { DutyStructure, DutyStructureHistoryEntry, DutyBucket } from '@/types/duty-structure';
import { loadDutyStructures, saveDutyStructures } from '@/lib/cth-resolver';

export function appendHistory(
  structures: DutyStructure[],
  structureId: string,
  entry: DutyStructureHistoryEntry,
): DutyStructure[] {
  return structures.map((ds) =>
    ds.id === structureId
      ? { ...ds, history: [...ds.history, entry], updated_at: new Date().toISOString() }
      : ds,
  );
}

// [JWT] POST /api/eximx/duty-structures/:id/revaluation
export function captureRevaluation(
  entityCode: string,
  structureId: string,
  userId: string,
  bucketKind: DutyBucket['kind'],
  fieldChanged: string,
  oldValue: number | string | null,
  newValue: number | string | null,
  justification: string,
  gazetteRef: string,
): DutyStructure[] {
  const all = loadDutyStructures(entityCode);
  const entry: DutyStructureHistoryEntry = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    bucket_kind: bucketKind,
    field_changed: fieldChanged,
    old_value: oldValue,
    new_value: newValue,
    justification,
    gazette_ref: gazetteRef,
  };
  const updated = appendHistory(all, structureId, entry);
  saveDutyStructures(entityCode, updated);
  return updated;
}

export function filterHistory(
  structure: DutyStructure,
  fromDate: string,
  toDate: string,
): DutyStructureHistoryEntry[] {
  return structure.history.filter((h) => h.timestamp >= fromDate && h.timestamp <= toDate);
}
