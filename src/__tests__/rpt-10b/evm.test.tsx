/**
 * @file        evm.test.tsx
 * @sprint      RPT-10b · Block 3 · EVMPage test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';
import '@/lib/report-framework/data-sources';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10b · EVMPage', () => {
  const src = read('src/pages/erp/projx/cockpits/EVMPage.tsx');
  const types = read('src/pages/erp/projx/ProjXSidebar.types.ts');
  const sidebar = read('src/pages/erp/projx/ProjXSidebar.tsx');
  const groups = read('src/pages/erp/projx/ProjXSidebar.groups.ts');
  const page = read('src/pages/erp/projx/ProjXPage.tsx');

  it('exports default component', () => {
    expect(src).toMatch(/export default function EVMPage/);
  });

  it('reads real DSC sources only (projx.projects + projx.financials)', () => {
    expect(src).toContain("'projx.projects'");
    expect(src).toContain("'projx.financials'");
  });

  it('composes FROZEN primitives only · NO recharts import', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).not.toContain("from 'recharts'");
  });

  it('PV from current_contract_value · EV from billed_to_date · AC declared absent', () => {
    expect(src).toContain('current_contract_value');
    expect(src).toContain('billed_to_date');
    expect(src).toContain('evm-absent-declaration');
    expect(src).toContain('AC absent');
  });

  it('SPI computed when PV>0 · CPI declared absent (AC missing)', () => {
    expect(src).toContain('SPI');
    expect(src).toContain('CPI');
    expect(src).toContain('DECLARED absent');
  });

  it('integrity badge + honest empty-state present', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('evm-integrity');
    expect(src).toContain('evm-empty');
  });

  it('ProjX wires projx-evm · type + sidebar + groups + switch case', () => {
    expect(types).toContain("'projx-evm'");
    expect(sidebar).toContain("'projx-evm'");
    expect(sidebar).toContain('Earned Value');
    expect(groups).toContain("'projx-evm': 'reports'");
    expect(page).toContain("case 'projx-evm'");
    expect(page).toContain('EVMPage');
  });

  it('px-spi seeded (rendered); px-cpi seeded (gated tile rendered)', () => {
    expect(getKpi('px-spi')).toBeDefined();
    expect(getKpi('px-cpi')).toBeDefined();
  });
});
