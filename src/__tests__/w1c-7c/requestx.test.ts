import { describe, it, expect } from 'vitest';
import { materialIndentsKey } from '@/types/material-indent';
import { ENTITY, setupFreshSeed, readKey } from './_helpers';

describe('W1C-7c · RequestX seed', () => {
  setupFreshSeed();
  it('seeds entity-scoped material indents', () => {
    const rows = readKey<{ status: string }>(materialIndentsKey(ENTITY));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => r.status === 'submitted')).toBe(true);
  });
});
