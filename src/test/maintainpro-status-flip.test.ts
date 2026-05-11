/**
 * @file        src/test/maintainpro-status-flip.test.ts
 * @purpose     A.17 · Q-LOCK-1 status flip verification · matches A.13 + A.15a precedent
 * @sprint      T-Phase-1.A.17 · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
import { applications } from '@/components/operix-core/applications';

function readSrc(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf-8');
}

describe('A.17 · MaintainPro status flip · Q-LOCK-1', () => {
  it('card-entitlement-engine seed drops the "locked" override', () => {
    const src = readSrc('src/lib/card-entitlement-engine.ts');
    expect(src).toMatch(/one\('maintainpro'\)/);
    expect(src).not.toMatch(/one\('maintainpro', 'locked'\)/);
  });

  it('seedDemoEntitlements returns maintainpro as active', () => {
    const seed = seedDemoEntitlements('demo');
    const mp = seed.find((e) => e.card_id === 'maintainpro');
    expect(mp).toBeDefined();
    expect(mp?.status).toBe('active');
  });

  it('applications.ts maintainpro entry has status active', () => {
    const mp = applications.find((a) => a.id === 'maintainpro');
    expect(mp?.status).toBe('active');
  });

  it('card-entitlement-engine sentinel comment references MOAT #23', () => {
    const src = readSrc('src/lib/card-entitlement-engine.ts');
    expect(src).toMatch(/A\.17 STATUS FLIP/);
  });

  it('applications.ts sentinel comment references MOAT #23', () => {
    const src = readSrc('src/components/operix-core/applications.ts');
    expect(src).toMatch(/A\.17 STATUS FLIP/);
  });
});
