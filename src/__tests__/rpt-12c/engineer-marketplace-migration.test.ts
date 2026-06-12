import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/servicedesk/marketplace/EngineerMarketplace.tsx'), 'utf8');
describe('RPT-12c · EngineerMarketplace', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sd-marketplace-integrity-badge'));
  it('preserves registry call', () => expect(src).toContain('listEngineerMarketplaceProfiles'));
});
