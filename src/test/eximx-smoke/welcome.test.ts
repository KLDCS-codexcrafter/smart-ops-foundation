/**
 * @file        src/test/eximx-smoke/welcome.test.ts
 * @purpose     TIER 3 · Smoke test · EximX Welcome + Page shell
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block C
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('EximX Welcome + Page shell · smoke', () => {
  it('EximXWelcome.tsx exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXWelcome.tsx')).toBe(true);
  });

  it('EximXPage.tsx exists', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXPage.tsx')).toBe(true);
  });

  it('Welcome file is non-empty React component', () => {
    const content = fs.readFileSync('src/pages/erp/eximx/EximXWelcome.tsx', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });

  it('Page shell wires Shell config + types', () => {
    const content = fs.readFileSync('src/pages/erp/eximx/EximXPage.tsx', 'utf-8');
    expect(content).toMatch(/Shell/);
  });
});
