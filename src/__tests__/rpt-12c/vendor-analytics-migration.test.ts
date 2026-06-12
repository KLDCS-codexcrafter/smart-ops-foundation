import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/payout/VendorAnalytics.tsx'), 'utf8');
describe('RPT-12c · VendorAnalytics', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('top integrity badge', () => expect(src).toContain('po-vendor-top-integrity-badge'));
  it('distribution integrity badge', () => expect(src).toContain('po-vendor-distribution-integrity-badge'));
});
