import { describe, it, expect } from 'vitest';
import { dispatchReceiptsKey } from '@/types/dispatch-receipt';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · Dispatch seed', () => {
  setupFreshSeed();
  it('seeds dispatch receipts at the canonical key', () => {
    const rows = readKey<{ status: string }>(dispatchReceiptsKey(ENTITY));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.status === 'delivered')).toBe(true);
  });
});
