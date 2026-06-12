import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/servicedesk/reports/CustomerPnLReport.tsx'), 'utf8');
describe('RPT-12c · CustomerPnLReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sd-customer-pnl-integrity-badge'));
  it('wires sd-customer-pnl KPI', () => expect(src).toContain("getKpi('sd-customer-pnl')"));
  it('preserves compute', () => expect(src).toContain('computeCustomerPnL'));
});
