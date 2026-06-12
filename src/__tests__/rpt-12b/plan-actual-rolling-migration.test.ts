import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/production/reports/PlanActualRolling.tsx'), 'utf8');
describe('RPT-12b · PlanActualRolling', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('prod-plan-actual-integrity-badge'));
  it('preserves filters', () => { expect(src).toContain('plan_type'); expect(src).toContain('groupBy'); });
});
