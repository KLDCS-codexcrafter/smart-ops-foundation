/**
 * W1C-2 · Block 4 · SiteTwin honest-data pass — no fake trend literals.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const SRC = readFileSync(resolve(process.cwd(), 'src/pages/erp/sitex/reports/SiteTwinDashboard.tsx'), 'utf8');

describe('W1C-2 Block 4 · SiteTwin sparkline removal', () => {
  it('no hardcoded `trend: [` literals remain', () => {
    expect(SRC).not.toMatch(/trend:\s*\[/);
  });
  it('no `trend` field on RAGCardSpec', () => {
    expect(SRC).not.toMatch(/trend:\s*number\[\]/);
  });
  it('no per-card sparkline ReportChart mapping (no `trend.map`)', () => {
    expect(SRC).not.toMatch(/c\.trend\.map/);
  });
  it('still uses ReportChart at page level over real `aggregated` array', () => {
    expect(SRC).toContain('ReportChart');
    expect(SRC).toContain('aggregated');
  });
  it('signReport still wraps aggregated real engine values', () => {
    expect(SRC).toContain('signReport(aggregated)');
  });
  it('integrity badge testid preserved', () => {
    expect(SRC).toContain('sx-site-twin-integrity-badge');
  });
  it('engine imports preserved (consume, not fork)', () => {
    expect(SRC).toContain('computeSiteHealthScore');
    expect(SRC).toContain('computeImprestHealthMetrics');
  });
});
