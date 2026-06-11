/**
 * @file        daybook-aggregator.ts
 * @sprint      RPT-3b · Cross-Card DayBook Aggregator + DSC
 * @purpose     React-free, pure aggregator that fans every registered DayBook
 *              source (RPT-3a) into a single merged, date-sorted feed with
 *              optional filtering. Mechanism only — the RPT-5 Command-Center
 *              surface will consume this.
 *
 * Walls: NO react, NO hooks, NO localStorage writes. Read-only by construction.
 */

import {
  listDayBookSources,
  type DayBookEntry,
} from './daybook-source-registry';

export interface CrossCardDayBookFilter {
  dateRange?: { from: string; to: string };
  domains?: string[];
  cardIds?: string[];
}

/**
 * Merge entries from every registered DayBook source, optionally filtered by
 * dateRange (inclusive · ISO date strings), domains, and cardIds. Pure read.
 */
export function getCrossCardDayBook(
  entityCode: string,
  filter?: CrossCardDayBookFilter,
): DayBookEntry[] {
  const sources = listDayBookSources().filter((s) => {
    if (filter?.cardIds && !filter.cardIds.includes(s.cardId)) return false;
    if (filter?.domains && !filter.domains.includes(s.domain)) return false;
    return true;
  });

  const merged: DayBookEntry[] = [];
  for (const s of sources) {
    try {
      merged.push(...s.read(entityCode));
    } catch {
      // sources must be defensive · skip on read failure
    }
  }

  const from = filter?.dateRange?.from;
  const to = filter?.dateRange?.to;
  const filtered = from || to
    ? merged.filter((e) => {
        if (from && e.date < from) return false;
        if (to && e.date > to) return false;
        return true;
      })
    : merged;

  return filtered.sort((a, b) => {
    const ka = `${a.date}T${a.time || '00:00'}`;
    const kb = `${b.date}T${b.time || '00:00'}`;
    return kb.localeCompare(ka);
  });
}
