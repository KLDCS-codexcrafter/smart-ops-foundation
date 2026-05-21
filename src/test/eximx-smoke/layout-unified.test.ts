/**
 * @file        src/test/eximx-smoke/layout-unified.test.ts
 * @purpose     TIER 3 · Smoke test · EximX Unified Layout
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block C
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('EximX Unified Layout · sub-module smoke', () => {
  it('EximXUnifiedLayout.tsx exists at verified path', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXUnifiedLayout.tsx')).toBe(true);
  });

  it('layout file is non-empty React component', () => {
    const content = fs.readFileSync('src/pages/erp/eximx/EximXUnifiedLayout.tsx', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });

  it('Unified sidebar config exists', () => {
    expect(fs.existsSync('src/apps/erp/configs/eximx-unified-sidebar-config.ts')).toBe(true);
  });
});
