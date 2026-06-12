/**
 * W1C-2 · Block 3 · VendorPerformanceView migration + allowlist empty.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PAGE = readFileSync(resolve(process.cwd(), 'src/pages/vendor-portal/VendorPerformanceView.tsx'), 'utf8');
const SWEEP = readFileSync(resolve(process.cwd(), 'src/lib/report-framework/__tests__/arc-close-sweep.test.ts'), 'utf8');

describe('W1C-2 Block 3 · VendorPerformanceView migration', () => {
  it('zero recharts imports', () => {
    expect(PAGE).not.toMatch(/from ['"]recharts['"]/);
  });
  it('uses ReportChart with bar config', () => {
    expect(PAGE).toContain('ReportChart');
    expect(PAGE).toContain("chartType: 'bar'");
  });
  it('integrity badge wired via signReport', () => {
    expect(PAGE).toContain('signReport');
    expect(PAGE).toContain('vp-performance-integrity-badge');
  });
  it('chart-host testid present', () => {
    expect(PAGE).toContain('vp-performance-chart-host');
  });
  it('preserves factor_breakdown compute', () => {
    expect(PAGE).toContain('score.factor_breakdown.map');
  });
  it('arc-close-sweep allowlist no longer shields vendor-portal page', () => {
    expect(SWEEP).not.toContain('src/pages/vendor-portal/VendorPerformanceView.tsx');
  });
});
