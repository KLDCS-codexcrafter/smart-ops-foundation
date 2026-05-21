import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('PackingCreditList UI smoke · D-NEW-FK', () => {
  it('file exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/finance/PackingCreditList.tsx')).toBe(true);
  });
  it('imports packing-credit-engine', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/PackingCreditList.tsx', 'utf-8');
    expect(c).toMatch(/from\s+['"]@\/lib\/packing-credit-engine['"]/);
  });
  it('has default export', () => {
    const c = fs.readFileSync('src/pages/erp/eximx/finance/PackingCreditList.tsx', 'utf-8');
    expect(c).toMatch(/export default function PackingCreditList/);
  });
});
