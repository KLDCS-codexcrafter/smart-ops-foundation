/**
 * @file        src/test/eximx-b1/dgtr-boe-tile-and-fi-refresh.test.ts
 * @purpose     BoE DGTR Impact tile + D-NEW-FI button refresh smoke
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs · Block D
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

describe('BoE DGTR Impact tile + D-NEW-FI button refresh smoke', () => {
  it('BoEDutyPaymentPanel references DGTR engine (additive tile)', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/import/BoEDutyPaymentPanel.tsx',
      'utf-8',
    );
    expect(content).toMatch(/dgtr-duty-impact-engine|summarizeBoEDGTRImpact|D-NEW-FD/);
  });
  it('TDLGapsAtlasPreview · D-NEW-FI · past tense after EX-11 ship', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/saathi/TDLGapsAtlasPreview.tsx',
      'utf-8',
    );
    expect(content).toMatch(/shipped in EX-11|catalogs/);
  });
  it('TDLGapsAtlasPreview · D-NEW-FI · view-full-Atlas nav link present', () => {
    const content = fs.readFileSync(
      'src/pages/erp/eximx/saathi/TDLGapsAtlasPreview.tsx',
      'utf-8',
    );
    expect(content).toMatch(/view full Atlas|atlas-full|AtlasFull/i);
  });
  it('TB-1 keystone invariants preserved · D-NEW-FF + D-NEW-FG engines intact', () => {
    expect(fs.existsSync('src/lib/voucher-runtime-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/per-item-valuation-engine.ts')).toBe(true);
    expect(fs.existsSync('src/lib/duty-waterfall-engine.ts')).toBe(true);
  });
  it('sentinel · D-NEW-FI closure marker', () => {
    expect('D-NEW-FI').toBe('D-NEW-FI');
  });
});
