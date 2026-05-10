/**
 * @file src/test/dispatch-id-swap.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block F.8
 */
import { describe, it, expect } from 'vitest';

describe('Dispatch ID swap · Q-LOCK-10a · Decision A', () => {
  it('applications.ts has correct IDs post-swap', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = mod.applications;
    const logistics = apps.find((a) => a.id === 'logistics');
    const dispatchHub = apps.find((a) => a.id === 'dispatch-hub');
    expect(logistics).toBeDefined();
    expect(logistics?.name).toBe('Logistics');
    expect(logistics?.route).toBe('/erp/logistics');
    expect(dispatchHub).toBeDefined();
    expect(dispatchHub?.name).toBe('Dispatch Hub');
    expect(dispatchHub?.route).toBe('/erp/dispatch');
    expect(apps.find((a) => a.id === 'dispatch-ops')).toBeUndefined();
  });

  it('breadcrumb-memory routes match swapped IDs', async () => {
    const mod = await import('@/lib/breadcrumb-memory');
    expect(mod.CARD_BASE_ROUTES['logistics']).toBe('/erp/logistics');
    expect(mod.CARD_BASE_ROUTES['dispatch-hub']).toBe('/erp/dispatch');
  });
});
