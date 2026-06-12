import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx'), 'utf8');
describe('RPT-12b · SavingsROIDashboard', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('dp-savings-roi-integrity-badge'));
  it('preserves combo trend', () => expect(src).toContain('combo'));
});
