/**
 * @file        src/test/eximx-smoke/layout-import.test.ts
 * @purpose     TIER 3 · Smoke test · EximX Import Layout + key pages
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block C
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('EximX Import Layout · sub-module smoke', () => {
  it('EximXImportLayout.tsx exists at verified path', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXImportLayout.tsx')).toBe(true);
  });

  it('layout file is non-empty React component', () => {
    const content = fs.readFileSync('src/pages/erp/eximx/EximXImportLayout.tsx', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });

  it('import module pages directory exists with content', () => {
    expect(fs.existsSync('src/pages/erp/eximx/import')).toBe(true);
    const entries = fs.readdirSync('src/pages/erp/eximx/import');
    expect(entries.length).toBeGreaterThan(0);
  });

  it('3 sub-module layouts coexist (institutional invariant)', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXExportLayout.tsx')).toBe(true);
    expect(fs.existsSync('src/pages/erp/eximx/EximXImportLayout.tsx')).toBe(true);
    expect(fs.existsSync('src/pages/erp/eximx/EximXUnifiedLayout.tsx')).toBe(true);
  });
});
