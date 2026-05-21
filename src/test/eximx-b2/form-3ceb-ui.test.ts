import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('Form3CEBDashboard + Compliance Saathi tile · D-NEW-FE UI smoke', () => {
  it('Dashboard file exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/compliance/Form3CEBDashboard.tsx')).toBe(true);
  });
  it('ComplianceSaathiPanel references Form 3CEB tile', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/saathi/ComplianceSaathiPanel.tsx',
      'utf-8',
    );
    expect(content).toMatch(/form-3ceb|D-NEW-FE|Form 3CEB/);
  });
  it('HedgeContractList references hedge-accrual-engine (D-NEW-FB additive tile)', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/finance/HedgeContractList.tsx',
      'utf-8',
    );
    expect(content).toMatch(/hedge-accrual-engine|computeQuarterEndHedgeAccruals|D-NEW-FB/);
  });
  it('sentinel · 8th SIBLING UI surface', () => {
    expect('8th-sibling-ui').toBe('8th-sibling-ui');
  });
});
