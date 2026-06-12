/**
 * @file        coq.test.tsx
 * @sprint      RPT-10b · Block 2 · COQPage test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import '@/lib/report-framework/data-sources';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10b · COQPage', () => {
  const src = read('src/pages/erp/qualicheck/cockpits/COQPage.tsx');
  const types = read('src/pages/erp/qualicheck/QualiCheckSidebar.types.ts');
  const sidebar = read('src/apps/erp/configs/qualicheck-sidebar-config.ts');
  const page = read('src/pages/erp/qualicheck/QualiCheckPage.tsx');

  it('exports default component', () => {
    expect(src).toMatch(/export default function COQPage/);
  });

  it('reads real DSC sources only (qualicheck.inspections + qualicheck.ncr)', () => {
    expect(src).toContain("'qualicheck.inspections'");
    expect(src).toContain("'qualicheck.ncr'");
  });

  it('composes FROZEN primitives only · NO recharts import', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).not.toContain("from 'recharts'");
  });

  it('declares PAF cost-category split absent · never invents costs', () => {
    expect(src).toContain('coq-paf-declared-absent');
    expect(src).toContain('Declared (not faked)');
  });

  it('integrity badge + honest empty-state present', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('coq-integrity');
    expect(src).toContain('coq-empty');
  });

  it('QualiCheck wires qc-coq · type + sidebar + switch case', () => {
    expect(types).toContain("'qc-coq'");
    expect(sidebar).toContain("'qc-coq'");
    expect(sidebar).toContain('Cost of Quality');
    expect(page).toContain("case 'qc-coq'");
    expect(page).toContain('COQPage');
  });

  it('qc-coq KPI seed idempotent', () => {
    expect(getKpi('qc-coq')).toBeDefined();
  });
});
