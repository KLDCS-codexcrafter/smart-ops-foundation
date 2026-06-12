/**
 * @file        intent-match.ts
 * @sprint      RPT-12a · Block 4 · NL intent → builder prefill (client-side, honest)
 * @purpose     Tokenize free-text and fuzzy-score it against registered DSC
 *              source/field labels + a tiny verb map. Returns a builder spec
 *              when a match is found; null otherwise (UI surfaces an honest
 *              "couldn't match" line and falls back to manual pickers).
 *
 * RULES:  NO LLM. NO network. Pure string scoring. Engine 0-DIFF.
 */

import { listSources, type DataSource } from './data-source-catalog';
import type { AggOp, QuerySpec } from './report-builder-engine';

export interface IntentMatch {
  sourceId: string;
  spec: QuerySpec;
  /** Words that triggered the match (debug/tests). */
  evidence: string[];
  /** Heuristic confidence score 0..1 (1 = perfect). */
  score: number;
}

// Verb → AggOp. Order matters: longest stems first inside the array.
const VERB_MAP: Array<{ words: string[]; agg: AggOp }> = [
  { words: ['sum', 'total', 'totals', 'amount', 'spend', 'value'], agg: 'sum' },
  { words: ['count', 'how many', 'number of', 'qty', 'quantity'], agg: 'count' },
  { words: ['avg', 'average', 'mean'], agg: 'avg' },
  { words: ['min', 'minimum', 'smallest', 'lowest'], agg: 'min' },
  { words: ['max', 'maximum', 'largest', 'highest', 'top'], agg: 'max' },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function fieldHits(src: DataSource, tokens: string[]): { keys: string[]; hits: number } {
  const keys: string[] = [];
  let hits = 0;
  for (const f of src.fields) {
    const lbl = f.label.toLowerCase();
    const key = f.key.toLowerCase();
    if (tokens.some((t) => lbl.includes(t) || key.includes(t) || t.includes(key))) {
      keys.push(f.key);
      hits++;
    }
  }
  return { keys, hits };
}

function sourceScore(src: DataSource, tokens: string[], rawText: string): number {
  const label = src.label.toLowerCase();
  const id = src.id.toLowerCase();
  const card = src.card.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (label.includes(t)) score += 3;
    if (id.includes(t)) score += 2;
    if (card.includes(t)) score += 1;
    if (rawText.includes(label)) score += 4;
  }
  return score;
}

function detectVerb(text: string): AggOp | null {
  for (const v of VERB_MAP) {
    for (const w of v.words) {
      if (text.includes(w)) return v.agg;
    }
  }
  return null;
}

export function matchIntent(text: string): IntentMatch | null {
  const raw = (text ?? '').toLowerCase().trim();
  if (raw.length < 3) return null;
  const tokens = tokenize(raw);
  if (tokens.length === 0) return null;

  const sources = listSources();
  if (sources.length === 0) return null;

  // 1. Pick best source
  let best: { src: DataSource; score: number; fieldKeys: string[] } | null = null;
  for (const s of sources) {
    const sScore = sourceScore(s, tokens, raw);
    const f = fieldHits(s, tokens);
    const combined = sScore + f.hits * 2;
    if (combined > 0 && (!best || combined > best.score)) {
      best = { src: s, score: combined, fieldKeys: f.keys };
    }
  }
  if (!best || best.score < 2) return null;

  // 2. Pick aggregation
  const agg: AggOp = detectVerb(raw) ?? 'sum';

  // 3. Pick measure + groupBy
  const fieldsByKind = (kind: 'dimension' | 'measure') =>
    best!.src.fields.filter((f) => f.kind === kind).map((f) => f.key);
  const matchedDims = best.fieldKeys.filter((k) =>
    best!.src.fields.find((f) => f.key === k)?.kind === 'dimension',
  );
  const matchedMeasures = best.fieldKeys.filter((k) =>
    best!.src.fields.find((f) => f.key === k)?.kind === 'measure',
  );

  const groupBy = matchedDims.length ? matchedDims.slice(0, 2) : fieldsByKind('dimension').slice(0, 1);
  let measureField =
    matchedMeasures[0] ?? fieldsByKind('measure')[0] ?? best.src.fields[0]?.key ?? '';

  // 'count' is exempt from measure-kind check in the engine; for count, alias on row identity.
  if (agg === 'count') measureField = measureField || best.src.fields[0]?.key || '';

  if (!measureField) return null;

  const spec: QuerySpec = {
    filters: [],
    groupBy,
    measures: [{ field: measureField, agg }],
  };

  return {
    sourceId: best.src.id,
    spec,
    evidence: tokens.filter((t) =>
      best!.src.label.toLowerCase().includes(t) ||
      best!.src.id.toLowerCase().includes(t) ||
      best!.fieldKeys.some((k) => k.toLowerCase().includes(t)),
    ),
    score: Math.min(1, best.score / 10),
  };
}
