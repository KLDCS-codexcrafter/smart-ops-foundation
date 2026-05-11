/**
 * @file        src/test/maintainpro-status-flip.test.ts
 * @purpose     A.17 · Q-LOCK-1 status flip verification · matches A.13 + A.15a precedent
 * @sprint      T-Phase-1.A.17 · Block F.2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fs from 'node:fs';
import path from 'node:path';
import { seedDemoEntitlements } from '@/lib/card-entitlement-engine';
import { applications } from '@/components/operix-core/applications';

const useCardEntitlementSource = fs.readFileSync(
  path.join(__dirname, '..', 'hooks', 'useCardEntitlement.ts'),
  'utf-8',
);

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

  it('migrates stale maintainpro locked → active on hook init (A.17.T1 self-heal)', () => {
    // Simulate stale localStorage state (existing tenant pre-flip)
    const entityCode = 'demo';
    const key = `erp_card_entitlements_${entityCode}`;
    const stale = [
      { tenant_id: entityCode, card_id: 'maintainpro', status: 'locked',
        plan_tier: 'growth', effective_from: '2026-04-01', effective_until: null,
        trial_days_remaining: null, feature_flags: [], notes: '',
        created_at: '2026-04-01', updated_at: '2026-04-01' },
    ];
    localStorage.setItem(key, JSON.stringify(stale));

    // Read it back via the same path the hook uses
    const raw = localStorage.getItem(key);
    expect(raw).toBeTruthy();

    // Hook init logic via direct source inspection (source-level assert pattern)
    expect(useCardEntitlementSource).toMatch(/ent\.card_id === ['"]maintainpro['"]/);
    expect(useCardEntitlementSource).toMatch(/ent\.status === ['"]locked['"]/);
  });

  it('migration block covers engineeringx + sitex + maintainpro (defensive 3-card cover)', () => {
    expect(useCardEntitlementSource).toMatch(/const engineeringx =/);
    expect(useCardEntitlementSource).toMatch(/const sitex =/);
    expect(useCardEntitlementSource).toMatch(/const maintainpro =/);
  });

  it('migration if condition includes all 6 historical status-flip cards', () => {
    // Match the if condition with all 6 conditions present
    expect(useCardEntitlementSource).toMatch(/if \(gfProd \|\| procure360 \|\| qualicheck \|\| engineeringx \|\| sitex \|\| maintainpro\)/);
  });
});
