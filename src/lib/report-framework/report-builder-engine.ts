/**
 * @file        report-builder-engine.ts
 * @sprint      RPT-9a · User Report Builder · Query Engine
 * @purpose     Pure, React-free query engine over the Data Source Catalog (DSC).
 *              Powers the per-card × per-role User Report Builder. Composes the
 *              cross-card governance lock via allowedSourcesFor(layer, entitled).
 *
 * Read-only-lock: ZERO react imports, ZERO localStorage writes, ZERO post/save/
 * write voucher helpers. Grep-asserted by read-only-lock.test.ts (same lock as
 * the rest of the report-framework core).
 *
 * NOT inside insightx-aggregator-engine — sits beside it. The aggregator
 * registers the cross-card scenarios; this engine runs ad-hoc user queries
 * over any registered DataSource.
 */

import {
  getSource,
  listSources,
  type DataSource,
} from './data-source-catalog';
import type { RoleLayer } from './role-layer';
import { signReport } from './integrity-sign';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FilterOp = 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
export type AggOp = 'sum' | 'count' | 'avg' | 'min' | 'max';

export interface QueryFilter {
  field: string;
  op: FilterOp;
  value: unknown;
}

export interface QueryMeasure {
  field: string;
  agg: AggOp;
  /** Output column key. Defaults to `${agg}_${field}` (or `count` for count). */
  alias?: string;
}

export interface QuerySort {
  field: string;
  dir: 'asc' | 'desc';
}

export interface QuerySpec {
  filters?: QueryFilter[];
  groupBy: string[];
  measures: QueryMeasure[];
  sort?: QuerySort;
  limit?: number;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  integrityHash: string;
}

export class ReportBuilderQueryError extends Error {
  readonly kind: 'unknown-source' | 'unknown-field' | 'wrong-kind' | 'no-measures';
  constructor(kind: ReportBuilderQueryError['kind'], message: string) {
    super(message);
    this.kind = kind;
    this.name = 'ReportBuilderQueryError';
  }
}

// ─── Cross-card lock ─────────────────────────────────────────────────────────

/**
 * The cross-card governance lock.
 *
 * Rules:
 *  - operator / manager → only sources whose `card` ∈ entitledCards.
 *    Cross-card / aggregate sources (card === 'xc' or starting with 'xc.')
 *    are denied.
 *  - management+ → everything entitled PLUS cross-card aggregate sources.
 */
export function allowedSourcesFor(
  layer: RoleLayer,
  entitledCards: string[],
): DataSource[] {
  const entitled = new Set(entitledCards);
  return listSources().filter((src) => {
    const isCrossCard = src.card === 'xc' || src.card.startsWith('xc.') || src.card === 'cross-card';
    if (isCrossCard) return layer === 'management';
    return entitled.has(src.card);
  });
}

// ─── Query runner ────────────────────────────────────────────────────────────

export function runQuery(
  sourceId: string,
  spec: QuerySpec,
  entityCode: string,
): QueryResult {
  const src = getSource(sourceId);
  if (!src) {
    throw new ReportBuilderQueryError('unknown-source', `Unknown source: ${sourceId}`);
  }

  const fieldByKey = new Map(src.fields.map((f) => [f.key, f] as const));

  // Validation: groupBy must be 'dimension' fields
  for (const g of spec.groupBy) {
    const f = fieldByKey.get(g);
    if (!f) throw new ReportBuilderQueryError('unknown-field', `groupBy field not in source: ${g}`);
    if (f.kind !== 'dimension') {
      throw new ReportBuilderQueryError('wrong-kind', `groupBy field "${g}" is a measure; expected dimension`);
    }
  }
  // Validation: measure fields must be 'measure' kind (count is exempt — operates on row identity)
  for (const m of spec.measures) {
    const f = fieldByKey.get(m.field);
    if (!f) throw new ReportBuilderQueryError('unknown-field', `measure field not in source: ${m.field}`);
    if (m.agg !== 'count' && f.kind !== 'measure') {
      throw new ReportBuilderQueryError('wrong-kind', `measure field "${m.field}" is a dimension; expected measure for agg "${m.agg}"`);
    }
  }
  if (spec.measures.length === 0) {
    throw new ReportBuilderQueryError('no-measures', 'spec.measures must contain at least one measure');
  }

  // Read raw rows
  const raw = (src.read(entityCode) ?? []) as Record<string, unknown>[];

  // Filter
  const filtered = (spec.filters ?? []).reduce<Record<string, unknown>[]>(
    (acc, f) => acc.filter((r) => passFilter(r, f)),
    raw,
  );

  // Group + aggregate
  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const r of filtered) {
    const key = spec.groupBy.map((g) => String(r[g] ?? '')).join('\u0001');
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }

  // If no groupBy, single aggregate row over the whole filtered set
  const grouped: Record<string, unknown>[] = [];
  if (spec.groupBy.length === 0) {
    grouped.push(aggregateBucket(filtered, spec));
  } else {
    for (const [, rows] of buckets) {
      const head = rows[0] ?? {};
      const row: Record<string, unknown> = {};
      for (const g of spec.groupBy) row[g] = head[g];
      Object.assign(row, aggregateBucket(rows, spec));
      grouped.push(row);
    }
  }

  // Sort
  if (spec.sort) {
    const { field, dir } = spec.sort;
    grouped.sort((a, b) => compareCell(a[field], b[field]) * (dir === 'asc' ? 1 : -1));
  }

  // Limit
  const finalRows = spec.limit && spec.limit > 0 ? grouped.slice(0, spec.limit) : grouped;

  return {
    rows: finalRows,
    integrityHash: signReport(finalRows),
  };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function passFilter(row: Record<string, unknown>, f: QueryFilter): boolean {
  const v = row[f.field];
  switch (f.op) {
    case 'eq': return v === f.value;
    case 'neq': return v !== f.value;
    case 'contains': return String(v ?? '').toLowerCase().includes(String(f.value ?? '').toLowerCase());
    case 'gt': return toNum(v) > toNum(f.value);
    case 'lt': return toNum(v) < toNum(f.value);
    default: return true;
  }
}

function aggregateBucket(rows: Record<string, unknown>[], spec: QuerySpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const m of spec.measures) {
    const alias = m.alias ?? (m.agg === 'count' ? 'count' : `${m.agg}_${m.field}`);
    const nums = rows.map((r) => toNum(r[m.field])).filter((n) => Number.isFinite(n));
    switch (m.agg) {
      case 'count': out[alias] = rows.length; break;
      case 'sum':   out[alias] = nums.reduce((a, b) => a + b, 0); break;
      case 'avg':   out[alias] = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0; break;
      case 'min':   out[alias] = nums.length ? Math.min(...nums) : 0; break;
      case 'max':   out[alias] = nums.length ? Math.max(...nums) : 0; break;
    }
  }
  return out;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') { const n = Number(v); return Number.isFinite(n) ? n : 0; }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return 0;
}

function compareCell(a: unknown, b: unknown): number {
  const na = toNum(a); const nb = toNum(b);
  const aNum = typeof a === 'number' || (typeof a === 'string' && Number.isFinite(Number(a)));
  const bNum = typeof b === 'number' || (typeof b === 'string' && Number.isFinite(Number(b)));
  if (aNum && bNum) return na - nb;
  return String(a ?? '').localeCompare(String(b ?? ''));
}
