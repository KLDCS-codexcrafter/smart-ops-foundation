/**
 * @file        src/test/servicedesk-stale-status-migration.test.ts
 * @sprint      T-Phase-1.C.2.T2 · D-NEW-BB 8th consumer · Stale-Status Migration Hotfix
 * @purpose     Verify existing tenants with stale {servicedesk: 'locked'} get migrated
 *              to 'active' on hook init · matches maintainpro A.17.T1 pattern.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderHook } from '@testing-library/react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { cardEntitlementsKey } from '@/types/card-entitlement';

const ENTITY = 'demo';

function staleEntry(card_id: string, status: string) {
  const now = '2026-04-01T00:00:00.000Z';
  return {
    tenant_id: ENTITY, card_id, status, plan_tier: 'growth',
    effective_from: now, effective_until: null,
    trial_days_remaining: null, feature_flags: [], notes: '',
    created_at: now, updated_at: now,
  };
}

describe('C.2.T2 · servicedesk stale-status migration · D-NEW-BB 8th consumer', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('active_entity_code', ENTITY);
  });

  it('migrates stale servicedesk locked → active on hook init', () => {
    const stale = [staleEntry('servicedesk', 'locked'), staleEntry('fincore', 'active')];
    localStorage.setItem(cardEntitlementsKey(ENTITY), JSON.stringify(stale));

    const { result } = renderHook(() => useCardEntitlement());
    const sd = result.current.entitlements.find((e) => e.card_id === 'servicedesk');
    expect(sd?.status).toBe('active');
  });

  it('grants access to servicedesk after migration (sidebar visibility)', () => {
    const stale = [staleEntry('servicedesk', 'locked')];
    localStorage.setItem(cardEntitlementsKey(ENTITY), JSON.stringify(stale));

    const { result } = renderHook(() => useCardEntitlement());
    expect(result.current.canAccess('servicedesk').allowed).toBe(true);
  });

  it('migration is idempotent · already-active servicedesk stays active', () => {
    const fresh = [staleEntry('servicedesk', 'active')];
    localStorage.setItem(cardEntitlementsKey(ENTITY), JSON.stringify(fresh));

    const { result } = renderHook(() => useCardEntitlement());
    const sd = result.current.entitlements.find((e) => e.card_id === 'servicedesk');
    expect(sd?.status).toBe('active');
  });

  it('source contains D-NEW-BB 8th consumer migration block for servicedesk', () => {
    const src = readFileSync('src/hooks/useCardEntitlement.ts', 'utf-8');
    expect(src).toMatch(/const servicedesk =/);
    expect(src).toMatch(/ent\.card_id === ['"]servicedesk['"]/);
    expect(src).toMatch(/gfProd \|\| procure360 \|\| qualicheck \|\| engineeringx \|\| sitex \|\| maintainpro \|\| servicedesk/);
  });
});
