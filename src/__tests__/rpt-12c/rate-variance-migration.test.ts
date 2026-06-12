import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/procure-hub/reports/RateVarianceGraphPanel.tsx'), 'utf8');
describe('RPT-12c · RateVarianceGraphPanel', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('pr-rate-variance-integrity-badge'));
  it('preserves contract lookup', () => expect(src).toContain('findActiveRate'));
});
