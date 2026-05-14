/**
 * @file        src/test/servicedesk-stale-status-migration.test.ts
 * @sprint      T-Phase-1.C.2.T2 → T3 · D-NEW-BB 8th consumer · Stale-Status Migration Hotfix
 * @purpose     Source-level assertion that servicedesk D-NEW-BB migration block exists
 *              and matches A.17.T1 maintainpro institutional pattern · NO renderHook
 *              (project lacks @testing-library/dom peer dep · source-level pattern matches
 *              maintainpro-status-flip.test.ts institutional precedent)
 * @iso         Reliability + Maintainability
 * @decisions   D-NEW-BB Stale-Status Migration Pattern · 8th consumer (servicedesk at C.2.T2)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';

const useCardEntitlementSource = readFileSync(
  join(process.cwd(), 'src/hooks/useCardEntitlement.ts'),
  'utf-8',
);

describe('C.2.T2 · servicedesk stale-status migration · D-NEW-BB 8th consumer', () => {
  it('source contains D-NEW-BB 8th consumer migration block for servicedesk', () => {
    expect(useCardEntitlementSource).toMatch(/const servicedesk =/);
    expect(useCardEntitlementSource).toMatch(/ent\.card_id === ['"]servicedesk['"]/);
    expect(useCardEntitlementSource).toMatch(/ent\.status === ['"]locked['"]/);
  });

  it('migration if condition includes servicedesk (8th consumer)', () => {
    expect(useCardEntitlementSource).toMatch(
      /gfProd \|\| procure360 \|\| qualicheck \|\| engineeringx \|\| sitex \|\| maintainpro \|\| servicedesk/,
    );
  });

  it('servicedesk migration block has institutional C.2.T2 comment marker', () => {
    expect(useCardEntitlementSource).toMatch(/T-Phase-1\.C\.2\.T2/);
    expect(useCardEntitlementSource).toMatch(/D-NEW-BB.*8th consumer/);
  });

  it('seedDemoEntitlements returns servicedesk as active (T1 seed flip preserved)', () => {
    const seed = seedDemoEntitlements('demo');
    const sd = seed.find((e) => e.card_id === 'servicedesk');
    expect(sd).toBeDefined();
    expect(sd?.status).toBe('active');
  });

  it('migration block has institutional comment referencing audit cycle #49', () => {
    expect(useCardEntitlementSource).toMatch(/audit cycle #49/);
  });
});
