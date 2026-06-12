import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/dispatch/reports/ReconciliationSummaryReport.tsx'), 'utf8');
describe('RPT-12b · ReconciliationSummaryReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('dp-recon-summary-integrity-badge'));
  it('preserves variance trend', () => expect(src).toContain('variance_pct'));
});
