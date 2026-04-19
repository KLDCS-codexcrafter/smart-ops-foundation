/**
 * segment-rule-engine.ts — Evaluate CustomerSegment.auto_rule strings
 * Supports a minimal DSL: 'field op value [AND|OR field op value...]'
 * Fields: city, clv_tier, churn_tier, placed_orders_30d, lifetime_value_paise
 * Operators: =, !=, IN, NOT IN, >, <, >=, <=
 * Top-1% gap G4 — closes the gap where auto_rule is stored but never executed.
 * Pure: no React, no localStorage.
 */

import type { CLVResult } from '@/types/customer-clv';
import type { ChurnResult } from './customer-churn-engine';

export interface SegmentContext {
  customer_id: string;
  city: string;
  clv_tier?: CLVResult['clv_rank_tier'];
  churn_tier?: ChurnResult['risk_tier'];
  placed_orders_30d: number;
  lifetime_value_paise: number;
}

type Op = '=' | '!=' | 'IN' | 'NOT IN' | '>' | '<' | '>=' | '<=';

interface Clause {
  field: keyof SegmentContext;
  op: Op;
  value: string | number | string[];
}

function parseValue(rawIn: string): string | number | string[] {
  const raw = rawIn.trim();
  if (raw.startsWith('(') && raw.endsWith(')')) {
    return raw.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw.replace(/^['"]|['"]$/g, '');
}

/** Parse a DSL rule string into clauses. Returns null if invalid. */
export function parseRule(rule: string): { clauses: Clause[]; joiner: 'AND' | 'OR' } | null {
  const trimmed = rule.trim();
  if (!trimmed) return null;

  const joiner: 'AND' | 'OR' = / OR /i.test(trimmed) ? 'OR' : 'AND';
  const parts = trimmed.split(new RegExp(` ${joiner} `, 'i'));

  const clauses: Clause[] = [];
  for (const p of parts) {
    const opMatch = p.match(/^\s*(\w+)\s+(NOT IN|IN|!=|>=|<=|=|>|<)\s+(.+?)\s*$/i);
    if (!opMatch) return null;
    const field = opMatch[1] as keyof SegmentContext;
    const op = opMatch[2].toUpperCase() as Op;
    const value = parseValue(opMatch[3]);
    clauses.push({ field, op, value });
  }
  return { clauses, joiner };
}

function evalClause(clause: Clause, ctx: SegmentContext): boolean {
  const actual = ctx[clause.field];
  if (actual === undefined || actual === null) return false;
  switch (clause.op) {
    case '=':      return actual === clause.value;
    case '!=':     return actual !== clause.value;
    case 'IN':     return Array.isArray(clause.value) && clause.value.includes(String(actual));
    case 'NOT IN': return Array.isArray(clause.value) && !clause.value.includes(String(actual));
    case '>':      return typeof actual === 'number' && typeof clause.value === 'number' && actual >  clause.value;
    case '<':      return typeof actual === 'number' && typeof clause.value === 'number' && actual <  clause.value;
    case '>=':     return typeof actual === 'number' && typeof clause.value === 'number' && actual >= clause.value;
    case '<=':     return typeof actual === 'number' && typeof clause.value === 'number' && actual <= clause.value;
    default:       return false;
  }
}

export function evalRule(rule: string, ctx: SegmentContext): boolean {
  const parsed = parseRule(rule);
  if (!parsed) return false;
  const results = parsed.clauses.map(c => evalClause(c, ctx));
  return parsed.joiner === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

/** Assign customers to segments based on their auto_rule. Returns membership map. */
export function evaluateAllSegments(
  segments: { id: string; auto_rule: string; manual_customer_ids: string[] }[],
  contexts: SegmentContext[],
): Map<string, Set<string>> {
  const memberships = new Map<string, Set<string>>();
  for (const seg of segments) {
    const set = new Set(seg.manual_customer_ids);
    if (seg.auto_rule && seg.auto_rule.trim()) {
      for (const ctx of contexts) {
        if (evalRule(seg.auto_rule, ctx)) set.add(ctx.customer_id);
      }
    }
    memberships.set(seg.id, set);
  }
  return memberships;
}
