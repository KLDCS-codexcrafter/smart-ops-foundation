import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/salesx/SalesXAnalytics.tsx'), 'utf8');
describe('RPT-12b · SalesXAnalytics', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sx-analytics-integrity-badge'));
  it('preserves drill-down state', () => { expect(src).toContain('setDrillStage'); expect(src).toContain('drillRows'); });
});
