/**
 * @file        report-builder-engine.test.ts
 * @sprint      RPT-9a · User Report Builder · engine tests
 *
 * Covers:
 *  - filter / groupBy / aggregate correctness on a fixture source
 *  - dimension/measure kind validation
 *  - allowedSourcesFor cross-card lock (operator denied xc · management allowed)
 *  - typed errors for unknown source / unknown field / wrong kind / no measures
 *  - integrity hash present and deterministic
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  runQuery,
  allowedSourcesFor,
  ReportBuilderQueryError,
} from '../report-builder-engine';
import {
  registerSource,
  __resetDataSourceCatalogForTests,
  type DataSource,
} from '../data-source-catalog';

const FIXTURE_ID = 'fixture.orders';
const fixtureRows = (): Record<string, unknown>[] => [
  { id: 'o1', region: 'North', status: 'paid',   amount: 1000 },
  { id: 'o2', region: 'North', status: 'unpaid', amount: 500  },
  { id: 'o3', region: 'South', status: 'paid',   amount: 1500 },
  { id: 'o4', region: 'South', status: 'paid',   amount: 700  },
  { id: 'o5', region: 'East',  status: 'unpaid', amount: 200  },
];

const fixtureSource: DataSource = {
  id: FIXTURE_ID,
  label: 'Fixture Orders',
  card: 'fincore',
  kind: 'register',
  fields: [
    { key: 'id',     label: 'ID',     kind: 'dimension' },
    { key: 'region', label: 'Region', kind: 'dimension' },
    { key: 'status', label: 'Status', kind: 'dimension' },
    { key: 'amount', label: 'Amount', kind: 'measure'   },
  ],
  read: () => fixtureRows(),
};

const xcSource: DataSource = {
  id: 'xc.cash-position',
  label: 'Cross-card cash',
  card: 'xc',
  kind: 'kpi',
  fields: [
    { key: 'entity', label: 'Entity', kind: 'dimension' },
    { key: 'cash',   label: 'Cash',   kind: 'measure' },
  ],
  read: () => [{ entity: 'E1', cash: 100 }],
};

const eximxSource: DataSource = {
  id: 'eximx.shipments',
  label: 'Eximx shipments',
  card: 'eximx',
  kind: 'register',
  fields: [{ key: 'no', label: 'No', kind: 'dimension' }, { key: 'val', label: 'Val', kind: 'measure' }],
  read: () => [],
};

beforeEach(() => {
  __resetDataSourceCatalogForTests();
  registerSource(fixtureSource);
  registerSource(xcSource);
  registerSource(eximxSource);
});

describe('RPT-9a · report-builder-engine · query correctness', () => {
  it('groupBy region + sum(amount) returns 3 rows summed correctly', () => {
    const r = runQuery(FIXTURE_ID, {
      groupBy: ['region'],
      measures: [{ field: 'amount', agg: 'sum' }],
    }, 'E1');
    expect(r.rows.length).toBe(3);
    const byRegion = Object.fromEntries(r.rows.map((row) => [row.region, row.sum_amount]));
    expect(byRegion.North).toBe(1500);
    expect(byRegion.South).toBe(2200);
    expect(byRegion.East).toBe(200);
  });

  it('groupBy status + count returns paid=3 unpaid=2', () => {
    const r = runQuery(FIXTURE_ID, {
      groupBy: ['status'],
      measures: [{ field: 'id', agg: 'count' }],
    }, 'E1');
    const byStatus = Object.fromEntries(r.rows.map((row) => [row.status, row.count]));
    expect(byStatus.paid).toBe(3);
    expect(byStatus.unpaid).toBe(2);
  });

  it('filter eq + groupBy + sum applies before aggregation', () => {
    const r = runQuery(FIXTURE_ID, {
      filters: [{ field: 'status', op: 'eq', value: 'paid' }],
      groupBy: ['region'],
      measures: [{ field: 'amount', agg: 'sum' }],
    }, 'E1');
    expect(r.rows.length).toBe(2);
    const byRegion = Object.fromEntries(r.rows.map((row) => [row.region, row.sum_amount]));
    expect(byRegion.North).toBe(1000);
    expect(byRegion.South).toBe(2200);
  });

  it('filter ops gt/lt/contains/neq work as expected', () => {
    const gt = runQuery(FIXTURE_ID, {
      filters: [{ field: 'amount', op: 'gt', value: 500 }],
      groupBy: [], measures: [{ field: 'id', agg: 'count' }],
    }, 'E1');
    expect(gt.rows[0].count).toBe(3);

    const lt = runQuery(FIXTURE_ID, {
      filters: [{ field: 'amount', op: 'lt', value: 1000 }],
      groupBy: [], measures: [{ field: 'id', agg: 'count' }],
    }, 'E1');
    expect(lt.rows[0].count).toBe(2);

    const contains = runQuery(FIXTURE_ID, {
      filters: [{ field: 'region', op: 'contains', value: 'sou' }],
      groupBy: [], measures: [{ field: 'id', agg: 'count' }],
    }, 'E1');
    expect(contains.rows[0].count).toBe(2);

    const neq = runQuery(FIXTURE_ID, {
      filters: [{ field: 'region', op: 'neq', value: 'North' }],
      groupBy: [], measures: [{ field: 'id', agg: 'count' }],
    }, 'E1');
    expect(neq.rows[0].count).toBe(3);
  });

  it('avg/min/max all aggregate correctly', () => {
    const r = runQuery(FIXTURE_ID, {
      groupBy: [],
      measures: [
        { field: 'amount', agg: 'avg', alias: 'a' },
        { field: 'amount', agg: 'min', alias: 'mn' },
        { field: 'amount', agg: 'max', alias: 'mx' },
      ],
    }, 'E1');
    expect(r.rows[0].mn).toBe(200);
    expect(r.rows[0].mx).toBe(1500);
    expect(r.rows[0].a).toBeCloseTo((1000+500+1500+700+200)/5);
  });

  it('sort + limit applied after aggregation', () => {
    const r = runQuery(FIXTURE_ID, {
      groupBy: ['region'],
      measures: [{ field: 'amount', agg: 'sum' }],
      sort: { field: 'sum_amount', dir: 'desc' },
      limit: 2,
    }, 'E1');
    expect(r.rows.length).toBe(2);
    expect(r.rows[0].region).toBe('South');
    expect(r.rows[1].region).toBe('North');
  });

  it('integrity hash is present and deterministic', () => {
    const a = runQuery(FIXTURE_ID, { groupBy: ['region'], measures: [{ field: 'amount', agg: 'sum' }] }, 'E1');
    const b = runQuery(FIXTURE_ID, { groupBy: ['region'], measures: [{ field: 'amount', agg: 'sum' }] }, 'E1');
    expect(a.integrityHash).toBeTruthy();
    expect(a.integrityHash).toBe(b.integrityHash);
  });
});

describe('RPT-9a · report-builder-engine · validation', () => {
  it('throws unknown-source for an unregistered id', () => {
    expect(() => runQuery('does.not.exist', { groupBy: [], measures: [{ field: 'a', agg: 'sum' }] }, 'E1'))
      .toThrowError(ReportBuilderQueryError);
  });

  it('rejects groupBy on a measure field (wrong-kind)', () => {
    try {
      runQuery(FIXTURE_ID, { groupBy: ['amount'], measures: [{ field: 'amount', agg: 'sum' }] }, 'E1');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ReportBuilderQueryError);
      expect((e as ReportBuilderQueryError).kind).toBe('wrong-kind');
    }
  });

  it('rejects sum on a dimension field (wrong-kind)', () => {
    try {
      runQuery(FIXTURE_ID, { groupBy: ['region'], measures: [{ field: 'status', agg: 'sum' }] }, 'E1');
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as ReportBuilderQueryError).kind).toBe('wrong-kind');
    }
  });

  it('allows count on a dimension field (count is exempt)', () => {
    const r = runQuery(FIXTURE_ID, { groupBy: ['region'], measures: [{ field: 'status', agg: 'count' }] }, 'E1');
    expect(r.rows.length).toBe(3);
  });

  it('rejects unknown field with unknown-field kind', () => {
    try {
      runQuery(FIXTURE_ID, { groupBy: ['nope'], measures: [{ field: 'amount', agg: 'sum' }] }, 'E1');
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as ReportBuilderQueryError).kind).toBe('unknown-field');
    }
  });

  it('rejects spec with no measures', () => {
    try {
      runQuery(FIXTURE_ID, { groupBy: ['region'], measures: [] }, 'E1');
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as ReportBuilderQueryError).kind).toBe('no-measures');
    }
  });
});

describe('RPT-9a · report-builder-engine · cross-card lock', () => {
  it('operator is denied cross-card / xc sources', () => {
    const sources = allowedSourcesFor('operator', ['fincore', 'eximx']);
    expect(sources.some((s) => s.id === 'xc.cash-position')).toBe(false);
    expect(sources.some((s) => s.id === FIXTURE_ID)).toBe(true);
    expect(sources.some((s) => s.id === 'eximx.shipments')).toBe(true);
  });

  it('manager is also denied cross-card sources', () => {
    const sources = allowedSourcesFor('manager', ['fincore']);
    expect(sources.some((s) => s.id === 'xc.cash-position')).toBe(false);
    expect(sources.some((s) => s.id === 'eximx.shipments')).toBe(false);
  });

  it('management is allowed cross-card / xc sources', () => {
    const sources = allowedSourcesFor('management', ['fincore']);
    expect(sources.some((s) => s.id === 'xc.cash-position')).toBe(true);
  });

  it('operator with no entitled cards sees nothing', () => {
    const sources = allowedSourcesFor('operator', []);
    expect(sources.length).toBe(0);
  });
});

describe('RPT-9a · report-builder-engine · read-only-lock grep', () => {
  it('engine file imports no React and writes no localStorage', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/report-framework/report-builder-engine.ts'),
      'utf8',
    );
    expect(/from\s+['"]react['"]/.test(src)).toBe(false);
    expect(/localStorage\.setItem/.test(src)).toBe(false);
    expect(/\bpostVoucher\b/.test(src)).toBe(false);
    expect(/\bsaveVoucher\b/.test(src)).toBe(false);
    expect(/\bwriteVoucher\b/.test(src)).toBe(false);
  });
});
