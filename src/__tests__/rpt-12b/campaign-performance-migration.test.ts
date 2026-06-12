/**
 * @file RPT-12b · CampaignPerformanceReport migration + closing wave-1 assertion
 * Closing grep: zero `from 'recharts'` across production+dispatch+salesx pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/salesx/reports/CampaignPerformanceReport.tsx'), 'utf8');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (entry === '__tests__') continue;
      walk(p, out);
    } else if (entry.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

describe('RPT-12b · CampaignPerformanceReport + closing grep', () => {
  it('zero recharts', () => expect(src).not.toMatch(/from ['"]recharts['"]/));
  it('ReportChart', () => expect(src).toContain('ReportChart'));
  it('signReport', () => expect(src).toContain('signReport'));
  it('integrity badge', () => expect(src).toContain('sx-campaign-roi-integrity-badge'));

  it('CLOSING: 3-dir grep returns 0 recharts imports across production+dispatch+salesx pages', () => {
    const dirs = [
      resolve(process.cwd(), 'src/pages/erp/production'),
      resolve(process.cwd(), 'src/pages/erp/dispatch'),
      resolve(process.cwd(), 'src/pages/erp/salesx'),
    ];
    const files = dirs.flatMap(d => walk(d));
    const offenders = files.filter(f => /from ['"]recharts['"]/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
