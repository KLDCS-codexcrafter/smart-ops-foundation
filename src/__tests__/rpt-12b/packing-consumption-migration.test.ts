import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/dispatch/reports/PackingConsumptionReport.tsx'), 'utf8');
describe('RPT-12b · PackingConsumptionReport', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('dp-packing-consumption-integrity-badge'));
  it('preserves BOM engine wiring', () => expect(src).toContain('expandDLN'));
});
