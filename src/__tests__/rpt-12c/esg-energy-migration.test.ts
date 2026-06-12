import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/maintainpro/reports/ESGEnergyDashboard.tsx'), 'utf8');
describe('RPT-12c · ESGEnergyDashboard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('mp-esg-integrity-badge'));
  it('preserves emissions compute', () => expect(src).toContain('computeScope1Emissions'));
});
