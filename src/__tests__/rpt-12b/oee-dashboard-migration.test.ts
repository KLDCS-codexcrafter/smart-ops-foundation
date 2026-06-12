/**
 * @file RPT-12b · OEEDashboard recharts → framework migration
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/production/reports/OEEDashboard.tsx'), 'utf8');

describe('RPT-12b · OEEDashboard', () => {
  it('zero recharts import', () => { expect(src).not.toMatch(/from ['"]recharts['"]/); });
  it('uses ReportChart from framework', () => { expect(src).toContain('ReportChart'); });
  it('signReport integrity wired', () => { expect(src).toContain('signReport'); });
  it('integrity badge testid present', () => { expect(src).toContain('prod-oee-integrity-badge'); });
  it('preserves existing OEE engine wiring', () => { expect(src).toContain('computeOEE'); expect(src).toContain('buildOEESourceData'); });
});
