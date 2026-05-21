import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('PackingCreditDetail UI smoke · D-NEW-FK', () => {
  it('file exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/finance/PackingCreditDetail.tsx')).toBe(true);
  });
  it('imports packing-credit-engine', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/PackingCreditDetail.tsx', 'utf-8');
    expect(c).toMatch(/from\s+['"]@\/lib\/packing-credit-engine['"]/);
  });
  it('has default export', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/PackingCreditDetail.tsx', 'utf-8');
    expect(c).toMatch(/export default function PackingCreditDetail/);
  });
  it('ExportRealisationSaathiPanel includes PC tile (D-NEW-FK link)', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/saathi/ExportRealisationSaathiPanel.tsx', 'utf-8');
    expect(c).toMatch(/D-NEW-FK/);
    expect(c).toMatch(/\/erp\/eximx\/finance\/packing-credit/);
  });
});
