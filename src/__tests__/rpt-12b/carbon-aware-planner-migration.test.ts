import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/production/reports/CarbonAwareProductionPlanner.tsx'), 'utf8');
describe('RPT-12b · CarbonAwareProductionPlanner', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('prod-carbon-planner-integrity-badge'));
  it('preserves carbon engine wiring', () => expect(src).toContain('getGridIntensityForHour'));
});
