/**
 * @file        report-definitions.test.ts
 * @sprint      RPT-9a · User Report Builder · definitions persistence tests
 *
 * Covers:
 *  - allowedSaveScopesFor ceiling per role × layer
 *  - saveDefinition enforces ceiling (operator can't save team; manager can't save card)
 *  - listDefinitions visibility per layer + private/own
 *  - deleteDefinition: own item OK; other user blocked unless management
 *  - ONLY the namespaced REPORT_DEFINITIONS_KEY is written (grep)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveDefinition,
  listDefinitions,
  deleteDefinition,
  allowedSaveScopesFor,
  ReportDefinitionScopeError,
  REPORT_DEFINITIONS_KEY,
  __resetReportDefinitionsForTests,
} from '../report-definitions';
import type { QuerySpec } from '../report-builder-engine';

const baseSpec: QuerySpec = {
  groupBy: ['region'],
  measures: [{ field: 'amount', agg: 'sum' }],
};

const baseSave = (overrides: Partial<Parameters<typeof saveDefinition>[0]> = {}) =>
  saveDefinition({
    name: 'r',
    sourceId: 'fixture.orders',
    spec: baseSpec,
    scope: 'private',
    cardId: 'fincore',
    role: 'finance',
    layer: 'manager',
    userId: 'u1',
    ...overrides,
  });

beforeEach(() => {
  __resetReportDefinitionsForTests();
});

describe('RPT-9a · allowedSaveScopesFor · role→scope ceiling', () => {
  it('view_only role (operator layer) → private only', () => {
    expect(allowedSaveScopesFor('view_only', 'operator')).toEqual(['private']);
  });
  it('manager layer → private + team', () => {
    expect(allowedSaveScopesFor('finance', 'manager')).toEqual(['private', 'team']);
  });
  it('management layer (functional role) → private + team + card', () => {
    expect(allowedSaveScopesFor('finance', 'management')).toEqual(['private', 'team', 'card']);
  });
  it('tenant_admin / super_admin → all four (incl. curated) regardless of layer', () => {
    expect(allowedSaveScopesFor('tenant_admin', 'manager')).toContain('curated');
    expect(allowedSaveScopesFor('super_admin', 'operator')).toContain('curated');
  });
});

describe('RPT-9a · saveDefinition · enforces role→scope', () => {
  it('operator (layer=operator) cannot save scope=team', () => {
    expect(() => baseSave({ layer: 'operator', scope: 'team' })).toThrowError(ReportDefinitionScopeError);
  });
  it('manager cannot save scope=card', () => {
    expect(() => baseSave({ layer: 'manager', scope: 'card' })).toThrowError(ReportDefinitionScopeError);
  });
  it('management cannot save scope=curated (unless admin)', () => {
    expect(() => baseSave({ role: 'finance', layer: 'management', scope: 'curated' })).toThrowError(ReportDefinitionScopeError);
  });
  it('tenant_admin can save scope=curated', () => {
    const def = baseSave({ role: 'tenant_admin', layer: 'management', scope: 'curated' });
    expect(def.scope).toBe('curated');
  });
  it('saved definition gets a generated id and ISO createdAt', () => {
    const def = baseSave();
    expect(def.id).toMatch(/^rd_/);
    expect(def.createdAt).toMatch(/T.+Z$/);
  });
});

describe('RPT-9a · listDefinitions · visibility per layer', () => {
  beforeEach(() => {
    baseSave({ userId: 'u1', scope: 'private', name: 'u1-private' });
    baseSave({ userId: 'u2', scope: 'private', name: 'u2-private' });
    baseSave({ userId: 'u1', scope: 'team', layer: 'manager', name: 'team-r' });
    baseSave({ userId: 'u1', scope: 'card', role: 'finance', layer: 'management', name: 'card-r' });
    baseSave({ userId: 'u3', scope: 'curated', role: 'tenant_admin', layer: 'management', name: 'curated-r' });
  });

  it('operator sees only own private + card + curated (no team)', () => {
    const items = listDefinitions('fincore', 'operator', 'u1');
    const names = items.map((d) => d.name);
    expect(names).toContain('u1-private');
    expect(names).not.toContain('u2-private');
    expect(names).not.toContain('team-r');
    expect(names).toContain('card-r');
    expect(names).toContain('curated-r');
  });

  it('manager sees own private + team + card + curated', () => {
    const items = listDefinitions('fincore', 'manager', 'u1');
    const names = items.map((d) => d.name);
    expect(names).toContain('u1-private');
    expect(names).toContain('team-r');
    expect(names).toContain('card-r');
    expect(names).toContain('curated-r');
    expect(names).not.toContain('u2-private');
  });

  it('cardId filter scopes to that card only', () => {
    const items = listDefinitions('payout', 'manager', 'u1');
    expect(items.length).toBe(0);
  });

  it('undefined cardId lists across cards', () => {
    const items = listDefinitions(undefined, 'management', 'u1');
    expect(items.length).toBeGreaterThanOrEqual(4);
  });
});

describe('RPT-9a · deleteDefinition · ownership + management override', () => {
  it('owner can delete own item', () => {
    const def = baseSave({ userId: 'u1' });
    expect(deleteDefinition(def.id, 'operator', 'u1')).toBe(true);
    expect(listDefinitions(undefined, 'management', 'u1').find((d) => d.id === def.id)).toBeUndefined();
  });

  it('non-owner manager cannot delete', () => {
    const def = baseSave({ userId: 'u1' });
    expect(() => deleteDefinition(def.id, 'manager', 'u2')).toThrowError(ReportDefinitionScopeError);
  });

  it('management layer can delete any item', () => {
    const def = baseSave({ userId: 'u1' });
    expect(deleteDefinition(def.id, 'management', 'u_mgr')).toBe(true);
  });

  it('returns false for unknown id', () => {
    expect(deleteDefinition('rd_nope', 'management', 'u_mgr')).toBe(false);
  });
});

describe('RPT-9a · single-key storage discipline', () => {
  it('writes ONLY the namespaced REPORT_DEFINITIONS_KEY', () => {
    const writes: string[] = [];
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      writes.push(k);
      return orig.call(this, k, v);
    };
    try {
      baseSave({ name: 'A' });
      baseSave({ name: 'B', userId: 'u2' });
    } finally {
      Storage.prototype.setItem = orig;
    }
    expect(writes.length).toBeGreaterThan(0);
    for (const k of writes) {
      expect(k).toBe(REPORT_DEFINITIONS_KEY);
    }
  });
});
