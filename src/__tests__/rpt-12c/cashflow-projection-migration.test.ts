import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/projx/reports/CashFlowProjectionReport.tsx'), 'utf8');
describe('RPT-12c · CashFlowProjectionReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('px-cashflow-integrity-badge'));
  it('wires px-cashflow KPI', () => expect(src).toContain("getKpi('px-cashflow')"));
  it('preserves pivot compute', () => expect(src).toContain('computeScheduleStatus'));
});
