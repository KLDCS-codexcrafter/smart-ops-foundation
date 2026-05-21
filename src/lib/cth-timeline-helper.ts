/**
 * @file        src/lib/cth-timeline-helper.ts
 * @purpose     D-NEW-EZ · CTH history granular timeline · PURE HELPER
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs
 * @decisions   Q-LOCK-4(a) helper · cth-history-engine stays 0-DIFF · READ-ONLY consumer
 * @disciplines FR-30 · FR-50 · returns NEW arrays · zero mutation
 */
import type { DutyStructure, DutyStructureHistoryEntry } from '@/types/duty-structure';
import { loadDutyStructures } from '@/lib/cth-resolver';

export interface CTHTimelineEvent {
  date: string;
  cth_code: string;
  country_code: string;
  event_type: string;
  before_value: string;
  after_value: string;
  reason: string;
  recorded_by: string;
}

function byDateDesc(a: CTHTimelineEvent, b: CTHTimelineEvent): number {
  return b.date.localeCompare(a.date);
}

function toEvent(structure: DutyStructure, e: DutyStructureHistoryEntry): CTHTimelineEvent {
  return {
    date: e.timestamp.slice(0, 10),
    cth_code: structure.cth_code,
    country_code: structure.country_code,
    event_type: `${e.bucket_kind}:${e.field_changed}`,
    before_value: e.old_value === null ? '—' : String(e.old_value),
    after_value: e.new_value === null ? '—' : String(e.new_value),
    reason: e.gazette_ref ? `${e.justification} · ${e.gazette_ref}` : e.justification,
    recorded_by: e.user_id,
  };
}

/** PURE HELPER · returns NEW sorted array · empty country_code = all countries for this CTH */
export function buildTimelineForCTH(
  entityCode: string,
  cthCode: string,
  countryCode: string,
): CTHTimelineEvent[] {
  const structures = loadDutyStructures(entityCode);
  const matches = structures.filter(
    (s) => s.cth_code === cthCode && (countryCode === '' || s.country_code === countryCode),
  );
  const events: CTHTimelineEvent[] = [];
  for (const s of matches) {
    for (const h of s.history) events.push(toEvent(s, h));
  }
  return [...events].sort(byDateDesc);
}

export function timelineSummary(events: readonly CTHTimelineEvent[]): {
  total_events: number;
  latest_event_date: string | null;
  earliest_event_date: string | null;
} {
  if (events.length === 0) {
    return { total_events: 0, latest_event_date: null, earliest_event_date: null };
  }
  return {
    total_events: events.length,
    latest_event_date: events[0].date,
    earliest_event_date: events[events.length - 1].date,
  };
}
