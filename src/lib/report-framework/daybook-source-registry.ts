/**
 * @file        daybook-source-registry.ts
 * @sprint      RPT-3a · DayBook Generalize + Source Registry
 * @purpose     React-free, additive registry of DayBook sources across cards.
 *              Seed of the cross-card feed for RPT-3b. Pure, idempotent.
 *
 * Walls: NO react, NO hooks, NO localStorage writes. Reads are delegated to
 * the source's `read()` closure (each card wraps its existing loader).
 */

import type { DayBookEntry } from '@/hooks/useDayBook';
export type { DayBookEntry } from '@/hooks/useDayBook';

/** Open-ended domain string (was the closed 2-value DayBookFamily). */
export type DayBookDomain = string;

export interface DayBookSource {
  cardId: string;
  domain: DayBookDomain;
  label: string;
  read: (entityCode: string) => DayBookEntry[];
}

const SOURCES: DayBookSource[] = [];

function keyOf(cardId: string, domain: DayBookDomain): string {
  return `${cardId}::${domain}`;
}

/** Idempotent append by (cardId, domain). Re-register replaces the entry in-place. */
export function registerDayBookSource(src: DayBookSource): void {
  const idx = SOURCES.findIndex((s) => keyOf(s.cardId, s.domain) === keyOf(src.cardId, src.domain));
  if (idx >= 0) {
    SOURCES[idx] = src;
  } else {
    SOURCES.push(src);
  }
}

export function listDayBookSources(): DayBookSource[] {
  return [...SOURCES];
}

export function getDayBookSource(cardId: string, domain: DayBookDomain): DayBookSource | undefined {
  return SOURCES.find((s) => s.cardId === cardId && s.domain === domain);
}

export interface DayBookFilter {
  cardId?: string;
  domain?: DayBookDomain;
}

/**
 * Merge entries from every matching source, sorted newest-first by date+time.
 * Pure: never writes, never mutates source data.
 */
export function getDayBookEntries(entityCode: string, filter?: DayBookFilter): DayBookEntry[] {
  const matches = SOURCES.filter((s) => {
    if (filter?.cardId && s.cardId !== filter.cardId) return false;
    if (filter?.domain && s.domain !== filter.domain) return false;
    return true;
  });
  const out: DayBookEntry[] = [];
  for (const s of matches) {
    try {
      out.push(...s.read(entityCode));
    } catch {
      // sources must be defensive · skip on read failure
    }
  }
  return out.sort((a, b) => {
    const ka = `${a.date}T${a.time || '00:00'}`;
    const kb = `${b.date}T${b.time || '00:00'}`;
    return kb.localeCompare(ka);
  });
}

/** Test-only · clears the registry. Not exported from the barrel. */
export function __resetDayBookSourcesForTests(): void {
  SOURCES.length = 0;
}
