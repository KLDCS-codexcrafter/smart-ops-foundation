import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getKpi } from '@/lib/report-framework/kpi-registry';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/dispatch/reports/TransporterScorecard.tsx'), 'utf8');
describe('RPT-12b · TransporterScorecard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge (dp-transporter)', () => expect(src).toContain('dp-transporter-integrity-badge'));
  it('pre-seeded KPI dp-transporter exists', () => expect(getKpi('dp-transporter')).toBeDefined());
});
