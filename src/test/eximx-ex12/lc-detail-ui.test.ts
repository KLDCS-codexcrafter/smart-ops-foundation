import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('LCDetail UI smoke · D-NEW-FJ', () => {
  it('file exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/finance/LCDetail.tsx')).toBe(true);
  });
  it('imports lc-engine', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/LCDetail.tsx', 'utf-8');
    expect(c).toMatch(/from\s+['"]@\/lib\/lc-engine['"]/);
  });
  it('has default export', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/LCDetail.tsx', 'utf-8');
    expect(c).toMatch(/export default function LCDetail/);
  });
  it('ExportPOSaathiPanel includes LC tile (D-NEW-FJ link)', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/saathi/ExportPOSaathiPanel.tsx', 'utf-8');
    expect(c).toMatch(/D-NEW-FJ/);
    expect(c).toMatch(/\/erp\/eximx\/finance\/lc/);
  });
});
