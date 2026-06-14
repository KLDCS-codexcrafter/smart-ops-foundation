/**
 * CL-1 · Block 4 · B11-F1 theme-guard + B16-F1/F2 + dead-code assertions.
 * Locks the contract — no bg-[# dark-panel literals in src/pages/erp/**.
 * Does NOT convert the ~55 text-white instances (mostly intentional on tints).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('CL-1 · B11-F1 · theme-guard over src/pages/erp/**', () => {
  it('no bg-[# dark-panel literals across src/pages/erp/**', () => {
    const files = walk('src/pages/erp');
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      // catches bg-[#xxxxxx] and bg-[#xxx] inline hex panels
      if (/bg-\[#[0-9a-fA-F]{3,8}\]/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe('CL-1 · B16-F1 — OfflineIndicator on MobileShopFloorOperatorPage', () => {
  it('source imports + renders <OfflineIndicator />', () => {
    const src = readFileSync('src/pages/mobile/MobileShopFloorOperatorPage.tsx', 'utf8');
    expect(src).toMatch(/from '@\/components\/mobile\/OfflineIndicator'/);
    expect(src).toMatch(/<OfflineIndicator\s*\/>/);
  });
});

describe('CL-1 · B16-F2 — InstallPromptBanner mounted on /operix-go/* shell', () => {
  it('App.tsx mounts the banner via OperixGoChrome route-aware sibling', () => {
    const src = readFileSync('src/App.tsx', 'utf8');
    expect(src).toMatch(/InstallPromptBanner/);
    expect(src).toMatch(/OperixGoChrome/);
    expect(src).toMatch(/\/operix-go/);
  });
});

describe('CL-1 · Dead-code — MobilePODCapture component removed', () => {
  it('the unrouted rich variant no longer exists', () => {
    expect(existsSync('src/components/mobile/MobilePODCapture.tsx')).toBe(false);
  });
  it('live MobilePODCapturePage (transporter) still exists', () => {
    expect(existsSync('src/pages/mobile/transporter/MobilePODCapturePage.tsx')).toBe(true);
  });
});
