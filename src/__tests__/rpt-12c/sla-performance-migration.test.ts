import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/servicedesk/reports/SLAPerformance.tsx'), 'utf8');
describe('RPT-12c · SLAPerformance', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sd-sla-performance-integrity-badge'));
  it('preserves SLA compute', () => expect(src).toContain('computeRows'));
});
