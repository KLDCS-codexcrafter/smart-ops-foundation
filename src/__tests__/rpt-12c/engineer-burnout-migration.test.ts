import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/servicedesk/engineers/EngineerBurnoutDashboard.tsx'), 'utf8');
describe('RPT-12c · EngineerBurnoutDashboard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sd-burnout-integrity-badge'));
  it('preserves compute', () => expect(src).toContain('detectEngineerBurnout'));
});
