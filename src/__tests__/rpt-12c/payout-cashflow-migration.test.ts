import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/payout/CashFlowDashboard.tsx'), 'utf8');
describe('RPT-12c · CashFlowDashboard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('projection integrity badge', () => expect(src).toContain('po-cashflow-projection-integrity-badge'));
  it('forecast integrity badge', () => expect(src).toContain('po-cashflow-forecast-integrity-badge'));
  it('preserves engine wiring', () => expect(src).toContain('computeCashFlowProjection'));
});
