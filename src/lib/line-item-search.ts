/**
 * line-item-search · Sprint T-Phase-2.7-d-2 · Q4-d full-text + soft-cap fallback
 *
 * Searches across all line item fields:
 *   item_name · item_code · hsn_sac_code · description · uom · narration_per_line
 *
 * Soft-cap: when items.length > FULL_TEXT_THRESHOLD (100) ·
 * falls back to 3-field search (item_name + item_code + hsn_sac_code) for performance.
 */

export interface SearchMatch {
  rowIndex: number;
  matchedFields: string[];
  score: number;
}

export interface SearchResult {
  matches: SearchMatch[];
  totalRowsSearched: number;
  searchScope: 'full-text' | '3-field-fallback';
  fallbackReason?: string;
}

export const FULL_TEXT_THRESHOLD = 100;

const FULL_FIELDS = [
  'item_name', 'item_code', 'hsn_sac_code',
  'description', 'uom', 'narration_per_line',
  'narration', 'remarks',
];
const FALLBACK_FIELDS = ['item_name', 'item_code', 'hsn_sac_code'];

function valToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

export function searchLineItems<T extends Record<string, unknown>>(
  items: T[],
  query: string,
): SearchResult {
  const q = (query ?? '').trim().toLowerCase();
  const useFallback = items.length > FULL_TEXT_THRESHOLD;
  const scope: 'full-text' | '3-field-fallback' = useFallback ? '3-field-fallback' : 'full-text';
  const fields = useFallback ? FALLBACK_FIELDS : FULL_FIELDS;

  if (!q) {
    return {
      matches: [],
      totalRowsSearched: items.length,
      searchScope: scope,
      fallbackReason: useFallback ? `>${FULL_TEXT_THRESHOLD} rows · using identity fields only` : undefined,
    };
  }

  const matches: SearchMatch[] = [];
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    const matchedFields: string[] = [];
    for (const f of fields) {
      const val = valToString(row[f]).toLowerCase();
      if (val && val.includes(q)) matchedFields.push(f);
    }
    if (matchedFields.length > 0) {
      matches.push({ rowIndex: i, matchedFields, score: matchedFields.length });
    }
  }
  matches.sort((a, b) => (b.score - a.score) || (a.rowIndex - b.rowIndex));

  return {
    matches,
    totalRowsSearched: items.length,
    searchScope: scope,
    fallbackReason: useFallback ? `>${FULL_TEXT_THRESHOLD} rows · using identity fields only` : undefined,
  };
}
