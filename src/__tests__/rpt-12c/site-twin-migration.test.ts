import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/sitex/reports/SiteTwinDashboard.tsx'), 'utf8');
describe('RPT-12c · SiteTwinDashboard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sx-site-twin-integrity-badge'));
  it('preserves health-score compute', () => expect(src).toContain('computeSiteHealthScore'));
});
