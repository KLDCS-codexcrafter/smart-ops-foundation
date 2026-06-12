/**
 * @file        credit-xray.test.tsx
 * @sprint      RPT-10a · Block 3 · CreditXRayPage test
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string): string => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('RPT-10a · CreditXRayPage', () => {
  const src = read('src/pages/erp/receivx/cockpits/CreditXRayPage.tsx');
  const page = read('src/features/receivx/ReceivXPage.tsx');
  const types = read('src/features/receivx/ReceivXSidebar.types.ts');
  const sidebar = read('src/features/receivx/ReceivXSidebar.tsx');

  it('page file exports default component', () => {
    expect(src).toMatch(/export default function CreditXRayPage/);
  });

  it('composes FROZEN primitives (ReportChart · ScorecardTile · TableChartToggle)', () => {
    expect(src).toContain('ReportChart');
    expect(src).toContain('ScorecardTile');
    expect(src).toContain('TableChartToggle');
  });

  it('reads real DSC sources only (receivx.ar · distributor.orders)', () => {
    expect(src).toContain("'receivx.ar'");
    expect(src).toContain("'distributor.orders'");
  });

  it('gates distributor cross-card to management via layerCeilingFor', () => {
    expect(src).toContain('layerCeilingFor');
    expect(src).toContain('isManagement');
  });

  it('aging waterfall + top-10 exposure + overdue-% RAG tile present', () => {
    expect(src).toContain('credit-xray-aging');
    expect(src).toContain('credit-xray-top10');
    expect(src).toContain('resolveRag');
    expect(src).toContain('overduePct');
  });

  it('integrity badge via signReport · honest empty-state', () => {
    expect(src).toContain('signReport');
    expect(src).toContain('credit-xray-integrity');
    expect(src).toContain('credit-xray-empty');
  });

  it('ReceivX wires rx-credit-xray module · sidebar entry · switch case', () => {
    expect(types).toContain("'rx-credit-xray'");
    expect(page).toContain("case 'rx-credit-xray'");
    expect(page).toContain('CreditXRayPage');
    expect(sidebar).toContain("'rx-credit-xray'");
    expect(sidebar).toContain('Credit X-Ray');
  });
});
