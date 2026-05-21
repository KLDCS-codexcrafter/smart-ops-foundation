/**
 * @file        src/test/eximx-smoke/layout-export.test.ts
 * @purpose     TIER 3 · Smoke test · EximX Export Layout + key pages
 * @sprint      T-Phase-2.TB-1-EximX-Test-Bolster · Sprint 37 · Block C
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('EximX Export Layout · sub-module smoke', () => {
  it('EximXExportLayout.tsx exists at verified path', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXExportLayout.tsx')).toBe(true);
  });

  it('5+ export module pages exist (EX-7a/b/c deliverables)', () => {
    const candidates = [
      'src/pages/erp/eximx/export/ExportPOEntry.tsx',
      'src/pages/erp/eximx/export/ExportPOList.tsx',
      'src/pages/erp/eximx/export/ShippingBillEntry.tsx',
      'src/pages/erp/eximx/export/ShippingBillList.tsx',
      'src/pages/erp/eximx/export/ExportRealisationList.tsx',
      'src/pages/erp/eximx/export/EBRCEDPMSDashboard.tsx',
      'src/pages/erp/eximx/export/FEMA270DayTracker.tsx',
      'src/pages/erp/eximx/export/BuyerReliabilityDashboard.tsx',
      'src/pages/erp/eximx/export/CoOLegalizationDashboard.tsx',
    ];
    const found = candidates.filter((p) => fs.existsSync(p));
    expect(found.length).toBeGreaterThanOrEqual(5);
  });

  it('Module switcher (#17 Moat) · 3 sub-module layouts coexist', () => {
    expect(fs.existsSync('src/pages/erp/eximx/EximXExportLayout.tsx')).toBe(true);
    expect(fs.existsSync('src/pages/erp/eximx/EximXImportLayout.tsx')).toBe(true);
    expect(fs.existsSync('src/pages/erp/eximx/EximXUnifiedLayout.tsx')).toBe(true);
  });

  it('layout file is non-empty React component', () => {
    const content = fs.readFileSync('src/pages/erp/eximx/EximXExportLayout.tsx', 'utf-8');
    expect(content.length).toBeGreaterThan(100);
    expect(content).toMatch(/export/);
  });
});
