/**
 * sitex-mobile-captures.test.ts — A.15b · Block H · minimal capture smoke tests
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string): string => fs.readFileSync(path.join(process.cwd(), p), 'utf8');

describe('A.15b · 4 mobile captures registered', () => {
  it('DPR capture exports default + uses geolocation-bridge', () => {
    const src = read('src/components/mobile/MobileSiteDPRCapture.tsx');
    expect(src).toMatch(/getCurrentLocation/);
    expect(src).toMatch(/geo_fence|haversine/i);
    expect(src).toMatch(/Submit BLOCKED/);
  });
  it('Snag capture wires emitSnagRaisedSevere', () => {
    const src = read('src/components/mobile/MobileSiteSnagCapture.tsx');
    expect(src).toMatch(/emitSnagRaisedSevere/);
    expect(src).toMatch(/severity === 'medium'/);
  });
  it('Safety capture wires emitSafetyIncidentEscalate', () => {
    const src = read('src/components/mobile/MobileSiteSafetyIncidentCapture.tsx');
    expect(src).toMatch(/emitSafetyIncidentEscalate/);
    expect(src).toMatch(/SEVERITY_MAP/);
  });
  it('Material Issue capture uses offline-queue-engine', () => {
    const src = read('src/components/mobile/MobileSiteMaterialIssueCapture.tsx');
    expect(src).toMatch(/enqueueWrite/);
    expect(src).toMatch(/isOnline/);
  });
  it('App.tsx wires 4 NEW routes', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/\/operix-go\/site-dpr/);
    expect(src).toMatch(/\/operix-go\/site-snag/);
    expect(src).toMatch(/\/operix-go\/site-safety/);
    expect(src).toMatch(/\/operix-go\/site-material-issue/);
  });
  it('OperixGoPage adds 4 NEW MOBILE_PRODUCTS entries phase=live', () => {
    const src = read('src/pages/mobile/OperixGoPage.tsx');
    expect(src).toMatch(/id: 'site-dpr'/);
    expect(src).toMatch(/id: 'site-snag'/);
    expect(src).toMatch(/id: 'site-safety'/);
    expect(src).toMatch(/id: 'site-material-issue'/);
  });
  it('sitex-bridges exports emitSafetyIncidentEscalate', () => {
    const src = read('src/lib/sitex-bridges.ts');
    expect(src).toMatch(/export function emitSafetyIncidentEscalate/);
  });
  it('MOAT #22 criterion #6 banked', () => {
    const src = read('src/pages/erp/sitex/reports/MOATCriteriaValidator.tsx');
    const c6Block = src.split('id: 6')[1] ?? '';
    expect(c6Block.slice(0, 200)).toMatch(/status: 'banked'/);
  });
});
