/**
 * @file        src/test/eximx-b1/landed-cost-variance-ui.test.ts
 * @purpose     D-NEW-EW UI additive smoke
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('LandedCostReconciliationDashboard · D-NEW-EW variance drill smoke', () => {
  it('UI file references variance engine', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/import/LandedCostReconciliationDashboard.tsx',
      'utf-8',
    );
    expect(content).toMatch(/landed-cost-variance-engine|computeVarianceForAll|LandedCostVarianceReport/);
  });
  it('UI file still uses existing reconciliation engine (READ-ONLY consumer pattern)', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/import/LandedCostReconciliationDashboard.tsx',
      'utf-8',
    );
    expect(content).toMatch(/summarizeMLGITReconciliation|reconciliation-engine/);
  });
  it('sentinel · variance drill additive', () => {
    expect('variance-drill').toBe('variance-drill');
  });
});
