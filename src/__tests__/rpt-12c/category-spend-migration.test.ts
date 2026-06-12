import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/requestx/reports/CategoryWiseSpendEstimate.tsx'), 'utf8');
describe('RPT-12c · CategoryWiseSpendEstimate', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('rx-category-spend-integrity-badge'));
  it('preserves compute', () => expect(src).toContain('groupByCategory'));
});
