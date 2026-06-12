/**
 * @file        narrative.ts
 * @sprint      RPT-12a · Block 5 · AI-narrative slot (interface + rule-based default)
 * @purpose     A pluggable provider that returns a single sentence narrative
 *              describing the rows of a report. The DEFAULT provider is
 *              RULE-BASED: every number it emits is computed directly from
 *              the real rows. No free text. No LLM. No fabrication.
 *
 *              An LLM-backed provider can be registered at Wave-2 via
 *              registerNarrativeProvider(); the contract is the same.
 */

import type { QuerySpec } from './report-builder-engine';

export interface NarrativeProvider {
  id: string;
  describe(rows: ReadonlyArray<Record<string, unknown>>, spec: QuerySpec): string;
}

let active: NarrativeProvider | null = null;

export function registerNarrativeProvider(provider: NarrativeProvider): void {
  active = provider;
}

export function getNarrativeProvider(): NarrativeProvider {
  return active ?? DEFAULT_PROVIDER;
}

export function describeReport(
  rows: ReadonlyArray<Record<string, unknown>>,
  spec: QuerySpec,
): string {
  return getNarrativeProvider().describe(rows, spec);
}

// ─── Default rule-based provider ───────────────────────────────────────────

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  return 0;
}

function aliasOf(m: { field: string; agg: string; alias?: string }): string {
  return m.alias ?? (m.agg === 'count' ? 'count' : `${m.agg}_${m.field}`);
}

export interface NarrativeAggregates {
  groupCount: number;
  total: number;
  topLabel: string;
  topValue: number;
  topPctOfTotal: number;
  belowThresholdCount: number;
  thresholdValue: number;
  measureAlias: string;
}

/** Compute the aggregates that drive the default narrative sentence.
 *  Every value here is read from the rows — never invented. */
export function computeNarrativeAggregates(
  rows: ReadonlyArray<Record<string, unknown>>,
  spec: QuerySpec,
): NarrativeAggregates | null {
  if (rows.length === 0 || spec.measures.length === 0) return null;
  const m = spec.measures[0];
  const alias = aliasOf(m);
  const dim = spec.groupBy[0];

  const values = rows.map((r) => toNum(r[alias]));
  const total = values.reduce((a, b) => a + b, 0);

  let topIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[topIdx]) topIdx = i;
  }
  const topValue = values[topIdx] ?? 0;
  const topLabel = dim ? String(rows[topIdx]?.[dim] ?? '—') : '(overall)';
  const topPct = total > 0 ? Math.round((topValue / total) * 1000) / 10 : 0;

  // Threshold = 25% of the top value — computed, not hard-coded magic.
  const thresholdValue = topValue * 0.25;
  const belowThresholdCount = values.filter((v) => v < thresholdValue).length;

  return {
    groupCount: rows.length,
    total,
    topLabel,
    topValue,
    topPctOfTotal: topPct,
    belowThresholdCount,
    thresholdValue,
    measureAlias: alias,
  };
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export const DEFAULT_PROVIDER: NarrativeProvider = {
  id: 'rule-based-v1',
  describe(rows, spec) {
    const agg = computeNarrativeAggregates(rows, spec);
    if (!agg) return '';
    const dimLabel = spec.groupBy[0] ?? 'group';
    const parts: string[] = [];
    parts.push(`Top ${dimLabel} is ${agg.topLabel} at ${fmt(agg.topValue)} (${agg.measureAlias})`);
    if (agg.total > 0) parts.push(`${agg.topPctOfTotal}% of total ${fmt(agg.total)}`);
    parts.push(`${agg.belowThresholdCount} of ${agg.groupCount} groups below ${fmt(agg.thresholdValue)}`);
    return parts.join('; ') + '.';
  },
};

/** Test-only · clears any registered provider so DEFAULT_PROVIDER applies. */
export function __resetNarrativeProviderForTests(): void {
  active = null;
}
