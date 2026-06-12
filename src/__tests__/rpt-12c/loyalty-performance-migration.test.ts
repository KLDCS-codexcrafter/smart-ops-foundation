import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/customer-hub/reports/LoyaltyPerformanceReport.tsx'), 'utf8');
describe('RPT-12c · LoyaltyPerformanceReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('cu-loyalty-integrity-badge'));
  it('wires cu-loyalty KPI', () => expect(src).toContain("getKpi('cu-loyalty')"));
});
