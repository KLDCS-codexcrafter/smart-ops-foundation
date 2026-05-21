import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('LCList UI smoke · D-NEW-FJ', () => {
  it('file exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/finance/LCList.tsx')).toBe(true);
  });
  it('imports lc-engine', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/LCList.tsx', 'utf-8');
    expect(c).toMatch(/from\s+['"]@\/lib\/lc-engine['"]/);
  });
  it('has default export', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/LCList.tsx', 'utf-8');
    expect(c).toMatch(/export default function LCList/);
  });
});
