import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/distributor-hub/reports/DisputeStatsReport.tsx'), 'utf8');
describe('RPT-12c · DisputeStatsReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('db-disputes-integrity-badge'));
  it('wires db-disputes KPI', () => expect(src).toContain("getKpi('db-disputes')"));
});
