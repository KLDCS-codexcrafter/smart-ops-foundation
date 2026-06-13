import { describe, it, expect } from 'vitest';
import { equipmentKey, workOrderKey } from '@/types/maintainpro';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · MaintainPro seed', () => {
  setupFreshSeed();
  it('seeds equipment and an open work order', () => {
    expect(readKey(equipmentKey(ENTITY)).length).toBeGreaterThan(0);
    const wos = readKey<{ status: string }>(workOrderKey(ENTITY));
    expect(wos.length).toBeGreaterThan(0);
    expect(wos.some(w => w.status === 'in_progress')).toBe(true);
  });
});
